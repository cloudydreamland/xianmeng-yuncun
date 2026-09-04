import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { verifyAdminSession, digest, randomToken, nowSeconds } from '../../admin/functions/_lib/auth.ts';
import { onRequestGet as getRecords, onRequestPost as createRecord } from '../../admin/functions/api/records/index.ts';
import { onRequestDelete as deleteRecord, onRequestPatch as patchRecord } from '../../admin/functions/api/records/[id].ts';
import { onRequestPost as restoreRecord } from '../../admin/functions/api/records/[id]/restore.ts';
import { onRequestPost as importRecords } from '../../admin/functions/api/import.ts';
import { onRequestGet as exportRecords } from '../../admin/functions/api/export.ts';
import type { AdminEnv, D1Database, D1PreparedStatement, D1Result } from '../../admin/functions/_types.ts';

class MemoryStatement implements D1PreparedStatement {
  #values: SQLInputValue[] = [];
  private readonly database: DatabaseSync;
  private readonly sql: string;
  constructor(database: DatabaseSync, sql: string) { this.database = database; this.sql = sql; }
  bind(...values: unknown[]): D1PreparedStatement { this.#values = values as SQLInputValue[]; return this; }
  async first<T>(): Promise<T | null> { return (this.database.prepare(this.sql).get(...this.#values) as T | undefined) || null; }
  async all<T>(): Promise<D1Result<T>> { return { success: true, results: this.database.prepare(this.sql).all(...this.#values) as T[], meta: {} }; }
  async run<T>(): Promise<D1Result<T>> { const result = this.database.prepare(this.sql).run(...this.#values); return { success: true, meta: { changes: Number(result.changes) } }; }
}

export class MemoryD1 implements D1Database {
  readonly database = new DatabaseSync(':memory:');
  constructor() { for (const file of ['0001_private_records.sql', '0002_passkey_auth.sql', '0003_password_auth.sql']) this.database.exec(readFileSync(new URL(`../../admin/migrations/${file}`, import.meta.url), 'utf8')); }
  prepare(query: string): D1PreparedStatement { return new MemoryStatement(this.database, query); }
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    this.database.exec('BEGIN');
    try { const results = []; for (const statement of statements) results.push(await statement.run()); this.database.exec('COMMIT'); return results; }
    catch (error) { this.database.exec('ROLLBACK'); throw error; }
  }
}

async function authFixture() {
  const DB = new MemoryD1(); const token = randomToken(); const now = nowSeconds();
  DB.database.prepare('INSERT INTO auth_admin VALUES (?, ?, ?)').run('primary', randomToken(), now);
  DB.database.prepare('INSERT INTO auth_credentials (id, public_key, name, created_at) VALUES (?, ?, ?, ?)').run('test-key', 'test-public-key', 'Test', now);
  DB.database.prepare('INSERT INTO auth_sessions (token_hash, credential_id, scope, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)').run(await digest(token), 'test-key', 'admin', now, now + 3600, now);
  return { token: `__Host-yuncun-session=${token}`, fetcher: globalThis.fetch, env: { DB, ADMIN_EMAIL: 'owner@example.com', PUBLIC_ADMIN_ORIGIN: 'https://admin.example' } satisfies AdminEnv };
}

test('仅有效服务器会话可以访问私人数据；伪造 Access 头不再有效', async () => {
  const auth = await authFixture();
  const request = new Request('https://admin.example/api/session', { headers: { cookie: auth.token } });
  assert.equal((await verifyAdminSession(request, auth.env)).email, 'owner@example.com');
  await assert.rejects(() => verifyAdminSession(new Request(request.url, { headers: { 'cf-access-jwt-assertion': auth.token } }), auth.env), /admin_auth_required/);
  await assert.rejects(() => verifyAdminSession(new Request('https://preview.admin.example/api/session', { headers: { cookie: auth.token } }), auth.env), /admin_origin_forbidden/);
  auth.env.DB.database.exec('DELETE FROM auth_sessions');
  await assert.rejects(() => verifyAdminSession(request, auth.env), /admin_auth_required/);
});

test('私人记录 API 支持创建、版本冲突、软删除、恢复和幂等导入', async () => {
  const auth = await authFixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = auth.fetcher;
  try {
    const env: AdminEnv = { ...auth.env };
    const headers = { cookie: auth.token, origin: 'https://admin.example', 'content-type': 'application/json' };
    const context = (request: Request, id = '') => ({ request, env, params: { id }, waitUntil: () => undefined });
    const created = await createRecord(context(new Request('https://admin.example/api/records', { method: 'POST', headers, body: JSON.stringify({ kind: 'plan', data: { title: '整理云卷', date: '2026-09-03' } }) })));
    assert.equal(created.status, 201);
    const record = (await created.json() as { record: { id: string; version: number } }).record;

    const updated = await patchRecord(context(new Request(`https://admin.example/api/records/${record.id}`, { method: 'PATCH', headers, body: JSON.stringify({ kind: 'plan', version: 1, data: { title: '整理云卷完成' } }) }), record.id));
    assert.equal((await updated.json() as { record: { version: number } }).record.version, 2);
    const conflict = await patchRecord(context(new Request(`https://admin.example/api/records/${record.id}`, { method: 'PATCH', headers, body: JSON.stringify({ kind: 'plan', version: 1, data: { title: '旧版本' } }) }), record.id));
    assert.equal(conflict.status, 409);

    const removed = await deleteRecord(context(new Request(`https://admin.example/api/records/${record.id}`, { method: 'DELETE', headers, body: JSON.stringify({ version: 2 }) }), record.id));
    assert.equal(removed.status, 200);
    const restored = await restoreRecord(context(new Request(`https://admin.example/api/records/${record.id}/restore`, { method: 'POST', headers, body: JSON.stringify({ version: 3 }) }), record.id));
    assert.equal(restored.status, 200);

    const importBody = { source: 'legacy-browser', records: [{ id: 'journal:legacy:1', kind: 'journal', data: { title: '旧日记', content: '一段回忆' } }] };
    const imported = await importRecords(context(new Request('https://admin.example/api/import', { method: 'POST', headers, body: JSON.stringify(importBody) })));
    assert.equal((await imported.json() as { imported: number }).imported, 1);
    const duplicate = await importRecords(context(new Request('https://admin.example/api/import', { method: 'POST', headers, body: JSON.stringify(importBody) })));
    assert.equal((await duplicate.json() as { duplicate: boolean }).duplicate, true);

    const listed = await getRecords(context(new Request('https://admin.example/api/records', { headers: { cookie: auth.token } })));
    assert.equal((await listed.json() as { records: unknown[] }).records.length, 2);

    const backup = await exportRecords(context(new Request('https://admin.example/api/export', { headers: { cookie: auth.token } })));
    const backupBody = await backup.json() as { records: Array<{ id: string; deletedAt: string | null }> };
    assert.equal(backup.headers.get('cache-control'), 'private, no-store');
    assert.equal(backupBody.records.length, 2);

    const database = (env.DB as MemoryD1).database;
    database.prepare('UPDATE private_records SET deleted_at = ? WHERE id = ?').run('2026-01-01T00:00:00.000Z', record.id);
    await getRecords(context(new Request('https://admin.example/api/records?trash=true', { headers: { cookie: auth.token } })));
    assert.equal(database.prepare('SELECT id FROM private_records WHERE id = ?').get(record.id), undefined);
  } finally { globalThis.fetch = originalFetch; }
});

test('私人写接口拒绝缺少同源 Origin 的请求', async () => {
  const auth = await authFixture();
  const originalFetch = globalThis.fetch; globalThis.fetch = auth.fetcher;
  try {
    const env: AdminEnv = { ...auth.env };
    const response = await createRecord({ request: new Request('https://admin.example/api/records', { method: 'POST', headers: { cookie: auth.token, 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'plan', data: { title: '不可写入' } }) }), env, params: {}, waitUntil: () => undefined });
    assert.equal(response.status, 403);
  } finally { globalThis.fetch = originalFetch; }
});

test('导入接口拒绝没有 Content-Length 的超大请求体', async () => {
  const auth = await authFixture();
  const originalFetch = globalThis.fetch; globalThis.fetch = auth.fetcher;
  try {
    const env: AdminEnv = { ...auth.env };
    const oversized = JSON.stringify({ source: 'json-backup', records: [], padding: 'x'.repeat(1_500_000) });
    const request = new Request('https://admin.example/api/import', { method: 'POST', headers: { cookie: auth.token, origin: 'https://admin.example', 'content-type': 'application/json' }, body: oversized });
    request.headers.delete('content-length');
    const response = await importRecords({ request, env, params: {}, waitUntil: () => undefined });
    assert.equal(response.status, 413);
  } finally { globalThis.fetch = originalFetch; }
});

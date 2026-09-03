import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { verifyAdminAccess } from '../../admin/functions/_lib/access.ts';
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

class MemoryD1 implements D1Database {
  readonly database = new DatabaseSync(':memory:');
  constructor() { this.database.exec(readFileSync(new URL('../../admin/migrations/0001_private_records.sql', import.meta.url), 'utf8')); }
  prepare(query: string): D1PreparedStatement { return new MemoryStatement(this.database, query); }
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> { return Promise.all(statements.map((statement) => statement.run())); }
}

function base64Url(value: string | Uint8Array): string {
  return Buffer.from(value).toString('base64url');
}

async function authFixture(overrides: Record<string, unknown> = {}) {
  const issuer = `https://unit-${crypto.randomUUID()}.cloudflareaccess.com`;
  const audience = 'admin-audience';
  const email = 'owner@example.com';
  const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const publicKey = await crypto.subtle.exportKey('jwk', keys.publicKey) as JsonWebKey & { kid: string };
  publicKey.kid = 'unit-key'; publicKey.alg = 'RS256'; publicKey.use = 'sig';
  const header = base64Url(JSON.stringify({ alg: 'RS256', kid: publicKey.kid, typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({ iss: issuer, aud: audience, email, sub: 'owner-id', exp: Math.floor(Date.now() / 1000) + 300, ...overrides }));
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keys.privateKey, new TextEncoder().encode(`${header}.${payload}`));
  const token = `${header}.${payload}.${base64Url(new Uint8Array(signature))}`;
  const fetcher = async () => Response.json({ keys: [publicKey] });
  return { token, fetcher: fetcher as typeof fetch, env: { ADMIN_EMAIL: email, CF_ACCESS_AUD: audience, CF_ACCESS_ISSUER: issuer } satisfies AdminEnv };
}

test('Access JWT 必须通过签名、签发方、Audience、有效期和唯一邮箱校验', async () => {
  const valid = await authFixture();
  const request = new Request('https://admin.example/api/session', { headers: { 'cf-access-jwt-assertion': valid.token } });
  assert.equal((await verifyAdminAccess(request, valid.env, valid.fetcher)).email, 'owner@example.com');
  const wrongEmail = await authFixture({ email: 'visitor@example.com' });
  await assert.rejects(() => verifyAdminAccess(new Request('https://admin.example/api/session', { headers: { 'cf-access-jwt-assertion': wrongEmail.token } }), wrongEmail.env, wrongEmail.fetcher), /admin_email_forbidden/);
  const expired = await authFixture({ exp: Math.floor(Date.now() / 1000) - 1 });
  await assert.rejects(() => verifyAdminAccess(new Request('https://admin.example/api/session', { headers: { 'cf-access-jwt-assertion': expired.token } }), expired.env, expired.fetcher), /admin_token_expired/);
  const wrongAudience = await authFixture({ aud: 'another-audience' });
  await assert.rejects(() => verifyAdminAccess(new Request('https://admin.example/api/session', { headers: { 'cf-access-jwt-assertion': wrongAudience.token } }), wrongAudience.env, wrongAudience.fetcher), /admin_token_claims_invalid/);
  const wrongIssuer = await authFixture({ iss: 'https://other-team.cloudflareaccess.com' });
  await assert.rejects(() => verifyAdminAccess(new Request('https://admin.example/api/session', { headers: { 'cf-access-jwt-assertion': wrongIssuer.token } }), wrongIssuer.env, wrongIssuer.fetcher), /admin_token_claims_invalid/);
  const tampered = await authFixture();
  const tokenParts = tampered.token.split('.');
  tokenParts[2] = `${tokenParts[2][0] === 'A' ? 'B' : 'A'}${tokenParts[2].slice(1)}`;
  await assert.rejects(() => verifyAdminAccess(new Request('https://admin.example/api/session', { headers: { 'cf-access-jwt-assertion': tokenParts.join('.') } }), tampered.env, tampered.fetcher), /admin_token_signature_invalid/);
});

test('私人记录 API 支持创建、版本冲突、软删除、恢复和幂等导入', async () => {
  const auth = await authFixture();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = auth.fetcher;
  try {
    const env: AdminEnv = { ...auth.env, DB: new MemoryD1() };
    const headers = { 'cf-access-jwt-assertion': auth.token, origin: 'https://admin.example', 'content-type': 'application/json' };
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

    const listed = await getRecords(context(new Request('https://admin.example/api/records', { headers: { 'cf-access-jwt-assertion': auth.token } })));
    assert.equal((await listed.json() as { records: unknown[] }).records.length, 2);

    const backup = await exportRecords(context(new Request('https://admin.example/api/export', { headers: { 'cf-access-jwt-assertion': auth.token } })));
    const backupBody = await backup.json() as { records: Array<{ id: string; deletedAt: string | null }> };
    assert.equal(backup.headers.get('cache-control'), 'private, no-store');
    assert.equal(backupBody.records.length, 2);

    const database = (env.DB as MemoryD1).database;
    database.prepare('UPDATE private_records SET deleted_at = ? WHERE id = ?').run('2026-01-01T00:00:00.000Z', record.id);
    await getRecords(context(new Request('https://admin.example/api/records?trash=true', { headers: { 'cf-access-jwt-assertion': auth.token } })));
    assert.equal(database.prepare('SELECT id FROM private_records WHERE id = ?').get(record.id), undefined);
  } finally { globalThis.fetch = originalFetch; }
});

test('私人写接口拒绝缺少同源 Origin 的请求', async () => {
  const auth = await authFixture();
  const originalFetch = globalThis.fetch; globalThis.fetch = auth.fetcher;
  try {
    const env: AdminEnv = { ...auth.env, DB: new MemoryD1() };
    const response = await createRecord({ request: new Request('https://admin.example/api/records', { method: 'POST', headers: { 'cf-access-jwt-assertion': auth.token, 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'plan', data: { title: '不可写入' } }) }), env, params: {}, waitUntil: () => undefined });
    assert.equal(response.status, 403);
  } finally { globalThis.fetch = originalFetch; }
});

test('导入接口拒绝没有 Content-Length 的超大请求体', async () => {
  const auth = await authFixture();
  const originalFetch = globalThis.fetch; globalThis.fetch = auth.fetcher;
  try {
    const env: AdminEnv = { ...auth.env, DB: new MemoryD1() };
    const oversized = JSON.stringify({ source: 'json-backup', records: [], padding: 'x'.repeat(1_500_000) });
    const request = new Request('https://admin.example/api/import', { method: 'POST', headers: { 'cf-access-jwt-assertion': auth.token, origin: 'https://admin.example', 'content-type': 'application/json' }, body: oversized });
    request.headers.delete('content-length');
    const response = await importRecords({ request, env, params: {}, waitUntil: () => undefined });
    assert.equal(response.status, 413);
  } finally { globalThis.fetch = originalFetch; }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { hashSyncAccessToken } from '../../functions/_lib/syncAccess.ts';
import { onRequestDelete, onRequestGet, onRequestPut } from '../../functions/api/sync.ts';
import type { D1Database, D1PreparedStatement, D1Result } from '../../functions/_types.ts';

class MemoryStatement implements D1PreparedStatement {
  #values: SQLInputValue[] = [];
  private readonly database: DatabaseSync;
  private readonly sql: string;
  constructor(database: DatabaseSync, sql: string) { this.database = database; this.sql = sql; }
  bind(...values: unknown[]): D1PreparedStatement { this.#values = values as SQLInputValue[]; return this; }
  async first<T>(): Promise<T | null> { return (this.database.prepare(this.sql).get(...this.#values) as T | undefined) || null; }
  async run<T>(): Promise<D1Result<T>> {
    const result = this.database.prepare(this.sql).run(...this.#values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class MemoryD1 implements D1Database {
  readonly database = new DatabaseSync(':memory:');
  prepare(query: string): D1PreparedStatement { return new MemoryStatement(this.database, query); }
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> { return Promise.all(statements.map((statement) => statement.run())); }
}

async function accessFixture() {
  const token = 'yuncun_test_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return {
    env: { YUNCUN_DB: new MemoryD1(), SYNC_ACCESS_TOKEN_HASH: await hashSyncAccessToken(token) },
    headers: { authorization: `Bearer ${token}` },
  };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Buffer.from(digest).toString('hex');
}

test('同步 API 完成创建、读取、条件冲突、更新和删除闭环', async () => {
  const fixture = await accessFixture();
  const context = (request: Request) => ({ request, env: fixture.env, waitUntil: () => undefined });
  const missing = await onRequestGet(context(new Request('https://site.example/api/sync', { headers: fixture.headers })));
  assert.equal(missing.status, 404);

  const firstPayload = JSON.stringify({ version: 1, ciphertext: 'encrypted-one' });
  const first = await onRequestPut(context(new Request('https://site.example/api/sync', { method: 'PUT', headers: { ...fixture.headers, origin: 'https://site.example', 'content-type': 'application/json' }, body: JSON.stringify({ baseRevision: 0, payload: firstPayload, checksum: await sha256(firstPayload) }) })));
  assert.equal(first.status, 200);
  assert.equal((await first.json() as { revision: number }).revision, 1);

  const stale = await onRequestPut(context(new Request('https://site.example/api/sync', { method: 'PUT', headers: { ...fixture.headers, origin: 'https://site.example', 'content-type': 'application/json' }, body: JSON.stringify({ baseRevision: 0, payload: firstPayload, checksum: await sha256(firstPayload) }) })));
  assert.equal(stale.status, 409);

  const secondPayload = JSON.stringify({ version: 1, ciphertext: 'encrypted-two' });
  const second = await onRequestPut(context(new Request('https://site.example/api/sync', { method: 'PUT', headers: { ...fixture.headers, origin: 'https://site.example', 'content-type': 'application/json' }, body: JSON.stringify({ baseRevision: 1, payload: secondPayload, checksum: await sha256(secondPayload) }) })));
  assert.equal((await second.json() as { revision: number }).revision, 2);

  const loaded = await onRequestGet(context(new Request('https://site.example/api/sync', { headers: fixture.headers })));
  const loadedBody = await loaded.json() as { revision: number; payload: string };
  assert.equal(loadedBody.revision, 2); assert.equal(loadedBody.payload, secondPayload);

  const removed = await onRequestDelete(context(new Request('https://site.example/api/sync', { method: 'DELETE', headers: { ...fixture.headers, origin: 'https://site.example' } })));
  assert.equal(removed.status, 200);
  assert.equal((await onRequestGet(context(new Request('https://site.example/api/sync', { headers: fixture.headers })))).status, 404);
});

test('同步 API 拒绝未认证、跨来源和校验和错误的写入', async () => {
  const fixture = await accessFixture();
  const context = (request: Request) => ({ request, env: fixture.env, waitUntil: () => undefined });
  assert.equal((await onRequestGet(context(new Request('https://site.example/api/sync')))).status, 403);
  const crossOrigin = await onRequestPut(context(new Request('https://site.example/api/sync', { method: 'PUT', headers: { ...fixture.headers, origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' })));
  assert.equal(crossOrigin.status, 403);
  const badChecksum = await onRequestPut(context(new Request('https://site.example/api/sync', { method: 'PUT', headers: { ...fixture.headers, origin: 'https://site.example', 'content-type': 'application/json' }, body: JSON.stringify({ baseRevision: 0, payload: 'ciphertext', checksum: '0'.repeat(64) }) })));
  assert.equal(badChecksum.status, 422);
});

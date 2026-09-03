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
  async run<T>(): Promise<D1Result<T>> { const result = this.database.prepare(this.sql).run(...this.#values); return { success: true, meta: { changes: Number(result.changes) } }; }
}

class MemoryD1 implements D1Database {
  readonly database = new DatabaseSync(':memory:');
  prepare(query: string): D1PreparedStatement { return new MemoryStatement(this.database, query); }
  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> { return Promise.all(statements.map((statement) => statement.run())); }
}

async function accessFixture() {
  const token = 'yuncun_test_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const database = new MemoryD1();
  database.database.exec('CREATE TABLE sync_snapshots (owner TEXT PRIMARY KEY, revision INTEGER, updated_at TEXT, payload TEXT, checksum TEXT)');
  database.database.prepare('INSERT INTO sync_snapshots VALUES (?, ?, ?, ?, ?)').run('primary', 3, '2026-09-03T00:00:00.000Z', 'encrypted-legacy', 'a'.repeat(64));
  return { env: { YUNCUN_DB: database, SYNC_ACCESS_TOKEN_HASH: await hashSyncAccessToken(token) }, headers: { authorization: `Bearer ${token}` } };
}

test('旧同步 API 仅允许认证读取，所有写入均永久关闭', async () => {
  const fixture = await accessFixture();
  const context = (request: Request) => ({ request, env: fixture.env, waitUntil: () => undefined });
  assert.equal((await onRequestGet(context(new Request('https://site.example/api/sync')))).status, 403);
  const loaded = await onRequestGet(context(new Request('https://site.example/api/sync', { headers: fixture.headers })));
  assert.equal(loaded.status, 200);
  assert.match(loaded.headers.get('x-robots-tag') || '', /noindex/);
  assert.equal((await loaded.json() as { revision: number }).revision, 3);
  assert.equal((await onRequestPut(context(new Request('https://site.example/api/sync', { method: 'PUT' })))).status, 410);
  assert.equal((await onRequestDelete(context(new Request('https://site.example/api/sync', { method: 'DELETE' })))).status, 410);
});

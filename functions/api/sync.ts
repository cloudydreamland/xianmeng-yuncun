import type { D1Database, PagesHandler } from '../_types.ts';
import { verifySyncAccess } from '../_lib/syncAccess.ts';

interface Env {
  YUNCUN_DB?: D1Database;
  SYNC_ACCESS_TOKEN_HASH?: string;
}

interface SyncRow {
  revision: number;
  updated_at: string;
  payload: string;
  checksum: string;
}

const MAX_PAYLOAD_BYTES = 1_500_000;
const schemaSql = `CREATE TABLE IF NOT EXISTS sync_snapshots (
  owner TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  payload TEXT NOT NULL,
  checksum TEXT NOT NULL
)`;

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
    },
  });
}

async function checksum(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function authenticate(request: Request, env: Env) {
  try {
    return await verifySyncAccess(request, env);
  } catch {
    return null;
  }
}

export const onRequestGet: PagesHandler<Env> = async ({ request, env }) => {
  const identity = await authenticate(request, env);
  if (!identity) return json({ error: 'private_sync_auth_required' }, 403);
  if (!env.YUNCUN_DB) return json({ error: 'sync_database_not_configured' }, 503);
  await env.YUNCUN_DB.prepare(schemaSql).run();
  const row = await env.YUNCUN_DB.prepare('SELECT revision, updated_at, payload, checksum FROM sync_snapshots WHERE owner = ?')
    .bind(identity.owner).first<SyncRow>();
  if (!row) return json({ revision: 0, snapshot: null }, 404);
  return json({ revision: row.revision, updatedAt: row.updated_at, payload: row.payload, checksum: row.checksum });
};

export const onRequestPut: PagesHandler<Env> = async ({ request, env }) => {
  const identity = await authenticate(request, env);
  if (!identity) return json({ error: 'private_sync_auth_required' }, 403);
  if (!env.YUNCUN_DB) return json({ error: 'sync_database_not_configured' }, 503);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'cross_origin_write_rejected' }, 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'json_required' }, 415);
  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > MAX_PAYLOAD_BYTES) return json({ error: 'snapshot_too_large' }, 413);

  let body: { baseRevision?: unknown; payload?: unknown; checksum?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const baseRevision = Number(body.baseRevision);
  const payload = typeof body.payload === 'string' ? body.payload : '';
  const suppliedChecksum = typeof body.checksum === 'string' ? body.checksum.toLowerCase() : '';
  if (!Number.isSafeInteger(baseRevision) || baseRevision < 0 || !payload || new TextEncoder().encode(payload).byteLength > MAX_PAYLOAD_BYTES) return json({ error: 'invalid_snapshot' }, 422);
  const actualChecksum = await checksum(payload);
  if (!/^[a-f0-9]{64}$/.test(suppliedChecksum) || actualChecksum !== suppliedChecksum) return json({ error: 'checksum_mismatch' }, 422);

  await env.YUNCUN_DB.prepare(schemaSql).run();
  const now = new Date().toISOString();
  const result = baseRevision === 0
    ? await env.YUNCUN_DB.prepare('INSERT OR IGNORE INTO sync_snapshots (owner, revision, updated_at, payload, checksum) VALUES (?, 1, ?, ?, ?)')
      .bind(identity.owner, now, payload, actualChecksum).run()
    : await env.YUNCUN_DB.prepare('UPDATE sync_snapshots SET revision = revision + 1, updated_at = ?, payload = ?, checksum = ? WHERE owner = ? AND revision = ?')
      .bind(now, payload, actualChecksum, identity.owner, baseRevision).run();

  if ((result.meta.changes || 0) !== 1) {
    const current = await env.YUNCUN_DB.prepare('SELECT revision, updated_at FROM sync_snapshots WHERE owner = ?').bind(identity.owner).first<Pick<SyncRow, 'revision' | 'updated_at'>>();
    return json({ error: 'sync_conflict', revision: current?.revision || 0, updatedAt: current?.updated_at }, 409);
  }
  return json({ revision: baseRevision + 1, updatedAt: now, checksum: actualChecksum });
};

export const onRequestDelete: PagesHandler<Env> = async ({ request, env }) => {
  const identity = await authenticate(request, env);
  if (!identity) return json({ error: 'private_sync_auth_required' }, 403);
  if (!env.YUNCUN_DB) return json({ error: 'sync_database_not_configured' }, 503);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'cross_origin_write_rejected' }, 403);
  await env.YUNCUN_DB.prepare(schemaSql).run();
  await env.YUNCUN_DB.prepare('DELETE FROM sync_snapshots WHERE owner = ?').bind(identity.owner).run();
  return json({ deleted: true });
};

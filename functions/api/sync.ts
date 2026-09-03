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


function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
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
  let row: SyncRow | null;
  try {
    row = await env.YUNCUN_DB.prepare('SELECT revision, updated_at, payload, checksum FROM sync_snapshots WHERE owner = ?')
      .bind(identity.owner).first<SyncRow>();
  } catch {
    return json({ revision: 0, snapshot: null }, 404);
  }
  if (!row) return json({ revision: 0, snapshot: null }, 404);
  return json({ revision: row.revision, updatedAt: row.updated_at, payload: row.payload, checksum: row.checksum });
};

export const onRequestPut: PagesHandler<Env> = async () => json({ error: 'legacy_sync_read_only' }, 410);

export const onRequestDelete: PagesHandler<Env> = async () => json({ error: 'legacy_sync_read_only' }, 410);

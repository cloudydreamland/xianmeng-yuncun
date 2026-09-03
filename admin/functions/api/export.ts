import type { AdminEnv, PagesHandler } from '../_types.ts';
import { requireAdmin } from '../_lib/guard.ts';
import { parseRow, purgeExpiredTrash, requireDatabase, type PrivateRecordRow } from '../_lib/records.ts';
import { json } from '../_lib/response.ts';

export const onRequestGet: PagesHandler<AdminEnv> = async ({ request, env }) => {
  const identity = await requireAdmin(request, env);
  if (identity instanceof Response) return identity;
  let db;
  try { db = requireDatabase(env); } catch { return json({ error: 'private_database_not_configured' }, 503); }
  await purgeExpiredTrash(db);
  const result = await db.prepare('SELECT id, kind, data_json, version, created_at, updated_at, deleted_at FROM private_records WHERE owner = ? ORDER BY updated_at DESC')
    .bind(identity.owner).all<PrivateRecordRow>();
  const exportedAt = new Date().toISOString();
  const body = JSON.stringify({ version: 1, exportedAt, records: (result.results || []).map(parseRow) }, null, 2);
  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="yuncun-private-backup-${exportedAt.slice(0, 10)}.json"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
};

import type { AdminEnv, PagesHandler } from '../../_types.ts';
import { requireAdmin } from '../../_lib/guard.ts';
import { findRecord, requireDatabase, validateRecordInput } from '../../_lib/records.ts';
import { json, requireSameOriginWrite } from '../../_lib/response.ts';

export const onRequestPatch: PagesHandler<AdminEnv> = async ({ request, env, params }) => {
  const identity = await requireAdmin(request, env);
  if (identity instanceof Response) return identity;
  const rejected = requireSameOriginWrite(request);
  if (rejected) return rejected;
  let body: { version?: unknown; kind?: unknown; data?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const version = Number(body.version);
  if (!Number.isSafeInteger(version) || version < 1) return json({ error: 'invalid_record_version' }, 422);
  let input;
  try { input = validateRecordInput({ id: params.id, kind: body.kind, data: body.data }, false); } catch (error) { return json({ error: error instanceof Error ? error.message : 'invalid_record' }, 422); }
  let db;
  try { db = requireDatabase(env); } catch { return json({ error: 'private_database_not_configured' }, 503); }
  const now = new Date().toISOString();
  const result = await db.prepare('UPDATE private_records SET kind = ?, data_json = ?, version = version + 1, updated_at = ? WHERE owner = ? AND id = ? AND version = ? AND deleted_at IS NULL')
    .bind(input.kind, JSON.stringify(input.data), now, identity.owner, params.id, version).run();
  if ((result.meta.changes || 0) !== 1) {
    const current = await findRecord(db, params.id);
    return current ? json({ error: 'record_conflict', record: current }, 409) : json({ error: 'record_not_found' }, 404);
  }
  return json({ record: { id: params.id, kind: input.kind, data: input.data, version: version + 1, createdAt: (await findRecord(db, params.id))?.createdAt || now, updatedAt: now, deletedAt: null } });
};

export const onRequestDelete: PagesHandler<AdminEnv> = async ({ request, env, params }) => {
  const identity = await requireAdmin(request, env);
  if (identity instanceof Response) return identity;
  const rejected = requireSameOriginWrite(request);
  if (rejected) return rejected;
  let body: { version?: unknown };
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const version = Number(body.version);
  if (!Number.isSafeInteger(version) || version < 1) return json({ error: 'invalid_record_version' }, 422);
  let db;
  try { db = requireDatabase(env); } catch { return json({ error: 'private_database_not_configured' }, 503); }
  const now = new Date().toISOString();
  const result = await db.prepare('UPDATE private_records SET deleted_at = ?, updated_at = ?, version = version + 1 WHERE owner = ? AND id = ? AND version = ? AND deleted_at IS NULL')
    .bind(now, now, identity.owner, params.id, version).run();
  if ((result.meta.changes || 0) !== 1) {
    const current = await findRecord(db, params.id);
    return current ? json({ error: 'record_conflict', record: current }, 409) : json({ error: 'record_not_found' }, 404);
  }
  return json({ deleted: true, version: version + 1, deletedAt: now });
};

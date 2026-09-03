import { PRIVATE_RECORD_KINDS } from '../../../../shared/privateRecords.ts';
import type { AdminEnv, PagesHandler } from '../../_types.ts';
import { requireAdmin } from '../../_lib/guard.ts';
import { parseRow, purgeExpiredTrash, requireDatabase, validateRecordInput, type PrivateRecordRow } from '../../_lib/records.ts';
import { json, requireSameOriginWrite } from '../../_lib/response.ts';

export const onRequestGet: PagesHandler<AdminEnv> = async ({ request, env }) => {
  const identity = await requireAdmin(request, env);
  if (identity instanceof Response) return identity;
  let db;
  try { db = requireDatabase(env); } catch { return json({ error: 'private_database_not_configured' }, 503); }
  await purgeExpiredTrash(db);
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind');
  if (kind && !PRIVATE_RECORD_KINDS.includes(kind as never)) return json({ error: 'invalid_record_kind' }, 422);
  const trash = url.searchParams.get('trash') === 'true';
  const statement = kind
    ? db.prepare(`SELECT id, kind, data_json, version, created_at, updated_at, deleted_at FROM private_records WHERE owner = ? AND kind = ? AND deleted_at IS ${trash ? 'NOT ' : ''}NULL ORDER BY updated_at DESC`).bind(identity.owner, kind)
    : db.prepare(`SELECT id, kind, data_json, version, created_at, updated_at, deleted_at FROM private_records WHERE owner = ? AND deleted_at IS ${trash ? 'NOT ' : ''}NULL ORDER BY updated_at DESC`).bind(identity.owner);
  const result = await statement.all<PrivateRecordRow>();
  return json({ records: (result.results || []).map(parseRow) });
};

export const onRequestPost: PagesHandler<AdminEnv> = async ({ request, env }) => {
  const identity = await requireAdmin(request, env);
  if (identity instanceof Response) return identity;
  const rejected = requireSameOriginWrite(request);
  if (rejected) return rejected;
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  let input;
  try { input = validateRecordInput(body); } catch (error) { return json({ error: error instanceof Error ? error.message : 'invalid_record' }, 422); }
  let db;
  try { db = requireDatabase(env); } catch { return json({ error: 'private_database_not_configured' }, 503); }
  const id = input.id || `${input.kind}:${crypto.randomUUID()}`;
  const existing = await db.prepare('SELECT id FROM private_records WHERE owner = ? AND id = ?').bind(identity.owner, id).first<{ id: string }>();
  if (existing) return json({ error: 'record_exists', id }, 409);
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO private_records (id, owner, kind, data_json, version, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, 1, ?, ?, NULL)')
    .bind(id, identity.owner, input.kind, JSON.stringify(input.data), now, now).run();
  return json({ record: { id, kind: input.kind, data: input.data, version: 1, createdAt: now, updatedAt: now, deletedAt: null } }, 201);
};

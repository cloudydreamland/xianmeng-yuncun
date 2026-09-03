import { stableJson, type PrivateRecordInput } from '../../../shared/privateRecords.ts';
import type { AdminEnv, PagesHandler } from '../_types.ts';
import { requireAdmin } from '../_lib/guard.ts';
import { requireDatabase, validateRecordInput } from '../_lib/records.ts';
import { json, requireSameOriginWrite } from '../_lib/response.ts';

const MAX_IMPORT_BYTES = 1_500_000;
const MAX_IMPORT_RECORDS = 400;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost: PagesHandler<AdminEnv> = async ({ request, env }) => {
  const identity = await requireAdmin(request, env);
  if (identity instanceof Response) return identity;
  const rejected = requireSameOriginWrite(request);
  if (rejected) return rejected;
  const declaredSize = Number(request.headers.get('content-length') || 0);
  if (declaredSize > MAX_IMPORT_BYTES) return json({ error: 'import_too_large' }, 413);
  let rawBody = '';
  try { rawBody = await request.text(); } catch { return json({ error: 'invalid_json' }, 400); }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_IMPORT_BYTES) return json({ error: 'import_too_large' }, 413);
  let body: { source?: unknown; records?: unknown };
  try { body = JSON.parse(rawBody) as { source?: unknown; records?: unknown }; } catch { return json({ error: 'invalid_json' }, 400); }
  if (!Array.isArray(body.records) || body.records.length > MAX_IMPORT_RECORDS) return json({ error: 'invalid_import_records' }, 422);
  const source = body.source === 'json-backup' ? 'json-backup' : 'legacy-browser';
  const records: PrivateRecordInput[] = [];
  try { body.records.forEach((record) => records.push(validateRecordInput(record))); } catch (error) { return json({ error: error instanceof Error ? error.message : 'invalid_record' }, 422); }
  const checksum = await sha256(stableJson(records));
  let db;
  try { db = requireDatabase(env); } catch { return json({ error: 'private_database_not_configured' }, 503); }
  const duplicate = await db.prepare('SELECT checksum, imported_count, imported_at FROM import_runs WHERE checksum = ?').bind(checksum).first<{ checksum: string; imported_count: number; imported_at: string }>();
  if (duplicate) return json({ duplicate: true, imported: 0, previousImported: duplicate.imported_count, importedAt: duplicate.imported_at, checksum });
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const normalized = records.map((record) => {
    let id = record.id || `${record.kind}:${crypto.randomUUID()}`;
    if (seen.has(id)) id = `${record.kind}:${crypto.randomUUID()}`;
    seen.add(id);
    return { ...record, id };
  });
  const statements = normalized.map((record) => db.prepare('INSERT OR IGNORE INTO private_records (id, owner, kind, data_json, version, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, 1, ?, ?, NULL)')
    .bind(record.id, identity.owner, record.kind, JSON.stringify(record.data), now, now));
  statements.push(db.prepare('INSERT INTO import_runs (checksum, source, imported_count, imported_at) VALUES (?, ?, ?, ?)').bind(checksum, source, normalized.length, now));
  const results = await db.batch(statements);
  const imported = results.slice(0, -1).reduce((sum, result) => sum + Number(result.meta.changes || 0), 0);
  return json({ duplicate: false, imported, skipped: normalized.length - imported, importedAt: now, checksum });
};

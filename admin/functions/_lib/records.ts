import { PRIVATE_RECORD_KINDS, type PrivateRecord, type PrivateRecordInput, type PrivateRecordKind } from '../../../shared/privateRecords.ts';
import type { AdminEnv, D1Database } from '../_types.ts';

export interface PrivateRecordRow {
  id: string;
  kind: PrivateRecordKind;
  data_json: string;
  version: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const idPattern = /^[a-zA-Z0-9:_-]{1,128}$/;
const kindSet = new Set<string>(PRIVATE_RECORD_KINDS);
const maxRecordBytes = 64_000;

export function requireDatabase(env: AdminEnv): D1Database {
  if (!env.DB) throw new Error('private_database_not_configured');
  return env.DB;
}

export function parseRow(row: PrivateRecordRow): PrivateRecord {
  return { id: row.id, kind: row.kind, data: JSON.parse(row.data_json), version: row.version, createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at };
}

export function validateRecordInput(value: unknown, allowMissingId = true): PrivateRecordInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_record');
  const input = value as Partial<PrivateRecordInput>;
  if (!kindSet.has(String(input.kind))) throw new Error('invalid_record_kind');
  if (input.id !== undefined && (!idPattern.test(input.id) || input.id.startsWith('__'))) throw new Error('invalid_record_id');
  if (!allowMissingId && !input.id) throw new Error('record_id_required');
  if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) throw new Error('invalid_record_data');
  const serialized = JSON.stringify(input.data);
  if (new TextEncoder().encode(serialized).byteLength > maxRecordBytes) throw new Error('record_too_large');
  return { id: input.id, kind: input.kind as PrivateRecordKind, data: input.data };
}

export async function purgeExpiredTrash(db: D1Database): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  await db.prepare('DELETE FROM private_records WHERE owner = ? AND deleted_at IS NOT NULL AND deleted_at < ?').bind('primary', cutoff).run();
}

export async function findRecord(db: D1Database, id: string): Promise<PrivateRecord | null> {
  const row = await db.prepare('SELECT id, kind, data_json, version, created_at, updated_at, deleted_at FROM private_records WHERE owner = ? AND id = ?')
    .bind('primary', id).first<PrivateRecordRow>();
  return row ? parseRow(row) : null;
}

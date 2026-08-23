import { LIFE_KEYS } from './lifeStore.ts';

export const SYNC_STORAGE_KEYS = [
  ...Object.values(LIFE_KEYS),
  'yuncun-capture-draft-v1',
  'yuncun-life-focus-state-v1',
] as const;

export const SYNC_META_KEY = 'yuncun-sync-meta-v1';
export const SYNC_BASE_KEY = 'yuncun-sync-base-v1';

export interface SyncSnapshot {
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
}

export interface SyncMeta {
  enabled: boolean;
  auto: boolean;
  revision: number;
  salt?: string;
  lastSyncAt?: string;
  lastChecksum?: string;
}

function parseValue(raw: string | null): unknown {
  if (raw === null) return undefined;
  try { return JSON.parse(raw); } catch { return undefined; }
}

export function collectSyncSnapshot(storage: Pick<Storage, 'getItem'>): SyncSnapshot {
  const data: Record<string, unknown> = {};
  SYNC_STORAGE_KEYS.forEach((key) => {
    const value = parseValue(storage.getItem(key));
    if (value !== undefined) data[key] = value;
  });
  return { version: 1, exportedAt: new Date().toISOString(), data };
}

export function applySyncSnapshot(storage: Pick<Storage, 'setItem' | 'removeItem'>, snapshot: SyncSnapshot): void {
  if (snapshot.version !== 1 || !snapshot.data || typeof snapshot.data !== 'object') throw new Error('invalid_sync_snapshot');
  SYNC_STORAGE_KEYS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(snapshot.data, key)) storage.setItem(key, JSON.stringify(snapshot.data[key]));
    else storage.removeItem(key);
  });
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function same(left: unknown, right: unknown): boolean {
  return stable(left) === stable(right);
}

function timestamp(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const item = value as Record<string, unknown>;
  for (const key of ['updatedAt', 'completedAt', 'savedAt', 'createdAt', 'date']) {
    const candidate = item[key];
    const parsed = typeof candidate === 'number' ? candidate : typeof candidate === 'string' ? Date.parse(candidate) : 0;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function mergeRecord(base: unknown, local: unknown, remote: unknown): unknown {
  if (same(local, remote)) return local;
  if (same(local, base)) return remote;
  if (same(remote, base)) return local;

  if (Array.isArray(local) && Array.isArray(remote)) {
    const objectsWithIds = [...local, ...remote].every((item) => item && typeof item === 'object' && typeof (item as Record<string, unknown>).id === 'string');
    if (!objectsWithIds) return [...new Map([...local, ...remote].map((item) => [stable(item), item])).values()];
    const baseById = new Map((Array.isArray(base) ? base : []).map((item) => [String((item as Record<string, unknown>)?.id || ''), item]));
    const localById = new Map(local.map((item) => [String((item as Record<string, unknown>).id), item]));
    const remoteById = new Map(remote.map((item) => [String((item as Record<string, unknown>).id), item]));
    return [...new Set([...baseById.keys(), ...localById.keys(), ...remoteById.keys()])].map((id) => {
      const localItem = localById.get(id); const remoteItem = remoteById.get(id); const baseItem = baseById.get(id);
      if (localItem === undefined) return baseItem !== undefined && same(remoteItem, baseItem) ? undefined : remoteItem;
      if (remoteItem === undefined) return baseItem !== undefined && same(localItem, baseItem) ? undefined : localItem;
      if (same(localItem, baseItem)) return remoteItem;
      if (same(remoteItem, baseItem)) return localItem;
      const localTime = timestamp(localItem); const remoteTime = timestamp(remoteItem);
      return remoteTime > localTime ? remoteItem : localItem;
    }).filter((item) => item !== undefined);
  }

  if (local && remote && typeof local === 'object' && typeof remote === 'object') {
    const baseObject = base && typeof base === 'object' ? base as Record<string, unknown> : {};
    const localObject = local as Record<string, unknown>;
    const remoteObject = remote as Record<string, unknown>;
    return Object.fromEntries([...new Set([...Object.keys(localObject), ...Object.keys(remoteObject)])].map((key) => [key, mergeRecord(baseObject[key], localObject[key], remoteObject[key])]));
  }

  return timestamp(remote) > timestamp(local) ? remote : local;
}

export function mergeSyncSnapshots(base: SyncSnapshot | null, local: SyncSnapshot, remote: SyncSnapshot): SyncSnapshot {
  const baseData = base?.data || {};
  const keys = new Set([...Object.keys(local.data), ...Object.keys(remote.data)]);
  const data = Object.fromEntries([...keys].map((key) => [key, mergeRecord(baseData[key], local.data[key], remote.data[key])]));
  return { version: 1, exportedAt: new Date().toISOString(), data };
}

export function readSyncMeta(storage: Pick<Storage, 'getItem'>): SyncMeta {
  const value = parseValue(storage.getItem(SYNC_META_KEY));
  if (!value || typeof value !== 'object') return { enabled: false, auto: true, revision: 0 };
  const meta = value as Partial<SyncMeta>;
  return { enabled: Boolean(meta.enabled), auto: meta.auto !== false, revision: Number.isSafeInteger(meta.revision) ? Number(meta.revision) : 0, salt: meta.salt, lastSyncAt: meta.lastSyncAt, lastChecksum: meta.lastChecksum };
}

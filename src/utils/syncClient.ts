import { LIFE_UPDATED_EVENT } from './lifeStore.ts';
import { createSyncSalt, decryptSyncSnapshot, deriveSyncKey, encryptSyncSnapshot, forgetSyncKey, readEnvelopeSalt, recallSyncKey, rememberSyncKey, sha256 } from './syncCrypto.ts';
import { SYNC_BASE_KEY, SYNC_META_KEY, applySyncSnapshot, collectSyncSnapshot, mergeSyncSnapshots, readSyncMeta, type SyncMeta, type SyncSnapshot } from './syncData.ts';

export type SyncResultCode = 'synced' | 'locked' | 'auth_required' | 'not_configured' | 'offline' | 'conflict' | 'invalid_passphrase' | 'error';
export interface SyncResult { code: SyncResultCode; revision?: number; updatedAt?: string; }
export interface SyncOptions { passphrase?: string; rememberDevice?: boolean; createIfMissing?: boolean; }

let activeSync: Promise<SyncResult> | null = null;

function readBase(): SyncSnapshot | null {
  try { return JSON.parse(localStorage.getItem(SYNC_BASE_KEY) || 'null') as SyncSnapshot | null; } catch { return null; }
}

async function fetchRemote(): Promise<{ code: 'ok' | 'empty'; revision: number; updatedAt?: string; payload?: string; checksum?: string } | SyncResult> {
  try {
    const response = await fetch('/api/sync', { headers: { accept: 'application/json' }, cache: 'no-store' });
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (response.status === 404) return { code: 'empty', revision: 0 };
    if (response.status === 403) return { code: 'auth_required' };
    if (response.status === 503) return { code: 'not_configured' };
    if (!response.ok || typeof body.payload !== 'string') return { code: 'error' };
    return { code: 'ok', revision: Number(body.revision), updatedAt: String(body.updatedAt || ''), payload: body.payload, checksum: String(body.checksum || '') };
  } catch { return { code: navigator.onLine ? 'error' : 'offline' }; }
}

async function runSync(options: SyncOptions): Promise<SyncResult> {
  const remote = await fetchRemote();
  if ('code' in remote && !['ok', 'empty'].includes(remote.code)) return remote as SyncResult;
  const remoteState = remote as { code: 'ok' | 'empty'; revision: number; updatedAt?: string; payload?: string; checksum?: string };
  const meta = readSyncMeta(localStorage);
  let salt = remoteState.payload ? readEnvelopeSalt(remoteState.payload) : meta.salt || createSyncSalt();
  let key = options.passphrase ? await deriveSyncKey(options.passphrase, salt) : await recallSyncKey(salt);
  if (!key) return { code: 'locked', revision: remoteState.revision };
  if (options.rememberDevice !== false) await rememberSyncKey(salt, key).catch(() => undefined);

  const local = collectSyncSnapshot(localStorage);
  let merged = local;
  if (remoteState.payload) {
    if (remoteState.checksum && await sha256(remoteState.payload) !== remoteState.checksum) return { code: 'error' };
    let remoteSnapshot: SyncSnapshot;
    try { remoteSnapshot = await decryptSyncSnapshot<SyncSnapshot>(remoteState.payload, key); } catch { return { code: 'invalid_passphrase' }; }
    merged = mergeSyncSnapshots(readBase(), local, remoteSnapshot);
  } else if (options.createIfMissing === false) return { code: 'locked', revision: 0 };

  applySyncSnapshot(localStorage, merged);
  const encrypted = await encryptSyncSnapshot(merged, key, salt);
  const encryptedChecksum = await sha256(encrypted);
  const response = await fetch('/api/sync', { method: 'PUT', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ baseRevision: remoteState.revision, payload: encrypted, checksum: encryptedChecksum }) });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (response.status === 409) return { code: 'conflict', revision: Number(body.revision) };
  if (response.status === 403) return { code: 'auth_required' };
  if (response.status === 503) return { code: 'not_configured' };
  if (!response.ok) return { code: 'error' };

  const nextMeta: SyncMeta = { enabled: true, auto: meta.auto, revision: Number(body.revision), salt, lastSyncAt: String(body.updatedAt || new Date().toISOString()), lastChecksum: encryptedChecksum };
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(nextMeta));
  localStorage.setItem(SYNC_BASE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new CustomEvent('yuncun-sync-complete', { detail: nextMeta }));
  window.dispatchEvent(new CustomEvent(LIFE_UPDATED_EVENT, { detail: 'sync' }));
  window.dispatchEvent(new CustomEvent('yuncun-local-plans-updated'));
  window.dispatchEvent(new CustomEvent('yuncun-reading-list-updated'));
  return { code: 'synced', revision: nextMeta.revision, updatedAt: nextMeta.lastSyncAt };
}

export function synchronizeLifeData(options: SyncOptions = {}): Promise<SyncResult> {
  if (activeSync) return activeSync;
  activeSync = runSync(options).catch(() => ({ code: 'error' as const })).finally(() => { activeSync = null; });
  return activeSync;
}

export function setSyncEnabled(enabled: boolean, auto = true): SyncMeta {
  const current = readSyncMeta(localStorage);
  const next: SyncMeta = { ...current, enabled, auto };
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('yuncun-sync-settings', { detail: next }));
  return next;
}

export async function deleteRemoteSync(): Promise<SyncResult> {
  try {
    const response = await fetch('/api/sync', { method: 'DELETE', headers: { accept: 'application/json' } });
    if (response.status === 403) return { code: 'auth_required' };
    if (response.status === 503) return { code: 'not_configured' };
    if (!response.ok && response.status !== 404) return { code: 'error' };
    const meta = readSyncMeta(localStorage);
    if (meta.salt) await forgetSyncKey(meta.salt).catch(() => undefined);
    localStorage.removeItem(SYNC_META_KEY);
    localStorage.removeItem(SYNC_BASE_KEY);
    window.dispatchEvent(new CustomEvent('yuncun-sync-complete'));
    return { code: 'synced', revision: 0 };
  } catch { return { code: navigator.onLine ? 'error' : 'offline' }; }
}

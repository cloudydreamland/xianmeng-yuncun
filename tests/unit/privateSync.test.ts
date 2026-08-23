import test from 'node:test';
import assert from 'node:assert/strict';
import { hashSyncAccessToken, verifySyncAccess } from '../../functions/_lib/syncAccess.ts';
import { decryptSyncSnapshot, deriveSyncKey, encryptSyncSnapshot, readEnvelopeSalt } from '../../src/utils/syncCrypto.ts';
import { applySyncSnapshot, mergeSyncSnapshots, type SyncSnapshot } from '../../src/utils/syncData.ts';

test('同步访问密钥只与服务端 SHA-256 哈希比对', async () => {
  const token = 'yuncun_test_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const hash = await hashSyncAccessToken(token);
  const request = new Request('https://site.example/api/sync', { headers: { authorization: `Bearer ${token}` } });
  assert.deepEqual(await verifySyncAccess(request, { SYNC_ACCESS_TOKEN_HASH: hash }), { owner: 'primary' });
  await assert.rejects(() => verifySyncAccess(new Request('https://site.example/api/sync'), { SYNC_ACCESS_TOKEN_HASH: hash }));
  await assert.rejects(() => verifySyncAccess(new Request('https://site.example/api/sync', { headers: { authorization: 'Bearer wrong-token-that-is-still-long-enough-123456789' } }), { SYNC_ACCESS_TOKEN_HASH: hash }));
  await assert.rejects(() => verifySyncAccess(request, {}));
});

test('同步快照使用口令派生钥匙并通过 AES-GCM 往返', async () => {
  const salt = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString('base64');
  const key = await deriveSyncKey('a-long-private-passphrase', salt);
  const snapshot = { version: 1, exportedAt: '2026-08-22T00:00:00.000Z', data: { sample: [{ id: '1', title: '散步' }] } } as const;
  const payload = await encryptSyncSnapshot(snapshot, key, salt);
  assert.equal(readEnvelopeSalt(payload), salt);
  assert.deepEqual(await decryptSyncSnapshot(payload, key), snapshot);
  const wrongKey = await deriveSyncKey('another-private-passphrase', salt);
  await assert.rejects(() => decryptSyncSnapshot(payload, wrongKey));
});

test('三方合并保留两台设备的新记录并采用真正发生变化的一侧', () => {
  const base: SyncSnapshot = { version: 1, exportedAt: '2026-08-20T00:00:00Z', data: { plans: [{ id: 'a', title: '旧标题', updatedAt: '2026-08-20' }], log: { '2026-08-20': ['a'] } } };
  const local: SyncSnapshot = { version: 1, exportedAt: '2026-08-21T00:00:00Z', data: { plans: [{ id: 'a', title: '旧标题', updatedAt: '2026-08-20' }, { id: 'b', title: '本机新增', updatedAt: '2026-08-21' }], log: { '2026-08-20': ['a', 'b'] } } };
  const remote: SyncSnapshot = { version: 1, exportedAt: '2026-08-22T00:00:00Z', data: { plans: [{ id: 'a', title: '云端更新', updatedAt: '2026-08-22' }], log: { '2026-08-20': ['a', 'c'] } } };
  const merged = mergeSyncSnapshots(base, local, remote);
  const plans = merged.data.plans as Array<{ id: string; title: string }>;
  assert.equal(plans.find((item) => item.id === 'a')?.title, '云端更新');
  assert.equal(plans.find((item) => item.id === 'b')?.title, '本机新增');
  assert.deepEqual((merged.data.log as Record<string, string[]>)['2026-08-20'].sort(), ['a', 'b', 'c']);

  const values = new Map<string, string>();
  applySyncSnapshot({ setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }, { version: 1, exportedAt: '', data: { 'yuncun-life-inbox-v1': [] } });
  assert.equal(values.get('yuncun-life-inbox-v1'), '[]');
});

test('三方合并会把一台设备的删除传播到未改动的另一台设备', () => {
  const old = { id: 'old', title: '准备删除', updatedAt: '2026-08-20' };
  const keep = { id: 'keep', title: '保留', updatedAt: '2026-08-20' };
  const base: SyncSnapshot = { version: 1, exportedAt: '', data: { plans: [old, keep] } };
  const local: SyncSnapshot = { version: 1, exportedAt: '', data: { plans: [keep] } };
  const remote: SyncSnapshot = { version: 1, exportedAt: '', data: { plans: [old, keep] } };
  assert.deepEqual(mergeSyncSnapshots(base, local, remote).data.plans, [keep]);
});

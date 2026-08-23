export interface EncryptedSyncEnvelope {
  version: 1;
  algorithm: 'AES-GCM';
  derivation: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

const ITERATIONS = 310_000;
const KEY_DATABASE = 'yuncun-private-sync-keys';
const KEY_STORE = 'keys';

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function createSyncSalt(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveSyncKey(passphrase: string, salt: string): Promise<CryptoKey> {
  if (passphrase.length < 12) throw new Error('passphrase_too_short');
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: base64ToBytes(salt), iterations: ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptSyncSnapshot(value: unknown, key: CryptoKey, salt: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  const envelope: EncryptedSyncEnvelope = { version: 1, algorithm: 'AES-GCM', derivation: 'PBKDF2-SHA-256', iterations: ITERATIONS, salt, iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(encrypted)) };
  return JSON.stringify(envelope);
}

export async function decryptSyncSnapshot<T>(payload: string, key: CryptoKey): Promise<T> {
  const envelope = JSON.parse(payload) as EncryptedSyncEnvelope;
  if (envelope.version !== 1 || envelope.algorithm !== 'AES-GCM' || envelope.derivation !== 'PBKDF2-SHA-256' || envelope.iterations !== ITERATIONS) throw new Error('unsupported_sync_envelope');
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(envelope.iv) }, key, base64ToBytes(envelope.ciphertext));
  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

export function readEnvelopeSalt(payload: string): string {
  const envelope = JSON.parse(payload) as Partial<EncryptedSyncEnvelope>;
  if (envelope.version !== 1 || typeof envelope.salt !== 'string') throw new Error('invalid_sync_envelope');
  return envelope.salt;
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(KEY_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function rememberSyncKey(salt: string, key: CryptoKey): Promise<void> {
  if (!('indexedDB' in window)) return;
  const database = await openKeyDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(KEY_STORE, 'readwrite');
    transaction.objectStore(KEY_STORE).put(key, salt);
    transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

export async function recallSyncKey(salt: string): Promise<CryptoKey | null> {
  if (!('indexedDB' in window)) return null;
  const database = await openKeyDatabase();
  const result = await new Promise<CryptoKey | null>((resolve, reject) => {
    const request = database.transaction(KEY_STORE, 'readonly').objectStore(KEY_STORE).get(salt);
    request.onsuccess = () => resolve(request.result instanceof CryptoKey ? request.result : null); request.onerror = () => reject(request.error);
  });
  database.close(); return result;
}

export async function forgetSyncKey(salt?: string): Promise<void> {
  if (!('indexedDB' in window)) return;
  const database = await openKeyDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(KEY_STORE, 'readwrite');
    if (salt) transaction.objectStore(KEY_STORE).delete(salt); else transaction.objectStore(KEY_STORE).clear();
    transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

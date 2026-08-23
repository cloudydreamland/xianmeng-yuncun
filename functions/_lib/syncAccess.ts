export interface SyncAccessEnv {
  SYNC_ACCESS_TOKEN_HASH?: string;
}

export interface SyncIdentity {
  owner: string;
}

const HEX_SHA256 = /^[a-f0-9]{64}$/;

export async function hashSyncAccessToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function verifySyncAccess(request: Request, env: SyncAccessEnv): Promise<SyncIdentity> {
  const expectedHash = env.SYNC_ACCESS_TOKEN_HASH?.trim().toLowerCase() || '';
  if (!HEX_SHA256.test(expectedHash)) throw new Error('Sync access token is not configured');

  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer ([^\s]+)$/i);
  const token = match?.[1] || '';
  if (token.length < 32 || token.length > 256) throw new Error('Invalid sync access token');

  const actualHash = await hashSyncAccessToken(token);
  if (!constantTimeEqual(actualHash, expectedHash)) throw new Error('Invalid sync access token');
  return { owner: 'primary' };
}

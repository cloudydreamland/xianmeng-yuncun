import type { AdminEnv } from '../_types.ts';

interface AccessJwtHeader { alg?: string; kid?: string }
interface AccessJwtPayload {
  aud?: string | string[];
  email?: string;
  exp?: number;
  nbf?: number;
  iss?: string;
  sub?: string;
}
interface JsonWebKeyWithKid extends JsonWebKey { kid?: string }

export interface AdminIdentity { owner: 'primary'; email: string; subject: string }

const encoder = new TextEncoder();
const keyCache = new Map<string, { expiresAt: number; keys: JsonWebKeyWithKid[] }>();

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

function configured(env: AdminEnv): { email: string; audience: string; issuer: string } {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase() || '';
  const audience = env.CF_ACCESS_AUD?.trim() || '';
  const issuer = env.CF_ACCESS_ISSUER?.trim().replace(/\/$/, '') || '';
  if (!email || !audience || !/^https:\/\/[^/]+\.cloudflareaccess\.com$/.test(issuer)) throw new Error('admin_auth_not_configured');
  return { email, audience, issuer };
}

async function loadKeys(issuer: string, fetcher: typeof fetch, forceRefresh = false): Promise<JsonWebKeyWithKid[]> {
  const cached = keyCache.get(issuer);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.keys;
  const response = await fetcher(`${issuer}/cdn-cgi/access/certs`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('access_keys_unavailable');
  const body = await response.json() as { keys?: JsonWebKeyWithKid[] };
  if (!Array.isArray(body.keys) || body.keys.length === 0) throw new Error('access_keys_invalid');
  keyCache.set(issuer, { expiresAt: Date.now() + 5 * 60_000, keys: body.keys });
  return body.keys;
}

export async function verifyAdminAccess(request: Request, env: AdminEnv, fetcher: typeof fetch = fetch): Promise<AdminIdentity> {
  const config = configured(env);
  const token = request.headers.get('cf-access-jwt-assertion')?.trim() || '';
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('admin_auth_required');
  const header = decodeJson<AccessJwtHeader>(parts[0]);
  const payload = decodeJson<AccessJwtPayload>(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('admin_token_algorithm_invalid');
  let keys = await loadKeys(config.issuer, fetcher);
  let jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) {
    keys = await loadKeys(config.issuer, fetcher, true);
    jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  }
  if (!jwk) throw new Error('admin_token_key_invalid');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const validSignature = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decodeBase64Url(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`));
  if (!validSignature) throw new Error('admin_token_signature_invalid');

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (payload.iss?.replace(/\/$/, '') !== config.issuer || !audiences.includes(config.audience)) throw new Error('admin_token_claims_invalid');
  if (!payload.exp || payload.exp <= now || (payload.nbf && payload.nbf > now + 30)) throw new Error('admin_token_expired');
  if (payload.email?.trim().toLowerCase() !== config.email) throw new Error('admin_email_forbidden');
  return { owner: 'primary', email: config.email, subject: payload.sub || '' };
}

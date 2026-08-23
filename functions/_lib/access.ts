interface AccessEnv {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  SYNC_ALLOWED_EMAIL?: string;
}

interface AccessHeader {
  alg?: string;
  kid?: string;
}

interface AccessPayload {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  email?: string;
  exp?: number;
  nbf?: number;
}

interface Jwk extends JsonWebKey { kid?: string; alg?: string; use?: string }
interface JwksResponse { keys?: Jwk[] }

export interface AccessIdentity {
  owner: string;
  email: string;
}

let cachedKeys: { domain: string; expiresAt: number; keys: Jwk[] } | undefined;

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

function normalizeDomain(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

async function fetchKeys(domain: string, fetcher: typeof fetch): Promise<Jwk[]> {
  if (cachedKeys?.domain === domain && cachedKeys.expiresAt > Date.now()) return cachedKeys.keys;
  const response = await fetcher(`${domain}/cdn-cgi/access/certs`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Access signing keys are unavailable');
  const body = await response.json() as JwksResponse;
  if (!Array.isArray(body.keys) || body.keys.length === 0) throw new Error('Access signing keys are empty');
  cachedKeys = { domain, keys: body.keys, expiresAt: Date.now() + 5 * 60_000 };
  return body.keys;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyAccessRequest(request: Request, env: AccessEnv, fetcher: typeof fetch = fetch): Promise<AccessIdentity> {
  const token = request.headers.get('cf-access-jwt-assertion');
  const domain = env.CF_ACCESS_TEAM_DOMAIN ? normalizeDomain(env.CF_ACCESS_TEAM_DOMAIN) : '';
  const audience = env.CF_ACCESS_AUD?.trim() || '';
  const allowedEmails = (env.SYNC_ALLOWED_EMAIL || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!token || !domain || !audience || allowedEmails.length === 0) throw new Error('Access is not configured');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed Access token');
  const header = decodeJson<AccessHeader>(parts[0]);
  const payload = decodeJson<AccessPayload>(parts[1]);
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported Access token');

  const keys = await fetchKeys(domain, fetcher);
  const jwk = keys.find((key) => key.kid === header.kid && (!key.alg || key.alg === 'RS256'));
  if (!jwk) throw new Error('Unknown Access signing key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const validSignature = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!validSignature) throw new Error('Invalid Access signature');

  const now = Math.floor(Date.now() / 1000);
  const issuer = normalizeDomain(payload.iss || '');
  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  const email = payload.email?.trim().toLowerCase() || '';
  if (issuer !== domain || !audiences.includes(audience)) throw new Error('Access claims do not match');
  if (!payload.exp || payload.exp < now - 60 || (payload.nbf && payload.nbf > now + 60)) throw new Error('Access token is expired');
  if (!allowedEmails.includes(email)) throw new Error('Email is not allowed');

  return { owner: await sha256Hex(email), email };
}

export function clearAccessKeyCacheForTests(): void {
  cachedKeys = undefined;
}

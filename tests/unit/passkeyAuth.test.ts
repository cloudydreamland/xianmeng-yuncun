import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, createHash } from 'node:crypto';
import { MemoryD1 } from './adminPrivateApi.test.ts';
import { onRequest as authEndpoint } from '../../admin/functions/api/auth/[action].ts';
import { onRequest as middleware } from '../../admin/functions/_middleware.ts';
import { digest, randomToken, nowSeconds, getSession, consumeChallenge, issueChallenge, SESSION_COOKIE } from '../../admin/functions/_lib/auth.ts';
import { onRequestGet as listRecords } from '../../admin/functions/api/records/index.ts';
import type { AdminEnv } from '../../admin/functions/_types.ts';

const origin = 'https://admin.example';
const b64 = (value: Uint8Array | string) => Buffer.from(value).toString('base64url');
const hash = (value: string) => createHash('sha256').update(value).digest();
function bytes(value: Buffer) { return Buffer.concat([value.length < 256 ? Buffer.from([0x58, value.length]) : Buffer.from([0x59, value.length >> 8, value.length & 255]), value]); }
function device() {
  const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = keys.publicKey.export({ format: 'jwk' });
  const id = Buffer.from(randomToken(), 'base64url');
  const cose = Buffer.concat([Buffer.from([0xa5, 1, 2, 3, 0x26, 0x20, 1, 0x21, 0x58, 32]), Buffer.from(jwk.x!, 'base64url'), Buffer.from([0x22, 0x58, 32]), Buffer.from(jwk.y!, 'base64url')]);
  return {
    id: b64(id),
    registration(challenge: string, extra: Record<string, unknown> = {}, flags = 0x45) {
      const data = Buffer.concat([hash('admin.example'), Buffer.from([flags, 0, 0, 0, 0]), Buffer.alloc(16), Buffer.from([0, id.length]), id, cose]);
      const attestation = Buffer.concat([Buffer.from('a363666d74646e6f6e656761747453746d74a0686175746844617461', 'hex'), bytes(data)]);
      return { id: b64(id), rawId: b64(id), type: 'public-key', clientExtensionResults: {}, response: { clientDataJSON: b64(JSON.stringify({ type: 'webauthn.create', challenge, origin, crossOrigin: false, ...extra })), attestationObject: b64(attestation), transports: ['internal'] } };
    },
    assertion(challenge: string, userHandle: string, counter = 1, extra: Record<string, unknown> = {}, flags = 5) {
      const counterBytes = Buffer.alloc(4); counterBytes.writeUInt32BE(counter);
      const data = Buffer.concat([hash('admin.example'), Buffer.from([flags]), counterBytes]);
      const client = JSON.stringify({ type: 'webauthn.get', challenge, origin, crossOrigin: false, ...extra });
      const signature = sign('sha256', Buffer.concat([data, hash(client)]), keys.privateKey);
      return { id: b64(id), rawId: b64(id), type: 'public-key', clientExtensionResults: {}, response: { clientDataJSON: b64(client), authenticatorData: b64(data), signature: b64(signature), userHandle } };
    },
  };
}
async function fixture() {
  const token = randomToken(); const DB = new MemoryD1();
  const env: AdminEnv = { DB, PUBLIC_ADMIN_ORIGIN: origin, ADMIN_SETUP_TOKEN_HASH: await digest(token) };
  const cookies = new Map<string, string>(); let ip = 'test';
  async function call(action: string, body?: unknown, headers: Record<string, string> = {}) {
    const request = new Request(`${origin}/api/auth/${action}`, { method: body === undefined ? 'GET' : 'POST', headers: { origin, 'content-type': 'application/json', cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), 'cf-connecting-ip': ip, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const response = await authEndpoint({ request, env, params: { action }, waitUntil: () => {} });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) { const [name, value] = setCookie.split(';')[0].split('='); if (value) cookies.set(name, value); else cookies.delete(name); }
    return response;
  }
  async function enroll(key = device()) {
    const options = await call('register-options', { setupToken: token });
    assert.equal(options.status, 200);
    const { options: opts } = await options.json() as any;
    assert.equal(opts.authenticatorSelection.userVerification, 'required');
    const verified = await call('register-verify', { response: key.registration(opts.challenge), name: 'Test key' });
    assert.equal(verified.status, 200);
    const body = await verified.json() as any;
    return { key, handle: opts.user.id, codes: body.recoveryCodes as string[] };
  }
  const request = (path = '/api/records') => new Request(`${origin}${path}`, { headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') } });
  return { token, env, DB, call, cookies, enroll, request, nextIP: () => { ip = randomToken(); } };
}

test('Passkey 真实签名完成唯一管理员绑定、登录及服务端退出', async () => {
  const f = await fixture();
  assert.equal((await f.call('register-options', { setupToken: randomToken() })).status, 401);
  const { key, handle, codes } = await f.enroll();
  assert.equal(codes.length, 8);
  assert.equal((await getSession(f.request(), f.env))?.scope, 'admin');
  assert.equal((await f.call('register-options', { setupToken: f.token }, { cookie: '' })).status, 401);
  const oldCookie = f.cookies.get(SESSION_COOKIE)!;
  const logout = await f.call('logout', {}); assert.equal(logout.status, 200);
  assert.equal(await getSession(new Request(origin, { headers: { cookie: `${SESSION_COOKIE}=${oldCookie}` } }), f.env), null);
  const opts = await (await f.call('login-options', {})).json() as any;
  const response = key.assertion(opts.options.challenge, handle);
  const login = await f.call('login-verify', { response });
  assert.equal(login.status, 200);
  assert.match(login.headers.get('set-cookie')!, /HttpOnly; Secure; SameSite=Strict/);
  assert.equal((await f.call('login-verify', { response })).status, 401, 'challenge cannot be replayed');
  const session = await getSession(f.request(), f.env); assert.equal(session?.credential_id, key.id);
  f.DB.database.prepare('UPDATE auth_sessions SET last_seen_at = ?').run(nowSeconds() - 3601);
  assert.equal(await getSession(f.request(), f.env), null);
});

test('错误站点、挑战、用户句柄、缺少设备确认及伪造签名全部拒绝', async () => {
  const f = await fixture(); const { key, handle } = await f.enroll(); await f.call('logout', {});
  for (const kind of ['origin', 'challenge', 'handle', 'uv', 'signature', 'crossOrigin']) {
    f.nextIP();
    const opts = await (await f.call('login-options', {})).json() as any;
    const extra = kind === 'origin' ? { origin: 'https://evil.example' } : kind === 'crossOrigin' ? { crossOrigin: true, topOrigin: 'https://evil.example' } : {};
    const assertion = key.assertion(kind === 'challenge' ? 'wrong' : opts.options.challenge, kind === 'handle' ? randomToken() : handle, 1, extra, kind === 'uv' ? 1 : 5);
    if (kind === 'signature') assertion.response.signature = b64(Buffer.alloc(70));
    assert.equal((await f.call('login-verify', { response: assertion })).status, 401, kind);
    assert.equal(await getSession(f.request(), f.env), null);
  }
});

test('恢复码单次使用、不能读取数据；完成恢复撤销旧设备与会话', async () => {
  const f = await fixture(); const { key, codes } = await f.enroll(); const oldSession = f.cookies.get(SESSION_COOKIE)!;
  await f.call('logout', {});
  assert.equal((await f.call('recover', { code: codes[0] })).status, 200);
  assert.equal((await f.call('recover', { code: codes[0] })).status, 401);
  assert.equal((await listRecords({ request: f.request(), env: f.env, params: {}, waitUntil: () => {} })).status, 401);
  const options = await (await f.call('register-options', {})).json() as any;
  const replacement = device();
  const result = await f.call('register-verify', { response: replacement.registration(options.options.challenge), name: 'Replacement' });
  assert.equal(result.status, 200);
  assert.equal(f.DB.database.prepare('SELECT id FROM auth_credentials WHERE id = ?').get(key.id), undefined);
  assert.equal((await f.call('recover', { code: codes[1] })).status, 401);
  assert.equal(await getSession(new Request(origin, { headers: { cookie: `${SESSION_COOKIE}=${oldSession}` } }), f.env), null);
  assert.equal((await getSession(f.request(), f.env))?.credential_id, replacement.id);
});

test('CSRF、超大请求、限速、挑战过期和预览域名均关闭访问', async () => {
  const f = await fixture();
  assert.equal((await f.call('register-options', {}, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.call('register-options', { padding: 'x'.repeat(33000) })).status, 413);
  for (let i = 0; i < 29; i++) await f.call('register-options', {});
  assert.equal((await f.call('register-options', {})).status, 429);
  const header = await issueChallenge(f.DB, { purpose: 'login', challenge: 'unit', user_handle: 'unit', session_hash: null });
  f.DB.database.exec('UPDATE auth_challenges SET expires_at = 1');
  assert.equal(await consumeChallenge(new Request(origin, { headers: { cookie: header.split(';')[0] } }), f.DB), null);
  let nextCalled = false;
  for (const path of ['/', '/index.html', '/api/export', '/api/records', '/anything/']) {
    const response = await middleware({ request: new Request(`${origin}${path}`), env: f.env, params: {}, waitUntil: () => {}, next: async () => { nextCalled = true; return new Response('PRIVATE'); } });
    assert.equal(response.status, path.startsWith('/api/') ? 401 : 303);
    assert.match(response.headers.get('cache-control')!, /no-store/);
  }
  assert.equal(nextCalled, false);
  const preview = await middleware({ request: new Request('https://preview.admin.example/login/'), env: f.env, params: {}, waitUntil: () => {}, next: async () => new Response('unexpected') });
  assert.equal(preview.status, 503);
});

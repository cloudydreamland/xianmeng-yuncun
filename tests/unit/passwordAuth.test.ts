import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryD1 } from './adminPrivateApi.test.ts';
import { onRequest as endpoint } from '../../admin/functions/api/auth/[action].ts';
import { digest, randomToken, nowSeconds, getSession, verifyAdminSession } from '../../admin/functions/_lib/auth.ts';
import { acceptablePassword, derivePassword } from '../../admin/functions/_lib/password.ts';
import type { AdminEnv } from '../../admin/functions/_types.ts';

const origin = 'https://admin.example';
const email = '123456789@qq.com';
// Disposable fixtures only; never used against a deployed site.
const password = 'Moon-River-Copper!92';
const replacement = 'Forest-Lantern-Silver!83';
async function fixture() {
  const DB = new MemoryD1(); const now = nowSeconds(); const token = randomToken();
  DB.database.prepare('INSERT INTO auth_admin VALUES (?, ?, ?)').run('primary', randomToken(), now);
  DB.database.prepare('INSERT INTO auth_credentials (id, public_key, name, created_at) VALUES (?, ?, ?, ?)').run('device', 'unused', 'Device', now);
  DB.database.prepare("INSERT INTO auth_sessions (token_hash, credential_id, scope, created_at, expires_at, last_seen_at) VALUES (?, 'device', 'admin', ?, ?, ?)").run(await digest(token), now, now + 3600, now);
  const env: AdminEnv = { DB, ADMIN_EMAIL: email, PUBLIC_ADMIN_ORIGIN: origin };
  let cookie = `__Host-yuncun-session=${token}`;
  const request = () => new Request(origin, { headers: { cookie } });
  const call = async (action: string, body?: unknown, extra: Record<string, string> = {}) => {
    const r = await endpoint({ env, params: { action }, waitUntil: () => {}, request: new Request(`${origin}/api/auth/${action}`, { method: body === undefined ? 'GET' : 'POST', headers: { origin, 'content-type': 'application/json', 'cf-connecting-ip': 'fixture-ip', cookie, ...extra }, body: body === undefined ? undefined : JSON.stringify(body) }) });
    const value = r.headers.get('set-cookie'); if (value) cookie = value.split(';')[0];
    return r;
  };
  const resetLimits = () => DB.database.exec('DELETE FROM auth_rate_limits');
  return { DB, env, request, call, resetLimits, anonymous: () => { cookie = ''; } };
}

test('密码只存带随机盐的慢散列，登录精确邮箱且会话跨请求有效', async () => {
  const f = await fixture(); const oldRequest = f.request();
  assert.equal((await f.call('password-set', { email, password })).status, 200);
  assert.equal(await getSession(oldRequest, f.env), null, 'setting password revokes old sessions');
  const stored = f.DB.database.prepare('SELECT * FROM auth_password').get()!;
  assert.equal(stored.algorithm, 'scrypt-n16384-r8-p5'); assert.notEqual(stored.hash, password);
  assert.equal(stored.hash, await derivePassword(password, stored.salt as string));
  assert.equal((await verifyAdminSession(f.request(), f.env)).subject, 'password:primary');
  const status = await (await f.call('status')).json() as any; assert.equal(status.passwordEnabled, true);
  assert.equal(JSON.stringify(status).includes(email), false);
  await f.call('logout', {});
  assert.equal((await f.call('password-login', { email: 'other@qq.com', password })).status, 401);
  assert.equal((await f.call('password-login', { email, password: 'incorrect' })).status, 401);
  const response = await f.call('password-login', { email: ` ${email.toUpperCase()} `, password });
  assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie')!, /HttpOnly; Secure; SameSite=Strict/);
  assert.equal((await verifyAdminSession(f.request(), f.env)).email, email);
});

test('匿名、陈旧会话、错误旧密码不能设置密码；改密使旧密码和其他会话失效', async () => {
  const anonymous = await fixture(); anonymous.anonymous();
  assert.equal((await anonymous.call('password-set', { email, password })).status, 401);
  const stale = await fixture(); stale.DB.database.prepare('UPDATE auth_sessions SET created_at = ?').run(nowSeconds() - 301);
  assert.equal((await stale.call('password-set', { email, password })).status, 401);
  const f = await fixture(); await f.call('password-set', { email, password });
  const old = f.request();
  assert.equal((await f.call('password-set', { email, password: replacement, currentPassword: 'wrong' })).status, 401);
  assert.equal((await f.call('password-set', { email, password: replacement, currentPassword: password })).status, 200);
  assert.equal(await getSession(old, f.env), null);
  assert.equal((await f.call('password-login', { email, password })).status, 401);
  assert.equal((await f.call('password-login', { email, password: replacement })).status, 200);
  f.DB.database.exec('UPDATE auth_password SET version = version + 1');
  assert.equal(await getSession(f.request(), f.env), null, 'stale password versions cannot authorize');
});

test('每 IP 限速且跨 IP 也有全局限制；未知邮箱不能绕过计数', async () => {
  const f = await fixture(); await f.call('password-set', { email, password }); f.anonymous(); f.resetLimits();
  for (let i = 0; i < 5; i++) assert.equal((await f.call('password-login', { email: 'wrong@qq.com', password: 'wrong' })).status, 401);
  assert.equal((await f.call('password-login', { email, password })).status, 429);
  f.resetLimits();
  for (let i = 0; i < 20; i++) assert.equal((await f.call('password-login', { email: 'wrong@qq.com', password: 'wrong' }, { 'cf-connecting-ip': `ip-${i}` })).status, 401);
  assert.equal((await f.call('password-login', { email, password }, { 'cf-connecting-ip': 'new-ip' })).status, 429);
});

test('恢复码只能重设身份，不能读数据；重设保留记录并撤销旧密钥及恢复码', async () => {
  const f = await fixture(); await f.call('password-set', { email, password });
  const code = randomToken(); f.DB.database.prepare('INSERT INTO auth_recovery_codes VALUES (?, ?)').run(await digest(code), nowSeconds());
  f.DB.database.prepare("INSERT INTO private_records (id, kind, data_json, version, created_at, updated_at) VALUES ('kept', 'plan', '{}', 1, '2026-09-04', '2026-09-04')").run();
  f.anonymous(); assert.equal((await f.call('recover', { code })).status, 200);
  await assert.rejects(() => verifyAdminSession(f.request(), f.env));
  const reset = await f.call('password-set', { email, password: replacement }); assert.equal(reset.status, 200);
  const result = await reset.json() as any; assert.equal(result.recoveryCodes.length, 8);
  assert.equal(f.DB.database.prepare('SELECT count(*) AS n FROM auth_credentials').get()!.n, 0);
  assert.equal(f.DB.database.prepare('SELECT count(*) AS n FROM private_records').get()!.n, 1);
  assert.equal((await f.call('recover', { code })).status, 401);
  assert.equal((await f.call('password-login', { email, password })).status, 401);
  assert.equal((await f.call('password-login', { email, password: replacement })).status, 200);
});

test('弱密码、超长输入、跨站请求和缺少指定邮箱全部拒绝', async () => {
  assert.equal(acceptablePassword('password123456789', email), false);
  assert.equal(acceptablePassword('aaaaaaaaaaaaaaaa', email), false);
  const f = await fixture();
  assert.equal((await f.call('password-set', { email, password: 'short' })).status, 400);
  assert.equal((await f.call('password-login', { email, password: 'x'.repeat(1000) })).status, 401);
  assert.equal((await f.call('password-login', { email, password }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await f.call('password-login', { email, password }, { 'content-type': 'text/plain' })).status, 415);
  delete f.env.ADMIN_EMAIL;
  assert.equal((await f.call('password-login', { email, password })).status, 503);
});

test('验证期间撤销会话会使整个密码写入事务回滚', async () => {
  const f = await fixture(); const originalBatch = f.DB.batch.bind(f.DB);
  let batches = 0;
  f.DB.batch = async (statements) => { if (++batches === 2) f.DB.database.exec('DELETE FROM auth_sessions'); return originalBatch(statements); };
  assert.equal((await f.call('password-set', { email, password })).status, 401);
  assert.equal(f.DB.database.prepare('SELECT count(*) AS n FROM auth_password').get()!.n, 0);
});

test('不识别的散列格式返回不可用，不尝试降低参数或签发会话', async () => {
  const f = await fixture(); await f.call('password-set', { email, password }); f.anonymous();
  f.DB.database.exec("UPDATE auth_password SET algorithm = 'unknown-or-weaker-profile'");
  const response = await f.call('password-login', { email, password });
  assert.equal(response.status, 503);
  assert.equal((await response.json() as any).error, 'password_crypto_unavailable');
  assert.equal(response.headers.get('set-cookie'), null);
});

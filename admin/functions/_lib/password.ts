import { pbkdf2, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import type { AdminEnv, D1Database } from '../_types.ts';
import { cleanupAuth, cookie, digest, getSession, isRecent, nowSeconds, randomToken, SESSION_COOKIE, SESSION_SECONDS, sessionWriteGuard } from './auth.ts';
import { json } from './response.ts';

export const PASSWORD_ITERATIONS = 600000;
interface PasswordRow { salt: string; hash: string; iterations: number; version: number }
export const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
export function passwordValue(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 256) return null;
  const password = value.normalize('NFC');
  return [...password].length <= 128 && Buffer.byteLength(password, 'utf8') <= 512 ? password : null;
}
export function acceptablePassword(password: string, email: string): boolean {
  const lower = password.toLowerCase();
  return [...password].length >= 15 && new Set(password).size >= 5 &&
    !['password', '123456', 'qwerty', '管理员', 'xianmeng', 'yuncun'].some((word) => lower.includes(word)) &&
    !lower.includes(email.split('@')[0]);
}
export function derivePassword(password: string, salt: string): Promise<string> {
  // Native asynchronous crypto, not WebCrypto's limited PBKDF2 implementation.
  // Keep this cost fixed server-side; clients cannot downgrade or inflate it.
  return new Promise((resolve, reject) => pbkdf2(password, Buffer.from(salt, 'base64url'), PASSWORD_ITERATIONS, 32, 'sha256', (error, key) => {
    if (error) reject(error); else resolve(key.toString('base64url'));
  }));
}
export async function passwordRateLimit(request: Request, db: D1Database): Promise<boolean> {
  const now = nowSeconds(); const window = Math.floor(now / 900);
  const ip = await digest(request.headers.get('cf-connecting-ip') || 'unknown');
  for (const [key, limit] of [[`password-ip:${ip}`, 5], ['password-global', 20]] as const) {
    const row = await db.prepare('INSERT INTO auth_rate_limits (bucket, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1 RETURNING attempts')
      .bind(`${key}:${window}`, now + 1800).first<{ attempts: number }>();
    if (!row || row.attempts > limit) return false;
  }
  return true;
}
const failed = () => json({ error: 'email_or_password_incorrect' }, 401);
async function verify(password: string, row: PasswordRow | null): Promise<boolean> {
  // Unknown email / missing password uses the same expensive computation and error.
  const salt = row?.salt || 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const derived = await derivePassword(password, salt);
  const expected = row?.hash || 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const match = timingSafeEqual(Buffer.from(derived), Buffer.from(expected));
  return !!row && row.iterations === PASSWORD_ITERATIONS && match;
}
export async function passwordAction(request: Request, env: AdminEnv, db: D1Database, action: string, body: Record<string, unknown>): Promise<Response> {
  if (!['password-login', 'password-set'].includes(action)) return json({ error: 'not_found' }, 404);
  const allowedEmail = normalizeEmail(env.ADMIN_EMAIL);
  if (!/^[0-9]{5,12}@qq\.com$/.test(allowedEmail)) return json({ error: 'admin_unavailable' }, 503);
  if (!await passwordRateLimit(request, db)) return json({ error: 'password_rate_limited' }, 429, { 'Retry-After': '900' });
  await cleanupAuth(db);
  const password = passwordValue(body.password);
  if (password === null) return failed();
  const email = normalizeEmail(body.email);
  const row = await db.prepare('SELECT salt, hash, iterations, version FROM auth_password WHERE id = ?').bind('primary').first<PasswordRow>();
  if (action === 'password-login') {
    const matches = await verify(password, row);
    if (!matches || email !== allowedEmail || !row) return failed();
    const token = randomToken(); const now = nowSeconds();
    // The version condition prevents a slow in-flight login from surviving a reset.
    const result = await db.prepare("INSERT INTO auth_sessions (token_hash, credential_id, scope, created_at, expires_at, last_seen_at, password_version) SELECT ?, NULL, 'admin', ?, ?, ?, version FROM auth_password WHERE id = 'primary' AND version = ? AND hash = ? AND salt = ?")
      .bind(await digest(token), now, now + SESSION_SECONDS, now, row.version, row.hash, row.salt).run();
    if (result.meta.changes !== 1) return failed();
    const previous = await getSession(request, env);
    if (previous) await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(previous.token_hash).run();
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(SESSION_COOKIE, token, SESSION_SECONDS) });
  }
  const session = await getSession(request, env);
  if (!isRecent(session)) return json({ error: 'recent_login_required' }, 401);
  if (email !== allowedEmail) return failed();
  if (!acceptablePassword(password, allowedEmail)) return json({ error: 'password_too_weak' }, 400);
  if (row && session.scope === 'admin' && !session.credential_id) {
    const current = passwordValue(body.currentPassword);
    if (current === null || !await verify(current, row)) return failed();
  }
  const salt = randomToken(); const hash = await derivePassword(password, salt);
  const version = (row?.version || 0) + 1; const now = nowSeconds(); const token = randomToken();
  const statements = [sessionWriteGuard(db, session),
    db.prepare("INSERT INTO auth_write_guard (id, allowed) VALUES (1, (SELECT COALESCE((SELECT version FROM auth_password WHERE id = 'primary'), 0) = ?)) ON CONFLICT(id) DO UPDATE SET allowed = excluded.allowed").bind(row?.version || 0),
    db.prepare("INSERT INTO auth_password (id, salt, hash, iterations, version, updated_at) VALUES ('primary', ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET salt = excluded.salt, hash = excluded.hash, iterations = excluded.iterations, version = excluded.version, updated_at = excluded.updated_at").bind(salt, hash, PASSWORD_ITERATIONS, version, now),
    db.prepare('DELETE FROM auth_sessions'), db.prepare('DELETE FROM auth_challenges')];
  const codes: string[] = [];
  if (session.scope === 'recovery') {
    statements.push(db.prepare('DELETE FROM auth_credentials'), db.prepare('DELETE FROM auth_recovery_codes'));
    for (let i = 0; i < 8; i++) { const code = randomToken(); codes.push(code); statements.push(db.prepare('INSERT INTO auth_recovery_codes (code_hash, created_at) VALUES (?, ?)').bind(await digest(code), now)); }
  }
  statements.push(db.prepare("INSERT INTO auth_sessions (token_hash, credential_id, scope, created_at, expires_at, last_seen_at, password_version) VALUES (?, NULL, 'admin', ?, ?, ?, ?)").bind(await digest(token), now, now + SESSION_SECONDS, now, version));
  await db.batch(statements);
  return json({ ok: true, recoveryCodes: codes }, 200, { 'Set-Cookie': cookie(SESSION_COOKIE, token, SESSION_SECONDS) });
}

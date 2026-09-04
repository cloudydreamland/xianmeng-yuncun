import type { AdminEnv, D1Database } from '../_types.ts';
import { requireDatabase } from './records.ts';

export const SESSION_COOKIE = '__Host-yuncun-session';
export const CHALLENGE_COOKIE = '__Host-yuncun-challenge';
export const SESSION_SECONDS = 12 * 3600;
export const IDLE_SECONDS = 3600;
export const RECENT_SECONDS = 300;
const encoder = new TextEncoder();
export interface AdminIdentity { owner: 'primary'; email: string; subject: string }
export interface Session { token_hash: string; credential_id: string | null; scope: 'admin' | 'recovery'; created_at: number; expires_at: number; last_seen_at: number }
export interface Challenge { purpose: 'login' | 'setup' | 'register' | 'recover'; challenge: string; user_handle: string; session_hash: string | null; expires_at: number }
export interface Credential { id: string; public_key: string; counter: number; transports: string; name: string; created_at: number; last_used_at: number | null }
export const nowSeconds = () => Math.floor(Date.now() / 1000);
export function encode(bytes: Uint8Array): string { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export function decode(value: string): Uint8Array<ArrayBuffer> { return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)); }
export const randomToken = () => encode(crypto.getRandomValues(new Uint8Array(32)));
export async function digest(value: string): Promise<string> { return encode(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))); }
export function config(request: Request, env: AdminEnv) {
  const origin = env.PUBLIC_ADMIN_ORIGIN?.replace(/\/$/, '');
  if (!origin || !/^https:\/\/[^/?#]+$/.test(origin)) throw new Error('admin_auth_not_configured');
  if (new URL(request.url).origin !== origin) throw new Error('admin_origin_forbidden');
  return { origin, rpID: new URL(origin).hostname };
}
export function cookie(name: string, token: string, age: number): string {
  return `${name}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
}
export function readCookie(request: Request, name: string): string {
  const values = (request.headers.get('cookie') || '').split(';').map((v) => v.trim()).filter((v) => v.startsWith(`${name}=`));
  const value = values.length === 1 ? values[0].slice(name.length + 1) : '';
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : '';
}
export async function getSession(request: Request, env: AdminEnv): Promise<Session | null> {
  config(request, env);
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const db = requireDatabase(env);
  const session = await db.prepare('SELECT * FROM auth_sessions WHERE token_hash = ?').bind(await digest(token)).first<Session>();
  const now = nowSeconds();
  if (!session || session.expires_at <= now || session.last_seen_at <= now - IDLE_SECONDS) return null;
  if (session.last_seen_at < now - 60) await db.prepare('UPDATE auth_sessions SET last_seen_at = ? WHERE token_hash = ?').bind(now, session.token_hash).run();
  return session;
}
export async function verifyAdminSession(request: Request, env: AdminEnv): Promise<AdminIdentity> {
  const session = await getSession(request, env);
  if (!session || session.scope !== 'admin' || !session.credential_id) throw new Error('admin_auth_required');
  return { owner: 'primary', email: env.ADMIN_EMAIL || '管理员', subject: session.credential_id };
}
export function isRecent(session: Session | null): session is Session { return !!session && session.created_at > nowSeconds() - RECENT_SECONDS; }
export async function newSession(db: D1Database, credentialId: string | null, scope: Session['scope'] = 'admin') {
  const token = randomToken(); const now = nowSeconds(); const age = scope === 'admin' ? SESSION_SECONDS : RECENT_SECONDS;
  await db.prepare('INSERT INTO auth_sessions (token_hash, credential_id, scope, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(await digest(token), credentialId, scope, now, now + age, now).run();
  return cookie(SESSION_COOKIE, token, age);
}
export async function issueChallenge(db: D1Database, value: Omit<Challenge, 'expires_at'>): Promise<string> {
  const token = randomToken();
  await db.prepare('INSERT INTO auth_challenges (token_hash, purpose, challenge, user_handle, session_hash, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(await digest(token), value.purpose, value.challenge, value.user_handle, value.session_hash, nowSeconds() + 300).run();
  return cookie(CHALLENGE_COOKIE, token, 300);
}
export async function consumeChallenge(request: Request, db: D1Database): Promise<Challenge | null> {
  const token = readCookie(request, CHALLENGE_COOKIE);
  if (!token) return null;
  // DELETE RETURNING makes a challenge single-use even across concurrent Workers.
  return db.prepare('DELETE FROM auth_challenges WHERE token_hash = ? AND expires_at > ? RETURNING *').bind(await digest(token), nowSeconds()).first<Challenge>();
}
export async function rateLimit(request: Request, db: D1Database): Promise<boolean> {
  const now = nowSeconds(); const window = Math.floor(now / 300);
  // Trust only Cloudflare's edge-provided IP header, never X-Forwarded-For.
  const ipHash = await digest(request.headers.get('cf-connecting-ip') || 'unknown');
  const check = async (key: string, limit: number) => {
    const row = await db.prepare('INSERT INTO auth_rate_limits (bucket, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(bucket) DO UPDATE SET attempts = attempts + 1 RETURNING attempts')
      .bind(`${key}:${window}`, now + 600).first<{ attempts: number }>();
    return !!row && row.attempts <= limit;
  };
  // Global cap prevents distributed guessing and unbounded challenge/session writes.
  if (!await check('global', 160)) return false;
  return check(ipHash, 30);
}
export async function cleanupAuth(db: D1Database): Promise<void> {
  const now = nowSeconds();
  await db.batch([
    db.prepare('DELETE FROM auth_challenges WHERE expires_at <= ?').bind(now),
    db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ? OR last_seen_at <= ?').bind(now, now - IDLE_SECONDS),
    db.prepare('DELETE FROM auth_rate_limits WHERE expires_at <= ?').bind(now),
  ]);
}
export function sessionWriteGuard(db: D1Database, session: Session) {
  const now = nowSeconds();
  return db.prepare('INSERT INTO auth_write_guard (id, allowed) VALUES (1, (SELECT EXISTS(SELECT 1 FROM auth_sessions WHERE token_hash = ? AND expires_at > ? AND created_at > ?))) ON CONFLICT(id) DO UPDATE SET allowed = excluded.allowed')
    .bind(session.token_hash, now, now - RECENT_SECONDS);
}
export async function recoveryCodes(db: D1Database): Promise<string[]> {
  // High-entropy random codes (not human passwords); SHA-256 is appropriate here.
  const codes = Array.from({ length: 8 }, randomToken);
  const hashes = await Promise.all(codes.map(digest));
  await db.batch([db.prepare('DELETE FROM auth_recovery_codes'), ...hashes.map((hash) => db.prepare('INSERT INTO auth_recovery_codes (code_hash, created_at) VALUES (?, ?)').bind(hash, nowSeconds()))]);
  return codes;
}

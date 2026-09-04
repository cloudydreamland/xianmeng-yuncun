import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse, type AuthenticationResponseJSON, type RegistrationResponseJSON, type AuthenticatorTransportFuture } from '@simplewebauthn/server';
import type { AdminEnv, PagesHandler } from '../../_types.ts';
import { CHALLENGE_COOKIE, SESSION_COOKIE, cleanupAuth, config, consumeChallenge, cookie, decode, digest, encode, getSession, isRecent, issueChallenge, newSession, nowSeconds, randomToken, rateLimit, readCookie, sessionWriteGuard, type Credential } from '../../_lib/auth.ts';
import { json, requireSameOriginWrite } from '../../_lib/response.ts';
import { requireDatabase } from '../../_lib/records.ts';
import { passwordAction } from '../../_lib/password.ts';

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_json');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 32768) { await reader.cancel(); throw new Error('body_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_json');
  return value;
}
const failed = () => json({ error: 'authentication_failed' }, 401);
const recentRequired = () => json({ error: 'recent_login_required' }, 401);
function requireTopLevel(response: RegistrationResponseJSON | AuthenticationResponseJSON): boolean {
  try {
    const client = JSON.parse(new TextDecoder().decode(decode(response.response.clientDataJSON)));
    return client.crossOrigin !== true && client.topOrigin === undefined;
  } catch { return false; }
}

export const onRequest: PagesHandler<AdminEnv> = async ({ request, env, params }) => {
  try {
    const { origin, rpID } = config(request, env);
    const db = requireDatabase(env); const action = params.action;
    if (request.method === 'GET' && action === 'status') {
      const admin = await db.prepare('SELECT id FROM auth_admin WHERE id = ?').bind('primary').first();
      const password = await db.prepare("SELECT id FROM auth_password WHERE id = 'primary'").first();
      return json({ initialized: !!admin, passwordEnabled: !!password, setupAvailable: !admin && /^[A-Za-z0-9_-]{43}$/.test(env.ADMIN_SETUP_TOKEN_HASH || '') });
    }
    if (request.method === 'GET' && action === 'security') {
      const session = await getSession(request, env);
      if (!session || session.scope !== 'admin') return failed();
      const keys = await db.prepare('SELECT id, name, created_at, last_used_at FROM auth_credentials ORDER BY created_at').all();
      const recovery = await db.prepare('SELECT count(*) AS count FROM auth_recovery_codes').first<{ count: number }>();
      const password = await db.prepare("SELECT id FROM auth_password WHERE id = 'primary'").first();
      return json({ credentials: keys.results || [], passwordEnabled: !!password, recoveryCount: recovery?.count || 0, currentCredential: session.credential_id });
    }
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
    const rejected = requireSameOriginWrite(request); if (rejected) return rejected;
    if (!await rateLimit(request, db)) return json({ error: 'too_many_attempts' }, 429, { 'Retry-After': '300' });
    const body = await readBody(request);
    if (typeof action === 'string' && action.startsWith('password-')) return await passwordAction(request, env, db, action, body);
    if (action === 'logout') {
      const token = readCookie(request, SESSION_COOKIE);
      if (token) await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await digest(token)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(SESSION_COOKIE, '', 0), 'Clear-Site-Data': '"cache"' });
    }
    if (action === 'login-options') {
      await cleanupAuth(db);
      const admin = await db.prepare('SELECT user_handle FROM auth_admin WHERE id = ?').bind('primary').first<{ user_handle: string }>();
      if (!admin) return failed();
      const options = await generateAuthenticationOptions({ rpID, userVerification: 'required', allowCredentials: [], timeout: 60000 });
      return json({ options }, 200, { 'Set-Cookie': await issueChallenge(db, { purpose: 'login', challenge: options.challenge, user_handle: admin.user_handle, session_hash: null }) });
    }
    if (action === 'login-verify') {
      const challenge = await consumeChallenge(request, db);
      if (!challenge || challenge.purpose !== 'login') return failed();
      const response = body.response as AuthenticationResponseJSON | undefined;
      if (!response || typeof response.id !== 'string' || response.id.length > 2048 || !requireTopLevel(response)) return failed();
      const credential = await db.prepare('SELECT * FROM auth_credentials WHERE id = ?').bind(response.id).first<Credential>();
      if (!credential || response.response?.userHandle !== challenge.user_handle) return failed();
      const result = await verifyAuthenticationResponse({ response, expectedChallenge: challenge.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
        credential: { id: credential.id, publicKey: decode(credential.public_key), counter: credential.counter, transports: JSON.parse(credential.transports) as AuthenticatorTransportFuture[] } });
      if (!result.verified) return failed();
      const updated = await db.prepare('UPDATE auth_credentials SET counter = ?, last_used_at = ? WHERE id = ? AND counter = ?')
        .bind(result.authenticationInfo.newCounter, nowSeconds(), credential.id, credential.counter).run();
      if (updated.meta.changes !== 1) return failed();
      const previous = readCookie(request, SESSION_COOKIE);
      if (previous) await db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await digest(previous)).run();
      return json({ ok: true }, 200, { 'Set-Cookie': await newSession(db, credential.id) });
    }
    if (action === 'recover') {
      const code = typeof body.code === 'string' ? body.code.trim() : '';
      if (!/^[A-Za-z0-9_-]{43}$/.test(code)) return failed();
      const consumed = await db.prepare('DELETE FROM auth_recovery_codes WHERE code_hash = ? RETURNING code_hash').bind(await digest(code)).first();
      if (!consumed) return failed();
      // A recovery code permits enrolling a replacement key, never reading data.
      return json({ ok: true }, 200, { 'Set-Cookie': await newSession(db, null, 'recovery') });
    }
    if (action === 'register-options') {
      await cleanupAuth(db);
      const admin = await db.prepare('SELECT user_handle FROM auth_admin WHERE id = ?').bind('primary').first<{ user_handle: string }>();
      const session = await getSession(request, env);
      let purpose: 'setup' | 'register' | 'recover'; let sessionHash: string; let userHandle: string;
      if (!admin) {
        const setupToken = typeof body.setupToken === 'string' ? body.setupToken.trim() : '';
        if (!/^[A-Za-z0-9_-]{43}$/.test(setupToken) || !env.ADMIN_SETUP_TOKEN_HASH || await digest(setupToken) !== env.ADMIN_SETUP_TOKEN_HASH) return failed();
        purpose = 'setup'; sessionHash = env.ADMIN_SETUP_TOKEN_HASH; userHandle = randomToken();
      } else {
        if (!isRecent(session)) return recentRequired();
        purpose = session.scope === 'recovery' ? 'recover' : 'register'; sessionHash = session.token_hash; userHandle = admin.user_handle;
      }
      const keys = await db.prepare('SELECT id FROM auth_credentials').all<{ id: string }>();
      if (purpose === 'register' && (keys.results || []).length >= 8) return json({ error: 'credential_limit' }, 409);
      const options = await generateRegistrationOptions({ rpName: '闲梦 · 私人工作台', rpID, userID: decode(userHandle), userName: '唯一管理员', userDisplayName: '我的工作台',
        attestationType: 'none', supportedAlgorithmIDs: [-7, -257], timeout: 60000,
        authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
        excludeCredentials: (keys.results || []).map(({ id }) => ({ id })) });
      return json({ options }, 200, { 'Set-Cookie': await issueChallenge(db, { purpose, challenge: options.challenge, user_handle: userHandle, session_hash: sessionHash }) });
    }
    if (action === 'register-verify') {
      const challenge = await consumeChallenge(request, db);
      if (!challenge || challenge.purpose === 'login') return failed();
      const session = await getSession(request, env);
      if (challenge.purpose === 'setup') {
        if (challenge.session_hash !== env.ADMIN_SETUP_TOKEN_HASH || await db.prepare('SELECT id FROM auth_admin').first()) return failed();
      } else if (!isRecent(session) || session.token_hash !== challenge.session_hash || (challenge.purpose === 'recover') !== (session.scope === 'recovery')) return failed();
      if (!requireTopLevel(body.response as RegistrationResponseJSON)) return failed();
      const result = await verifyRegistrationResponse({ response: body.response as RegistrationResponseJSON, expectedChallenge: challenge.challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true, supportedAlgorithmIDs: [-7, -257] });
      if (!result.verified || !result.registrationInfo) return failed();
      const { credential } = result.registrationInfo;
      const now = nowSeconds(); const name = typeof body.name === 'string' ? body.name.trim().slice(0, 60) : '';
      const statements = [];
      if (challenge.purpose === 'setup') statements.push(db.prepare('INSERT INTO auth_admin (id, user_handle, created_at) VALUES (?, ?, ?)').bind('primary', challenge.user_handle, now));
      else statements.push(sessionWriteGuard(db, session!));
      if (challenge.purpose === 'recover') {
        statements.push(db.prepare('DELETE FROM auth_password'));
        statements.push(db.prepare('DELETE FROM auth_sessions'), db.prepare('DELETE FROM auth_challenges'), db.prepare('DELETE FROM auth_credentials'));
      }
      statements.push(db.prepare('INSERT INTO auth_credentials (id, public_key, counter, transports, name, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(credential.id, encode(credential.publicKey), credential.counter, JSON.stringify(credential.transports || []), name || '我的通行密钥', now));
      let codes: string[] = [];
      if (challenge.purpose !== 'register') {
        codes = Array.from({ length: 8 }, randomToken);
        statements.push(db.prepare('DELETE FROM auth_recovery_codes'));
        for (const code of codes) statements.push(db.prepare('INSERT INTO auth_recovery_codes (code_hash, created_at) VALUES (?, ?)').bind(await digest(code), now));
      }
      // Atomic: a simultaneous first registration fails the singleton constraint.
      await db.batch(statements);
      return json({ ok: true, recoveryCodes: codes }, 200, { 'Set-Cookie': await newSession(db, credential.id) });
    }
    const session = await getSession(request, env);
    if (!session || session.scope !== 'admin') return failed();
    if (!isRecent(session)) return recentRequired();
    if (action === 'logout-all') {
      await db.batch([sessionWriteGuard(db, session), db.prepare('DELETE FROM auth_sessions'), db.prepare('DELETE FROM auth_challenges')]);
      return json({ ok: true }, 200, { 'Set-Cookie': cookie(SESSION_COOKIE, '', 0) });
    }
    if (action === 'remove-key') {
      if (typeof body.id !== 'string' || body.id === session.credential_id) return json({ error: 'cannot_remove_current_key' }, 409);
      await db.batch([sessionWriteGuard(db, session), db.prepare('DELETE FROM auth_credentials WHERE id = ? AND id != ?').bind(body.id, session.credential_id)]);
      return json({ ok: true });
    }
    if (action === 'rotate-codes') {
      const codes = Array.from({ length: 8 }, randomToken);
      const statements = [sessionWriteGuard(db, session), db.prepare('DELETE FROM auth_recovery_codes'), db.prepare("DELETE FROM auth_sessions WHERE scope = 'recovery'")];
      for (const code of codes) statements.push(db.prepare('INSERT INTO auth_recovery_codes (code_hash, created_at) VALUES (?, ?)').bind(await digest(code), nowSeconds()));
      await db.batch(statements);
      return json({ recoveryCodes: codes });
    }
    return json({ error: 'not_found' }, 404);
  } catch (error) {
    // Never expose crypto, database, credential or challenge details in errors.
    const message = error instanceof Error ? error.message : '';
    if (message === 'body_too_large') return json({ error: message }, 413);
    if (message === 'admin_auth_not_configured' || message === 'private_database_not_configured') return json({ error: 'admin_unavailable' }, 503);
    return failed();
  }
};

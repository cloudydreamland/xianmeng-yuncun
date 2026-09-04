import { useEffect, useState, type SyntheticEvent } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { PasswordLoginForm, PasswordRecovery } from './PasswordAuth';

export async function authApi<T>(action: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/auth/${action}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: body === undefined ? { accept: 'application/json' } : { accept: 'application/json', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'request_failed');
  return data as T;
}
export function authMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (message === 'too_many_attempts') return '尝试过于频繁，请 5 分钟后重试。';
  if (message === 'recent_login_required') return '身份验证已过期，请重新验证后再操作。';
  if (message === 'email_or_password_incorrect') return '邮箱或网站密码不正确。';
  if (message === 'password_rate_limited') return '密码尝试次数过多，请 15 分钟后重试；也可使用已绑定的备用通行密钥。';
  if (message === 'password_too_weak') return '密码需为 15–128 个字符，请避开邮箱号码、重复字符、常见口令和连续数字。';
  if (message === 'password_crypto_unavailable') return '密码服务暂时不可用，未完成登录或保存。请稍后重试或使用备用通行密钥。';
  if (message === 'admin_unavailable') return '登录服务尚未配置完成或暂时不可用，请稍后重试。';
  if (message === 'cannot_remove_current_key') return '不能移除本次登录使用的密钥，请先用另一把密钥登录。';
  if (message === 'credential_limit') return '最多保留 8 把密钥，请先移除不再使用的密钥。';
  return '验证未完成。请确认已选择正确的通行密钥或恢复码，然后重试。';
}
export async function authenticate() {
  const { options } = await authApi<{ options: PublicKeyCredentialRequestOptionsJSON }>('login-options', {});
  const response = await startAuthentication({ optionsJSON: options });
  await authApi('login-verify', { response });
}
async function register(name: string, setupToken?: string) {
  const { options } = await authApi<{ options: PublicKeyCredentialCreationOptionsJSON }>('register-options', { setupToken });
  const response = await startRegistration({ optionsJSON: options });
  return authApi<{ recoveryCodes: string[] }>('register-verify', { name, response });
}
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const download = () => {
    const url = URL.createObjectURL(new Blob([`闲梦私人工作台恢复码\n每行仅能使用一次。请离线保管，不要发到聊天、仓库或公开站。\n恢复完成后，所有旧密钥和旧恢复码失效。\n\n${codes.join('\n')}\n`], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'yuncun-recovery-codes.txt'; a.click(); URL.revokeObjectURL(url);
  };
  return <section className="data-card recovery-codes"><h2>请保存恢复码</h2><p>每个恢复码只能用一次，用于重设密码或绑定替代密钥；恢复完成会撤销旧密钥、会话和旧恢复码。请离线保管，不要发送给任何人。</p><pre>{codes.join('\n')}</pre><button className="button" onClick={download}>下载恢复码</button><label className="confirm-backup"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />我已安全保存恢复码</label><button className="button secondary" disabled={!confirmed} onClick={onDone}>完成</button></section>;
}
export default function PasskeyLogin() {
  const [state, setState] = useState<{ initialized: boolean; setupAvailable: boolean; passwordEnabled: boolean } | null>(null);
  const [mode, setMode] = useState<'login' | 'setup' | 'recover'>('login');
  const [message, setMessage] = useState('正在检查登录服务…');
  const [busy, setBusy] = useState(false); const [codes, setCodes] = useState<string[]>([]);
  useEffect(() => { authApi<{ initialized: boolean; setupAvailable: boolean; passwordEnabled: boolean }>('status').then((value) => { setState(value); setMode(value.initialized ? 'login' : 'setup'); setMessage(value.initialized ? value.passwordEnabled ? '请输入管理员 QQ 邮箱和网站专用密码。' : '请先用已有通行密钥进入工作台，在“数据与备份”中设置网站密码。' : value.setupAvailable ? '首次绑定需要一次性初始化凭据。' : '管理员初始化尚未开放，请先完成云端配置。'); }).catch((error) => setMessage(authMessage(error))); }, []);
  const login = async () => { setBusy(true); setMessage('请在设备弹窗中确认身份…'); try { await authenticate(); window.location.replace('/'); } catch (error) { setMessage(authMessage(error)); } finally { setBusy(false); } };
  const enroll = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setMessage('请在设备弹窗中创建通行密钥…');
    try {
      if (mode === 'recover') await authApi('recover', { code: String(data.get('code') || '').trim() });
      const result = await register(String(data.get('name') || ''), mode === 'setup' ? String(data.get('code') || '').trim() : undefined);
      form.reset(); setCodes(result.recoveryCodes); setMessage('密钥已绑定。请先保存新的恢复码。');
    } catch (error) { setMessage(authMessage(error)); } finally { setBusy(false); }
  };
  return <div className="admin-shell auth-shell"><section className="surface auth-panel"><p className="kicker">PRIVATE CLOUD · 私人云案</p><h1>管理员登录</h1><p>公开网站无需登录；这里仅用于管理你的私人记录。</p><p className="status-strip" role="status">{message}</p>{codes.length ? <RecoveryCodes codes={codes} onDone={() => window.location.replace('/')} /> : <>
    {state?.initialized && mode === 'login' && <><PasswordLoginForm disabled={!state.passwordEnabled || busy} onError={setMessage} onSuccess={() => window.location.replace('/')} /><p>这是网站独立密码，不是 QQ 邮箱密码；不向 QQ 发送密码。</p><button className="button secondary" disabled={busy} onClick={() => void login()}>{busy ? '等待设备确认…' : '使用通行密钥登录'}</button><p>通行密钥仅作为备用登录和首次设置密码的验证方式。</p><button className="text-button" disabled={busy} onClick={() => setMode('recover')}>忘记密码？使用恢复码</button></>}
    {mode === 'recover' && <><PasswordRecovery onError={setMessage} onDone={setCodes} /><button className="text-button" onClick={() => setMode('login')}>返回登录</button></>}
    {state?.setupAvailable && mode === 'setup' && <form className="record-form" onSubmit={enroll}><h2>绑定第一把通行密钥</h2><label><span>一次性初始化凭据</span><input name="code" type="password" autoComplete="off" required minLength={43} maxLength={43} /></label><label><span>设备名称</span><input name="name" placeholder="例如：我的手机" required maxLength={60} /></label><button className="button" disabled={busy}>{busy ? '等待设备确认…' : '验证并绑定通行密钥'}</button></form>}
  </>}<a className="public-return" href="https://xianmeng-yuncun.pages.dev">返回公开网站</a></section></div>;
}

interface SecurityData { credentials: { id: string; name: string; created_at: number; last_used_at: number | null }[]; recoveryCount: number; currentCredential: string }
export function PasskeySecurity({ reauthenticate = authenticate }: { reauthenticate?: () => Promise<unknown> } = {}) {
  const [data, setData] = useState<SecurityData | null>(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [codes, setCodes] = useState<string[]>([]);
  const refresh = async () => setData(await authApi<SecurityData>('security'));
  useEffect(() => { void refresh().catch((error) => setMessage(authMessage(error))); }, []);
  const run = async (operation: () => Promise<void>) => { setBusy(true); setMessage('请确认设备验证…'); try { await operation(); await refresh(); setMessage('账户安全设置已保存。'); } catch (error) { setMessage(authMessage(error)); } finally { setBusy(false); } };
  const add = (event: SyntheticEvent<HTMLFormElement>) => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name') || '备用设备'); void run(async () => { await reauthenticate(); await register(name); }); };
  return <article className="data-card"><h3>账户与通行密钥</h3><p>通行密钥可作为备用登录方式。安全设置修改前需要再次确认身份。</p>{message && <p role="status">{message}</p>}{data && <><ul className="credential-list">{data.credentials.map((key) => <li key={key.id}><span>{key.name}{key.id === data.currentCredential ? ' · 当前登录密钥' : ''}</span>{key.id !== data.currentCredential && <button className="button danger" disabled={busy} onClick={() => { if (window.confirm(`移除“${key.name}”？该密钥对应的会话也会退出。`)) void run(async () => { await reauthenticate(); await authApi('remove-key', { id: key.id }); }); }}>移除</button>}</li>)}</ul><p>可用恢复码：{data.recoveryCount} 个</p></>}
    <form className="record-form" onSubmit={add}><label><span>备用密钥名称</span><input name="name" required maxLength={60} placeholder="例如：备用手机" /></label><button className="button" disabled={busy}>绑定备用通行密钥</button></form><div className="form-actions"><button className="button secondary" disabled={busy} onClick={() => { if (window.confirm('生成新的恢复码后，旧恢复码立即失效。继续吗？')) void run(async () => { await reauthenticate(); const result = await authApi<{ recoveryCodes: string[] }>('rotate-codes', {}); setCodes(result.recoveryCodes); }); }}>重新生成恢复码</button><button className="button secondary" disabled={busy} onClick={() => { if (window.confirm('退出所有设备上的工作台？')) void run(async () => { await reauthenticate(); await authApi('logout-all', {}); window.location.replace('/login/'); }); }}>退出所有设备</button></div>{codes.length > 0 && <RecoveryCodes codes={codes} onDone={() => setCodes([])} />}
  </article>;
}

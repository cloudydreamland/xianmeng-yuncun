import { useEffect, useState, type SyntheticEvent } from 'react';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';

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
  if (message === 'recent_login_required') return '为了保护账户，请先重新验证通行密钥，再进行此操作。';
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
  return <section className="data-card recovery-codes"><h2>请保存恢复码</h2><p>每个恢复码只能用一次。它允许你绑定替代密钥；恢复完成会撤销所有旧密钥和会话。请离线保管，不要发送给任何人。</p><pre>{codes.join('\n')}</pre><button className="button" onClick={download}>下载恢复码</button><label className="confirm-backup"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />我已安全保存恢复码</label><button className="button secondary" disabled={!confirmed} onClick={onDone}>完成</button></section>;
}
export default function PasskeyLogin() {
  const [state, setState] = useState<{ initialized: boolean; setupAvailable: boolean } | null>(null);
  const [mode, setMode] = useState<'login' | 'setup' | 'recover'>('login');
  const [message, setMessage] = useState('正在检查登录服务…');
  const [busy, setBusy] = useState(false); const [codes, setCodes] = useState<string[]>([]);
  useEffect(() => { authApi<{ initialized: boolean; setupAvailable: boolean }>('status').then((value) => { setState(value); setMode(value.initialized ? 'login' : 'setup'); setMessage(value.initialized ? '请选择你已绑定的通行密钥。' : value.setupAvailable ? '首次绑定需要一次性初始化凭据。' : '管理员初始化尚未开放，请先完成云端配置。'); }).catch((error) => setMessage(authMessage(error))); }, []);
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
    {state?.initialized && mode === 'login' && <><button className="button auth-primary" disabled={busy} onClick={() => void login()}>{busy ? '等待设备确认…' : '使用通行密钥登录'}</button><p>使用设备指纹、面容或解锁 PIN；网站不会收到这些信息。如果内置浏览器无法弹出设备验证，请用系统浏览器打开本页。</p><button className="text-button" disabled={busy} onClick={() => setMode('recover')}>设备丢失？使用恢复码</button></>}
    {(mode === 'recover' || state?.setupAvailable && mode === 'setup') && <form className="record-form" onSubmit={enroll}><h2>{mode === 'setup' ? '绑定第一把通行密钥' : '恢复管理员访问'}</h2><label><span>{mode === 'setup' ? '一次性初始化凭据' : '未使用的恢复码'}</span><input name="code" type="password" autoComplete="off" required minLength={43} maxLength={43} /></label><label><span>设备名称</span><input name="name" placeholder="例如：我的手机" required maxLength={60} /></label>{mode === 'recover' && <p>成功绑定新密钥后，旧密钥、旧会话和旧恢复码全部失效。若取消设备弹窗，已提交的恢复码仍会消耗，请使用下一条。</p>}<button className="button" disabled={busy}>{busy ? '等待设备确认…' : '验证并绑定通行密钥'}</button>{state?.initialized && <button className="text-button" type="button" disabled={busy} onClick={() => setMode('login')}>返回登录</button>}</form>}
  </>}<a className="public-return" href="https://xianmeng-yuncun.pages.dev">返回公开网站</a></section></div>;
}

interface SecurityData { credentials: { id: string; name: string; created_at: number; last_used_at: number | null }[]; recoveryCount: number; currentCredential: string }
export function PasskeySecurity() {
  const [data, setData] = useState<SecurityData | null>(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [codes, setCodes] = useState<string[]>([]);
  const refresh = async () => setData(await authApi<SecurityData>('security'));
  useEffect(() => { void refresh().catch((error) => setMessage(authMessage(error))); }, []);
  const run = async (operation: () => Promise<void>) => { setBusy(true); setMessage('请确认设备验证…'); try { await operation(); await refresh(); setMessage('账户安全设置已保存。'); } catch (error) { setMessage(authMessage(error)); } finally { setBusy(false); } };
  const add = (event: SyntheticEvent<HTMLFormElement>) => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name') || '备用设备'); void run(async () => { await authenticate(); await register(name); }); };
  return <article className="data-card"><h3>账户与通行密钥</h3><p>建议绑定至少两种独立的设备或密钥。安全设置修改前需要再次确认身份。</p>{message && <p role="status">{message}</p>}{data && <><ul className="credential-list">{data.credentials.map((key) => <li key={key.id}><span>{key.name}{key.id === data.currentCredential ? ' · 当前登录密钥' : ''}</span>{key.id !== data.currentCredential && <button className="button danger" disabled={busy} onClick={() => { if (window.confirm(`移除“${key.name}”？该密钥对应的会话也会退出。`)) void run(async () => { await authenticate(); await authApi('remove-key', { id: key.id }); }); }}>移除</button>}</li>)}</ul><p>可用恢复码：{data.recoveryCount} 个</p></>}
    <form className="record-form" onSubmit={add}><label><span>备用密钥名称</span><input name="name" required maxLength={60} placeholder="例如：备用手机" /></label><button className="button" disabled={busy}>绑定备用通行密钥</button></form><div className="form-actions"><button className="button secondary" disabled={busy} onClick={() => { if (window.confirm('生成新的恢复码后，旧恢复码立即失效。继续吗？')) void run(async () => { await authenticate(); const result = await authApi<{ recoveryCodes: string[] }>('rotate-codes', {}); setCodes(result.recoveryCodes); }); }}>重新生成恢复码</button><button className="button secondary" disabled={busy} onClick={() => { if (window.confirm('退出所有设备上的工作台？')) void run(async () => { await authenticate(); await authApi('logout-all', {}); window.location.replace('/login/'); }); }}>退出所有设备</button></div>{codes.length > 0 && <RecoveryCodes codes={codes} onDone={() => setCodes([])} />}
  </article>;
}

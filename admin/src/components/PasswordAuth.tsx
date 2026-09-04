import { useEffect, useState, type SyntheticEvent } from 'react';
import { authApi, authenticate, authMessage, PasskeySecurity, RecoveryCodes } from './PasskeyAuth';

export const passwordHelp = '请使用 15–128 个字符的独立长密码，避开邮箱号码、常见口令和连续数字；不要填写 QQ 邮箱密码。';
export function PasswordLoginForm({ onSuccess, onError, disabled = false }: { onSuccess: () => void; onError: (message: string) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true);
    try { await authApi('password-login', { email: data.get('email'), password: data.get('password') }); form.reset(); onSuccess(); }
    catch (error) { onError(authMessage(error)); } finally { setBusy(false); }
  };
  return <form className="record-form" onSubmit={submit}><label><span>QQ 邮箱</span><input name="email" type="email" autoComplete="username" inputMode="email" required maxLength={254} /></label><label><span>网站专用密码</span><input name="password" type="password" autoComplete="current-password" required maxLength={256} /></label><button className="button auth-primary" disabled={busy || disabled}>{busy ? '正在验证…' : '邮箱密码登录'}</button></form>;
}

export function PasswordRecovery({ onError, onDone }: { onError: (message: string) => void; onDone: (codes: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    if (data.get('password') !== data.get('confirm')) { onError('两次输入的新密码不一致。'); return; }
    setBusy(true);
    try {
      await authApi('recover', { code: String(data.get('code') || '').trim() });
      const result = await authApi<{ recoveryCodes: string[] }>('password-set', { email: data.get('email'), password: data.get('password') });
      form.reset(); onDone(result.recoveryCodes);
    } catch (error) { onError(authMessage(error)); } finally { setBusy(false); }
  };
  return <form className="record-form" onSubmit={submit}><h2>重设网站密码</h2><p>使用一条离线恢复码。提交会消耗该码；重设成功后旧密码、设备密钥、会话和旧恢复码全部失效，私人记录保留。</p><label><span>QQ 邮箱</span><input name="email" type="email" autoComplete="username" required maxLength={254} /></label><label><span>未使用的恢复码</span><input name="code" type="password" autoComplete="off" required minLength={43} maxLength={43} /></label><p>{passwordHelp}</p><label><span>新网站密码</span><input name="password" type="password" autoComplete="new-password" required minLength={15} maxLength={128} /></label><label><span>确认新密码</span><input name="confirm" type="password" autoComplete="new-password" required minLength={15} maxLength={128} /></label><button className="button" disabled={busy}>{busy ? '正在重设…' : '验证恢复码并重设密码'}</button></form>;
}

export function PasswordSecurity() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState(''); const [currentPassword, setCurrentPassword] = useState('');
  const [useKey, setUseKey] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  useEffect(() => { authApi<{ passwordEnabled: boolean }>('security').then((data) => setEnabled(data.passwordEnabled)).catch((error) => setMessage(authMessage(error))); }, []);
  const reauthenticate = async () => {
    if (!enabled || useKey) await authenticate();
    else await authApi('password-login', { email, password: currentPassword });
  };
  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    if (data.get('password') !== data.get('confirm')) { setMessage('两次输入的新密码不一致。'); return; }
    setBusy(true); setMessage('正在验证身份并保存密码…');
    try {
      await reauthenticate();
      await authApi('password-set', { email, password: data.get('password'), currentPassword });
      form.reset(); setCurrentPassword(''); setEnabled(true); setUseKey(false);
      setMessage('网站密码已保存。其他会话已退出；以后可在任意设备使用 QQ 邮箱和此密码登录。');
    } catch (error) { setMessage(authMessage(error)); } finally { setBusy(false); }
  };
  return <><article className="data-card"><h3>账户与网站密码</h3><p>{enabled ? '邮箱密码登录已启用。' : '首次设置需要验证已有通行密钥；设置完成后，日常登录不再依赖设备密钥。'}</p><p>{passwordHelp}</p>{message && <p role="status">{message}</p>}
    <form className="record-form" onSubmit={submit}><label><span>管理员 QQ 邮箱</span><input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    {enabled && <><label><span>当前网站密码</span><input type="password" autoComplete="current-password" required={!useKey} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label><label><input type="checkbox" checked={useKey} onChange={(event) => setUseKey(event.target.checked)} />改用已绑定的备用通行密钥验证身份</label></>}
    <label><span>新网站密码</span><input name="password" type="password" autoComplete="new-password" required minLength={15} maxLength={128} /></label><label><span>确认新密码</span><input name="confirm" type="password" autoComplete="new-password" required minLength={15} maxLength={128} /></label><button className="button" disabled={busy || enabled === null}>{busy ? '正在保存…' : enabled ? '验证并修改网站密码' : '验证身份并启用密码登录'}</button></form>
    {codes.length > 0 && <RecoveryCodes codes={codes} onDone={() => setCodes([])} />}</article><details className="data-card"><summary>备用通行密钥与恢复码</summary><p>修改以下设置前，请在上方填写邮箱和当前密码，或选择使用备用通行密钥验证。</p><PasskeySecurity reauthenticate={reauthenticate} /></details></>;
}

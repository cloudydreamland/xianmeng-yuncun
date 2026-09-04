import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { legacySnapshotToRecords, type PrivateRecord, type PrivateRecordData, type PrivateRecordInput } from '../../../shared/privateRecords';
import { authApi, PasskeySecurity } from './PasskeyAuth';

type EditableKind = 'plan' | 'inbox' | 'habit' | 'focus-session' | 'checklist' | 'expiry' | 'expense' | 'inventory' | 'journal';
type ViewId = 'today' | EditableKind | 'data';
type FieldType = 'text' | 'date' | 'time' | 'number' | 'textarea' | 'select' | 'checkbox';
interface Field { key: string; label: string; type: FieldType; required?: boolean; options?: string[]; placeholder?: string }
interface Definition { label: string; mark: string; description: string; fields: Field[] }
interface MigrationPreview { records: PrivateRecordInput[]; source: 'legacy-browser' | 'json-backup'; raw?: unknown }

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
const definitions: Record<EditableKind, Definition> = {
  plan: { label: '私人计划', mark: '策', description: '安排日期、优先级和完成状态。', fields: [
    { key: 'title', label: '计划名称', type: 'text', required: true }, { key: 'date', label: '日期', type: 'date' }, { key: 'time', label: '时间', type: 'time' },
    { key: 'priority', label: '优先级', type: 'select', options: ['high', 'medium', 'low'] }, { key: 'notes', label: '备注', type: 'textarea' }, { key: 'completed', label: '已完成', type: 'checkbox' },
  ] },
  inbox: { label: '随手收集', mark: '收', description: '暂存想法和待整理事项。', fields: [
    { key: 'title', label: '标题', type: 'text', required: true }, { key: 'date', label: '日期', type: 'date' }, { key: 'detail', label: '详细内容', type: 'textarea' }, { key: 'handled', label: '已整理', type: 'checkbox' },
  ] },
  habit: { label: '习惯', mark: '养', description: '管理习惯并记录今天是否完成。', fields: [
    { key: 'name', label: '习惯名称', type: 'text', required: true }, { key: 'archived', label: '已归档', type: 'checkbox' },
  ] },
  'focus-session': { label: '专注记录', mark: '定', description: '记录已完成的专注时段。', fields: [
    { key: 'title', label: '专注事项', type: 'text', required: true }, { key: 'minutes', label: '分钟', type: 'number', required: true }, { key: 'date', label: '日期', type: 'date', required: true },
  ] },
  checklist: { label: '清单', mark: '单', description: '用换行分隔清单项目。', fields: [
    { key: 'title', label: '清单名称', type: 'text', required: true }, { key: 'items', label: '清单项目', type: 'textarea', required: true, placeholder: '每行一项' },
  ] },
  expiry: { label: '期限', mark: '期', description: '证件、订阅和生活事项的到期提醒。', fields: [
    { key: 'title', label: '事项', type: 'text', required: true }, { key: 'date', label: '到期日期', type: 'date', required: true }, { key: 'category', label: '分类', type: 'text' }, { key: 'completed', label: '已处理', type: 'checkbox' },
  ] },
  expense: { label: '账目', mark: '账', description: '记录私人开销，不会出现在公开站。', fields: [
    { key: 'title', label: '项目', type: 'text', required: true }, { key: 'amount', label: '金额', type: 'number', required: true }, { key: 'category', label: '分类', type: 'text' }, { key: 'date', label: '日期', type: 'date', required: true },
  ] },
  inventory: { label: '物品', mark: '物', description: '记录物品位置和购买信息。', fields: [
    { key: 'title', label: '物品', type: 'text', required: true }, { key: 'location', label: '位置', type: 'text', required: true }, { key: 'purchasedAt', label: '购买日期', type: 'date' }, { key: 'note', label: '备注', type: 'textarea' },
  ] },
  journal: { label: '私人手记', mark: '记', description: '仅管理员可见的日记与回忆。', fields: [
    { key: 'title', label: '标题', type: 'text', required: true }, { key: 'date', label: '日期', type: 'date', required: true }, { key: 'mood', label: '心情', type: 'text' }, { key: 'content', label: '正文', type: 'textarea', required: true },
  ] },
};
const editableKinds = Object.keys(definitions) as EditableKind[];

function displayTitle(record: PrivateRecord): string {
  return String(record.data.title || record.data.name || `${definitions[record.kind as EditableKind]?.label || record.kind}记录`);
}

function displaySummary(record: PrivateRecord): string {
  const data = record.data;
  if (record.kind === 'expense') return `${data.category || '未分类'} · ¥${Number(data.amount || 0).toFixed(2)} · ${data.date || '未定日期'}`;
  if (record.kind === 'inventory') return `${data.location || '未设位置'}${data.note ? ` · ${data.note}` : ''}`;
  if (record.kind === 'focus-session') return `${data.minutes || 0} 分钟 · ${data.date || '未定日期'}`;
  if (record.kind === 'checklist') return `${Array.isArray(data.items) ? data.items.length : 0} 项`;
  return String(data.notes || data.detail || data.content || data.date || '没有补充说明');
}

function formValue(field: Field, record: PrivateRecord | null): string | boolean {
  const value = record?.data[field.key];
  if (field.key === 'items' && Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : String((item as { label?: unknown }).label || '')).filter(Boolean).join('\n');
  if (field.type === 'checkbox') return Boolean(value);
  if (value !== undefined && value !== null) return String(value);
  if (field.type === 'date') return today();
  if (field.key === 'priority') return 'medium';
  return '';
}

function parseForm(definition: Definition, form: HTMLFormElement): PrivateRecordData {
  const formData = new FormData(form);
  const data: PrivateRecordData = {};
  definition.fields.forEach((field) => {
    if (field.type === 'checkbox') data[field.key] = formData.get(field.key) === 'on';
    else if (field.type === 'number') data[field.key] = Number(formData.get(field.key) || 0);
    else if (field.key === 'items') data.items = String(formData.get(field.key) || '').split(/\r?\n/).map((line, index) => ({ id: `check:${crypto.randomUUID?.() || `${Date.now()}-${index}`}`, label: line.trim(), done: false })).filter((item) => item.label);
    else data[field.key] = String(formData.get(field.key) || '').trim();
  });
  return data;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: 'no-store', ...init, headers: { accept: 'application/json', ...(init?.body ? { 'content-type': 'application/json' } : {}), ...init?.headers } });
  const body = await response.json().catch(() => ({})) as T & { error?: string; record?: PrivateRecord };
  if (!response.ok) {
    const error = new Error(body.error || 'request_failed') as Error & { status?: number; record?: PrivateRecord };
    error.status = response.status; error.record = body.record; throw error;
  }
  return body;
}

function downloadJson(value: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function AdminWorkspace({ publicOrigin }: { publicOrigin: string }) {
  const [records, setRecords] = useState<PrivateRecord[]>([]);
  const [trash, setTrash] = useState<PrivateRecord[]>([]);
  const [active, setActive] = useState<ViewId>('today');
  const [editing, setEditing] = useState<PrivateRecord | null>(null);
  const [sessionEmail, setSessionEmail] = useState('');
  const [status, setStatus] = useState('正在连接私人云端…');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(true);
  const [conflict, setConflict] = useState<PrivateRecord | null>(null);
  const [conflictDraft, setConflictDraft] = useState<{ kind: EditableKind; data: PrivateRecordData } | null>(null);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const [session, activeRecords, deletedRecords] = await Promise.all([
        api<{ email: string }>('/api/session'),
        api<{ records: PrivateRecord[] }>('/api/records'),
        api<{ records: PrivateRecord[] }>('/api/records?trash=true'),
      ]);
      setSessionEmail(session.email); setRecords(activeRecords.records); setTrash(deletedRecords.records);
      setStatus('私人云端已连接，所有修改会立即保存。'); setError(false);
    } catch {
      setStatus('无法读取私人云端，请检查登录状态或稍后重试。'); setError(true);
    } finally { setBusy(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== new URL(publicOrigin).origin || event.data?.type !== 'yuncun-private-migration') return;
      const expected = sessionStorage.getItem('yuncun-migration-nonce');
      if (!expected || event.data.nonce !== expected || !event.data.data || typeof event.data.data !== 'object') return;
      const imported = legacySnapshotToRecords(event.data.data as Record<string, unknown>);
      setPreview({ records: imported, source: 'legacy-browser', raw: event.data.data });
      setActive('data'); setStatus(`已收到 ${imported.length} 条旧记录，请核对后导入。`); setError(false);
      sessionStorage.removeItem('yuncun-migration-nonce');
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [publicOrigin]);

  const visibleRecords = active !== 'today' && active !== 'data' ? records.filter((record) => record.kind === active) : [];
  const todayKey = today();
  const metrics = useMemo(() => ({
    openPlans: records.filter((record) => record.kind === 'plan' && !record.data.completed).length,
    todayPlans: records.filter((record) => record.kind === 'plan' && record.data.date === todayKey && !record.data.completed).length,
    habits: records.filter((record) => record.kind === 'habit' && !record.data.archived).length,
    monthExpense: records.filter((record) => record.kind === 'expense' && String(record.data.date || '').startsWith(todayKey.slice(0, 7))).reduce((sum, record) => sum + Number(record.data.amount || 0), 0),
  }), [records, todayKey]);

  const setView = (view: ViewId) => { setActive(view); setEditing(null); setConflict(null); setConflictDraft(null); };
  const save = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (active === 'today' || active === 'data') return;
    setBusy(true); setStatus('正在保存…'); setError(false); setConflict(null); setConflictDraft(null);
    const data = parseForm(definitions[active], event.currentTarget);
    try {
      if (editing) await api(`/api/records/${encodeURIComponent(editing.id)}`, { method: 'PATCH', body: JSON.stringify({ kind: active, data, version: editing.version }) });
      else await api('/api/records', { method: 'POST', body: JSON.stringify({ kind: active, data }) });
      setEditing(null); await refresh(); setStatus('已保存到私人云端。');
    } catch (caught) {
      const issue = caught as Error & { status?: number; record?: PrivateRecord };
      if (issue.status === 409 && issue.record) { setConflict(issue.record); setConflictDraft({ kind: active, data }); setStatus('云端版本已变化，请选择处理方式。'); }
      else { setStatus('保存失败，表单内容仍保留在当前页面，请重试。'); setError(true); }
      setBusy(false);
    }
  };
  const saveConflictCopy = async () => {
    if (!conflictDraft) return;
    setBusy(true); setStatus('正在另存为副本…');
    try {
      await api('/api/records', { method: 'POST', body: JSON.stringify({ kind: conflictDraft.kind, data: conflictDraft.data }) });
      setEditing(null); setConflict(null); setConflictDraft(null); await refresh(); setStatus('当前修改已另存为一条新记录。');
    } catch { setStatus('副本保存失败，请重试。'); setError(true); setBusy(false); }
  };
  const remove = async (record: PrivateRecord) => {
    if (!confirm(`将“${displayTitle(record)}”移入回收站？`)) return;
    setBusy(true); setStatus('正在移入回收站…');
    try { await api(`/api/records/${encodeURIComponent(record.id)}`, { method: 'DELETE', body: JSON.stringify({ version: record.version }) }); await refresh(); }
    catch { setStatus('删除失败，记录没有改变。'); setError(true); setBusy(false); }
  };
  const restore = async (record: PrivateRecord) => {
    setBusy(true);
    try { await api(`/api/records/${encodeURIComponent(record.id)}/restore`, { method: 'POST', body: JSON.stringify({ version: record.version }) }); await refresh(); }
    catch { setStatus('恢复失败，请刷新后重试。'); setError(true); setBusy(false); }
  };
  const toggleHabit = async (habit: PrivateRecord) => {
    const log = records.find((record) => record.kind === 'habit-log' && record.data.habitId === habit.id && record.data.date === todayKey);
    setBusy(true);
    try {
      if (log) await api(`/api/records/${encodeURIComponent(log.id)}`, { method: 'DELETE', body: JSON.stringify({ version: log.version }) });
      else await api('/api/records', { method: 'POST', body: JSON.stringify({ id: `habit-log:${todayKey}:${habit.id}`, kind: 'habit-log', data: { habitId: habit.id, date: todayKey, completed: true } }) });
      await refresh();
    } catch { setStatus('打卡保存失败，请重试。'); setError(true); setBusy(false); }
  };
  const openMigration = () => {
    const nonce = crypto.randomUUID(); sessionStorage.setItem('yuncun-migration-nonce', nonce);
    window.open(`${publicOrigin.replace(/\/$/, '')}/private-migration/?nonce=${encodeURIComponent(nonce)}`, 'yuncun-private-migration', 'popup,width=760,height=760');
  };
  const importPreview = async () => {
    if (!preview) return;
    setBusy(true); setStatus('正在写入私人云端…'); setError(false);
    try {
      const result = await api<{ imported: number; skipped?: number; duplicate?: boolean }>('/api/import', { method: 'POST', body: JSON.stringify({ source: preview.source, records: preview.records }) });
      if (preview.raw) downloadJson({ version: 1, exportedAt: new Date().toISOString(), data: preview.raw }, `yuncun-legacy-backup-${todayKey}.json`);
      setPreview(null); await refresh(); setStatus(result.duplicate ? '这批数据此前已经导入，未生成重复记录。' : `已导入 ${result.imported} 条记录${result.skipped ? `，跳过 ${result.skipped} 条同名记录` : ''}。`);
    } catch { setStatus('导入失败，预览仍保留，可稍后重试。'); setError(true); setBusy(false); }
  };
  const uploadBackup = async (file?: File) => {
    if (!file) return;
    try {
      const value = JSON.parse(await file.text()) as { records?: PrivateRecordInput[]; data?: Record<string, unknown> };
      const imported = Array.isArray(value.records) ? value.records.map(({ id, kind, data }) => ({ id, kind, data })) : value.data ? legacySnapshotToRecords(value.data) : [];
      if (!imported.length) throw new Error('empty');
      setPreview({ records: imported, source: 'json-backup', raw: value }); setStatus(`已读取备份中的 ${imported.length} 条记录，请核对后导入。`); setError(false);
    } catch { setStatus('无法读取这个备份文件。'); setError(true); }
  };

  if (busy && !sessionEmail) return <div className="loading">正在开启私人工作台…</div>;
  if (!sessionEmail) return <div className="admin-shell"><section className="surface panel"><h1>尚未连接私人工作台</h1><p role="status">{status}</p><a className="button" href="/login/">前往管理员登录</a></section></div>;
  const logout = async () => {
    setBusy(true);
    try { await authApi('logout', {}); setRecords([]); setTrash([]); setEditing(null); setPreview(null); setSessionEmail(''); window.location.replace('/login/'); }
    catch { setStatus('退出失败，请检查网络后重试。'); setError(true); setBusy(false); }
  };
  const activeDefinition = active !== 'today' && active !== 'data' ? definitions[active] : null;
  return <div className="admin-shell">
    <header className="admin-header"><div><p className="kicker">PRIVATE CLOUD DESK · 私人云案</p><h1>我的工作台</h1><p>只有唯一管理员能够查看和修改，记录直接保存到私人云端。</p></div><div className="account"><span>{sessionEmail} · 通行密钥已验证</span><button className="text-button" disabled={busy} onClick={() => void logout()}>退出登录</button></div></header>
    <div className={`status-strip ${error ? 'is-error' : ''}`} role="status" aria-live="polite"><i aria-hidden="true"></i><span>{status}</span></div>
    <nav className="admin-nav" aria-label="私人工作台目录">
      <button aria-pressed={active === 'today'} onClick={() => setView('today')}>今日</button>
      {editableKinds.map((kind) => <button key={kind} aria-pressed={active === kind} onClick={() => setView(kind)}>{definitions[kind].label}</button>)}
      <button aria-pressed={active === 'data'} onClick={() => setView('data')}>数据与备份</button>
    </nav>
    <div className="workspace-grid">
      <section className="surface panel">
        {active === 'data' && <PasskeySecurity />}
        {active === 'today' && <><header className="panel-heading"><div><p className="kicker">TODAY · 今日云笺</p><h2>今日概览</h2></div><p>{todayKey}</p></header><div className="metrics"><article className="metric"><span>未完成计划</span><strong>{metrics.openPlans}</strong><small>全部私人计划</small></article><article className="metric"><span>今天</span><strong>{metrics.todayPlans}</strong><small>项待办</small></article><article className="metric"><span>习惯</span><strong>{metrics.habits}</strong><small>项进行中</small></article><article className="metric"><span>本月开销</span><strong>¥{metrics.monthExpense.toFixed(0)}</strong><small>私人账目</small></article></div><ol className="today-list">{records.filter((record) => record.kind === 'plan' && !record.data.completed).slice(0, 8).map((record) => <li key={record.id}><strong>{displayTitle(record)}</strong> · {String(record.data.date || '未定日期')}</li>)}</ol></>}
        {activeDefinition && <><header className="panel-heading"><div><p className="kicker">PRIVATE RECORDS · {activeDefinition.mark}</p><h2>{activeDefinition.label}</h2></div><p>{activeDefinition.description}</p></header><div className="record-list">{visibleRecords.length ? visibleRecords.map((record) => { const habitDone = record.kind === 'habit' && records.some((item) => item.kind === 'habit-log' && item.data.habitId === record.id && item.data.date === todayKey); return <article className="record-card" key={record.id}><div><h3>{displayTitle(record)}</h3><p>{displaySummary(record)}</p><small>云端版本 {record.version} · {new Date(record.updatedAt).toLocaleString('zh-CN')}</small></div><div className="record-actions">{record.kind === 'habit' && <button className="button secondary" onClick={() => void toggleHabit(record)} disabled={busy}>{habitDone ? '取消今日' : '今日完成'}</button>}<button className="button secondary" onClick={() => { setEditing(record); setConflict(null); }}>编辑</button><button className="button danger" onClick={() => void remove(record)} disabled={busy}>删除</button></div></article>; }) : <div className="empty">这里还没有记录，可以从右侧新增第一条。</div>}</div></>}
        {active === 'data' && <><header className="panel-heading"><div><p className="kicker">DATA & BACKUP · 云卷</p><h2>迁移、备份与回收站</h2></div><p>数据不会进入公开站。</p></header><div className="data-tools"><article className="data-card"><h3>从旧工作台迁移</h3><p>读取公开站当前浏览器里的旧私人记录，先预览数量，再写入云端。</p><button className="button" onClick={openMigration}>打开安全迁移页</button></article><article className="data-card"><h3>完整备份</h3><p>导出内容包含有效记录和回收站，可用于离线留档或恢复。</p><a className="button" href="/api/export" download>导出 JSON 备份</a><label><span className="sr-only">选择 JSON 备份</span><input type="file" accept="application/json,.json" onChange={(event) => void uploadBackup(event.target.files?.[0])} /></label></article>{preview && <article className="data-card preview"><h3>待导入预览</h3><p>共 {preview.records.length} 条记录：</p><ul>{Object.entries(preview.records.reduce<Record<string, number>>((counts, record) => ({ ...counts, [record.kind]: (counts[record.kind] || 0) + 1 }), {})).map(([kind, count]) => <li key={kind}>{kind}：{count}</li>)}</ul><div className="form-actions"><button className="button" onClick={() => void importPreview()} disabled={busy}>确认写入云端</button><button className="button secondary" onClick={() => setPreview(null)}>取消</button></div></article>}<article className="data-card"><h3>回收站 · 30 天</h3>{trash.length ? <div className="record-list">{trash.map((record) => <article className="record-card trash-card" key={record.id}><div><h3>{displayTitle(record)}</h3><p>{record.deletedAt ? `删除于 ${new Date(record.deletedAt).toLocaleString('zh-CN')}` : ''}</p></div><button className="button secondary" onClick={() => void restore(record)}>恢复</button></article>)}</div> : <p>回收站为空。</p>}</article></div></>}
      </section>
      {activeDefinition && <aside className="surface editor"><p className="kicker">{editing ? 'EDIT RECORD' : 'NEW RECORD'}</p><h2>{editing ? `编辑${activeDefinition.label}` : `新增${activeDefinition.label}`}</h2><form className="record-form" key={`${active}-${editing?.id || 'new'}-${editing?.version || 0}`} onSubmit={save}>{activeDefinition.fields.map((field) => <label className={field.type === 'checkbox' ? 'checkbox' : ''} key={field.key}>{field.type === 'checkbox' ? <><input name={field.key} type="checkbox" defaultChecked={Boolean(formValue(field, editing))} /><span>{field.label}</span></> : <><span>{field.label}</span>{field.type === 'textarea' ? <textarea name={field.key} required={field.required} placeholder={field.placeholder} defaultValue={String(formValue(field, editing))}></textarea> : field.type === 'select' ? <select name={field.key} defaultValue={String(formValue(field, editing))}>{field.options?.map((option) => <option key={option} value={option}>{option === 'high' ? '高' : option === 'medium' ? '中' : '低'}</option>)}</select> : <input name={field.key} type={field.type} required={field.required} step={field.type === 'number' ? '0.01' : undefined} defaultValue={String(formValue(field, editing))} />}</>}</label>)}<div className="form-actions"><button className="button" disabled={busy}>{busy ? '保存中…' : '保存到云端'}</button>{editing && <button className="button secondary" type="button" onClick={() => { setEditing(null); setConflict(null); setConflictDraft(null); }}>取消编辑</button>}</div></form>{conflict && <div className="conflict"><strong>检测到其他设备的新版本。</strong><p>载入云端版本会放弃当前表单修改；另存为副本会保留两份记录。</p><div className="form-actions"><button className="button secondary" onClick={() => { setEditing(conflict); setConflict(null); setConflictDraft(null); }}>载入云端版本</button><button className="button" onClick={() => void saveConflictCopy()}>另存为副本</button></div></div>}</aside>}
    </div>
  </div>;
}

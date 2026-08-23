export const LIFE_KEYS = {
  inbox: 'yuncun-life-inbox-v1',
  habits: 'yuncun-life-habits-v1',
  habitLog: 'yuncun-life-habit-log-v1',
  focusLog: 'yuncun-life-focus-log-v1',
  checklists: 'yuncun-life-checklists-v1',
  expiries: 'yuncun-life-expiries-v1',
  expenses: 'yuncun-life-expenses-v1',
  inventory: 'yuncun-life-inventory-v1',
  journal: 'yuncun-life-journal-v1',
  plans: 'yuncun-local-plans-v1',
  reading: 'yuncun-reading-list-v1',
  focus: 'yuncun-workspace-focus-v1',
  reminders: 'yuncun-life-reminders-v1',
} as const;

export const LIFE_UPDATED_EVENT = 'yuncun-life-updated';

export function readStored<T>(storage: Pick<Storage, 'getItem'>, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(storage: Pick<Storage, 'setItem'>, key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value));
}

export function localDateKey(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.valueOf() - offset).toISOString().slice(0, 10);
}

export function lifeId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}:${random}`;
}

export function announceLifeUpdate(detail?: string): void {
  window.dispatchEvent(new CustomEvent(LIFE_UPDATED_EVENT, { detail }));
}

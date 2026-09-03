export const PRIVATE_RECORD_KINDS = [
  'plan',
  'inbox',
  'habit',
  'habit-log',
  'focus-session',
  'focus-state',
  'checklist',
  'expiry',
  'expense',
  'inventory',
  'journal',
  'reminder',
  'capture-draft',
] as const;

export type PrivateRecordKind = typeof PRIVATE_RECORD_KINDS[number];

export interface PrivateRecordData {
  [key: string]: unknown;
}

export interface PrivateRecordInput {
  id?: string;
  kind: PrivateRecordKind;
  data: PrivateRecordData;
}

export interface PrivateRecord extends Required<PrivateRecordInput> {
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export const LEGACY_PRIVATE_STORAGE_KEYS = [
  'yuncun-life-inbox-v1',
  'yuncun-life-habits-v1',
  'yuncun-life-habit-log-v1',
  'yuncun-life-focus-log-v1',
  'yuncun-life-checklists-v1',
  'yuncun-life-expiries-v1',
  'yuncun-life-expenses-v1',
  'yuncun-life-inventory-v1',
  'yuncun-life-journal-v1',
  'yuncun-local-plans-v1',
  'yuncun-workspace-focus-v1',
  'yuncun-life-focus-state-v1',
  'yuncun-life-reminders-v1',
  'yuncun-capture-draft-v1',
] as const;

const arrayMappings: Record<string, PrivateRecordKind> = {
  'yuncun-life-inbox-v1': 'inbox',
  'yuncun-life-habits-v1': 'habit',
  'yuncun-life-focus-log-v1': 'focus-session',
  'yuncun-life-checklists-v1': 'checklist',
  'yuncun-life-expiries-v1': 'expiry',
  'yuncun-life-expenses-v1': 'expense',
  'yuncun-life-inventory-v1': 'inventory',
  'yuncun-life-journal-v1': 'journal',
  'yuncun-local-plans-v1': 'plan',
};

function objectData(value: unknown): PrivateRecordData | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as PrivateRecordData
    : null;
}

function safeId(kind: PrivateRecordKind, value: unknown, index: number): string {
  const candidate = objectData(value)?.id;
  if (typeof candidate === 'string' && /^[a-zA-Z0-9:_-]{1,128}$/.test(candidate) && !candidate.startsWith('__')) return candidate;
  return `${kind}:legacy:${index}`;
}

function safeIdPart(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 48);
  return cleaned || 'unknown';
}

export function collectLegacyPrivateSnapshot(storage: { getItem(key: string): string | null }): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const key of LEGACY_PRIVATE_STORAGE_KEYS) {
    try {
      const raw = storage.getItem(key);
      if (raw !== null) data[key] = JSON.parse(raw);
    } catch {
      // Invalid legacy values are omitted and reported through the preview counts.
    }
  }
  return data;
}

export function legacySnapshotToRecords(data: Record<string, unknown>): PrivateRecordInput[] {
  const records: PrivateRecordInput[] = [];
  for (const [key, kind] of Object.entries(arrayMappings)) {
    const values = data[key];
    if (!Array.isArray(values)) continue;
    values.forEach((value, index) => {
      const item = objectData(value);
      if (item) records.push({ id: safeId(kind, value, index), kind, data: item });
    });
  }

  const habitLog = objectData(data['yuncun-life-habit-log-v1']);
  if (habitLog) {
    Object.entries(habitLog).forEach(([date, ids]) => {
      if (!Array.isArray(ids)) return;
      ids.forEach((habitId) => {
        if (typeof habitId !== 'string' || !habitId) return;
        records.push({ id: `habit-log:${safeIdPart(date)}:${safeIdPart(habitId)}`, kind: 'habit-log', data: { date, habitId, completed: true } });
      });
    });
  }

  const singletonMappings: Array<[string, PrivateRecordKind, string]> = [
    ['yuncun-workspace-focus-v1', 'focus-state', 'focus-state:workspace'],
    ['yuncun-life-focus-state-v1', 'focus-state', 'focus-state:timer'],
    ['yuncun-life-reminders-v1', 'reminder', 'reminder:state'],
    ['yuncun-capture-draft-v1', 'capture-draft', 'capture-draft:current'],
  ];
  singletonMappings.forEach(([key, kind, id]) => {
    const item = objectData(data[key]);
    if (item) records.push({ id, kind, data: item });
  });

  return records;
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

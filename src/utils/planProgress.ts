export type PlanStatus = '构想中' | '进行中' | '暂停' | '已完成';
export type PlanPriority = '高' | '中' | '低';
export type PlanItemStatus = '待开始' | '待办' | '进行中' | '已完成';
export type DueState = 'overdue' | 'upcoming' | 'later' | 'undated';

export interface MilestoneLike {
  status: PlanItemStatus;
}

export interface SortablePlan {
  status: PlanStatus;
  priority: PlanPriority;
  targetAt?: Date | string;
  updatedAt: Date | string;
}

const DAY_MS = 86_400_000;
const statusRank: Record<PlanStatus, number> = { '进行中': 0, '构想中': 1, '暂停': 2, '已完成': 3 };
const priorityRank: Record<PlanPriority, number> = { '高': 0, '中': 1, '低': 2 };

export function calculatePlanProgress(milestones: MilestoneLike[]): number | null {
  if (milestones.length === 0) return null;
  const completed = milestones.filter(({ status }) => status === '已完成').length;
  return Math.round((completed / milestones.length) * 100);
}

function dateKey(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function shanghaiDateKey(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

export function daysUntil(dueAt: Date | string, now = new Date()): number {
  return dayNumber(dateKey(dueAt)) - dayNumber(shanghaiDateKey(now));
}

export function classifyDueDate(dueAt?: Date | string, now = new Date()): DueState {
  if (!dueAt) return 'undated';
  const days = daysUntil(dueAt, now);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'upcoming';
  return 'later';
}

export function comparePlans<T extends SortablePlan>(left: T, right: T): number {
  const byStatus = statusRank[left.status] - statusRank[right.status];
  if (byStatus !== 0) return byStatus;
  const byPriority = priorityRank[left.priority] - priorityRank[right.priority];
  if (byPriority !== 0) return byPriority;
  const leftTarget = left.targetAt ? Date.parse(dateKey(left.targetAt)) : Number.POSITIVE_INFINITY;
  const rightTarget = right.targetAt ? Date.parse(dateKey(right.targetAt)) : Number.POSITIVE_INFINITY;
  if (leftTarget !== rightTarget) return leftTarget - rightTarget;
  return Date.parse(dateKey(right.updatedAt)) - Date.parse(dateKey(left.updatedAt));
}

export function priorityValue(priority: PlanPriority): number {
  return priorityRank[priority];
}

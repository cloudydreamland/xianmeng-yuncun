import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculatePlanProgress,
  classifyDueDate,
  comparePlans,
  daysUntil,
} from '../../src/utils/planProgress.ts';

test('里程碑进度只计算已完成项目', () => {
  assert.equal(calculatePlanProgress([]), null);
  assert.equal(calculatePlanProgress([{ status: '已完成' }, { status: '进行中' }, { status: '待开始' }]), 33);
  assert.equal(calculatePlanProgress([{ status: '已完成' }, { status: '已完成' }]), 100);
});

test('截止日期按 Asia/Shanghai 的自然日分类', () => {
  const now = new Date('2026-07-22T04:00:00.000Z');
  assert.equal(daysUntil('2026-07-21', now), -1);
  assert.equal(classifyDueDate('2026-07-21', now), 'overdue');
  assert.equal(classifyDueDate('2026-07-22', now), 'upcoming');
  assert.equal(classifyDueDate('2026-07-29', now), 'upcoming');
  assert.equal(classifyDueDate('2026-07-30', now), 'later');
  assert.equal(classifyDueDate(undefined, now), 'undated');
});

test('计划按状态、优先级、目标日期和更新时间排序', () => {
  const plans = [
    { title: '完成项', status: '已完成' as const, priority: '高' as const, updatedAt: '2026-07-22' },
    { title: '低优先', status: '进行中' as const, priority: '低' as const, updatedAt: '2026-07-22' },
    { title: '较晚目标', status: '进行中' as const, priority: '高' as const, targetAt: '2026-08-20', updatedAt: '2026-07-22' },
    { title: '较近目标', status: '进行中' as const, priority: '高' as const, targetAt: '2026-08-01', updatedAt: '2026-07-20' },
  ];
  plans.sort(comparePlans);
  assert.deepEqual(plans.map(({ title }) => title), ['较近目标', '较晚目标', '低优先', '完成项']);
});

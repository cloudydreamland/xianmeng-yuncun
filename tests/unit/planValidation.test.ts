import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPlanProjectReferences, planSchema } from '../../src/schemas/plan.ts';

const validPlan = {
  title: '月潭推进台',
  slug: 'moon-pool-dashboard',
  summary: '公开展示项目进度。',
  area: '站点建设',
  status: '进行中',
  priority: '高',
  updatedAt: '2026-07-22',
  featured: true,
  tags: ['月潭'],
  milestones: [{ id: 'schema', title: '建立模型', status: '已完成' }],
  nextActions: [{ id: 'verify', title: '完成验收', status: '进行中' }],
};

test('计划 Schema 接受符合规则的进行中计划', () => {
  assert.equal(planSchema.safeParse(validPlan).success, true);
});

test('计划 Schema 拒绝重复数组 ID', () => {
  const result = planSchema.safeParse({
    ...validPlan,
    milestones: [
      { id: 'same-id', title: '第一项', status: '已完成' },
      { id: 'same-id', title: '第二项', status: '进行中' },
    ],
  });
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.message, /id 必须唯一/);
});

test('进行中计划必须保留未完成行动', () => {
  const result = planSchema.safeParse({
    ...validPlan,
    nextActions: [{ id: 'done', title: '已经结束', status: '已完成' }],
  });
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.message, /至少需要一个未完成行动/);
});

test('已完成计划不能保留未完成里程碑', () => {
  const result = planSchema.safeParse({
    ...validPlan,
    status: '已完成',
    milestones: [{ id: 'pending', title: '尚未结束', status: '进行中' }],
  });
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.message, /所有里程碑都必须完成/);
});

test('计划关联必须指向真实项目', () => {
  assert.throws(
    () => assertPlanProjectReferences(
      [{ data: { slug: 'moon-pool-dashboard', projectSlug: 'missing-project' } }],
      ['yuncun-blog'],
    ),
    /关联了不存在的项目/,
  );
});

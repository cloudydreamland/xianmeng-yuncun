import { z } from 'astro/zod';

export const contentSlugSchema = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'slug 只能包含小写英文字母、数字和短横线',
);

const milestoneStatus = z.enum(['待开始', '进行中', '已完成']);
const actionStatus = z.enum(['待办', '进行中', '已完成']);

export const planSchema = z.object({
  title: z.string().min(1),
  slug: contentSlugSchema,
  summary: z.string().min(1),
  area: z.string().min(1),
  status: z.enum(['构想中', '进行中', '暂停', '已完成']),
  priority: z.enum(['高', '中', '低']),
  startedAt: z.coerce.date().optional(),
  targetAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date(),
  projectSlug: contentSlugSchema.optional(),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  milestones: z.array(z.object({
    id: contentSlugSchema,
    title: z.string().min(1),
    status: milestoneStatus,
    targetAt: z.coerce.date().optional(),
  })).default([]),
  nextActions: z.array(z.object({
    id: contentSlugSchema,
    title: z.string().min(1),
    status: actionStatus,
    dueAt: z.coerce.date().optional(),
  })).default([]),
}).superRefine((plan, context) => {
  const addDuplicateIssues = (items: Array<{ id: string }>, path: 'milestones' | 'nextActions') => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.id)) {
        context.addIssue({ code: 'custom', path: [path, index, 'id'], message: `${path} 中的 id 必须唯一` });
      }
      seen.add(item.id);
    });
  };

  addDuplicateIssues(plan.milestones, 'milestones');
  addDuplicateIssues(plan.nextActions, 'nextActions');

  if (plan.status === '进行中') {
    if (plan.milestones.length === 0) {
      context.addIssue({ code: 'custom', path: ['milestones'], message: '进行中的计划至少需要一个里程碑' });
    }
    if (!plan.nextActions.some((action) => action.status !== '已完成')) {
      context.addIssue({ code: 'custom', path: ['nextActions'], message: '进行中的计划至少需要一个未完成行动' });
    }
  }

  if (plan.status === '已完成' && plan.milestones.some((milestone) => milestone.status !== '已完成')) {
    context.addIssue({ code: 'custom', path: ['milestones'], message: '已完成计划的所有里程碑都必须完成' });
  }
});

type PlanReference = {
  data: {
    slug: string;
    projectSlug?: string;
  };
};

export function assertPlanProjectReferences(plans: PlanReference[], projectSlugs: Iterable<string>) {
  const knownProjects = new Set(projectSlugs);
  const invalidPlan = plans.find(({ data }) => data.projectSlug && !knownProjects.has(data.projectSlug));
  if (invalidPlan?.data.projectSlug) {
    throw new Error(`计划 ${invalidPlan.data.slug} 关联了不存在的项目：${invalidPlan.data.projectSlug}`);
  }
}

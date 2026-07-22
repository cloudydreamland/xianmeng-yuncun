import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { contentSlugSchema as slug, planSchema } from './schemas/plan';

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    slug,
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string(),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    slug,
    description: z.string(),
    period: z.string(),
    status: z.enum(['构想中', '进行中', '已完成', '持续维护']),
    stack: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    repoUrl: z.url().optional(),
    demoUrl: z.url().optional(),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});

const plans = defineCollection({
  loader: glob({ base: './src/content/plans', pattern: '**/*.{md,mdx}' }),
  schema: planSchema,
});

const regions = defineCollection({
  loader: glob({ base: './src/content/regions', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    slug,
    realm: z.enum(['闲梦', '浮屿']),
    summary: z.string(),
    quote: z.string(),
    functionTitle: z.string(),
    functionDescription: z.string(),
    status: z.enum(['active', 'planned']),
    order: z.number().int().min(1),
    theme: z.enum(['village', 'wind', 'star', 'moon', 'rain', 'snow', 'lantern']),
  }),
});

const works = defineCollection({
  loader: glob({ base: './src/content/works', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) => z.object({
    title: z.string(),
    slug,
    summary: z.string(),
    createdAt: z.coerce.date().optional(),
    publishedAt: z.coerce.date(),
    category: z.enum(['摄影', '插画', '生成艺术', '设计实验']),
    tags: z.array(z.string()).default([]),
    cover: image(),
    coverAlt: z.string().min(1),
    images: z.array(z.object({
      src: image(),
      alt: z.string().min(1),
      caption: z.string().optional(),
    })).min(1),
    creationMode: z.enum(['原创拍摄', '手工创作', 'AI辅助', '混合创作']).optional(),
    tools: z.array(z.string()).default([]),
    processNote: z.string().min(1).optional(),
    credit: z.string().min(1).optional(),
    creditUrl: z.url().optional(),
    license: z.enum(['all-rights-reserved', 'cc-by-nc-4.0']).default('all-rights-reserved'),
    featured: z.boolean().default(false),
    draft: z.boolean().default(true),
  }).superRefine((work, context) => {
    if ((work.creationMode === 'AI辅助' || work.creationMode === '混合创作') && work.tools.length === 0) {
      context.addIssue({
        code: 'custom',
        path: ['tools'],
        message: 'AI辅助或混合创作必须填写 tools',
      });
    }
  }),
});

export const collections = { notes, projects, plans, regions, works };

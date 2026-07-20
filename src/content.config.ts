import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const slug = z.string().regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  'slug 只能包含小写英文字母、数字和短横线',
);

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

export const collections = { notes, projects, regions };

import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string(),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    period: z.string(),
    status: z.enum(['构想中', '进行中', '已完成', '持续维护']),
    stack: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    repoUrl: z.url().optional(),
    demoUrl: z.url().optional(),
    cover: z.string().optional(),
  }),
});

export const collections = { notes, projects };

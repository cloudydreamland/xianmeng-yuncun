import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { fileURLToPath } from 'node:url';

const picomatchCompatPath = fileURLToPath(new URL('./scripts/picomatch-compat.mjs', import.meta.url));
const sitemapExcludedPaths = new Set(['/learn/', '/notes/', '/projects/', '/workspace/', '/private-migration/']);

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://xianmeng-yuncun.pages.dev',
  integrations: [react(), mdx(), sitemap({
    filter: (page) => !sitemapExcludedPaths.has(new URL(page).pathname),
  })],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  markdown: {
    processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }),
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
  vite: {
    cacheDir: process.env.YUNCUN_VITE_CACHE_DIR || 'node_modules/.vite',
    resolve: {
      alias: {
        picomatch: picomatchCompatPath,
      },
      noExternal: ['animal-island-ui'],
    },
    build: {
      cssMinify: true,
    },
  },
});

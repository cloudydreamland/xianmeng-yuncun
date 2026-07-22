import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';

const picomatchCompatPath = fileURLToPath(new URL('./scripts/picomatch-compat.mjs', import.meta.url));

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://xianmeng-yuncun.pages.dev',
  integrations: [react(), mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
  vite: {
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

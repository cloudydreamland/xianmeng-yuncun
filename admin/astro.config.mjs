import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: process.env.PUBLIC_ADMIN_ORIGIN || 'https://xianmeng-yuncun-admin.pages.dev',
  integrations: [react()],
  output: 'static',
  vite: { build: { sourcemap: false } },
});

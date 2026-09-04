import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './auth-tests', workers: 1, reporter: 'list', timeout: 60000,
  use: { baseURL: 'https://localhost:4323', ignoreHTTPSErrors: true, trace: 'off' },
  webServer: { command: 'node scripts/auth-preview.mjs', url: 'https://localhost:4323/login/', ignoreHTTPSErrors: true, reuseExistingServer: false, timeout: 120000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

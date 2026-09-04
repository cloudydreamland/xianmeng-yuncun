import { test, expect } from '@playwright/test';

test('完整设备绑定、云端保存、退出、重新登录与账户保护', async ({ page, context }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  await cdp.send('WebAuthn.addVirtualAuthenticator', { options: { protocol: 'ctap2', ctap2Version: 'ctap2_1', transport: 'internal', hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } });
  await page.goto('/');
  await expect(page).toHaveURL(/\/login\/$/);
  await page.getByLabel('一次性初始化凭据').fill('A'.repeat(43));
  await page.getByLabel('设备名称').fill('测试设备');
  await page.getByRole('button', { name: '验证并绑定通行密钥' }).click();
  await expect(page.getByRole('heading', { name: '请保存恢复码' })).toBeVisible();
  await page.getByLabel('我已安全保存恢复码').check();
  await page.getByRole('button', { name: '完成', exact: true }).click();
  await expect(page.getByRole('heading', { name: '我的工作台' })).toBeVisible();
  await page.getByRole('button', { name: '私人计划', exact: true }).click();
  await page.getByLabel('计划名称').fill('本地隔离测试计划');
  await page.getByRole('button', { name: '保存到云端' }).click();
  await expect(page.getByRole('status')).toContainText('已保存到私人云端');
  await page.reload();
  await page.getByRole('button', { name: '私人计划', exact: true }).click();
  await expect(page.getByRole('heading', { name: '本地隔离测试计划' })).toBeVisible();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(page).toHaveURL(/\/login\/$/);
  const denied = await context.request.get('/api/records'); expect(denied.status()).toBe(401);
  await page.getByRole('button', { name: '使用通行密钥登录' }).click();
  await expect(page.getByRole('heading', { name: '我的工作台' })).toBeVisible();
  await page.getByRole('button', { name: '数据与备份' }).click();
  await page.getByText('备用通行密钥与恢复码', { exact: true }).click();
  await expect(page.getByText('测试设备 · 当前登录密钥')).toBeVisible();
  // Switch the existing singleton administrator to a dedicated website password.
  await page.getByLabel('管理员 QQ 邮箱').fill('123456789@qq.com');
  await page.getByLabel('新网站密码', { exact: true }).fill('Moon-River-Copper!92');
  await page.getByLabel('确认新密码', { exact: true }).fill('Moon-River-Copper!92');
  await page.getByRole('button', { name: '验证身份并启用密码登录' }).click();
  await expect(page.getByText('网站密码已保存。其他会话已退出；以后可在任意设备使用 QQ 邮箱和此密码登录。')).toBeVisible();
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  // No authenticator required for subsequent ordinary logins.
  await cdp.send('WebAuthn.disable');
  await page.getByLabel('QQ 邮箱', { exact: true }).fill('123456789@qq.com');
  await page.getByLabel('网站专用密码', { exact: true }).fill('Moon-River-Copper!92');
  await page.getByRole('button', { name: '邮箱密码登录' }).click();
  await expect(page.getByRole('heading', { name: '我的工作台' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '私人计划', exact: true }).click();
  await expect(page.getByRole('heading', { name: '本地隔离测试计划' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  expect(errors).toEqual([]);
});

test('未登录不能访问页面、导出或写入，且禁止缓存和跨站提交', async ({ request }) => {
  for (const path of ['/api/session', '/api/records', '/api/export', '/api/auth/security']) {
    const response = await request.get(path); expect(response.status()).toBe(401); expect(response.headers()['cache-control']).toContain('no-store');
  }
  const response = await request.post('/api/records', { data: { kind: 'plan', data: { title: '不应写入' } } }); expect(response.status()).toBe(401);
  const csrf = await request.post('/api/auth/login-options', { data: {}, headers: { origin: 'https://evil.example' } }); expect(csrf.status()).toBe(403);
  const login = await request.get('/login/'); expect(login.headers()['content-security-policy']).toContain("script-src 'self' 'nonce-");
  expect(login.headers()['x-robots-tag']).toContain('noindex');
});

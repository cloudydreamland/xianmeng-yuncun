import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { realmNavigation } from '../../src/data/realms.ts';
import { regionDirectories } from '../../src/data/regionDirectory.ts';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('七境公开名称、功能与路由只有一份规范来源', () => {
  assert.equal(Object.keys(realmNavigation).length, 7);
  assert.equal(new Set(Object.values(realmNavigation).map((realm) => realm.href)).size, 7);
  assert.equal(Object.keys(regionDirectories).length, 7);
  assert.equal(realmNavigation['snow-cliff'].functionLabel, '静心与休憩');
});

test('公开布局和境域页不再挂载私人编辑或同步组件', () => {
  const layout = read('../../src/layouts/BaseLayout.astro');
  const regions = read('../../src/pages/world/[slug].astro');
  for (const privateComponent of ['QuickCapture', 'ReminderCenter', 'SyncAgent', 'PrivateToolPortal']) {
    assert.doesNotMatch(`${layout}\n${regions}`, new RegExp(privateComponent));
  }
  assert.doesNotMatch(read('../../src/components/HeaderV2.astro'), /\/workspace\/|data-reminder-open/);
});

test('当前公开说明不再宣称私人工作台只存本机或不存在的雪崖功能', () => {
  const currentSurfaces = [
    read('../../src/pages/index.astro'),
    read('../../src/content/regions/cloud-village.mdx'),
    read('../../src/content/regions/snow-cliff.mdx'),
    read('../../src/content/projects/yuncun-blog.mdx'),
    read('../../src/content/plans/yuncun-next-stage.mdx'),
  ].join('\n');
  assert.doesNotMatch(currentSurfaces, /默认保存在本机|持有同步密码|26 个页面|75\+|不提前建设账号|习惯打卡、联系说明和友人链接/);
});

test('Cloudflare Pages 对旧入口使用正式重定向', () => {
  const redirects = read('../../public/_redirects');
  assert.match(redirects, /^\/workspace\/\* https:\/\/xianmeng-yuncun-admin\.pages\.dev\/:splat 302/m);
  for (const route of ['notes', 'projects', 'learn']) assert.match(redirects, new RegExp(`^/${route}/? `, 'm'));
});

test('重定向页和迁移桥不会进入 Sitemap', () => {
  const config = read('../../astro.config.mjs');
  for (const route of ['/learn/', '/notes/', '/projects/', '/workspace/', '/private-migration/']) assert.match(config, new RegExp(route.replaceAll('/', '\\/')));
  assert.match(config, /sitemap\(\{\s*filter:/);
});

test('管理端认证说明统一为邮箱密码与备用通行密钥，整站必须经过中间件', () => {
  const surfaces = [read('../../admin/.env.example'), read('../../admin/src/components/AdminWorkspace.tsx'), read('../../src/content/projects/yuncun-blog.mdx')].join('\n');
  assert.doesNotMatch(surfaces, /Cloudflare Access|CF_ACCESS_|cdn-cgi\/access/);
  assert.match(surfaces, /通行密钥/);
  assert.match(read('../../admin/src/components/PasswordAuth.tsx'), /邮箱密码登录/);
  assert.match(read('../../docs/private-sync.md'), /历史方案，仅用于旧数据迁移参考/);
  assert.deepEqual(JSON.parse(read('../../admin/public/_routes.json')).include, ['/*']);
  assert.match(read('../../admin/functions/_middleware.ts'), /requireAdmin/);
});

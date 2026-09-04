// Produces a local-only enrollment handoff. Never prints the token to logs.
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../../.tmp/', import.meta.url));
mkdirSync(directory, { recursive: true });
const path = fileURLToPath(new URL('../../.tmp/admin-first-enrollment.txt', import.meta.url));
const token = randomBytes(32).toString('base64url');
const hash = createHash('sha256').update(token).digest('base64url');
const content = `闲梦私人工作台 · 首次绑定\n\n请本人完成下面两步，不要把此文件发到聊天、仓库或公开站。\n\n1. Cloudflare > xianmeng-yuncun-admin > Settings > Variables and Secrets\n新增 Secret，名称 ADMIN_SETUP_TOKEN_HASH，值为下面这行哈希（不是原始凭据）：\n${hash}\n保存后重新部署管理项目。\n\n2. 打开 https://xianmeng-yuncun-admin.pages.dev/login/\n在“一次性初始化凭据”栏输入下面这行原始凭据：\n${token}\n\n绑定设备、下载恢复码，并确认已妥善保存。完成首次绑定后，移除上面的初始化 Secret 并重新部署。\n管理员已经存在时，此凭据无效。不要为了重新绑定而删除 auth_admin 或私人数据。\n本文件用完请自行删除。\n`;
// Fail rather than overwrite an enrollment handoff from an earlier run.
writeFileSync(path, content, { flag: 'wx', mode: 0o600 });
console.log(`已生成本机首次绑定说明：${path}（内容未输出到日志）`);

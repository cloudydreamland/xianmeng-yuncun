# 私人跨设备同步

私人同步沿用现有 Cloudflare Pages 部署，但不会把生活数据明文交给服务器：浏览器用用户口令派生 AES-GCM 钥匙，D1 只保存加密信封、校验和、修订号和匿名化所有者键。口令不会发送到服务器。

## 安全边界

- `/api/sync` 必须放在 Cloudflare Access 后面；函数仍会再次验证 `Cf-Access-Jwt-Assertion` 的 RS256 签名、签发者、受众、有效期和邮箱允许名单。
- 加密口令至少 12 个字符。口令遗失后无法恢复云端快照，应继续保留工作台 JSON 备份。
- 云端采用条件修订号写入；另一台设备先写入时返回冲突，客户端必须重新拉取并进行三方合并。
- D1 的 `owner` 是允许邮箱的 SHA-256 值，不保存邮箱明文。
- 自动同步只在用户明确同意后启用；界面提供随时停用、锁定本机钥匙和删除云端副本的入口。

## Cloudflare 配置

1. 创建 D1 数据库，并执行 `migrations/0001_sync_snapshots.sql`。
2. 在 Pages 项目的 Settings → Bindings 中添加 D1 binding，变量名必须为 `YUNCUN_DB`，然后重新部署。
3. 在 Cloudflare Zero Trust 中为 `/api/sync*` 建立 Access Self-hosted 应用，只允许个人邮箱访问。
4. 在 Pages Functions 的生产与预览环境配置：
   - `CF_ACCESS_TEAM_DOMAIN`：例如 `https://your-team.cloudflareaccess.com`
   - `CF_ACCESS_AUD`：Access 应用的 AUD Tag
   - `SYNC_ALLOWED_EMAIL`：一个邮箱，或逗号分隔的少量允许邮箱
5. 部署后，先验证未登录请求返回 403，再由工作台显式连接。

`public/_routes.json` 将 Functions 调用限制在 `/api/*`，其他页面继续走免费的静态资源路径。

Cloudflare 官方资料：[Pages D1 bindings](https://developers.cloudflare.com/pages/functions/bindings/)、[Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/)、[Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)。

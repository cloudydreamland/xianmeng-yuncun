# 私人跨设备同步

私人同步沿用现有 Cloudflare Pages 和 D1，不要求开通 Zero Trust 付费结算。浏览器用同步密码派生 AES-GCM 钥匙，D1 只保存加密信封、校验和与修订号；同步密码不会发送到服务器。

## 安全边界

- `/api/sync` 要求 `Authorization: Bearer <访问密钥>`。Pages Secret 只保存访问密钥的 SHA-256 哈希，不保存访问密钥明文。
- 访问密钥与同步密码职责不同：前者阻止陌生请求，后者加密实际内容。不要将两者设为同一个值。
- 加密口令至少 12 个字符。口令遗失后无法恢复云端快照，应继续保留工作台 JSON 备份。
- 云端采用条件修订号写入；另一台设备先写入时返回冲突，客户端必须重新拉取并进行三方合并。
- 当前站点是单用户同步，D1 使用固定的私有 owner 键；轮换访问密钥不会改变已有快照的归属。
- 自动同步只在用户明确同意后启用；界面提供随时停用、锁定本机钥匙和删除云端副本的入口。

## Cloudflare 配置

1. 创建 D1 数据库，并执行 `migrations/0001_sync_snapshots.sql`。
2. 在 Pages 项目的 Settings → Bindings 中添加 D1 binding，变量名必须为 `YUNCUN_DB`，然后重新部署。
3. 离线生成至少 32 字节的随机访问密钥，并计算其小写 SHA-256 十六进制哈希。访问密钥保存在密码管理器中，仓库和 Cloudflare 都只接触哈希。
4. 在 Pages 项目的生产与预览环境分别添加 Secret：`SYNC_ACCESS_TOKEN_HASH=<64 位小写哈希>`。
5. 重新部署后，先验证无 `Authorization` 请求返回 403，再在工作台粘贴访问密钥和同步密码完成首次连接。

若要轮换访问密钥，只需生成新值、替换两个环境的 Secret 并重新部署。已有 D1 密文不需要迁移；已登录设备需要重新粘贴新访问密钥。

`public/_routes.json` 将 Functions 调用限制在 `/api/*`，其他页面继续走免费的静态资源路径。

Cloudflare 官方资料：[Pages D1 bindings](https://developers.cloudflare.com/pages/functions/bindings/)、[Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/)、[Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)。

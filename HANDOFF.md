# “闲梦 · 云村”项目交接说明

> 更新：2026-07-19  
> 接手分支：`main`  
> 像素绘本重构来源分支：`codex/pixel-storybook-redesign`

这份文件是下一位开发者或 AI 的项目入口。请先读完再改代码。

## 当前真实状态

- 生产站 <https://xianmeng-yuncun.pages.dev/> 由 `main` 自动发布；`main` 已包含第四、第五阶段，推送后的实际部署状态以 Cloudflare 为准。
- 历史继承关系是：旧 `main` → `feature/cms-authoring` → `codex/pixel-storybook-redesign` → 当前 `main`。
- 搜索、筛选、阅读工具、Sveltia 后台代码、项目详情、四时地图和像素绘本视觉都已合入 `main`。
- 最新完整生产构建通过：Astro/TypeScript 无错误，Pagefind 成功生成索引。
- 后续功能应从最新 `main` 新建分支开发，通过构建和预览验收后再合并。

## 本地启动

需要 Node.js 22 和 pnpm。

```powershell
git clone https://github.com/cloudydreamland/xianmeng-yuncun.git
cd xianmeng-yuncun
git switch main
pnpm install
pnpm dev
```

浏览器打开终端显示的地址，通常是 `http://localhost:4321`。

```powershell
pnpm build
pnpm preview
```

`pnpm build` 会生成 Astro 静态站及 `dist/pagefind` 搜索索引。开发模式没有完整 Pagefind 索引是正常现象。

## 主要文件

- `src/components/VillageMap.tsx`：首页地图、地点窗口、时间切换与键盘交互。
- `src/data/villageCopy.ts`：地点和四时固定文案。
- `src/styles/global.css`：像素绘本设计系统和全站布局。
- `src/content/notes/`、`src/content/projects/`：MDX 内容。
- `public/images/village/`：四时桌面／移动背景与精灵。
- `public/admin/`：Sveltia CMS 配置和预览样式。
- `src/content.config.ts`：内容字段定义。

替换四时图片时必须保持建筑、河流和三个热点位置一致，并同时更新桌面与移动素材。

## 已完成

- 首页单屏探索地图，支持 `#study`、`#workshop`、`#mountain` 分享与恢复。
- 清晨、白昼、黄昏、夜晚切换不同背景文件，并记忆手动选择。
- 地点入口支持鼠标、触摸、键盘、`Esc` 和焦点恢复。
- 笔记筛选、全站搜索、阅读进度、目录定位、代码复制、阅读时间。
- 项目详情、显式 slug、封面、Open Graph 回退及项目搜索直达。
- `/admin/` 页面、中文内容字段和仓库媒体规则。
- RSS、Sitemap、robots、404、草稿过滤和 Cloudflare Pages 构建链路。

## 唯一实质性基础设施尾项：Sveltia OAuth

后台页面可以打开，但登录保存尚不能使用。下一位 AI 不得编造 Worker 地址或密钥。

需要用户配合完成：

1. 部署官方 `sveltia/sveltia-cms-auth` Cloudflare Worker，建议名 `xianmeng-yuncun-cms-auth`。
2. 创建 GitHub OAuth App：Homepage 为 `https://xianmeng-yuncun.pages.dev/admin/`，Callback 为 `https://<真实-worker-域名>/callback`。
3. 只在 Worker 加密变量中保存 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、`ALLOWED_DOMAINS`，绝不能提交仓库。
4. 在 `public/admin/config.yml` 的 `backend` 下加入真实 `base_url`。
5. 在 `public/_headers` 的 `/admin/*` CSP `connect-src` 中加入真实 Worker 源站。
6. 重新构建并验证登录、创建、预览和发布。

固定版本 Sveltia CMS `0.171.1` 对 editorial workflow 的实际支持需要复核。当前虽然保留 `publish_mode: editorial_workflow`，但真实验收前不能宣称 Pull Request 审阅流程可用；如版本不支持，应升级到经过验证的固定版本，或明确使用直接提交流程。

## 其他未上线内容

- 个人简介、联系方式、部分笔记和项目仍是演示内容。
- 云灵桌宠、天气、真实环境音、评论、用户系统和完整地图是明确延期项，不是代码遗漏。
- Animal Island UI 目前只加载全局样式。其 React 组件在 Astro 7 服务端构建时出现过 CSS Module 兼容问题，恢复组件导入前必须先验证 `pnpm build`。

## 接手顺序

1. 切换当前分支，执行 `pnpm build`。
2. 本地检查四时、三个地点、搜索、笔记和项目详情。
3. 新改动先让用户验收 Cloudflare 分支预览。
4. 用户要启用后台时，再完成 OAuth Worker。
5. 得到明确上线许可后，创建功能分支到 `main` 的 Pull Request。
6. 合并后检查生产站、RSS、Sitemap、Pagefind、404 与 `/admin/`。

## 上线检查

- [ ] 桌面和手机四时背景正确，热点没有偏位。
- [ ] 地点哈希刷新、前进后退、键盘和减少动态模式正常。
- [ ] 搜索、筛选、阅读工具和项目详情正常。
- [ ] 草稿不进入页面、RSS、Sitemap 与 Pagefind。
- [ ] `/admin/` 不进入公开导航、Sitemap 或搜索引擎索引。
- [ ] OAuth 密钥未进入 Git、前端资源或 Pages 环境变量。
- [ ] `pnpm build` 零错误。
- [ ] 用户明确同意后才合并 `main`。

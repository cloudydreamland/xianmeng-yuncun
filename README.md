# 闲梦 · 云村

一座藏在云墙后的个人数字村落，用于发布笔记、项目经历与个人介绍。站点以 Astro 静态生成，Markdown/MDX 管理内容，React 只负责首次入村的云幕交互。

## 本地运行

环境要求：Node.js 20.11 或更高版本，推荐使用 pnpm。

```bash
pnpm install
pnpm dev
```

生产检查与预览：

```bash
pnpm build
pnpm preview
```

构建产物输出到 `dist/`。`pnpm build` 会在 Astro 静态页面生成后继续运行 Pagefind，并把中文全文搜索索引写入 `dist/pagefind/`；因此开发服务器中搜索面板会提示索引尚未生成，完整搜索功能请使用上述生产预览流程验证。

## 添加笔记

在 `src/content/notes/` 新建 `.md` 或 `.mdx` 文件：

```yaml
---
title: 文章标题
description: 用于列表和 SEO 的简短说明
publishedAt: 2026-07-17
updatedAt: 2026-07-18 # 可选
slug: first-note
tags: [标签一, 标签二]
category: 分类名称
draft: false
cover: /images/example.webp # 可选
coverAlt: 封面中的山窗与白云 # 可选
---
```

`draft: true` 的笔记不会进入生产页面、RSS 或 Sitemap。`slug` 必须使用小写英文／拼音、数字和短横线，并与文件名保持一致；例如 `first-note.mdx` 对应 `/notes/first-note/`。

## 添加项目

在 `src/content/projects/` 新建 `.md` 或 `.mdx` 文件：

```yaml
---
title: 项目名称
slug: project-name
description: 项目的一句话说明
period: 2026.07 — 至今
status: 持续维护 # 构想中 / 进行中 / 已完成 / 持续维护
stack: [Astro, TypeScript]
featured: true
repoUrl: https://github.com/example/repo # 可选
demoUrl: https://example.com # 可选
cover: /images/example.webp # 可选
coverAlt: 项目界面预览 # 可选
---
```

每个项目会生成独立详情页 `/projects/<slug>/`，项目正文会显示在详情页中并单独进入 Pagefind 搜索索引。

## 可视化内容后台

后台入口为 `/admin/`，使用固定版本 `@sveltia/cms@0.171.1`。后台不显示在公开导航、RSS、Sitemap 或 Pagefind 中，并被搜索引擎规则标记为 `noindex`。

- “笔记”和“项目”两个集合与 Astro 内容模型一一对应，保存为 `src/content` 下的 MDX。
- 图片写入 `public/uploads/`，只接受 AVIF、WebP、JPEG 与 PNG，单文件上限 2MB。
- PAT 登录已禁用，只显示 GitHub OAuth。
- OAuth Worker 使用官方 `sveltia/sveltia-cms-auth`，Worker 名称为 `xianmeng-yuncun-cms-auth`。
- `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET` 与 `ALLOWED_DOMAINS` 只配置在 Cloudflare Worker；Client Secret 必须作为加密变量，绝不能写入仓库。

OAuth 完成后，将 Worker 的 HTTPS 地址写入 `public/admin/config.yml` 的 `backend.base_url`，并把同一精确源加入 `public/_headers` 中 `/admin/*` 的 `connect-src`。

> Sveltia 官方当前仍将 Editorial Workflow 标记为未实现。配置已保留 `publish_mode: editorial_workflow`，但在官方版本提供该能力之前，不能把它当作可用的 Pull Request 审阅流程；内容发布仍需在 GitHub 中复核提交行为。

## 更换主视觉

首页当前使用 `public/images/yuncun-cloudwall.webp`。替换时建议：

- 保持约 2:1 横向比例，推荐宽度 1800–2400px。
- 主要视觉焦点放在中部偏右，左上保留低细节区域供标题使用。
- 输出 WebP 或 AVIF，建议控制在 500KB 内。
- 同步修改 `src/pages/index.astro` 中的图片尺寸与替代文本。

## 沉浸漫游与环境状态

首页的四幕入村体验由 `VillageJourney` 负责。桌面端按照页面滚动进度切换场景，移动端与减少动态模式会显示为静态分幕。

- 环境光色支持自动、清晨、白昼、黄昏和夜晚，访客选择保存在 `localStorage['yuncun-time-mode']`。
- 地点入口通过组件的 `locations` 属性配置，默认指向笔记、项目和关于页面。
- 可选 `ambienceSrc` 属性接受 `{ mp3?: string, ogg?: string }`。只有传入有效音源时才会渲染播放器和声音开关。
- 替换主视觉时无需改动滚动逻辑，保持图片路径、尺寸和替代文本同步即可。

## Cloudflare Pages 部署

1. 将项目推送到 GitHub 或 GitLab。
2. 在 Cloudflare Dashboard 的 Workers & Pages 中创建 Pages 项目并连接仓库。
3. 构建命令填写 `pnpm build`，输出目录填写 `dist`。
4. Node.js 版本设置为 `22`，环境变量 `PUBLIC_SITE_URL` 设置为正式站点地址。
5. 在 `astro.config.mjs`、`public/robots.txt` 中将默认 `pages.dev` 地址替换为正式域名。

Cloudflare 会为主分支创建生产部署，并为 Pull Request 创建预览地址。`public/_headers` 已包含静态资源缓存与基础安全响应头。

## 首期范围

已实现：首页沉浸漫游、手动与自动昼夜光色、全站中文搜索、可分享的笔记分类与标签筛选、阅读进度、目录定位、代码复制、项目详情与封面、可视化内容后台、关于页、RSS、Sitemap、自定义 404、响应式导航、云幕入场和减少动态效果支持。

暂未实现：云灵桌宠、完整岛屿地图、天气系统、实际环境音资源、评论，以及 Sveltia 尚未提供的 Editorial Workflow。

## 许可说明

站点代码可按仓库后续声明使用。`animal-island-ui` 当前为 CC BY-NC 4.0，本站仅加载其主题样式与字体资源；若未来用于商业项目，请重新确认依赖许可或替换相关样式。

主视觉为本项目生成的原创插画资产。请勿将它当作独立素材包再分发。

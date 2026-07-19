# 闲梦 · 云村

一座藏在云墙后的个人数字村落，用于发布笔记、项目经历与个人介绍。站点以 Astro 静态生成，Markdown/MDX 管理内容，React 只负责首次入村云幕、云村地图与时间切换。

如果要把项目交给另一位开发者或 AI，请先阅读 [HANDOFF.md](./HANDOFF.md)，其中记录了当前分支、已完成范围与未上线内容。

## 本地运行

环境要求：Node.js 22，推荐使用 pnpm。

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

## 更换四时主视觉

首页地图使用 `public/images/village/<time>/` 下的四组同构图，`time` 为 `dawn`、`day`、`dusk`、`night`。每组包含桌面和移动端的 AVIF/WebP：

- 四幅图必须保持完全相同的机位、河流、建筑与路径位置，否则地图热点会偏离。
- 桌面资源为 1600×900，移动资源为 960×540；建议桌面单张控制在 500KB 内。
- 热点位置在 `src/styles/global.css` 的 `.map-hotspot--study`、`.map-hotspot--workshop`、`.map-hotspot--mountain` 中调整。
- 默认分享图由 `src/layouts/BaseLayout.astro` 设置，替换主视觉后需要同步更新替代文本。

## 云村地图与环境状态

首页交互由 `VillageMap` 负责，地点内容与四时图片从 `src/pages/index.astro` 传入。

- 环境支持自动、清晨、白昼、黄昏和夜晚，选择保存在 `localStorage['yuncun-time-mode']`。
- 书屋、工坊、三山分别使用 `#study`、`#workshop`、`#mountain`，可分享并支持前进／后退恢复。
- 无 JavaScript 时显示白昼地图和三个普通内容链接。
- `prefers-reduced-motion` 下关闭镜头移动、精灵探头和持续漂浮动画。

## Cloudflare Pages 部署

1. 将项目推送到 GitHub 或 GitLab。
2. 在 Cloudflare Dashboard 的 Workers & Pages 中创建 Pages 项目并连接仓库。
3. 构建命令填写 `pnpm build`，输出目录填写 `dist`。
4. Node.js 版本设置为 `22`，环境变量 `PUBLIC_SITE_URL` 设置为正式站点地址。
5. 在 `astro.config.mjs`、`public/robots.txt` 中将默认 `pages.dev` 地址替换为正式域名。

Cloudflare 会为主分支创建生产部署，并为 Pull Request 创建预览地址。`public/_headers` 已包含静态资源缓存与基础安全响应头。

## 首期范围

已实现：可点击云村地图、四幅独立昼夜场景、全站时间主题、像素精灵地点窗、全站中文搜索、可分享的笔记分类与标签筛选、阅读进度、目录定位、代码复制、项目详情与封面、关于页、RSS、Sitemap、自定义 404、响应式导航、云幕入场和减少动态效果支持。

暂未实现：云灵桌宠、天气系统、实际环境音资源和评论。

## 许可说明

站点代码可按仓库后续声明使用。`animal-island-ui` 当前为 CC BY-NC 4.0，本站仅加载其主题样式与字体资源；若未来用于商业项目，请重新确认依赖许可或替换相关样式。

主视觉为本项目生成的原创插画资产。请勿将它当作独立素材包再分发。

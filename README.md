# 雲梦世界

以云村为中心、六境环绕的世界化个人站，用于发布笔记、项目经历、公开履历与世界设定。站点以 Astro 静态生成，Markdown/MDX 管理内容，React 负责首次入境云幕、全境地图、云镜搜索与四时切换。

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

## 添加浮光廊作品

作品内容位于 `src/content/works/`，图片位于 `src/assets/works/<slug>/`。灯巷只展示 `draft: false` 的真实作品；没有公开作品时继续显示区域设定，不生成空画廊。

每件作品必须填写标题、摘要、发布日期、分类、封面、多图替代文本和授权方式。个人收藏可以省略创作日期、创作方式和过程说明，页面会改为显示收录日期；已知作者可填写 `credit` 与 `creditUrl`。AI 辅助或混合创作一旦填写创作方式，仍必须同时填写使用工具。图片入库前应移除 EXIF/GPS，照片最长边不超过 3200px；Astro 会在构建时生成响应式图片。

素材入库可使用 `pnpm gallery:prepare <输入图片> <src/assets/works/<slug>/输出.webp> photo`；插画将最后一个参数改为 `art`。脚本会纠正方向、限制最长边并拒绝保留 EXIF、GPS、ICC 或 XMP 元数据。

```yaml
---
title: 作品标题
slug: work-slug
summary: 一句话说明
createdAt: 2026-07-20 # 个人收藏可省略
publishedAt: 2026-07-21
category: 摄影 # 摄影 / 插画 / 生成艺术 / 设计实验
tags: [夜色, 城市]
cover: ../../assets/works/work-slug/cover.webp
coverAlt: 画面替代文本
images:
  - src: ../../assets/works/work-slug/cover.webp
    alt: 第一张图片替代文本
    caption: 可选图片说明
creationMode: 原创拍摄 # 可省略；原创拍摄 / 手工创作 / AI辅助 / 混合创作
tools: []
processNote: 选择与后期过程说明 # 可省略
credit: 作者署名 # 可省略
creditUrl: https://example.com/ # 可省略
license: all-rights-reserved
featured: false
draft: true
---
```

公开作品生成 `/world/lantern-lane/<slug>/` 详情页，并进入“作品”搜索筛选、RSS 与 Sitemap。灯巷已有公开收藏，区域状态当前为 `active`。

## 更换四时主视觉

首页地图使用 `public/images/world/<time>/` 下的四组同构图，`time` 为 `dawn`、`day`、`dusk`、`night`。每组包含桌面和移动端的 AVIF/WebP：

- 四幅图必须保持完全相同的机位、河流、建筑与路径位置，否则地图热点会偏离。
- 4K 修复图只存放在 `media-originals/` 作为母图，不进入网页首屏或静态部署产物。
- 线上资源使用带版本号的 `*-restored-v1-{960,1440,1920}.avif/webp`；浏览器通过 `srcset` 按视口选择，不再预载相邻时段。
- 运行 `pnpm media:prepare` 可从母图重新生成所有响应式衍生图；升级画面时必须使用新的版本号，避免破坏长期缓存。
- 当前四时图由原始同构构图进行 AI 细节修复后统一输出，不得单独重绘或改变七境坐标。
- 七境坐标集中在 `src/data/worldMap.ts`，不要把坐标散落到组件或样式表中。
- 默认分享图由 `src/layouts/BaseLayout.astro` 设置，替换主视觉后需要同步更新替代文本。

`public/images/village/` 是笔记、项目和关于页使用的响应式内页背景；桌面最多加载 1920px，手机加载 960px。4K 母图不在 `public/` 中。

## 图片存储与 CDN

默认开发环境直接使用 `public/images/` 下的响应式衍生图。生产环境可将 `media-originals/` 上传到 Cloudflare R2，并设置：

- `PUBLIC_MEDIA_ORIGIN`：R2 自定义图片域名，例如 `https://img.example.com`。
- `PUBLIC_IMAGE_TRANSFORM_ORIGIN`：启用 Cloudflare Images 转换的站点域名。

配置后，`src/lib/imageDelivery.ts` 会把相同的图片请求切换为 Cloudflare Images 转换 URL；R2 保存 4K 原图，CDN 只向浏览器发送 960／1440／1920 的 AVIF/WebP。未配置时自动回退到本地衍生图，不影响构建。

列表页只加载缩略图，详情页按容器尺寸加载，4K 只用于母图、下载或主动放大。不要在 React 中用 `new Image()` 批量预载非当前时段图片。

## 全境地图与环境状态

首页交互由 `WorldMap` 负责，地点内容来自 `regions` 内容集合，坐标与四时资源来自 `src/data/worldMap.ts`。

- 环境支持自动、清晨、白昼、黄昏和夜晚，选择保存在 `localStorage['yuncun-time-mode']`。
- 七境使用各自 slug 作为 hash，可分享并支持前进／后退、Escape 和焦点恢复。
- 地名使用 `animal-island-ui` 的 `Title` 丝带组件；移动端保留地名册。
- 无 JavaScript 时显示白昼地图和七个普通区域链接。
- `prefers-reduced-motion` 下关闭图片入场和抽屉动画。

## Cloudflare Pages 部署

1. 将项目推送到 GitHub 或 GitLab。
2. 在 Cloudflare Dashboard 的 Workers & Pages 中创建 Pages 项目并连接仓库。
3. 构建命令填写 `pnpm build`，输出目录填写 `dist`。
4. Node.js 版本设置为 `22`，环境变量 `PUBLIC_SITE_URL` 设置为正式站点地址。
5. 在 `astro.config.mjs`、`public/robots.txt` 中将默认 `pages.dev` 地址替换为正式域名。

Cloudflare 会为主分支创建生产部署，并为 Pull Request 创建预览地址。`public/_headers` 已包含静态资源缓存与基础安全响应头。

## 首期范围

已实现：七地全境地图、同构四时场景、可分享的地点深链、键盘可访问卷轴侧栏、无脚本地名册、区域内容集合、雨桥嵌入式云镜、星渊成长路线、全站中文搜索、笔记筛选、项目详情、公开履历、RSS、Sitemap、自定义 404、响应式导航和减少动态效果支持。

暂未实现：云灵桌宠、天气系统、实际环境音资源和评论。

## 许可说明

站点代码可按仓库后续声明使用。`animal-island-ui` 当前为 CC BY-NC 4.0，本站加载其主题样式并使用 `Title` 丝带组件；若未来用于商业项目，请重新确认依赖许可或替换相关组件。

主视觉为本项目生成的原创插画资产。请勿将它当作独立素材包再分发。

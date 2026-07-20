# “雲梦世界”交接总览

> 最后核对：2026-07-20
> 正式分支：`main`
> 正式站：<https://xianmeng-yuncun.pages.dev/>
> 仓库：<https://github.com/cloudydreamland/xianmeng-yuncun>

## 一眼看懂

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 正式网站 | ✅ 已上线 | Cloudflare Pages 从 `main` 自动部署，七境全境地图已生效 |
| 本地与生产构建 | ✅ 通过 | Astro/TypeScript 0 错误，21 个页面，Pagefind 索引正常 |
| 首页四时地图 | ✅ 完成 | 四时同构图片、七个动森丝带地名、hash 深链与卷轴抽屉 |
| 笔记与阅读工具 | ✅ 完成 | 分类／标签 URL、搜索、目录、进度、代码复制、阅读时间 |
| 项目系统 | ✅ 完成 | 项目列表、项目详情、slug、封面、外部链接和搜索直达 |
| 真实个人内容 | 🟡 持续补充 | 公开简介、学习资料索引和 GitHub 项目已上线，私人联系方式不公开 |
| 灯巷画廊 | ✅ 首版开放 | 两件授权插画收藏、详情页、筛选、灯箱、搜索与 RSS |
| 云灵等扩展 | ⚪ 未开始 | 桌宠、天气、真实环境音和评论属于后续功能 |

下一位 AI 应从最新 `main` 开始，不要再以 `feature/cms-authoring` 或 `codex/pixel-storybook-redesign` 作为开发基线。

## 下一步做什么

### P0：验收浮屿·灯巷

1. 两件授权插画已入库，并已移除 EXIF/GPS、补齐替代文本与必要署名。
2. 灯巷状态已从 `planned` 改为 `active`。
3. 执行构建和 Playwright 回归，通过 Cloudflare PR 预览后再合并。
4. 后续个人收藏可省略未知创作日期与过程信息，但不得移除已有署名或水印。

### P1：后续体验扩展

- 根据用户反馈继续精修全境地图和灯巷浏览体验。
- 云灵桌宠应作为独立 React 模块，不改变现有内容路由。
- 天气、环境音、评论和用户系统应分别设计，不要一次性堆进首页。

## 外部服务与账户关系

这里仅记录项目依赖关系，不记录账号、邮箱、密钥或 Cloudflare Account ID。

| 服务 | 当前关系 | 能否解除 |
| --- | --- | --- |
| GitHub 仓库 | `cloudydreamland/xianmeng-yuncun`，公开仓库，保存源代码 | 不建议删除；这是项目源代码 |
| Cloudflare Pages | 项目 `xianmeng-yuncun`，连接 GitHub `main` 自动部署 | 不建议断开；断开后推送不会自动上线 |
| Codex/ChatGPT GitHub 应用 | 2026-07-19 核对为“未安装” | 已无连接器访问权限，无需再解绑 |
| 本机 Git SSH | 交接完成后已移除项目专用密钥引用 | 下一位维护者应使用自己的 GitHub 身份重新认证，不要复用前任密钥 |
| 浏览器登录会话 | 2026-07-19 已退出 GitHub 全部账户和 Cloudflare | 与代码仓库无关；以后登录后仍应在交接前再次退出 |

安全原则：为了防止其他 Codex 使用者接触外部账号，可以退出浏览器登录、卸载 ChatGPT/Codex 应用连接；不要为此断开 Cloudflare Pages 与 GitHub 的项目级部署连接，否则会损坏自动发布流程。

## 本地启动

需要 Node.js 22 和 pnpm。

```powershell
git clone https://github.com/cloudydreamland/xianmeng-yuncun.git
cd xianmeng-yuncun
git switch main
git pull
pnpm install
pnpm dev
```

浏览器打开终端显示的地址，通常是 `http://localhost:4321`。

生产验证：

```powershell
pnpm build
pnpm preview
```

`pnpm build` 会生成 Astro 静态站，并在 `dist/pagefind` 生成搜索索引。开发模式没有完整 Pagefind 索引属于正常现象。

## 主要代码位置

- `src/components/WorldMap.tsx`：首页地图、地点卷轴、时间切换和键盘交互。
- `src/data/worldMap.ts`：七境坐标与四时地图资源。
- `src/styles/global.css`：像素绘本设计系统及内页布局。
- `src/content/notes/`、`src/content/projects/`、`src/content/regions/`、`src/content/works/`：MDX 内容。
- `src/content.config.ts`：内容字段定义。
- `public/images/world/`：首页四时 4K 桌面／HD 移动地图；`public/images/village/` 提供同规格的内页背景。

替换四时图片时，必须保持七境位置一致，并同时更新 `*-desktop-4k` 与 `*-mobile-hd` 的 AVIF/WebP。正文内容不要被 AI 自动改写。

## 已知技术取舍

- Animal Island UI 的 `Title` 组件用于地图地名；Vite 8 通过 `resolve.noExternal` 处理其 CSS Module，升级依赖后必须重新验证生产构建。
- 夜间只改变外围环境，文章正文保持浅色纸张以保证阅读对比度。
- 首屏只优先加载当前时段背景，其他时段空闲预载；不要改成一次加载全部大图。

## 每次交付检查

- [ ] 从最新 `main` 新建功能分支，没有直接覆盖无关用户修改。
- [ ] `pnpm build` 为 0 错误。
- [ ] 桌面和手机的四时背景、七境地名和卷轴抽屉正常。
- [ ] 灯巷作品草稿、图片隐私元数据和创作标注符合要求。
- [ ] 搜索、筛选、阅读工具、项目详情和 404 正常。
- [ ] 草稿不进入页面、RSS、Sitemap 与 Pagefind。
- [ ] 仓库和构建产物中没有密钥、Token、Cookie 或私人账号信息。
- [ ] 预览验收并得到明确上线许可后才合并 `main`。

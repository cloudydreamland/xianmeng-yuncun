# 本地开发环境说明

本文档是雲梦世界项目在 Windows 本机上的统一环境基线。项目只使用 npm 管理依赖，不需要安装 pnpm，也不要混用 pnpm、Yarn 或 Bun。

## 1. 标准环境

| 项目 | 版本 | 说明 |
| --- | --- | --- |
| 操作系统 | Windows 10/11 | 命令示例使用 PowerShell |
| Node.js | 24.16.x | `package.json` 要求 `>=24.16 <25` |
| npm | 11.13.x | Node.js 自带，`package.json` 要求 `>=11.13 <12` |
| 项目框架 | Astro 7 | 依赖由 `package-lock.json` 锁定 |

仓库中的 `.node-version` 为 `24.16.0`。支持该文件的版本管理器会自动选择对应 Node.js 版本。

在项目目录执行以下命令检查本机环境：

```powershell
node --version
npm --version
```

预期结果分别以 `v24.16.` 和 `11.13.` 开头。如果版本不一致，请先安装或切换 Node.js 24.16.x，再安装依赖。

## 2. 首次安装

进入项目目录：

```powershell
cd D:\personal_web
```

已有 `package-lock.json` 时，推荐使用下面的可复现安装：

```powershell
npm ci
```

`npm ci` 会严格按照锁文件安装，并重新生成 `node_modules`。只有在主动增加、删除或升级依赖时才使用：

```powershell
npm install
```

不要提交 `node_modules/`。需要提交 `package.json` 和 `package-lock.json`，二者共同定义项目环境。

## 3. 启动开发服务器

```powershell
npm run dev
```

启动成功后，终端会显示本地地址，默认是：

```text
http://localhost:4321/
```

浏览器打开该地址即可。开发服务器会持续监听文件变化，因此终端停留在运行状态是正常现象；不要等待它自动返回 PowerShell 提示符。按 `Ctrl+C` 停止服务。

如果 4321 已被占用，Astro 会显示新的端口。也可以主动指定端口：

```powershell
npm run dev -- --port 4322
```

## 4. 构建与生产预览

执行完整的类型检查、静态构建和 Pagefind 搜索索引生成：

```powershell
npm run build
```

构建产物位于 `dist/`。用接近生产环境的方式预览：

```powershell
npm run preview
```

预览地址通常也是 `http://localhost:4321/`。开发模式不生成完整 Pagefind 索引，因此全文搜索应以 `npm run build` 后的预览结果为准。

## 5. 检查与测试

```powershell
# Astro/TypeScript 检查
npm run check

# Node 单元测试
npm run test:unit

# 首次运行端到端测试前安装 Chromium
npx playwright install chromium

# Playwright 端到端测试
npm run test:e2e
```

CI 使用同一套 Node.js 24.16.0 + npm 工作流，并通过 `npm ci` 安装锁定依赖。

## 6. 项目脚本

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 Astro 开发服务器 |
| `npm run build` | 检查、构建并生成搜索索引 |
| `npm run preview` | 本地预览 `dist/` |
| `npm run check` | 执行 Astro/TypeScript 检查 |
| `npm run test:unit` | 运行单元测试 |
| `npm run test:e2e` | 运行浏览器端到端测试 |
| `npm run plan:new -- <slug> "<标题>"` | 新建推进计划模板 |
| `npm run gallery:prepare -- <输入> <输出> <photo或art>` | 处理作品图片 |
| `npm run media:prepare` | 重新生成世界背景响应式图片 |
| `npm run regions:prepare` | 重新生成地区插图 |

## 7. 环境变量

复制 `.env.example` 为 `.env` 后按需修改。本地开发不配置图片 CDN 也能正常运行。

| 变量 | 是否必需 | 用途 |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | 建议配置 | 站点规范地址，用于 Sitemap 等输出 |
| `PUBLIC_MEDIA_ORIGIN` | 否 | Cloudflare R2 或图片域名 |
| `PUBLIC_IMAGE_TRANSFORM_ORIGIN` | 否 | Cloudflare Images 转换域名 |

`.env` 可能包含本机或部署配置，已被 Git 忽略，不要提交密钥、Token 或私人地址。

## 8. 常见问题

### 终端停在开发服务器输出

只要页面可以访问，这不是卡死。`npm run dev` 是常驻进程，按 `Ctrl+C` 才会退出。

### 出现 `Cannot find module` 或安装结果异常

通常是旧 pnpm 目录、安装中断或 Node.js 版本不一致造成的。确认 Node/npm 版本后执行：

```powershell
npm ci
```

该命令会按 `package-lock.json` 重建依赖，不要再运行 `pnpm install`。

### 出现 `Unknown project config "auto-install-peers"`

这是旧 pnpm 配置被 npm 读取时产生的警告。迁移后的 `.npmrc` 已移除该配置；如果仍看到它，请确认当前目录是最新代码，并检查用户级 `%USERPROFILE%\.npmrc` 是否还包含同名配置。

### 端口被占用

改用其他端口：

```powershell
npm run dev -- --port 4322
```

### 切换分支后依赖发生变化

当 `package-lock.json` 有变化时重新执行 `npm ci`，避免沿用旧依赖树。

## 9. 部署环境

Cloudflare Pages 使用以下配置：

- Node.js：`24.16.0`
- 安装命令：`npm ci`
- 构建命令：`npm run build`
- 输出目录：`dist`

正式部署时设置 `PUBLIC_SITE_URL`。图片 CDN 变量按需配置，留空时会使用仓库内的本地响应式图片。

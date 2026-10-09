# uni-app-x-starter

可复用的企业级 **uni-app x（蒸汽模式 Vapor）** 多端开发脚手架，目标平台为 **Android / iOS / 鸿蒙 / H5 / 微信小程序**。编译、浏览器运行与真机验收分别记录，支持范围以当前锁定版本和验证结果为准。

- 渲染模式：uni-app x 工程，**App（Android/iOS/鸿蒙）默认蒸汽模式 Vapor**；H5 与小程序端遵循官方编译器策略（详见下方「平台构建矩阵」），业务代码统一标准 `<script setup lang="ts">`
- UI：[RiceUI](https://riceui.cn/components/quickstart.html)（uni_modules 插件，全端 + 暗黑模式）
- 工程形态：**官方原生根目录布局 + CLI 工程化**——`App.uvue`/`main.uts`/`manifest.json`/`pages.json`/`index.html` 与 `pages/`、`pages-sub/`、`components/`、`static/`、`uni_modules/` 全部位于仓库根（uni-app x IDE 标准结构），`api/`/`http/`/`router/`/`store/`/`assets/`/`utils/`/`types/` 等工程化目录同样在根。pnpm + Vite 驱动全端开发与 CI；HBuilderX 直接「打开目录」选择**仓库根**即可菜单运行，与 CLI 是同一个工程、同一套文件
- 状态：Pinia 3 + 应用/环境隔离的版本化持久化，恢复时校验会话
- 网络：`http` 统一处理请求基址、query、token、业务码与会话失效；Excel 导入和普通文件上传有独立入口
- 观测：本地脱敏日志、请求耗时与全局异常钩子，可显式配置日志适配器
- 鉴权：全局路由拦截器（白名单 / 按需鉴权双模式）+ 冷启动直链兜底
- 列表：z-paging-x（下拉刷新、触底加载、空态、回顶）
- 工程化：约定式路由、API 自动导入、ESLint 9、husky + commitlint + lint-staged、dev/test/prod 三环境、Docker/nginx 部署模板

## 环境要求

- Node.js 24.19.x
- pnpm 12.6.0（通过 Corepack 或 `npm i -g pnpm@12.6.0`）
- 当前锁定：DCloud `3.0.0-5020620260917001`（5.26）、Vue `3.5.13`；App / 鸿蒙构建使用 HBuilderX 5.26。升级编译器后须重跑补丁回归与各端验收，不把所有更高版本视为已兼容。
- 安装后运行 `pnpm run doctor` 检查实际工具链、Vue/DCloud 对齐和补丁；原生构建需设置 `HBUILDERX_CLI_PATH`。

## 快速开始

```bash
pnpm install
pnpm run doctor
pnpm generate
pnpm check:routes

# H5
pnpm dev:h5

# 微信小程序（产物用微信开发者工具导入 dist/dev/mp-weixin）
node build/scripts/uni.mjs -p mp-weixin
```

App / 鸿蒙端有两种运行入口（均需本机安装 HBuilderX 正式版 **5.26**，与当前 CLI 编译器版本对齐）：

- **方式一：CLI 调起（推荐，能力完整）**——执行 `pnpm dev:app-android`（`dev:app-ios` / `dev:app-harmony`），脚本经 `uni-launch` 调起本机 HBuilderX 编译并运行到手机 / 模拟器 / 鸿蒙设备。vite 侧能力（`.env` 环境变量、约定式路由、依赖补丁）全部生效。使用前请先启动 HBuilderX。
- **方式二：HBuilderX 图形界面直接运行**——在 HBuilderX 中「文件 → 打开目录」，选择**仓库根目录** `uni-app-x/`。根目录的 `App.uvue` 与含 `"uni-app-x": {}` 的 `manifest.json` 使其被识别为标准 uni-app x 工程，打开后即可通过顶部菜单「运行 / 发行」到 Android / iOS / 鸿蒙 / Web / 小程序。

> **为什么页面与业务目录不放进 `src/`？** uni-app x 官方 IDE 仅识别「代码在根目录」的工程（靠根目录的 `App.uvue` 与 `manifest.json` 识别），刻意不支持老 uni-app 的 src/dist 双模式（见[官方文档](https://doc.dcloud.net.cn/uni-app-x/project.html)）。本脚手架直接采用官方原生根目录布局：主包在 `pages/`、分包在 `pages-sub/`、业务组件在 `components/`，因此 **pages.json 与路由 URL 都不带任何目录前缀**（如 `/#/pages/index/index`、`/pages-sub/pages/auth/login`），HBuilderX 与 CLI 对工程结构的理解完全一致，无需「根壳」或打开子目录等变通手段。
>
> 注意方式二走 HBuilderX **内置编译器**：`env/` 下环境变量注入、`definePage` 自动重新生成 `pages.json`、pnpm 补丁等 vite 侧能力不生效（根目录已生成的 `pages.json` 会被直接读取，新增页面后请先用一次 CLI 让其重新生成）。该方式适合快速真机预览；需要完整能力时请用方式一或纯 CLI 命令。HBuilderX 在根目录 `unpackage/` 下输出产物（已在 `.gitignore` 忽略）。
>
> 各端建议：**App / 鸿蒙真机调试与云打包**用方式一或方式二均可；**H5 请始终走 CLI**（`pnpm dev:h5`）——本仓库 `build/patches/` 中三处 H5 运行时白屏修复只作用于项目内编译器，HBuilderX 内置编译器未打这些补丁，用它运行 Web 可能复现白屏；小程序两端均可，CLI 侧配置更完整。
>
> **不要让两种编译同时进行**：HBuilderX 图形界面的编译与 `pnpm dev/build` 会并发扫描/写入同一份源码与产物，实测会导致 esbuild 服务崩溃与内存溢出。使用 CLI 前先在 HBuilderX 中停止运行（或关闭 HBuilderX），反之亦然。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev:h5` / `dev:mp-weixin` | 本地开发（development 环境） |
| `pnpm dev:h5:test` / `dev:mp-weixin:test` | 本地开发（test 环境） |
| `pnpm dev:app-android` / `dev:app-ios` / `dev:app-harmony` | 调起 HBuilderX 运行 App |
| `pnpm build:h5` / `build:mp-weixin` | 生产构建（production 环境） |
| `pnpm build:h5:test` / `build:mp-weixin:test` | 测试环境构建 |
| `pnpm generate` | 从 `pages.config.json` 和页面源码确定性生成 `pages.json` 与路由类型 |
| `pnpm test` | HTTP、会话、路由、存储、日志、初始化与工具链回归 |
| `pnpm run doctor` / `pnpm check:routes` | 工具链、补丁及注册页面与鉴权/tabBar 配置校验 |
| `pnpm check:release web` / `mp-weixin` / `app-android` | 检查共同生产配置与指定平台所需 AppID |
| `pnpm smoke:web` | 测试环境 Web 产物的页面、tabBar、登录、持久化与控制台冒烟 |
| `pnpm run init --config build/templates/project.example.json` | 默认只预览新项目初始化配置 |
| `pnpm release:h5` / `release:mp-weixin` | 校验配置、构建并检查产物不含 demo token |
| `pnpm lint` / `pnpm lint:fix` | ESLint 检查 / 自动修复 |
| `pnpm type-check` | vue-tsc 类型检查 |

## 平台构建矩阵

| 平台 | 渲染模式 | 构建方式 | 产物位置 | 本脚手架验证情况 |
| --- | --- | --- | --- | --- |
| App Android / iOS | 蒸汽模式 Vapor（DOM2 + bytecode） | `pnpm dev:app-android/ios` 经 uni-launch 调起 HBuilderX；或 HBuilderX 打开**仓库根**菜单运行 | HBuilderX 管理（根 `unpackage/`） | 需 HBuilderX + 真机/模拟器，未在 CI 环境验证 |
| App 鸿蒙 | 蒸汽模式 Vapor | `pnpm dev:app-harmony` 经 uni-launch 调起 HBuilderX；或 HBuilderX 打开**仓库根**菜单运行 | HBuilderX 管理（根 `unpackage/`） | 需 HBuilderX + 鸿蒙设备，未在 CI 环境验证 |
| H5 / Web | uni-app x（当前 5.26 Web 使用 VDOM） | 纯 CLI：`pnpm dev:h5` / `pnpm build:h5` | `dist/dev/h5`、`dist/build/h5` | 2026-10-09 测试/生产构建与 6 页面浏览器冒烟通过；后续交付重跑实际报告 |
| 微信小程序 | 小程序原生 wxml 渲染 | CLI 构建：`pnpm build:mp-weixin`，开发者工具导入产物 | `dist/dev/mp-weixin`、`dist/build/mp-weixin` | 2026-10-09 生产构建与产物检查通过；微信开发者工具与真机需另行验收 |

> 关于「蒸汽模式」的重要说明：蒸汽（Vapor/DOM2）目前是 **App 端专属** 渲染链路。DCloud 5.26 编译器在初始化时会对 web 与小程序平台**强制删除** `UNI_APP_X_DOM2` 开关（见 `@dcloudio/uni-cli-shared` 的 `initModuleAlias`），web 端 vue 运行时固定解析到 `@dcloudio/uni-h5-vue/dist-x`（启动横幅显示「uni-app x VDOM 模式」），蒸汽版运行时入口 `dist-x-vapor` 尚未接入官方 web 构建。因此本脚手架**不对 H5 注入 DOM2 开关、不替换 vue 运行时别名**，以保持与官方编译器完全一致、可平滑升级；待官方 web 蒸汽正式支持后，仅需升级依赖即可，业务代码无需改动。

### CLI 包装器做了什么

- `build/scripts/uni.mjs`（H5 / 小程序）：启动 uni CLI 前把 `UNI_INPUT_DIR` 设为 **工程根的绝对路径**（原生根目录布局下工程根即 uni 输入目录）。uts 编译器以该变量作为 tsconfig rootDir；只接受绝对路径，传相对路径会导致虚拟 tslib 快照触发 TS6059。
- `build/scripts/app-launch.mjs`（App / 鸿蒙）：同样注入工程根绝对路径后再调起 `uni-launch`，保证 HBuilderX 侧编译器与 CLI 行为一致。
- 根目录仅一份 `index.html`（CLI 与 HBuilderX 共用），入口为 `/main`（不带扩展名——dev 下 `.uts` 会被静态中间件原样返回导致白屏）。

构建入口另经 `check-build.mjs` 检查退出码与编译错误日志，报告保存到 `test-results/builds/`。`types/cli-compat.d.ts` 补齐当前 UTS CLI 遮蔽的 `resolveEasycom` 与 Web 运行时的应用工厂、`mergeModels`、`useCssVars` 声明，升级时须重跑实际 UTS 编译器回归；不替代官方原生端类型系统。

### 依赖补丁（build/patches/，pnpm 自动应用）

uni-app x 5.26（npm `5020620260917001` 线）纯 CLI 构建 H5 时存在工具链兼容问题，本脚手架通过 pnpm `patchedDependencies` 固化四个包的最小补丁（`pnpm install` 后自动生效，无需手工改 node_modules）：

| 被补丁包 | 问题 | 修复 |
| --- | --- | --- |
| `@dcloudio/uni-cli-shared`（内置 fork `@vue/compiler-sfc`） | dev 模式注入 `<script setup>` 标记 `Object.defineProperty(..., '__isScriptSetup', { enumerable:false, value:true })`，描述符对象字面量被 uts2js 包装成自带只读 `get/set` 方法的 `UTSJSONObject`，浏览器抛 `Invalid property descriptor` | 描述符改为 `Object.create(null)` 逐属性构造，不经过对象字面量包装（仅 dev 非 inline 模板路径，prod inline 不触发） |
| `@dcloudio/uni-h5-vue`（dist-x 运行时） | `updateSlots` 用 `Object.assign` 合并新旧 slots，内部键 `_` 初次挂载时被定义为只读，更新组件时抛 `Cannot assign to read only property '_'`，tab 页面白屏 | 合并时跳过 Vue 内部键 `_` / `__vInternal`（其值在 initSlots 已写入，无需重复赋值） |
| `@dcloudio/uni-uts-v1`（CLI 类型入口） | 按 `src/` 布局查找上级目录的 Vue 类型，在根目录工程与 pnpm 下找不到；回退到 Vue 顶层声明后，TypeScript 5.2 的导出缓存遗漏补充的 Web helper | 从项目的 Vue 依赖解析 runtime-core 类型入口，仅修正 CLI 分支；实际 UTS 回归验证 `mergeModels`、`createVueApp`、`resolveEasycom` |
| `@uni-helper/vite-plugin-uni-pages` | ① 转换钩子用 `id.endsWith('uvue')` 判断，uni-app x 的 `.uvue?import` 虚拟请求带查询串导致 `definePage` 宏未被剥离；② 解析脚本块时不认识 `lang="uts"`；③ HBuilderX 用 `h5`、CLI 用 `web` 生成页面时，插件把两者当成不同平台写入重复路径，而 HBuilderX 的 Web 条件编译同时启用 `H5` 和 `WEB`；④ SFC 解析器的 ESM 导入绕过 HBuilderX 的 CommonJS 别名，与旧版 `@vue/shared` 混用，报 `shared.genCacheKey is not a function` | 剥离查询串并按 TS 解析 UTS；在页面、分包与 tabBar 合并时统一将 `H5` 归一为 `WEB`；通过 `createRequire` 加载当前编译链的 SFC 解析器，保持 Vue 编译依赖一致 |

升级 @dcloudio 依赖后：先 `pnpm install`，若补丁冲突（上游已修复），删除 `build/patches/` 中对应补丁与 `pnpm-workspace.yaml` 的 `patchedDependencies` 记录即可；若仍存在，重新执行 `pnpm patch <pkg>@<ver>` 与 `pnpm patch-commit <临时目录> --patches-dir build/patches` 续补丁。

## 目录结构

```
uni-app-x/
├── App.uvue / main.uts        # 应用入口
├── manifest.json              # 应用配置（蒸汽开关 vapor:true、各端配置、appid）
├── pages.json                 # 【自动生成到根，勿手改】由 pages.config.json + 页面扫描合并
├── pages.config.json          # pages.json 静态基座（globalStyle/tabBar/easycom）
├── index.html                 # H5 模板（CLI 与 HBuilderX 共用，入口 /main）
├── uni.scss                   # 全局 SCSS 变量入口（转发 assets/styles/variables.scss）
├── pages/                     # 主包页面：index 首页、me 我的（路由 /pages/...）
├── pages-sub/                 # 分包（root: pages-sub）
│   └── pages/                 #   分包页面：auth/login、demo/ui、demo/paging、demo/rank
├── components/                # 业务公共组件（easycom 自动扫描）：app-layout 通用布局
├── api/                       # 业务接口调用与请求/响应类型：auth、upload
├── demo/                      # 显式 demo 模式的数据生成逻辑
├── http/                      # 请求与 multipart 传输（request / upload / URL 处理 / types）
├── router/                    # 路由鉴权：config 路径常量与白名单、interceptor 拦截器
├── store/                     # Pinia：app（主题）、user（会话）
├── tests/                     # HTTP、会话、主题、页面生成及代理配置测试
├── types/                     # env/cli-compat 手写声明；auto-imports/uni-pages 声明自动生成
├── utils/                     # 通用工具：env、storage 等（不放业务分层代码）
├── assets/                    # 资源类文件（经构建处理）：styles/ 全局样式与 SCSS 变量/主题令牌；
│   │                          #   后续可扩展 assets/images（组件内 import 的图片）等子目录
├── static/                    # 静态资源（tabbar 图标等）——编译器固定目录，原样拷贝、/static 绝对路径引用，不可改名
├── uni_modules/               # 插件市场组件（easycom 自动扫描）：rice-ui、z-paging-x
├── vite.config.ts             # CLI 构建配置（@ 指向工程根、envDir=env、约定式路由 / easycom / 自动导入 / 代理）
├── tsconfig.json
├── env/                       # 环境变量（Vite envDir）：.env 共享、.env.development/.env.test/.env.production
└── build/                     # 工程化配套
    ├── scripts/               #   CLI 包装器、页面生成与共享扫描配置、发布检查
    ├── patches/               #   pnpm 依赖补丁（H5 工具链缺陷修复，install 自动应用）
    └── deploy/                #   nginx / Dockerfile 部署模板（docker build -f build/deploy/Dockerfile .）
```

> **路径别名约定**：`@` 指向**工程根**：
> - 业务引用直接写 `@/store`、`@/http`、`@/api/auth`、`@/components/...`；
> - 插件与静态资源：`@/uni_modules/...`、`@/static/...`（或 `@img/...`）；
> - 页面路由与 `pages.json` 路径一致、**不带前缀**：`/#/pages/index/index`、`/pages-sub/pages/auth/login`。

## 工程约定

### 新增页面

1. 在 `pages/`（主包）或 `pages-sub/pages/`（分包）下新建 `.uvue` 页面（主包路由为 `/pages/...`，分包路由为 `/pages-sub/pages/...`）
2. 页面内通过 `definePage` 声明路由元信息，保存后根目录 `pages.json` 自动重新生成：

```vue
<script setup lang="uts">
definePage({
  style: { navigationBarTitleText: '页面标题' }
})
</script>
```

3. 根目录 `pages.json` 为 CLI 自动生成产物，请勿手改；全局 `globalStyle`、`tabBar`、`easycom` 在根目录 `pages.config.json` 维护
4. 分包页面统一放 `pages-sub/pages/`。分包专享接口、资源或复用视图出现后，再按需创建 `pages-sub/api`、`pages-sub/assets`、`pages-sub/controls`；扫描配置已排除 `controls`。新增独立分包 root 时，在 `build/scripts/page-options.mjs` 的 `subPackages` 中登记，并运行 `pnpm generate`。

### 布局与组件

通用布局已封装为 easycom 组件 `components/app-layout/app-layout.uvue`（同时在 `pages.config.json` 中显式映射），页面**直接使用标签、无需 import**：

```vue
<template>
  <app-layout title="页面标题" show-back>
    <!-- 内容 -->
  </app-layout>
</template>
```

> 为什么不用 `import DefaultLayout from '...'` 显式引入？
> uni-app x 的 uts2js 编译器会把“上下文类型为 any 的对象字面量”包装成 `UTSJSONObject`。
> 页面根节点若是显式引入的用户组件，编译出的 props / slots 实参会被错误包装，H5 下直接导致插槽与页面渲染异常。
> 走 easycom / `resolveComponent` 解析的组件有精确类型，不会被包装。因此**自定义通用组件统一放在 `components/<name>/<name>.uvue`，以标签方式使用**（easycom autoscan 已覆盖该目录；命名不符合约定时在 `pages.config.json` 补映射）。

### API 自动导入（无需手写 import）

`unplugin-auto-import` 已启用 **vue + uni-app** 两个预设（覆盖 `.uvue/.uts/.ts/.vue`，插件顺序在 `uni()` 之前，各端均在源码阶段注入）：

- 直接用：`ref` / `reactive` / `computed` / `watch` / `nextTick` / 生命周期钩子，以及 `onLoad` / `onShow` / `onReachBottom` 等 uni-app 页面生命周期，**无需 import**
- 仍需手写 import 的：`pinia` 的 `defineStore`、第三方库、`import type { Ref }` 等**类型**导入、以及 `main.uts` 中的 `createSSRApp`（不在预设内）
- 组件仍走 easycom：`components/` 与 `uni_modules/` 下的组件直接写标签
- 全局类型由自动生成的 `types/auto-imports.d.ts` 提供（已 gitignore），IDE 不识别时执行一次 `pnpm dev`/build 让其重新生成即可

### 网络请求

```ts
import { http } from '@/http'

// 自动拼接基址、注入 token、解包 data；失败抛 BizError，由调用方提示
const detail = await http.get<UserInfo>('/user/info', { id: 1 })
await http.post('/user/update', { nickname: '张三' })

// 匿名业务请求可传 { ignoreAuth: true }；绝对第三方 URL 不带本站 token
```

- 基址在 `env/.env.*` 的 `VITE_SERVER_BASEURL` 配置（环境变量统一收纳在 `env/` 目录，由 vite `envDir` 指定）
- H5 本地跨域可将 `VITE_H5_USE_PROXY=true`，经 vite 代理转发到 `VITE_PROXY_TARGET`
- 开发服务器默认只监听 `127.0.0.1`；确需局域网调试时显式设置 `VITE_DEV_HOST=0.0.0.0`，并注意开发工具链尚有未修复的依赖告警
- 业务接口源码放在 `api/`，底层传输仍在 `http/`；源码目录 `api/` 与 H5 请求代理前缀 `/api` 属于不同命名空间，开发服务器将 `/api/*` 统一转发到后端。
- 后端响应结构默认 `{ code, message, data }`，成功码 `0/200`；请求和业务上传共用 `http/response.ts` 的约定。`401/40001/40002` 使发起请求时的会话失效，`403` 只拒绝权限操作。旧响应不会清除替换后的会话。
- 需要双 token 无感刷新时，先明确刷新流程与存储约定，再在现有会话模块附近扩展；当前没有独立的 token store。

### 文件上传与 Excel 导入

```ts
import { importExcel, uploadFile } from '@/api/upload'

const report = await importExcel<MyImportResult>(localExcelPath)
const file = await uploadFile(localImagePath) // { key, url? }
```

文件选择由页面负责，传给接口的 `filePath` 必须是 `uni.uploadFile` 可读取的本地路径。两个入口均接受可选的 `{ name, formData }`；普通上传在七牛模式下会用后端签发的 `token`、`key` 覆盖同名表单字段。调用方捕获 `BizError` 并决定如何提示，不会由 HTTP 层重复弹 toast。

| 环境变量 | 用途 |
| --- | --- |
| `VITE_EXCEL_IMPORT_PATH` | Excel 导入的业务 API 相对路径，始终使用，与普通上传模式无关 |
| `VITE_FILE_UPLOAD_MODE` | 普通文件上传模式：`server-oss` 或 `qiniu` |
| `VITE_SERVER_UPLOAD_PATH` | `server-oss` 时接收文件并存入 OSS 的业务 API 相对路径 |
| `VITE_QINIU_TOKEN_PATH` | `qiniu` 时签发短期上传凭证的业务 API 相对路径 |
| `VITE_QINIU_UPLOAD_URL` | `qiniu` 时桶所在区域的 HTTPS 上传地址 |

公共默认值在 `env/.env`；可在 `env/.env.development`、`env/.env.test`、`env/.env.production` 覆盖。生产环境必须填写真实地址，`pnpm check:release` 会检查当前模式所需配置。前端环境变量只存路径和地址，不存七牛 AK/SK 或长期密钥。

业务 API 返回 `{ code, message, data }`，成功码为 `0` 或 `200`。Excel 的 `data` 是业务自定义导入结果（可以为 `null`）；服务端 OSS 上传的 `data` 为 `{ key: string, url?: string }`。七牛凭证接口通过 POST 返回 `data: { token: string, key: string }`，后端负责生成对象 key 和最小权限、短有效期 token；直传响应中的 key 必须与签发的 key 一致。七牛直传只返回 `key`，不信任其响应里的 URL，也不从 bucket 域名推导公开地址；若业务需要访问地址，应由后端提供。

部署时把业务 API 地址，以及七牛模式的上传域名加入 App/小程序网络域名白名单；H5 的业务 API 和七牛上传端均须允许对应来源的 CORS。小程序正式环境要求 HTTPS 合法域名。上线前用真实后端、七牛凭证和各目标端文件路径做上传冒烟测试；单测与构建不能替代真机验证。

### 登录鉴权

- 配置在 `router/config.ts`（路径常量集中维护，新增受限页面照此登记）：
  - `GLOBAL_NEED_LOGIN = true`：全局鉴权，`WHITE_LIST` 放行
  - `GLOBAL_NEED_LOGIN = false`：按需鉴权，把受限页面加入 `NEED_LOGIN_PAGES`
- 登录成功后调用 `navigateAfterLogin(redirect)` 自动回跳
- 开发和测试环境显式启用 `VITE_AUTH_MODE=demo`；生产环境固定为 `real`，使用 `/auth/login` 和 `/user/info`
- 401/40001/40002、过期和退出会清除原会话的 token、过期时间及用户资料；403 保留会话。正式模式退出会尝试通知后端，网络失败仍完成本地清理

### 状态管理

```ts
const userStore = useUserStore()   // 自动导入 ref/computed 等 vue API
await userStore.login(form)
```

需要持久化的 store 在定义时配置 `persist`（已适配 uni 存储，全端可用）。出现可复用的组合式逻辑时，再创建 `hooks/` 并按用途命名。

### 主题（RiceUI + 暗黑模式）

- `useAppStore()` 管理主题：App 支持 `auto / light / dark` 并同步 `setAppTheme`；微信监听 `hostTheme`，Web 监听媒体查询，固定跟随宿主，结果同步给 RiceUI
- `theme.json` 管理页面和 tabBar 的启动主题色，`assets/styles/theme.scss` 使用 Vapor 可支持的单类名主题令牌
- RiceUI CSS 变量见 `uni_modules/rice-ui/libs/style/variables.css`，覆盖品牌色在 `assets/styles/theme.scss` 中改写 `--rice-*`
- 使用 `showDialog` / `showActionSheet` 命令式 API 时，需按 RiceUI 文档把 `uni_modules/rice-ui/pages/` 下的两个页面注册进 `pages.config.json`（App/H5 需要，小程序不需要）

### 样式

- 仅使用 SCSS（未引入 Tailwind/UnoCSS）；全局变量在 `assets/styles/variables.scss`，经根 `uni.scss` 自动注入每个组件
- 资源分两类管理：`assets/` 放经构建处理的资源（样式、组件内 `import` 的图片，后续按 `assets/images` 等扩展）；`static/` 放需原样拷贝、以 `/static/...` 绝对路径引用的资源（tabBar 图标等），该目录名编译器固定、不可改
- App 端默认 flex 布局（`flex-direction` 默认 `column`），相关注意事项见下方「uni-app x 开发注意事项」

## 上线前 Checklist

1. `manifest.json`（根目录）：填写 DCloud `appid`、微信小程序 `appid`、应用名称与图标
2. `env/.env.production`：替换为真实 HTTPS 后端地址，保持 `VITE_AUTH_MODE=real`，选择上传模式并配置对应接口/七牛地址
3. App 图标/启动图、权限与模块配置在根 `manifest.json` 中维护；HBuilderX 打开**仓库根**后也可使用 manifest.json 可视化界面编辑（云打包时 HBuilderX 读取的就是该文件）
4. H5 部署参考 `build/deploy/nginx.conf` 与 `build/deploy/Dockerfile`（在工程根执行 `docker build -f build/deploy/Dockerfile .`）

## 质量与交付

PR 流水线运行冻结安装、生成、Lint、类型检查、单测、H5/微信生产编译以及 H5 测试环境浏览器冒烟。设置仓库变量 `ENABLE_NATIVE_CI=true` 并配置同时带 `self-hosted`、`hbuilderx-5.26` 和对应 `app-android` / `app-ios` / `app-harmony` 标签的专用 runner 后，额外通过官方 HBuilderX CLI 的 `launch ... --compile true --ui false` 运行三端编译门禁。runner 必须设置 `HBUILDERX_CLI_PATH` 指向 HBuilderX 5.26 的 `cli`/`cli.exe`；iOS runner 必须为 macOS，鸿蒙 runner 必须安装 DevEco。签名、真机 smoke test 和包体检查仍需独立发布流水线，不能由编译成功替代。

`pnpm-workspace.yaml` 已定向覆盖 `jpeg-js` 和 `path-to-regexp` 的相关版本；依赖审计结果随锁文件与公告更新而变化，按需运行 `pnpm audit --prod --registry=https://registry.npmjs.org`。当前质量 workflow 不包含审计步骤。升级 DCloud/Vite 必须连同补丁、H5/微信编译和三端真机验证一起进行。正式发布前应对所用后端、部署环境和依赖告警重新评估。

## uni-app x 开发注意事项

- 仅支持组合式 API（`<script setup>`），业务代码统一使用 TypeScript
- 页面文件后缀 `.uvue`；原生插件开发才使用 `.uts`
- 条件编译按平台区分：`// #ifdef APP-ANDROID` / `APP-IOS` / `APP-HARMONY`（或 `APP` 覆盖全部 App）、`// #ifdef WEB`、`// #ifdef MP-WEIXIN`
- App 端默认 flex 布局且 `flex-direction` 默认为 `column`，横向布局请显式声明 `flex-direction: row`（可使用 `.flex-row` 工具类）；H5/小程序端为标准 Web 布局
- 平台差异与能力清单以官方文档为准：<https://doc.dcloud.net.cn/uni-app-x/>

## 初始化为业务项目

先复制 `build/templates/project.example.json` 并设置项目名、标题、目标平台、AppID、API、上传模式与存储命名空间：

```bash
pnpm run init --config build/templates/project.example.json
pnpm run init --config project.json --target ../my-business-app --write
```

默认 dry-run；写入时目标父目录须存在，目标必须是源码目录之外的新目录。初始化器不覆盖、删除当前项目，不复制依赖、产物、已有环境文件、常见凭证文件或本地配置；请勿把其他业务密钥放入源码。`base` 保留首页/我的/登录与正式鉴权，去掉演示页面和演示登录；`demo` 保留演示功能，生产环境仍强制正式鉴权。生成后在新目录执行 `pnpm install --frozen-lockfile`、`pnpm run doctor`、`pnpm generate`、`pnpm check:routes`。`doctor` 和 `init` 与 pnpm 内置命令同名，必须带 `run`。

## 持久化、日志与质量门禁

`VITE_STORAGE_NAMESPACE` 应为每个业务应用设置不同值；适配器追加环境与数据版本，旧的无命名空间存储不自动迁移。损坏或不兼容记录忽略，用户会话在 Pinia 恢复后立即校验。令牌仍存于本地存储，设备安全与敏感业务的后端授权须由业务项目落实。

`utils/logger.ts` 默认输出本地脱敏日志；`configureLogger(adapter)` 可接入业务日志渠道。请求不记录 body、header 或 query，保留路径、状态、方法、耗时和格式受限的请求 ID。异常文本中的凭证也做脱敏；业务数据仍应避免主动传入日志。

`.github/workflows/quality.yml` 提供冻结安装、工具链、路由、lint、类型、测试、Web/微信编译和浏览器冒烟。原生任务仅在 `ENABLE_NATIVE_CI=true` 且专用 runner 配齐 HBuilderX/SDK 时执行。完整检查、发布配置及原生验收要求见 [质量与交付说明](docs/quality.md)。

## License

MIT（RiceUI、z-paging-x 均为 MIT 协议）

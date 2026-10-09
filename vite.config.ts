import process from 'node:process'
import path from 'node:path'
import { uniEasycomPlugin } from '@dcloudio/uni-cli-shared/dist/vite/plugins/easycom.js'
import { UNI_EASYCOM_EXCLUDE } from '@dcloudio/uni-cli-shared'
import uniModule from '@dcloudio/vite-plugin-uni'
import UniPages from '@uni-helper/vite-plugin-uni-pages'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig, loadEnv } from 'vite'
import { uniPageOptions } from './build/scripts/page-options.mjs'

// 官方原生根目录布局：工程根即 uni 输入目录，
// App.uvue/main.uts/manifest.json/pages/、pages-sub/、components/、uni_modules/、static/ 均在根，
// HBuilderX 直接打开仓库根即可运行，CLI 与 HBuilderX 识别同一工程结构。
// UNI_INPUT_DIR 必须在任何 uni 插件工厂执行前规范为【绝对路径】（uts 编译器以它作为 tsconfig rootDir）。
if (process.env.UNI_INPUT_DIR) {
  process.env.UNI_INPUT_DIR = path.resolve(process.cwd(), process.env.UNI_INPUT_DIR)
}
else {
  process.env.UNI_INPUT_DIR = process.cwd()
}

const rootDir = process.cwd()
// 环境变量统一收纳到 env/ 目录（Vite envDir；.env / .env.development / .env.test / .env.production）
const envDir = path.resolve(rootDir, 'env')

// @dcloudio/vite-plugin-uni 在 ESM 下存在 default/命名导出差异，做一次兼容
const uni = (uniModule as typeof uniModule & { default?: typeof uniModule }).default ?? uniModule

const platform = process.env.UNI_PLATFORM ?? ''
const isMp = platform.startsWith('mp-')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir)

  return {
    base: './',
    envDir,
    resolve: {
      alias: [
        // @ 指向工程根：业务代码用 @/store、@/http、@/components/...，插件与静态资源用 @/uni_modules、@/static
        { find: '@', replacement: rootDir },
        { find: '@img', replacement: path.join(rootDir, 'static') },
        // H5 端必须把裸导入 'vue' 统一指向 DCloud 的 uni-h5 vue 运行时分支：
        // uni-h5 平台层与 uts 产物中的 UTSJSONObject 等对象按该分支的特性实现，
        // 若落到标准 vue 包，会出现两份 Vue 运行时（defineProperty/slots 描述符冲突、
        // “Cannot assign to read only property '_'”等错误）。参考 unibestX 官方实现。
        ...(platform === 'web' || platform === 'h5'
          ? [{ find: /^vue$/, replacement: '@dcloudio/uni-h5-vue' }]
          : [])
      ]
    },
    plugins: [
      // 约定式路由：扫描 pages（主包）与 pages-sub（分包），合并 pages.config.json 生成根 pages.json
      UniPages(uniPageOptions),
      // vue / uni-app API 自动导入（ref、computed、onLoad 等无需手写 import）。
      // 必须排在 uni() 之前：在源码 .uvue/.uts 阶段注入 import，
      // 保证 H5 / 小程序 / App（uts 编译）各端拿到的都是已补齐导入的源码
      AutoImport({
        imports: ['vue', 'uni-app'],
        include: [/\.[jt]s$/, /\.uts$/, /\.vue$/, /\.uvue$/],
        dts: 'types/auto-imports.d.ts',
        vueTemplate: true
      }),
      // 非小程序端需手动挂载 easycom 插件（App 蒸汽 / Web 端把 <rice-*>、<z-paging-x> 转为静态 import）；
      // 小程序端由官方编译器基于 usingComponents 原生处理，挂载反而会报 resolveDynamicComponent
      ...(isMp ? [] : [uniEasycomPlugin({ exclude: UNI_EASYCOM_EXCLUDE })]),
      uni()
    ],
    server: {
      host: env.VITE_DEV_HOST || '127.0.0.1',
      port: Number(env.VITE_DEV_PORT) || 9000,
      // VITE_H5_USE_PROXY=true 时，H5 请求经 vite 代理转发，规避浏览器跨域
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true
        }
      }
    }
  }
})

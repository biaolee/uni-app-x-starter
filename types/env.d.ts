/// <reference types="@dcloudio/types" />

// vite-plugin-uni-pages 提供的页面配置宏（编译期提取，无运行时副作用）
declare function definePage(config: Record<string, any>): void

// uni-app x App 端主题 API（@dcloudio/types 的跨端 legacy 声明未收录，App 端运行时可用）
declare namespace UniNamespace {
  interface GetAppBaseInfoResult {
    appTheme?: string
  }
  interface GetDeviceInfoResult {
    osTheme?: string
  }
}
interface Uni {
  onAppThemeChange: (callback: (result: { appTheme: string }) => void) => void
  onHostThemeChange: (callback: () => void) => void
  setAppTheme: (options: { theme: 'auto' | 'light' | 'dark' }) => void
}

// 环境变量（.env.* 中 VITE_ 开头的变量）
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_SERVER_BASEURL: string
  readonly VITE_H5_USE_PROXY: string
  readonly VITE_PROXY_TARGET: string
  readonly VITE_DEV_PORT: string
  readonly VITE_AUTH_MODE: string
  readonly VITE_STORAGE_NAMESPACE: string
  readonly VITE_FILE_UPLOAD_MODE: string
  readonly VITE_EXCEL_IMPORT_PATH: string
  readonly VITE_SERVER_UPLOAD_PATH: string
  readonly VITE_QINIU_TOKEN_PATH: string
  readonly VITE_QINIU_UPLOAD_URL: string
  readonly DEV: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// RiceUI 入口为 .uts，这里为 TS / vue-tsc 提供最小类型声明
declare module '@/uni_modules/rice-ui' {
  import type { ComputedRef } from 'vue'

  export function setTheme(theme: 'dark' | 'light'): void
  export const isDark: ComputedRef<boolean>
}

// 平台编译器插件（由 uni CLI 注入到虚拟入口，包自身未携带类型声明）
declare module '@dcloudio/uni-h5' {
  import type { Plugin } from 'vue'

  export const plugin: Plugin
}
declare module '@dcloudio/uni-mp-weixin' {
  import type { Plugin } from 'vue'

  export const plugin: Plugin
}

declare module '*.uvue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, any>
  export default component
}

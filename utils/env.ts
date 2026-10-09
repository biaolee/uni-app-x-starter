/**
 * 环境变量统一出口（只允许通过本模块读取 env，避免散落各处）
 */
export const ENV = {
  appTitle: import.meta.env.VITE_APP_TITLE ?? '',
  /** 后端接口基址 */
  baseUrl: import.meta.env.VITE_SERVER_BASEURL ?? '',
  /** H5 是否走 vite 代理（走代理时请求前缀替换为 /api） */
  useProxy: import.meta.env.VITE_H5_USE_PROXY === 'true',
  devPort: Number(import.meta.env.VITE_DEV_PORT) || 9000,
  isDev: import.meta.env.DEV,
  mode: import.meta.env.MODE,
  storageNamespace: import.meta.env.VITE_STORAGE_NAMESPACE || 'uni-app-x-starter',
  authMode: import.meta.env.VITE_AUTH_MODE === 'demo' ? 'demo' : 'real',
  fileUploadMode: import.meta.env.VITE_FILE_UPLOAD_MODE ?? '',
  excelImportPath: import.meta.env.VITE_EXCEL_IMPORT_PATH ?? '',
  serverUploadPath: import.meta.env.VITE_SERVER_UPLOAD_PATH ?? '',
  qiniuTokenPath: import.meta.env.VITE_QINIU_TOKEN_PATH ?? '',
  qiniuUploadUrl: import.meta.env.VITE_QINIU_UPLOAD_URL ?? ''
} as const

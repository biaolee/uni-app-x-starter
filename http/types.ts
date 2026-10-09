/**
 * HTTP 层类型定义
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** 后端统一响应结构（按自家后端约定调整） */
export interface ApiResult<T = any> {
  code: number
  message?: string
  msg?: string
  data: T
}

export interface HttpRequestOptions {
  /** 接口地址，相对路径（如 /user/info）或完整 URL */
  url: string
  method?: HttpMethod
  /** 请求体（POST/PUT） */
  data?: Record<string, any> | string
  /** URL query 参数 */
  query?: Record<string, any>
  /** 自定义请求头（与全局 header 合并） */
  header?: Record<string, string>
  timeout?: number
  /** 跳过自动携带 token */
  ignoreAuth?: boolean
}

/** 业务异常 */
export class BizError extends Error {
  code: number
  constructor(code: number, message: string) {
    super(message)
    this.name = 'BizError'
    this.code = code
  }
}

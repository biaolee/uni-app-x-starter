import { ENV } from '@/utils/env'

/**
 * 解析最终请求地址：
 * 1. 完整 http(s) 地址原样使用
 * 2. H5 代理模式（VITE_H5_USE_PROXY=true）下前缀替换为 /api，交给 vite/nginx 转发
 * 3. 其余情况拼接 VITE_SERVER_BASEURL
 */
export function resolveUrl(url: string): string {
  if (/^https?:\/\//i.test(url))
    return url
  const path = url.startsWith('/') ? url : `/${url}`
  return `${ENV.baseUrl.replace(/\/$/, '')}${path}`
}

/** query 对象序列化为 querystring（跳过 null/undefined/''） */
export function stringifyQuery(query?: Record<string, any>): string {
  if (!query)
    return ''
  const pairs = Object.keys(query)
    .filter(key => query[key] !== null && query[key] !== undefined && query[key] !== '')
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(query[key]))}`)
  return pairs.join('&')
}

export function withQuery(url: string, query?: Record<string, any>): string {
  const value = stringifyQuery(query)
  if (!value)
    return url
  return `${url}${url.includes('?') ? '&' : '?'}${value}`
}

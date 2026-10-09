/// <reference types="@uni-helper/vite-plugin-uni-pages/client" />
import { pages, subPackages } from 'virtual:uni-pages'

/** 只规范页面路径用于匹配，不解码或重写 URL query。 */
export function normalizeRoutePath(url: unknown): string {
  if (typeof url !== 'string' || !url || url.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(url))
    return ''
  const path = url.split(/[?#]/)[0]
  if (!path || /[\s\\]/.test(path))
    return ''
  return `${path.startsWith('/') ? '' : '/'}${path}`.replace(/\/+$/, '')
}

const registeredPaths = new Set([
  ...pages.map(page => normalizeRoutePath(page.path)),
  ...subPackages.flatMap(pkg => pkg.pages.map(page => normalizeRoutePath(`${pkg.root}/${page.path}`)))
])

/** 仅接受已注册的内部页面，保留原始 query 编码；非法目标返回空字符串。 */
export function resolveInternalRouteUrl(url: unknown): string {
  if (typeof url !== 'string' || /[#\\]/.test(url))
    return ''
  for (let index = 0; index < url.length; index++) {
    const code = url.charCodeAt(index)
    if (code <= 32 || code === 127)
      return ''
  }
  const path = normalizeRoutePath(url)
  if (!path || !registeredPaths.has(path))
    return ''
  try {
    decodeURIComponent(url)
  }
  catch {
    return ''
  }
  const queryIndex = url.indexOf('?')
  return queryIndex < 0 ? path : `${path}${url.slice(queryIndex)}`
}

/** 冷启动 query 是参数值，逐项编码一次后再放进登录 redirect。 */
export function directEntryUrl(path: unknown, query?: unknown): string {
  const url = resolveInternalRouteUrl(path)
  if (!url || !query || typeof query !== 'object' || Array.isArray(query))
    return url
  const params: string[] = []
  try {
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }
  catch {
    return ''
  }
  if (!params.length)
    return url
  return `${url}${url.includes('?') ? '&' : '?'}${params.join('&')}`
}

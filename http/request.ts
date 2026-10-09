import { resolveUrl, withQuery } from './interceptor'
import { BizError } from './types'
import type { HttpMethod, HttpRequestOptions } from './types'
import { unwrapResponse } from './response'
import { logTransport } from '@/utils/logger'

interface HttpAuthAdapter {
  accessToken: () => string
  onUnauthorized: () => void
  sessionVersion?: () => number
}

let authAdapter: HttpAuthAdapter | null = null

export function configureHttpAuth(adapter: HttpAuthAdapter): void {
  authAdapter = adapter
}

export function captureHttpSession(url: string, ignoreAuth = false) {
  const adapter = usesSession(url, ignoreAuth) ? authAdapter : null
  const token = adapter?.accessToken() ?? ''
  return { adapter, token, version: adapter?.sessionVersion?.() }
}

export function notifyHttpUnauthorized(session: ReturnType<typeof captureHttpSession>): void {
  const { adapter, token, version } = session
  if (adapter && adapter === authAdapter && token === adapter.accessToken() && version === adapter.sessionVersion?.())
    adapter.onUnauthorized()
}

function usesSession(url: string, ignoreAuth = false): boolean {
  return !ignoreAuth && !/^https?:\/\//i.test(url)
}

export function requestHeader(url: string, ignoreAuth = false, json = true, extra?: Record<string, string>): Record<string, string> {
  const header: Record<string, string> = json ? { 'Content-Type': 'application/json;charset=utf-8' } : {}
  if (usesSession(url, ignoreAuth)) {
    const token = authAdapter?.accessToken()
    if (token)
      header.Authorization = `Bearer ${token}`
  }
  return { ...header, ...extra }
}

class Request {
  /** 核心请求方法，直接 resolve 业务 data */
  request<T = unknown>(options: HttpRequestOptions): Promise<T> {
    const session = captureHttpSession(options.url, options.ignoreAuth)
    if (options.header && Object.entries(options.header).some(([key, value]) => key.toLowerCase() === 'authorization' && value !== `Bearer ${session.token}`))
      session.adapter = null
    const started = Date.now()
    return new Promise((resolve, reject) => {
      uni.request({
        url: withQuery(resolveUrl(options.url), options.query),
        method: options.method ?? 'GET',
        data: options.data,
        header: requestHeader(options.url, options.ignoreAuth, true, options.header),
        timeout: options.timeout ?? 30_000,
        success: (res) => {
          logTransport(options.url, options.method ?? 'GET', started, res.statusCode, res.header)
          try {
            resolve(unwrapResponse<T>(res.statusCode, res.data, () => notifyHttpUnauthorized(session), true))
          }
          catch (error) {
            reject(error)
          }
        },
        fail: (error: any) => {
          logTransport(options.url, options.method ?? 'GET', started, -1)
          const message = /timeout/i.test(error?.errMsg ?? '') ? '请求超时，请稍后重试' : '网络异常，请检查网络连接'
          reject(new BizError(-1, message))
        }
      })
    })
  }

  get<T = unknown>(url: string, query?: Record<string, any>, options?: Partial<HttpRequestOptions>): Promise<T> {
    return this.request<T>({ url, method: 'GET', query, ...options })
  }

  post<T = unknown>(url: string, data?: Record<string, any>, options?: Partial<HttpRequestOptions>): Promise<T> {
    return this.request<T>({ url, method: 'POST', data, ...options })
  }

  put<T = unknown>(url: string, data?: Record<string, any>, options?: Partial<HttpRequestOptions>): Promise<T> {
    return this.request<T>({ url, method: 'PUT', data, ...options })
  }

  delete<T = unknown>(url: string, query?: Record<string, any>, options?: Partial<HttpRequestOptions>): Promise<T> {
    return this.request<T>({ url, method: 'DELETE', query, ...options })
  }
}

export const http = new Request()
export type { HttpMethod }

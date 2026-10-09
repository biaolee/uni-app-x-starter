import type { App } from 'vue'

export interface LogRecord {
  level: 'info' | 'error'
  event: string
  time: number
  data: unknown
}
export type LogAdapter = (record: LogRecord) => void

const SECRET_KEY = /authorization|cookie|token|password|passwd|secret|credential|api[-_]?key/i

function safeText(value: string): string {
  return value
    .replace(/Bearer\s+[^\s,;"']+/gi, 'Bearer [redacted]')
    .replace(/(["']?[\w-]*(?:token|password|passwd|secret|credential|authorization|api[-_]?key)[\w-]*["']?\s*[=:]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;&"'}]+)/gi, '$1[redacted]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => {
      // 日志只保留域名与路径，丢弃所有 query、fragment 和用户信息。
      return url.split(/[?#]/)[0].replace(/(https?:\/\/)[^/]*@/i, '$1')
    })
    .replace(/((?:token|password|passwd|secret|credential|authorization|api[-_]?key)\s*[=:]\s*)[^\s,;&"']+/gi, '$1[redacted]')
}

function normalize(value: unknown, seen = new WeakSet<object>(), depth = 0): unknown {
  if (typeof value === 'string')
    return safeText(value)
  if (value === null || value === undefined || typeof value === 'boolean' || typeof value === 'number')
    return value ?? null
  if (typeof value !== 'object')
    return String(value)
  if (seen.has(value))
    return '[circular]'
  if (depth > 8)
    return '[truncated]'
  seen.add(value)
  if (value instanceof Error)
    return { name: safeText(value.name), message: safeText(value.message) }
  if (Array.isArray(value))
    return value.slice(0, 50).map(item => normalize(item, seen, depth + 1))
  const data: Record<string, unknown> = {}
  for (const key of Object.keys(value).slice(0, 50)) {
    if (SECRET_KEY.test(key))
      data[key] = '[redacted]'
    else
      data[key] = normalize((value as Record<string, unknown>)[key], seen, depth + 1)
  }
  return data
}

const consoleAdapter: LogAdapter = record => console[record.level](`[${record.event}]`, record.data)
let adapter: LogAdapter = consoleAdapter

/** 外部上报由应用显式配置，默认只输出本地脱敏日志。 */
export function configureLogger(next: LogAdapter = consoleAdapter): void {
  adapter = next
}

function emit(level: LogRecord['level'], event: string, data: unknown): void {
  try {
    adapter({ level, event: safeText(event), time: Date.now(), data: normalize(data) })
  }
  catch {
    // 日志适配器或异常对象本身抛错时，不影响原始业务。
  }
}

export const logger = {
  info: (event: string, data?: unknown) => emit('info', event, data),
  error: (event: string, data?: unknown) => emit('error', event, data)
}

/** 请求不记录 query/body/header；ID 仅接受有限字符，防止上游回显敏感信息。 */
export function logTransport(url: string, method: string, started: number, status: number, headers?: Record<string, unknown>): void {
  const path = url.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0] || '/'
  const rawId = headers?.['x-request-id'] ?? headers?.['X-Request-Id'] ?? headers?.['x-trace-id']
  const requestId = typeof rawId === 'string' && /^[\w.-]{1,64}$/.test(rawId) ? rawId : undefined
  logger.info('http', { path, method, status, duration: Math.max(0, Date.now() - started), requestId })
}

interface LoggingApp {
  config: Pick<App['config'], 'errorHandler'>
}
const installedApps = new WeakSet<object>()
const installedRuntimes = new WeakSet<object>()

export function installGlobalLogging(app: LoggingApp): void {
  if (!installedApps.has(app)) {
    installedApps.add(app)
    const previous = app.config.errorHandler
    app.config.errorHandler = (error, instance, info) => {
      logger.error('vue.error', { error, info })
      previous?.(error, instance, info)
    }
  }
  if (typeof uni !== 'undefined' && !installedRuntimes.has(uni)) {
    installedRuntimes.add(uni)
    if (typeof uni.onUnhandledRejection === 'function')
      uni.onUnhandledRejection(event => logger.error('app.unhandledRejection', event))
  }
}

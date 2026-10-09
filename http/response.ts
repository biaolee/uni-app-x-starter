import { BizError } from './types'

const SUCCESS_CODES = [0, 200]
const EXPIRED_CODES = [401, 40001, 40002]

/** 请求与业务上传共用的后端响应约定。403 仅表示权限不足。 */
export function unwrapResponse<T>(status: number, value: unknown, onExpired: () => void, allowRaw = false, upload = false): T {
  const formatMessage = upload ? '上传响应格式错误' : '响应格式错误'
  if (status < 200 || status >= 300) {
    if (EXPIRED_CODES.includes(status)) {
      onExpired()
      throw new BizError(status, '登录已过期，请重新登录')
    }
    throw new BizError(status, status === 403 ? '没有权限执行此操作' : `${upload ? '上传失败' : '请求错误'}(${status})`)
  }
  if (!value || typeof value !== 'object' || !('code' in value)) {
    if (allowRaw)
      return value as T
    throw new BizError(-1, formatMessage)
  }
  const body = value as Record<string, unknown>
  if (typeof body.code !== 'number')
    throw new BizError(-1, formatMessage)
  if (EXPIRED_CODES.includes(body.code)) {
    onExpired()
    throw new BizError(body.code, '登录已过期，请重新登录')
  }
  if (!SUCCESS_CODES.includes(body.code)) {
    const message = typeof body.message === 'string' ? body.message : typeof body.msg === 'string' ? body.msg : body.code === 403 ? '没有权限执行此操作' : '业务异常'
    throw new BizError(body.code, message)
  }
  if (!Object.prototype.hasOwnProperty.call(body, 'data'))
    throw new BizError(-1, formatMessage)
  return body.data as T
}

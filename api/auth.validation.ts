import type { UserInfo } from './auth'

export interface SessionToken {
  token: string
  expiresIn?: number
}

export function isSessionToken(value: unknown): value is SessionToken {
  if (!value || typeof value !== 'object')
    return false
  const data = value as Record<string, unknown>
  return typeof data.token === 'string' && !!data.token.trim()
    && (data.expiresIn === undefined || (typeof data.expiresIn === 'number' && Number.isFinite(data.expiresIn) && data.expiresIn > 0 && data.expiresIn <= Number.MAX_SAFE_INTEGER / 1000))
}

export function isUserInfo(value: unknown): value is UserInfo {
  if (!value || typeof value !== 'object')
    return false
  const data = value as Record<string, unknown>
  return ((typeof data.id === 'number' && Number.isFinite(data.id)) || (typeof data.id === 'string' && !!data.id.trim()))
    && typeof data.nickname === 'string' && typeof data.avatar === 'string'
    && (data.phone === undefined || typeof data.phone === 'string')
    && (data.roles === undefined || (Array.isArray(data.roles) && data.roles.every(role => typeof role === 'string')))
}

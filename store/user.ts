import { defineStore } from 'pinia'
import { getUserInfoApi, loginApi, logoutApi } from '@/api/auth'
import type { LoginParams, UserInfo } from '@/api/auth'
import { ENV } from '@/utils/env'
import { isSessionToken, isUserInfo } from '@/api/auth.validation'

export interface TokenPayload {
  token: string
  expiresIn?: number
}

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const expireTime = ref(0)
  const userInfo = ref<UserInfo | null>(null)
  let revision = 0
  let expiryTimer: ReturnType<typeof setTimeout> | null = null

  const isLoggedIn = computed(() => !!token.value && !!userInfo.value)

  function clearSession(): void {
    revision++
    if (expiryTimer !== null)
      clearTimeout(expiryTimer)
    expiryTimer = null
    token.value = ''
    expireTime.value = 0
    userInfo.value = null
  }

  function accessToken(): string {
    if (expireTime.value !== 0 && expireTime.value <= Date.now()) {
      clearSession()
      return ''
    }
    return token.value
  }

  function ensureValidSession(): boolean {
    const valid = typeof token.value === 'string' && !!token.value.trim()
      && typeof expireTime.value === 'number' && Number.isFinite(expireTime.value) && expireTime.value >= 0
      && isUserInfo(userInfo.value) && !!accessToken()
    if (!valid)
      clearSession()
    return valid
  }

  function scheduleExpiry(): void {
    if (expiryTimer !== null)
      clearTimeout(expiryTimer)
    expiryTimer = null
    if (!token.value || expireTime.value === 0)
      return
    const remaining = expireTime.value - Date.now()
    if (remaining <= 0) {
      clearSession()
      return
    }
    expiryTimer = setTimeout(() => {
      if (expireTime.value > Date.now())
        scheduleExpiry()
      else
        clearSession()
    }, Math.min(remaining, 2_147_483_647))
  }

  function setSession(payload: TokenPayload, info: UserInfo): void {
    if (!isSessionToken(payload) || !isUserInfo(info))
      throw new Error('登录响应格式错误')
    clearSession()
    token.value = payload.token
    expireTime.value = payload.expiresIn ? Date.now() + payload.expiresIn * 1000 : 0
    userInfo.value = info
    scheduleExpiry()
  }

  function initSession(): void {
    if (ensureValidSession())
      scheduleExpiry()
  }

  async function login(params: LoginParams): Promise<UserInfo> {
    clearSession()
    const startedRevision = revision
    try {
      const result = await loginApi(params)
      if (revision !== startedRevision)
        throw new Error('登录操作已失效')
      if (!isSessionToken(result))
        throw new Error('登录响应格式错误')
      token.value = result.token
      expireTime.value = result.expiresIn ? Date.now() + result.expiresIn * 1000 : 0
      scheduleExpiry()
      const info = await getUserInfoApi()
      if (revision !== startedRevision)
        throw new Error('登录操作已失效')
      if (!isUserInfo(info))
        throw new Error('用户响应格式错误')
      userInfo.value = info
      scheduleExpiry()
      return info
    }
    catch (error) {
      if (revision === startedRevision)
        clearSession()
      throw error
    }
  }

  async function logout(): Promise<void> {
    let request: Promise<void> | null = null
    try {
      if (token.value && ENV.authMode !== 'demo')
        request = logoutApi()
    }
    catch {
      // Local logout must succeed even when the request cannot start.
    }
    clearSession()
    try {
      if (request)
        await request
    }
    catch {
      // The session has already been cleared.
    }
  }

  return {
    token,
    expireTime,
    userInfo,
    isLoggedIn,
    accessToken,
    ensureValidSession,
    setSession,
    initSession,
    clearSession,
    sessionVersion: () => revision,
    login,
    logout
  }
}, {
  persist: {
    pick: ['token', 'expireTime', 'userInfo'],
    afterHydrate: ({ store }) => store.initSession()
  }
})

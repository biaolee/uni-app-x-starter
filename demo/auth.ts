import type { UserInfo } from '@/api/auth'

export function createDemoSession(username: string): { token: string, expiresIn: number, user: UserInfo } {
  if (import.meta.env.VITE_AUTH_MODE !== 'demo')
    throw new Error('演示登录未启用')
  return {
    token: `demo-token-${Date.now()}`,
    expiresIn: 7200,
    user: { id: 1, nickname: username, avatar: '' }
  }
}

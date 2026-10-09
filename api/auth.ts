import { http } from '@/http'

/** 账号密码登录 */
export function loginApi(data: LoginParams) {
  return http.post<LoginResult>('/auth/login', data as Record<string, any>, { ignoreAuth: true })
}

/** 获取当前用户信息 */
export function getUserInfoApi() {
  return http.get<UserInfo>('/user/info')
}

/** 退出登录（通知后端作废 token） */
export function logoutApi() {
  return http.post<void>('/auth/logout')
}

/** 用户与鉴权相关接口定义（按后端实际响应结构调整） */
export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  /** 有效期（秒） */
  expiresIn: number
}

export interface UserInfo {
  id: number | string
  nickname: string
  avatar: string
  /** 可扩展：手机号、角色、权限标识等 */
  phone?: string
  roles?: string[]
}

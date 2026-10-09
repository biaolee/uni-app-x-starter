import { useUserStore } from '@/store/user'
import { configureHttpAuth } from '@/http'
import { directEntryUrl, normalizeRoutePath, resolveInternalRouteUrl } from './url'
import {
  GLOBAL_NEED_LOGIN,
  HOME_PAGE,
  LOGIN_PAGE,
  NEED_LOGIN_PAGES,
  TABBAR_PAGES,
  WHITE_LIST
} from './config'

/** 判断目标页面是否需要登录 */
function needLogin(url: string): boolean {
  const path = normalizeRoutePath(url)
  if (!path)
    return false
  if (GLOBAL_NEED_LOGIN) {
    return !WHITE_LIST.some(item => normalizeRoutePath(item) === path)
  }
  return NEED_LOGIN_PAGES.some(item => normalizeRoutePath(item) === path)
}

let isRedirecting = false
let installed = false

/** 跳转登录页，并携带登录前目标地址（redirect） */
function redirectToLogin(redirect: string): boolean {
  if (isRedirecting)
    return true
  isRedirecting = true
  const internalUrl = resolveInternalRouteUrl(redirect)
  const target = internalUrl && normalizeRoutePath(internalUrl) !== normalizeRoutePath(LOGIN_PAGE)
    ? `${LOGIN_PAGE}?redirect=${encodeURIComponent(internalUrl)}`
    : LOGIN_PAGE
  uni.reLaunch({
    url: target,
    complete: () => {
      isRedirecting = false
    }
  })
  return true
}

/** 核心守卫：返回 true 放行，false 拦截 */
function guard(url: string): boolean {
  if (!needLogin(url))
    return true
  if (useUserStore().ensureValidSession())
    return true
  redirectToLogin(url)
  return false
}

/**
 * 安装全局路由拦截器（在 createApp 中调用一次）
 */
export function installRouteInterceptor(): void {
  if (installed)
    return
  installed = true
  configureHttpAuth({
    accessToken: () => useUserStore().accessToken(),
    sessionVersion: () => useUserStore().sessionVersion(),
    onUnauthorized: () => {
      useUserStore().clearSession()
      redirectToLogin('')
    }
  });
  (['navigateTo', 'redirectTo', 'reLaunch', 'switchTab'] as const).forEach((method) => {
    uni.addInterceptor(method, {
      invoke(options: any) {
        return guard(options?.url ?? '') ? options : false
      }
    })
  })
}

/**
 * 冷启动 / H5 直链 / 小程序分享进入时拦截器不会触发，在 App.onShow 中兜底校验
 */
export function checkDirectEntry(options?: any): void {
  if (!options?.path)
    return
  const url = directEntryUrl(options.path, options.query)
  if (needLogin(options.path) && !useUserStore().ensureValidSession()) {
    redirectToLogin(url)
  }
}

/**
 * 登录成功后的统一回跳：优先 redirect 参数，其次首页；tabBar 页用 switchTab
 */
export function navigateAfterLogin(redirect?: string): void {
  const internalUrl = resolveInternalRouteUrl(redirect)
  const target = internalUrl && normalizeRoutePath(internalUrl) !== normalizeRoutePath(LOGIN_PAGE) ? internalUrl : HOME_PAGE
  const path = normalizeRoutePath(target)
  if (TABBAR_PAGES.some(item => normalizeRoutePath(item) === path)) {
    uni.switchTab({ url: path })
  }
  else {
    uni.reLaunch({ url: target })
  }
}

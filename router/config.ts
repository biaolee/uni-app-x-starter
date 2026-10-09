/**
 * 路由鉴权配置
 *
 * 官方原生根目录布局：主包页面位于 pages/，分包位于 pages-sub/pages/
 * （pages-sub 为分包 root，当前页面位于其 pages/ 目录），
 * 路由 URL 与 pages.json 路径一致，不带 src 前缀。
 */

/** 登录页（位于 pages-sub 分包 pages/auth） */
export const LOGIN_PAGE = '/pages-sub/pages/auth/login'

/** 首页（tabBar 页） */
export const HOME_PAGE = '/pages/index/index'

/** tabBar 页面集合（登录后回跳时用于区分 switchTab / reLaunch） */
export const TABBAR_PAGES = [
  '/pages/index/index',
  '/pages/me/me'
]

/**
 * 鉴权模式：
 * - true  = 全局鉴权：除 WHITE_LIST 外所有页面都要登录（适合强登录型 App）
 * - false = 按需鉴权：仅 NEED_LOGIN_PAGES 中的页面需要登录（适合浏览型 App）
 */
export const GLOBAL_NEED_LOGIN = false

/** 全局鉴权模式下的免登录白名单 */
export const WHITE_LIST = [
  LOGIN_PAGE,
  HOME_PAGE,
  '/pages/me/me',
  '/pages-sub/pages/demo/ui',
  '/pages-sub/pages/demo/paging'
]

/** 按需鉴权模式下，必须登录才能访问的页面（按需扩充） */
export const NEED_LOGIN_PAGES: string[] = []

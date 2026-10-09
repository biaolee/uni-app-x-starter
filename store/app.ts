import { defineStore } from 'pinia'
import { setTheme } from '@/uni_modules/rice-ui'

export type ThemeMode = 'auto' | 'light' | 'dark'

export const useAppStore = defineStore('app', () => {
  const themeMode = ref<ThemeMode>('auto')
  const isDark = ref(false)
  let initialized = false

  function getSystemDark(): boolean {
    // #ifdef WEB
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    // #endif
    // #ifdef MP-WEIXIN
    return uni.getAppBaseInfo().hostTheme === 'dark'
    // #endif
    // #ifdef APP
    return uni.getDeviceInfo().osTheme === 'dark'
    // #endif
    return false
  }

  function apply(mode: ThemeMode): void {
    const dark = mode === 'auto' ? getSystemDark() : mode === 'dark'
    isDark.value = dark
    setTheme(dark ? 'dark' : 'light')
    // #ifdef APP
    uni.setAppTheme({ theme: mode })
    // #endif
  }

  function initTheme(): void {
    // #ifndef APP
    themeMode.value = 'auto'
    // #endif
    if (initialized)
      return
    initialized = true

    // #ifdef WEB
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)')
      const listener = () => {
        if (themeMode.value === 'auto')
          apply('auto')
      }
      if (media.addEventListener)
        media.addEventListener('change', listener)
      else
        media.addListener(listener)
    }
    // #endif

    // #ifdef MP-WEIXIN
    uni.onHostThemeChange(() => {
      if (themeMode.value === 'auto')
        apply('auto')
    })
    // #endif

    // #ifdef APP
    uni.onAppThemeChange((result: any) => {
      isDark.value = result.appTheme === 'dark'
      setTheme(isDark.value ? 'dark' : 'light')
    })
    // #endif

    apply(themeMode.value)
  }

  function setThemeMode(mode: ThemeMode): void {
    // #ifndef APP
    if (mode !== 'auto')
      return
    // #endif
    themeMode.value = mode
    apply(mode)
  }

  return { themeMode, isDark, initTheme, setThemeMode }
}, {
  persist: { pick: ['themeMode'] }
})

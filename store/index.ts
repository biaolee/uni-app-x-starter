import { createPinia, setActivePinia } from 'pinia'
import { createPersistedState } from 'pinia-plugin-persistedstate'
import { storage } from '@/utils/storage'

const pinia = createPinia()

/**
 * 持久化插件：适配 uni 存储（全端可用）
 */
pinia.use(createPersistedState({
  storage
}))

// App 端页面模块可能在 createApp 之外引用 store，提前激活避免白屏
setActivePinia(pinia)

export default pinia

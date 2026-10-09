import { ENV } from './env'

/** 每个应用和环境独立；升级数据结构时递增版本，不隐式迁移旧用户数据。 */
export function createStorage(namespace: string, environment: string) {
  const scope = `${namespace}:${environment}`
  const prefix = `${encodeURIComponent(namespace)}:${encodeURIComponent(environment)}:v1:`

  function get<T = unknown>(key: string): T | null {
    try {
      const raw: unknown = uni.getStorageSync(prefix + key)
      if (typeof raw !== 'string' || !raw)
        return null
      const record: unknown = JSON.parse(raw)
      if (!record || typeof record !== 'object')
        return null
      const data = record as Record<string, unknown>
      if (data.version !== 1 || data.scope !== scope || !Object.prototype.hasOwnProperty.call(data, 'value'))
        return null
      return data.value as T
    }
    catch {
      return null
    }
  }

  function set(key: string, value: unknown): void {
    try {
      uni.setStorageSync(prefix + key, JSON.stringify({ version: 1, scope, value }))
    }
    catch {
      // 存储禁用、配额不足、不可序列化值均不影响业务。
    }
  }

  return {
    get,
    set,
    remove(key: string): void {
      try {
        uni.removeStorageSync(prefix + key)
      }
      catch {
        // 与读写保持相同的降级策略。
      }
    },
    getItem(key: string): string | null {
      const value = get(key)
      return typeof value === 'string' ? value : null
    },
    setItem: set
  }
}

export const storage = createStorage(ENV.storageNamespace, ENV.mode)

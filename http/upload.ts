import { resolveUrl } from './interceptor'
import { captureHttpSession, notifyHttpUnauthorized, requestHeader } from './request'
import { BizError } from './types'
import { unwrapResponse } from './response'
import { logTransport } from '@/utils/logger'

export interface UploadOptions {
  name?: string
  formData?: Record<string, string>
}

export interface UploadedFile {
  key: string
  url?: string
}

function parseBody(value: unknown): unknown {
  if (typeof value !== 'string')
    return value
  try {
    return JSON.parse(value)
  }
  catch {
    throw new BizError(-1, '上传响应格式错误')
  }
}

function uploadRaw(url: string, filePath: string, options: UploadOptions, businessApi: boolean): Promise<unknown> {
  const session = captureHttpSession(url, !businessApi)
  const started = Date.now()
  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: resolveUrl(url),
      filePath,
      name: options.name ?? 'file',
      formData: options.formData,
      header: businessApi ? requestHeader(url, false, false) : {},
      success: (res) => {
        const statusCode = res.statusCode as number
        logTransport(url, 'UPLOAD', started, statusCode)
        if (statusCode < 200 || statusCode >= 300) {
          if (businessApi) {
            try {
              unwrapResponse(statusCode, null, () => notifyHttpUnauthorized(session), false, true)
            }
            catch (error) {
              reject(error)
              return
            }
          }
          reject(new BizError(statusCode, `上传失败(${statusCode})`))
          return
        }
        try {
          const body = parseBody(res.data)
          resolve(businessApi ? unwrapResponse(statusCode, body, () => notifyHttpUnauthorized(session), false, true) : body)
        }
        catch (error) {
          reject(error)
        }
      },
      fail: () => {
        logTransport(url, 'UPLOAD', started, -1)
        reject(new BizError(-1, '上传失败，请重试'))
      }
    })
  })
}

export async function uploadBusiness<T>(url: string, filePath: string, options: UploadOptions = {}): Promise<T> {
  return await uploadRaw(url, filePath, options, true) as T
}

export async function uploadQiniu(url: string, filePath: string, options: UploadOptions): Promise<UploadedFile> {
  const body = await uploadRaw(url, filePath, options, false)
  if (typeof body !== 'object' || body === null || !('key' in body) || typeof body.key !== 'string' || !body.key.trim())
    throw new BizError(-1, '七牛云上传响应格式错误')
  return { key: body.key }
}

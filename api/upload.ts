import { http } from '@/http'
import { uploadBusiness, uploadQiniu } from '@/http/upload'
import type { UploadedFile, UploadOptions } from '@/http/upload'
import { BizError } from '@/http/types'
import { ENV } from '@/utils/env'

function businessPath(value: string, name: string): string {
  if (!value || !/^\/(?!\/)\S*$/.test(value))
    throw new BizError(-1, `${name} 必须是业务 API 相对路径`)
  return value
}

function qiniuHost(value: string): string {
  if (!value || !/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:\/.*)?$/i.test(value))
    throw new BizError(-1, 'VITE_QINIU_UPLOAD_URL 必须是 HTTPS 七牛云上传地址')
  return value
}

function validFile(value: unknown, provider: string): UploadedFile {
  if (!value || typeof value !== 'object' || typeof (value as UploadedFile).key !== 'string' || !(value as UploadedFile).key.trim())
    throw new BizError(-1, `${provider}上传返回的 key 无效`)
  const file = value as UploadedFile
  if (file.url !== undefined && (typeof file.url !== 'string' || !/^https:\/\/[a-z0-9.-]+(?::\d+)?(?:[/?#].*)?$/i.test(file.url)))
    throw new BizError(-1, `${provider}上传返回的 url 无效`)
  return { key: file.key, ...(file.url === undefined ? {} : { url: file.url }) }
}

export async function importExcel<T>(filePath: string, options: UploadOptions = {}): Promise<T> {
  return uploadBusiness<T>(businessPath(ENV.excelImportPath, 'VITE_EXCEL_IMPORT_PATH'), filePath, options)
}

export async function uploadFile(filePath: string, options: UploadOptions = {}): Promise<UploadedFile> {
  if (ENV.fileUploadMode === 'server-oss') {
    const data = await uploadBusiness<unknown>(businessPath(ENV.serverUploadPath, 'VITE_SERVER_UPLOAD_PATH'), filePath, options)
    return validFile(data, '服务端')
  }
  if (ENV.fileUploadMode !== 'qiniu')
    throw new BizError(-1, 'VITE_FILE_UPLOAD_MODE 必须是 server-oss 或 qiniu')

  const url = qiniuHost(ENV.qiniuUploadUrl)
  const tokenPath = businessPath(ENV.qiniuTokenPath, 'VITE_QINIU_TOKEN_PATH')
  const credential = await http.post<{ token: string, key: string }>(tokenPath, {})
  if (!credential || typeof credential.token !== 'string' || !credential.token.trim() || typeof credential.key !== 'string' || !credential.key.trim())
    throw new BizError(-1, '七牛云凭证响应无效')

  const data = await uploadQiniu(url, filePath, {
    ...options,
    formData: { ...options.formData, token: credential.token, key: credential.key }
  })
  const file = validFile({ key: data.key }, '七牛云')
  if (file.key !== credential.key)
    throw new BizError(-1, '七牛云上传返回的 key 与凭证不一致')
  return file
}

export type { UploadedFile, UploadOptions }

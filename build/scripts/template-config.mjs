export const TEMPLATE_PLATFORMS = ['web', 'mp-weixin', 'app-android', 'app-ios', 'app-harmony']

export function validateTemplateConfig(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config))
    return ['Configuration must be an object']
  const errors = []
  for (const key of ['projectName', 'appTitle', 'appid', 'weixinAppid', 'baseUrl', 'fileUploadMode', 'storageNamespace', 'profile']) {
    if (typeof config[key] !== 'string' || /[\r\n\0]/.test(config[key]))
      errors.push(`${key} must be a single-line string`)
  }
  for (const key of ['excelImportPath', 'serverUploadPath', 'qiniuTokenPath', 'qiniuUploadUrl']) {
    if (config[key] !== undefined && (typeof config[key] !== 'string' || /[\r\n\0]/.test(config[key])))
      errors.push(`${key} must be a single-line string`)
  }
  if (errors.length)
    return errors
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && ['"', '\'', '`'].every(quote => value.includes(quote)))
      errors.push(`${key} cannot contain all three environment quote delimiters`)
  }
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(config.projectName ?? ''))
    errors.push('projectName must be a lowercase package name using letters, digits and hyphens')
  if (!config.appTitle?.trim())
    errors.push('appTitle is required')
  if (!/^[a-z0-9][\w.-]{0,63}$/i.test(config.storageNamespace ?? ''))
    errors.push('storageNamespace must use letters, digits, dots, underscores or hyphens')
  if (!['base', 'demo'].includes(config.profile))
    errors.push('profile must be base or demo')
  if (!['server-oss', 'qiniu'].includes(config.fileUploadMode))
    errors.push('fileUploadMode must be server-oss or qiniu')
  if (!Array.isArray(config.platforms) || !config.platforms.length || config.platforms.some(platform => !TEMPLATE_PLATFORMS.includes(platform)))
    errors.push(`platforms must contain one or more of: ${TEMPLATE_PLATFORMS.join(', ')}`)
  if (Array.isArray(config.platforms) && config.platforms.includes('mp-weixin') && !/^wx[a-f\d]{16}$/i.test(config.weixinAppid ?? ''))
    errors.push('weixinAppid must be an own wx application ID for mp-weixin')
  if (Array.isArray(config.platforms) && config.platforms.some(platform => typeof platform === 'string' && platform.startsWith('app-')) && !/^__UNI__[a-z\d]+$/i.test(config.appid ?? ''))
    errors.push('appid must be an own __UNI__ application ID for native platforms')
  try {
    const url = new URL(config.baseUrl)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)
      errors.push('baseUrl must be an HTTP(S) endpoint without credentials, query or fragment')
  }
  catch {
    errors.push('baseUrl must be an absolute HTTP(S) URL')
  }
  for (const key of ['excelImportPath', 'serverUploadPath', 'qiniuTokenPath']) {
    if (config[key] !== undefined && (typeof config[key] !== 'string' || !/^\/(?!\/)[^\s?#]*$/.test(config[key])))
      errors.push(`${key} must be a relative API path starting with /`)
  }
  if (config.fileUploadMode === 'qiniu' && !/^https:\/\/(?:[a-z\d-]+\.)*(?:qiniup\.com|qbox\.me|qiniu\.com)(?::443)?\/?$/i.test(config.qiniuUploadUrl ?? ''))
    errors.push('qiniuUploadUrl must be an HTTPS Qiniu upload endpoint for qiniu mode')
  return errors
}

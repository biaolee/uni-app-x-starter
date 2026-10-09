export const RELEASE_TARGETS = ['web', 'h5', 'mp-weixin', 'app-android', 'app-ios', 'app-harmony']

function realHttpsEndpoint(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
      && !url.search && !url.hash
      && !/(?:^|\.)example\.(?:com|test)$/i.test(url.hostname)
      && url.hostname !== 'localhost' && !url.hostname.endsWith('.localhost')
      && !/^127\./.test(url.hostname) && url.hostname !== '[::1]'
      && url.hostname !== '0.0.0.0'
  }
  catch {
    return false
  }
}

export function validateReleaseConfig(target, manifest, env) {
  const errors = validateUploadConfig(env)
  if (!RELEASE_TARGETS.includes(target))
    errors.push(`release target must be one of: ${RELEASE_TARGETS.join(', ')}`)
  if (target === 'mp-weixin' && !/^wx[a-f\d]{16}$/i.test(manifest?.['mp-weixin']?.appid || ''))
    errors.push('manifest.json: mp-weixin.appid must be your Weixin application ID')
  if (target?.startsWith('app-') && !/^__UNI__[a-z\d]+$/i.test(manifest?.appid || ''))
    errors.push('manifest.json: appid must be your DCloud application ID')
  if (env.VITE_AUTH_MODE !== 'real')
    errors.push('env/.env.production: VITE_AUTH_MODE must be real')
  if (!realHttpsEndpoint(env.VITE_SERVER_BASEURL))
    errors.push('env/.env.production: VITE_SERVER_BASEURL must be a real HTTPS endpoint')
  return errors
}

export function validateUploadConfig(env) {
  const errors = []
  const path = (name) => {
    if (!/^\/(?!\/)\S*$/.test(env[name] || ''))
      errors.push(`env/.env.production: ${name} must be a relative business API path starting with /`)
  }

  path('VITE_EXCEL_IMPORT_PATH')
  if (env.VITE_FILE_UPLOAD_MODE === 'server-oss') {
    path('VITE_SERVER_UPLOAD_PATH')
  }
  else if (env.VITE_FILE_UPLOAD_MODE === 'qiniu') {
    path('VITE_QINIU_TOKEN_PATH')
    const host = env.VITE_QINIU_UPLOAD_URL || ''
    if (!realHttpsEndpoint(host))
      errors.push('env/.env.production: VITE_QINIU_UPLOAD_URL must be a real HTTPS upload host')
  }
  else {
    errors.push('env/.env.production: VITE_FILE_UPLOAD_MODE must be server-oss or qiniu')
  }
  return errors
}

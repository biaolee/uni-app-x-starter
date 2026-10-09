#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { validateTemplateConfig } from './template-config.mjs'

const SOURCE_ROOT = path.resolve(import.meta.dirname, '../..')
const SOURCE_DIRECTORIES = new Set(['api', 'assets', 'build', 'components', 'demo', 'docs', 'http', 'pages', 'pages-sub', 'router', 'static', 'store', 'tests', 'types', 'uni_modules', 'utils', '.github', '.husky'])
const SOURCE_FILES = new Set(['App.uvue', 'main.uts', 'manifest.json', 'pages.config.json', 'index.html', 'theme.json', 'uni.scss', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json', 'vite.config.ts', 'vitest.config.ts', 'eslint.config.mjs', '.gitignore', '.npmrc', 'README.md'])
const EXCLUDED_DIRECTORIES = new Set(['node_modules', '.git', '.idea', '.vscode', '.hx-tmp', 'dist', 'unpackage', 'coverage', 'test-results', 'playwright-report', '.cache'])

function isWithin(parent, child) {
  const relative = path.relative(parent, child)
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
}

function resolveTarget(sourceRoot, target, write) {
  if (!target) {
    if (write)
      throw new Error('--write requires an explicit --target pointing to a new directory')
    return null
  }
  const absolute = path.resolve(target)
  if (isWithin(sourceRoot, absolute) || isWithin(absolute, sourceRoot))
    throw new Error('Target must be outside the source checkout and must not contain it')
  if (existsSync(absolute) || lstatExists(absolute))
    throw new Error('Target already exists; overwrite is never allowed')
  // Resolve the existing parent to prevent junction/symlink aliases into the source.
  const parent = realpathSync(path.dirname(absolute))
  const resolved = path.join(parent, path.basename(absolute))
  if (isWithin(sourceRoot, resolved) || isWithin(resolved, sourceRoot))
    throw new Error('Target resolves inside the source checkout')
  return resolved
}

function lstatExists(file) {
  try {
    lstatSync(file)
    return true
  }
  catch (error) {
    if (error.code === 'ENOENT')
      return false
    throw error
  }
}

function collectSources(root, profile) {
  const files = new Map()
  function visit(relative = '') {
    for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name
      if (!relative && !(entry.isDirectory() ? SOURCE_DIRECTORIES.has(entry.name) : SOURCE_FILES.has(entry.name)))
        continue
      if (entry.isSymbolicLink())
        throw new Error(`Refusing to copy symbolic link: ${name}`)
      if (EXCLUDED_DIRECTORIES.has(entry.name) || /^\.env(?:\.|$)/.test(entry.name) || /\.(?:log|pem|key|p12|pfx|jks|keystore)$/i.test(entry.name) || entry.name.endsWith('.local'))
        continue
      if (/^(?:credentials|service-account|secrets)(?:[.-]|$)/i.test(entry.name) || (entry.name === '.npmrc' && relative))
        continue
      if (name === 'types/uni-pages.d.ts' || name === 'tests/template.test.ts' || name === 'types/auto-imports.d.ts' || name === 'docs/superpowers')
        continue
      if (profile === 'base' && (name === 'demo' || name === 'pages-sub/pages/demo' || name === 'tests/demo-auth.test.ts'))
        continue
      if (entry.isDirectory())
        visit(name)
      else if (entry.isFile())
        files.set(name, readFileSync(path.join(root, name)))
    }
  }
  visit()
  return files
}

function baseProfile(files) {
  files.set('pages/index/index.uvue', `<script setup lang="uts">
import { ENV } from '@/utils/env'
definePage({ style: { navigationBarTitleText: '首页' } })
</script>

<template>
  <app-layout :title="ENV.appTitle">
    <view class="card"><text>{{ ENV.appTitle }}</text></view>
  </app-layout>
</template>
`)
  const me = files.get('pages/me/me.uvue').toString().replace(/ {4}<view class="card">\s*<rice-cell-group>[\s\S]*?<\/rice-cell-group>\s*<\/view>\s*/, '')
  files.set('pages/me/me.uvue', me)
  let login = files.get('pages-sub/pages/auth/login.uvue').toString()
  login = login.replace(/^import .* from '@\/demo\/auth'\r?\n/gm, '').replace(/^import .* from '@\/utils\/env'\r?\n/gm, '').replace(/ENV\.authMode === 'demo' \? '[^']*' : ''/g, '\'\'').replace(/ {4}if \(import\.meta\.env\.VITE_AUTH_MODE === 'demo'\) \{[\s\S]*?\n {4}else \{\r?\n([\s\S]*?)\n {4}\}/, '$1').replace(/ {6}<text v-if="ENV\.authMode === 'demo'"[\s\S]*?<\/text>\r?\n/, '')
  if (/@\/demo|createDemoSession|ENV\.authMode|VITE_AUTH_MODE/.test(login))
    throw new Error('Login source changed; cannot safely remove demo authentication')
  files.set('pages-sub/pages/auth/login.uvue', login)
  files.set('router/config.ts', files.get('router/config.ts').toString().replace(/^.*['"]\/pages-sub\/pages\/demo\/.*\r?\n/gm, ''))
  let user = files.get('store/user.ts').toString().replace(/token\.value && ENV\.authMode !== 'demo'/g, 'token.value')
  if (!/ENV\./.test(user))
    user = user.replace(/^import .* from '@\/utils\/env'\r?\n/gm, '')
  files.set('store/user.ts', user)
  files.set('utils/env.ts', files.get('utils/env.ts').toString().replace(/import\.meta\.env\.VITE_AUTH_MODE === 'demo' \? 'demo' : 'real'/g, '\'real\''))
  files.set('tests/web-smoke/run.mjs', `#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import ts from 'typescript'

// Base profile smoke verifies pages, tabs and login shell without backend credentials.
const root = path.resolve(import.meta.dirname, '../..')
const artifactRoot = path.join(root, 'dist/build/h5')
const output = path.join(root, 'test-results/web-smoke')
const errors = []
const visited = []
async function main() {
let browser
let server
let page

try {
  const { chromium } = await import('playwright')
  let baseUrl = process.env.SMOKE_BASE_URL
  if (!baseUrl) {
    await fs.access(path.join(artifactRoot, 'index.html'))
    server = http.createServer(async (request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
        if (pathname === '/favicon.ico') {
          response.writeHead(204).end()
          return
        }
        const file = path.resolve(artifactRoot, \`\.\${pathname === '/' ? '/index.html' : pathname}\`)
        const relative = path.relative(artifactRoot, file)
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          response.writeHead(403).end()
          return
        }
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' }
        response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream')
        response.end(await fs.readFile(file))
      }
      catch {
        response.writeHead(404).end()
      }
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    baseUrl = \`http://127.0.0.1:\${server.address().port}\`
  }
  browser = await chromium.launch({ headless: true, channel: 'chromium' })
  page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error')
      errors.push(message.text())
  })
  page.on('response', (response) => {
    if (response.status() >= 400)
      errors.push(\`HTTP \${response.status()}: \${response.url()}\`)
  })
  page.on('requestfailed', request => errors.push(\`\${request.url()}: \${request.failure()?.errorText}\`))
  const pages = ts.parseConfigFileTextToJson('pages.json', await fs.readFile(path.join(root, 'pages.json'), 'utf8')).config
  const routes = [
    ...pages.pages.map(item => \`/\${item.path}\`),
    ...(pages.subPackages || []).flatMap(group => group.pages.map(item => \`/\${group.root}/\${item.path}\`))
  ]
  for (const route of routes) {
    await page.goto(\`\${baseUrl}/#\${route}\`, { waitUntil: 'networkidle' })
    await page.locator('.app-layout').waitFor({ state: 'visible' })
    const hash = new URL(page.url()).hash.split('?')[0]
    assert.ok(hash === \`#\${route}\` || (route === '/pages/index/index' && hash === '#/'), \`route did not render: \${route}\`)
    assert.ok((await page.locator('.app-layout').textContent())?.trim().length, \`empty page: \${route}\`)
    visited.push(route)
  }
  await page.goto(\`\${baseUrl}/#/pages/index/index\`, { waitUntil: 'networkidle' })
  await page.locator('uni-tabbar').getByText('我的', { exact: true }).click()
  await page.waitForURL(/#\\/pages\\/me\\/me$/)
  await page.getByText('去登录', { exact: true }).click()
  await page.waitForURL(/#\\/pages-sub\\/pages\\/auth\\/login$/)
  await page.locator('.rice-input input').nth(1).waitFor({ state: 'visible' })
  await page.goto(\`\${baseUrl}/#/pages/me/me\`, { waitUntil: 'networkidle' })
  await page.locator('uni-tabbar').getByText('首页', { exact: true }).click()
  await page.waitForURL(/#\\/(?:pages\\/index\\/index)?$/)
  assert.deepEqual(errors, [], 'browser errors detected')
  console.log(\`[smoke] \${visited.length} base pages, login shell and tabs passed\`)
}
catch (error) {
  errors.push(error.stack || String(error))
  console.error(\`[smoke] \${error.message}\`)
  process.exitCode = 1
}
finally {
  await fs.mkdir(output, { recursive: true })
  if (page)
    await page.screenshot({ path: path.join(output, 'last-page.png'), fullPage: true }).catch(() => {})
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ visited, errors }, null, 2))
  await browser?.close()
  if (server)
    await new Promise(resolve => server.close(resolve))
}
}

main().catch((error) => {
  console.error(\`[smoke] \${error.message}\`)
  process.exitCode = 1
})
`.split('\n').map((line, index, lines) => {
      const start = lines.indexOf('async function main() {')
      const end = lines.lastIndexOf('}')
      return index > start && index < end && line ? `  ${line}` : line
    }).join('\n'))
}

function environment(config, mode) {
  const values = {
    VITE_APP_TITLE: config.appTitle,
    VITE_SERVER_BASEURL: config.baseUrl,
    VITE_STORAGE_NAMESPACE: config.storageNamespace,
    VITE_DEV_PORT: '9000',
    VITE_DEV_HOST: '127.0.0.1',
    VITE_H5_USE_PROXY: 'false',
    VITE_PROXY_TARGET: config.baseUrl,
    VITE_AUTH_MODE: config.profile === 'demo' && mode !== 'production' ? 'demo' : 'real',
    VITE_FILE_UPLOAD_MODE: config.fileUploadMode,
    VITE_EXCEL_IMPORT_PATH: config.excelImportPath ?? '/imports/excel',
    VITE_SERVER_UPLOAD_PATH: config.serverUploadPath ?? '/files/upload',
    VITE_QINIU_TOKEN_PATH: config.qiniuTokenPath ?? '/files/qiniu-token',
    VITE_QINIU_UPLOAD_URL: config.qiniuUploadUrl ?? ''
  }
  const quoteValue = (value) => {
    const quote = ['"', '\'', '`'].find(delimiter => !value.includes(delimiter))
    return `${quote}${value.replace(/\$/g, '\\$')}${quote}`
  }
  return `${Object.entries(values).map(([key, value]) => `${key}=${['VITE_AUTH_MODE', 'VITE_FILE_UPLOAD_MODE'].includes(key) ? value : quoteValue(value)}`).join('\n')}\n`
}

function render(root, config) {
  const files = collectSources(root, config.profile)
  const json = name => JSON.parse(files.get(name).toString())
  const setJson = (name, value) => files.set(name, `${JSON.stringify(value, null, 2)}\n`)
  const pkg = json('package.json')
  pkg.name = config.projectName
  setJson('package.json', pkg)
  files.set('.npmrc', 'strict-peer-dependencies=false\nauto-install-peers=true\nshamefully-hoist=true\nnode-options=--max-old-space-size=8192\n')
  // Fresh declarations keep type checking available before the first Vite build.
  const globals = {
    'vue': ['ref', 'computed', 'reactive', 'watch', 'watchEffect', 'onMounted', 'onUnmounted', 'nextTick'],
    '@dcloudio/uni-app': ['onLoad', 'onShow', 'onHide', 'onLaunch', 'onError', 'onUnhandledRejection']
  }
  files.set('types/auto-imports.d.ts', `export {}\ndeclare global {\n${Object.entries(globals).flatMap(([module, names]) => names.map(name => `  const ${name}: typeof import('${module}').${name}`)).join('\n')}\n}\n`)
  const manifest = json('manifest.json')
  manifest.name = config.appTitle
  manifest.appid = config.appid
  manifest['mp-weixin'] = { ...manifest['mp-weixin'], appid: config.weixinAppid }
  setJson('manifest.json', manifest)
  const pages = json('pages.config.json')
  pages.globalStyle.navigationBarTitleText = config.appTitle
  setJson('pages.config.json', pages)
  const title = config.appTitle.replace(/[&<>"']/g, value => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[value])
  files.set('index.html', files.get('index.html').toString().replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`))
  setJson('platformConfig.json', { targets: [...new Set(config.platforms)].map(platform => platform.toUpperCase()) })
  for (const mode of ['', 'development', 'test', 'production'])
    files.set(`env/.env${mode ? `.${mode}` : ''}`, environment(config, mode))
  if (config.profile === 'base')
    baseProfile(files)
  // A fresh registration supports direct HBuilderX opening; CLI generation refreshes page styles/types.
  const mainPages = [...files.keys()].filter(name => /^pages\/.*\.uvue$/.test(name)).sort().map(name => ({ path: name.slice(0, -5) }))
  const subPages = [...files.keys()].filter(name => /^pages-sub\/pages\/.*\.uvue$/.test(name)).sort().map(name => ({ path: name.slice('pages-sub/'.length, -5) }))
  setJson('pages.json', { ...pages, pages: mainPages, subPackages: subPages.length ? [{ root: 'pages-sub', pages: subPages }] : [] })
  return files
}

export function initializeProject({ config, sourceRoot = SOURCE_ROOT, target, write = false }) {
  const errors = validateTemplateConfig(config)
  if (errors.length)
    throw new Error(errors.join('\n'))
  const source = realpathSync(sourceRoot)
  const destination = resolveTarget(source, target, write)
  const files = render(source, config)
  if (write) {
    // Exclusive creation is the final gate. Never clean up recursively: partial failures remain reviewable.
    mkdirSync(destination)
    for (const [name, contents] of files) {
      const file = path.join(destination, name)
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, contents, { flag: 'wx' })
    }
  }
  return { mode: write ? 'write' : 'dry-run', target: destination, profile: config.profile, projectName: config.projectName, platforms: config.platforms, fileCount: files.size }
}

function cli(args) {
  const keys = { '--project-name': 'projectName', '--app-title': 'appTitle', '--platforms': 'platforms', '--appid': 'appid', '--weixin-appid': 'weixinAppid', '--base-url': 'baseUrl', '--file-upload-mode': 'fileUploadMode', '--storage-namespace': 'storageNamespace', '--profile': 'profile', '--excel-import-path': 'excelImportPath', '--server-upload-path': 'serverUploadPath', '--qiniu-token-path': 'qiniuTokenPath', '--qiniu-upload-url': 'qiniuUploadUrl' }
  let configPath
  let target
  let write = false
  const overrides = {}
  for (let index = 0; index < args.length; index++) {
    const option = args[index]
    if (option === '--help') {
      console.log(`Usage: node build/scripts/init-project.mjs --config project.json [configuration overrides] [--target NEW_DIRECTORY] [--write]\nDefault: dry-run. --write requires a new directory outside this source checkout.\nOverrides: ${Object.keys(keys).join(', ')}`)
      return
    }
    if (option === '--write' || option === '--dry-run') {
      write = option === '--write'
      continue
    }
    if (option !== '--config' && option !== '--target' && !keys[option])
      throw new Error(`Unknown option: ${option}`)
    const value = args[++index]
    if (value === undefined || value.startsWith('--'))
      throw new Error(`Missing value for ${option}`)
    if (option === '--config')
      configPath = value
    else if (option === '--target')
      target = value
    else
      overrides[keys[option]] = option === '--platforms' ? value.split(',').map(item => item.trim()) : value
  }
  const config = { ...(configPath ? JSON.parse(readFileSync(path.resolve(configPath), 'utf8')) : {}), ...overrides }
  console.log(JSON.stringify(initializeProject({ config, target, write }), null, 2))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    cli(process.argv.slice(2))
  }
  catch (error) {
    console.error(`Initialization refused: ${error.message}`)
    process.exitCode = 1
  }
}

#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export function validateArtifact(platform, files) {
  const errors = []
  const entry = { 'h5': 'index.html', 'web': 'index.html', 'mp-weixin': 'app.json' }[platform]
  if (!entry)
    return ['artifact target must be h5, web or mp-weixin']
  if (!files.some(file => file.path === entry))
    errors.push(`missing ${platform} artifact entry: ${entry}`)
  for (const file of files) {
    if (/\.(?:js|json|html)$/.test(file.path) && file.content.includes('demo-token-'))
      errors.push(`demo authentication found in ${file.path}`)
  }
  if (platform === 'mp-weixin' && files.some(file => file.path === 'app.json')) {
    try {
      const app = JSON.parse(files.find(file => file.path === 'app.json').content)
      const main = Array.isArray(app.pages) ? app.pages : []
      if (!main.length)
        errors.push('app.json: at least one main page registration is required')
      const registrations = [...main]
      for (const group of app.subPackages || app.subpackages || []) {
        if (typeof group.root !== 'string' || !Array.isArray(group.pages)) {
          errors.push('app.json: invalid subpackage registration')
          continue
        }
        registrations.push(...group.pages.map(page => `${group.root}/${page}`))
      }
      const seen = new Set()
      for (const route of registrations) {
        if (typeof route !== 'string' || !/^[\w-]+(?:\/[\w-]+)+$/.test(route)) {
          errors.push(`app.json: invalid page route ${route}`)
          continue
        }
        if (seen.has(route))
          errors.push(`app.json: duplicate page registration ${route}`)
        seen.add(route)
        for (const extension of ['js', 'wxml']) {
          if (!files.some(file => file.path === `${route}.${extension}`))
            errors.push(`missing registered page artifact: ${route}.${extension}`)
        }
      }
      for (const tab of app.tabBar?.list || []) {
        if (!main.includes(tab.pagePath))
          errors.push(`app.json: tabBar route must be a registered main page: ${tab.pagePath}`)
      }
    }
    catch {
      errors.push('app.json: cannot parse usable page registrations')
    }
  }
  return errors
}

function main() {
  const platform = process.argv[2]
  if (!['h5', 'web', 'mp-weixin'].includes(platform || '')) {
    console.error('Usage: node build/scripts/check-artifact.mjs <h5|web|mp-weixin>')
    process.exitCode = 1
    return
  }
  const root = path.resolve(import.meta.dirname, '../..', 'dist/build', platform === 'web' ? 'h5' : platform)
  const files = []
  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory())
        scan(file)
      else if (/\.(?:js|json|html|wxml)$/.test(entry.name))
        files.push({ path: path.relative(root, file).replaceAll('\\', '/'), content: fs.readFileSync(file, 'utf8') })
    }
  }
  if (fs.existsSync(root))
    scan(root)
  const errors = validateArtifact(platform, files)
  for (const error of errors)
    console.error(`[release] ${error}`)
  if (errors.length)
    process.exitCode = 1
  else
    console.log(`[release] ${platform} artifact entry accepted; no demo token logic found`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href)
  main()

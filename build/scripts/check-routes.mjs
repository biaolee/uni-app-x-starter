#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Buffer } from 'node:buffer'
import ts from 'typescript'

function routePath(value) {
  return typeof value === 'string' && /^\/?[\w-]+(?:\/[\w-]+)+$/.test(value) ? `/${value.replace(/^\//, '')}` : null
}

export function validateRouteConfig(pages, router, configured) {
  const errors = []
  const registered = new Set()
  const add = (value) => {
    const route = routePath(value)
    if (!route)
      errors.push(`invalid registered route: ${value}`)
    else if (registered.has(route))
      errors.push(`duplicate registered route: ${route}`)
    else
      registered.add(route)
  }
  for (const page of pages.pages || [])
    add(page.path)
  for (const group of pages.subPackages || pages.subpackages || []) {
    for (const page of group.pages || [])
      add(`${group.root}/${page.path}`)
  }
  for (const key of ['LOGIN_PAGE', 'HOME_PAGE', 'TABBAR_PAGES', 'WHITE_LIST', 'NEED_LOGIN_PAGES']) {
    const values = Array.isArray(router[key]) ? router[key] : [router[key]]
    for (const value of values) {
      const route = routePath(value)
      if (!route || !registered.has(route))
        errors.push(`router ${key}: unregistered route ${value}`)
    }
  }
  const tabRoutes = (source, label) => (source?.tabBar?.list || []).map((tab) => {
    const route = routePath(tab.pagePath)
    if (!route || !registered.has(route))
      errors.push(`${label}: unregistered tabBar route ${tab.pagePath}`)
    return route
  })
  const expected = tabRoutes(configured, 'pages.config.json')
  const actual = tabRoutes(pages, 'pages.json')
  const routerTabs = (router.TABBAR_PAGES || []).map(routePath)
  if (JSON.stringify(expected) !== JSON.stringify(actual))
    errors.push('generated tabBar differs from pages.config.json')
  if (expected.length !== routerTabs.length || expected.some(route => !routerTabs.includes(route)))
    errors.push('router TABBAR_PAGES differs from configured tabBar')
  return errors
}

async function main() {
  const root = path.resolve(import.meta.dirname, '../..')
  const readJson = (file) => {
    const result = ts.parseConfigFileTextToJson(file, fs.readFileSync(path.join(root, file), 'utf8'))
    if (result.error)
      throw new Error(`Cannot parse ${file}`)
    return result.config
  }
  const source = fs.readFileSync(path.join(root, 'router/config.ts'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  const router = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
  const errors = validateRouteConfig(readJson('pages.json'), router, readJson('pages.config.json'))
  for (const error of errors)
    console.error(`[routes] ${error}`)
  if (errors.length)
    process.exitCode = 1
  else
    console.log('[routes] authentication and tabBar routes match generated registrations')
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[routes] ${error.message}`)
    process.exitCode = 1
  })
}

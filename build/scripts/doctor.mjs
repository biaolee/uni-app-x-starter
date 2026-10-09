#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { parse } from 'yaml'
import { validateToolchain } from './toolchain-config.mjs'

const root = path.resolve(import.meta.dirname, '../..')
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const workspace = parse(fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8'))
const pnpm = process.env.npm_execpath
  ? /\.(?:c?js|mjs)$/i.test(process.env.npm_execpath)
    ? spawnSync(process.execPath, [process.env.npm_execpath, '--version'], { encoding: 'utf8' })
    : spawnSync(process.env.npm_execpath, ['--version'], { encoding: 'utf8' })
  : process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'pnpm --version'], { encoding: 'utf8' })
    : spawnSync('pnpm', ['--version'], { encoding: 'utf8' })
const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }
const installedVersions = {}
for (const name of Object.keys({ ...dependencies, ...workspace.overrides })) {
  if (name !== 'vue' && !name.startsWith('@vue/') && !(name.startsWith('@dcloudio/') && /^3\.0\.0-/.test(dependencies[name] || '')))
    continue
  try {
    // pnpm keeps transitive overrides in its hidden hoist directory.
    const direct = path.join(root, 'node_modules', name, 'package.json')
    const file = fs.existsSync(direct) ? direct : path.join(root, 'node_modules/.pnpm/node_modules', name, 'package.json')
    installedVersions[name] = JSON.parse(fs.readFileSync(file, 'utf8')).version
  }
  catch {
    installedVersions[name] = ''
  }
}
let hbuilderxVersion
if (process.env.HBUILDERX_CLI_PATH) {
  const result = spawnSync(process.env.HBUILDERX_CLI_PATH, ['ver'], { encoding: 'utf8' })
  hbuilderxVersion = result.status === 0 ? `${result.stdout || ''} ${result.stderr || ''}` : ''
}
const patchFiles = Object.values(workspace.patchedDependencies || {}).filter(file => fs.existsSync(path.join(root, file)))
const errors = validateToolchain({ packageJson, workspace, nodeVersion: process.version, pnpmVersion: pnpm.stdout?.trim(), patchFiles, installedVersions, hbuilderxVersion })
if (pnpm.status !== 0)
  console.error(`[doctor] pnpm version command failed: ${pnpm.error?.message || pnpm.stderr?.trim() || 'unknown'}`)
for (const error of errors)
  console.error(`[doctor] ${error}`)
if (errors.length)
  process.exit(1)
console.log(`[doctor] Node ${process.version}, pnpm ${pnpm.stdout.trim()}, compiler alignment and persistent patches accepted`)
console.log(process.env.HBUILDERX_CLI_PATH ? '[doctor] HBuilderX 5.26 CLI accepted' : '[doctor] HBuilderX CLI not configured; native checks skipped')

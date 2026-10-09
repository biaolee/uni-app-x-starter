#!/usr/bin/env node
/**
 * uni-launch 启动包装器（App / 鸿蒙端调起本机 HBuilderX 运行）
 *
 * 官方原生根目录布局下工程根即 uni 输入目录（App.uvue 在根），uni-launch 透传编译环境时
 * 显式注入 UNI_INPUT_DIR 为工程根绝对路径，保证 HBuilderX 侧编译器与 CLI 行为一致。
 *
 * 用法：node build/scripts/app-launch.mjs <app-android|app-ios|app-harmony>
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'

const require = createRequire(import.meta.url)

process.env.UNI_INPUT_DIR = path.resolve(process.cwd(), process.env.UNI_INPUT_DIR || '.')

let launchBin
try {
  const pkgDir = path.dirname(require.resolve('@dcloudio/hbuilderx-cli/package.json'))
  const pkg = require('@dcloudio/hbuilderx-cli/package.json')
  launchBin = path.resolve(pkgDir, pkg.bin?.['uni-launch'] ?? 'bin/uni-launch.js')
}
catch {
  console.error('[app-launch] 未找到 @dcloudio/hbuilderx-cli，请先执行 pnpm install')
  process.exit(1)
}

const result = spawnSync(process.execPath, [launchBin, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit'
})

process.exit(result.status ?? 1)

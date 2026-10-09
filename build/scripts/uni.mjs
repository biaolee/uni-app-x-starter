#!/usr/bin/env node
/**
 * uni CLI 启动包装器（官方原生根目录布局）
 *
 * 背景：
 * - 工程根即 uni 输入目录：App.uvue/main.uts/manifest.json、pages/、pages-sub/、
 *   components/、uni_modules/、static/ 均在根，HBuilderX 可直接打开仓库根运行，
 *   CLI 与 HBuilderX 识别的工程结构完全一致。
 * - uni 的 uts 编译器把 UNI_INPUT_DIR 同时用作 tsconfig rootDir 与语言服务 currentDirectory，
 *   只接受绝对路径；这里在启动 CLI 前显式注入工程根的绝对路径。
 *
 * 用法：node build/scripts/uni.mjs <uni 命令行参数...>
 * 示例：node build/scripts/uni.mjs build -p web
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'
import process from 'node:process'

const require = createRequire(import.meta.url)

// UNI_INPUT_DIR 未设置时默认为工程根；已设置时同样解析为绝对路径
process.env.UNI_INPUT_DIR = path.resolve(process.cwd(), process.env.UNI_INPUT_DIR || '.')

// 定位本地安装的 uni CLI 入口（@dcloudio/vite-plugin-uni/bin/uni.js）
let uniBin
try {
  const pkgDir = path.dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json'))
  const pkg = require('@dcloudio/vite-plugin-uni/package.json')
  uniBin = path.resolve(pkgDir, pkg.bin?.uni ?? 'bin/uni.js')
}
catch {
  console.error('[uni.mjs] 未找到 @dcloudio/vite-plugin-uni，请先执行 pnpm install')
  process.exit(1)
}

const result = spawnSync(process.execPath, [uniBin, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit'
})

process.exit(result.status ?? 1)

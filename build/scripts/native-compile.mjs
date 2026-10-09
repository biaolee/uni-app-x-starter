#!/usr/bin/env node
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'

const platform = process.argv[2]
if (!['app-android', 'app-ios', 'app-harmony'].includes(platform || '')) {
  console.error('Usage: node build/scripts/native-compile.mjs <app-android|app-ios|app-harmony>')
  process.exit(1)
}

const cli = process.env.HBUILDERX_CLI_PATH
if (!cli) {
  console.error('[native] HBUILDERX_CLI_PATH must point to the HBuilderX 5.26 cli executable')
  process.exit(1)
}

const root = path.resolve(import.meta.dirname, '../..')
const version = spawnSync(cli, ['ver'], { encoding: 'utf8' })
const versionText = `${version.stdout || ''} ${version.stderr || ''}`
if (version.status !== 0 || !/5\.26(?:\.|\b)/.test(versionText)) {
  console.error(`[native] expected HBuilderX 5.26, got: ${versionText.trim() || version.error?.message || 'unknown'}`)
  process.exit(1)
}

const result = spawnSync(cli, ['launch', platform, '--project', root, '--compile', 'true', '--ui', 'false', '--continue-on-error', 'false'], {
  cwd: root,
  env: { ...process.env, UNI_INPUT_DIR: root },
  stdio: 'inherit'
})
process.exit(result.status ?? 1)

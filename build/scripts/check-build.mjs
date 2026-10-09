#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { stripVTControlCharacters } from 'node:util'
import { pathToFileURL } from 'node:url'

export function validateBuildDiagnostics(output) {
  return stripVTControlCharacters(output).replaceAll('\u200B', '').split(/\r?\n/).filter(line =>
    /^\s*(?:\[[^\]\r\n]+\]\s*)?(?:error(?:\s+TS\d+)?\s*:|ERROR\b|(?:Syntax|Type|Reference)Error:|UTS\s+(?:compiler\s+)?error\b)/i.test(line)
    || /^\s*\[plugin:[^\]]+\].*\s-\s+error(?:\s+TS\d+)?\s*:/i.test(line))
}

async function main() {
  const target = process.argv[2] === 'h5' ? 'web' : process.argv[2]
  if (!['web', 'mp-weixin', 'app-android', 'app-ios', 'app-harmony'].includes(target || '')) {
    console.error('Usage: node build/scripts/check-build.mjs <web|h5|mp-weixin|app-android|app-ios|app-harmony> [--mode test]')
    process.exitCode = 1
    return
  }
  const root = path.resolve(import.meta.dirname, '../..')
  const native = target.startsWith('app-')
  const script = path.join(root, 'build/scripts', native ? 'native-compile.mjs' : 'uni.mjs')
  const args = native ? [script, target] : [script, 'build', '-p', target, ...process.argv.slice(3)]
  let output = ''
  const child = spawn(process.execPath, args, { cwd: root, env: process.env, stdio: ['inherit', 'pipe', 'pipe'] })
  child.stdout.on('data', (chunk) => {
    output += chunk.toString()
    process.stdout.write(chunk)
  })
  child.stderr.on('data', (chunk) => {
    output += chunk.toString()
    process.stderr.write(chunk)
  })
  child.on('error', (error) => {
    output += `\nError: ${error.message}\n`
    console.error(`[build] ${error.message}`)
  })
  const status = await new Promise(resolve => child.on('close', code => resolve(code ?? 1)))
  const logDir = path.join(root, 'test-results/builds')
  await fs.mkdir(logDir, { recursive: true })
  await fs.writeFile(path.join(logDir, `${target}.log`), output)
  const errors = validateBuildDiagnostics(output)
  if (status !== 0 || errors.length) {
    console.error(`[build] ${target} failed: exit ${status}, ${errors.length} error diagnostics; see test-results/builds/${target}.log`)
    process.exitCode = 1
  }
  else {
    console.log(`[build] ${target} completed without compiler error diagnostics`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`[build] ${error.message}`)
    process.exitCode = 1
  })
}

#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { RELEASE_TARGETS, validateReleaseConfig } from './release-config.mjs'

const target = process.argv[2]
if (!RELEASE_TARGETS.includes(target)) {
  console.error(`Usage: node build/scripts/check-release.mjs <${RELEASE_TARGETS.join('|')}>`)
  process.exit(1)
}

const root = path.resolve(import.meta.dirname, '../..')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'))
const env = loadEnv('production', path.join(root, 'env'), '')
const errors = validateReleaseConfig(target, manifest, env)

if (errors.length) {
  for (const error of errors)
    console.error(`[release] ${error}`)
  process.exit(1)
}
console.log(`[release] ${target} configuration accepted`)

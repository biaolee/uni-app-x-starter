#!/usr/bin/env node
import path from 'node:path'
import { copyFileSync } from 'node:fs'
import { generateAll } from '@uni-helper/vite-plugin-uni-pages'
import { uniPageOptions } from './page-options.mjs'

const root = path.resolve(import.meta.dirname, '../..')
const platform = process.argv[2] || 'web'
copyFileSync(path.join(root, 'pages.config.json'), path.join(root, 'pages.json'))
await generateAll(uniPageOptions, { root, platform })
console.log(`Generated pages.json and route types for ${platform}`)

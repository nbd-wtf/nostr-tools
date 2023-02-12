#!/usr/bin/env node

const esbuild = require('esbuild')
const polyfillProviderPlugin = require('node-stdlib-browser/helpers/esbuild/plugin')
const stdLibBrowser = require('node-stdlib-browser')
const fs = require('fs')

let common = {
  entryPoints: ['index.ts'],
  bundle: true,
  sourcemap: 'external'
}

let browserCommon = {
  platform: 'browser',
  inject: [require.resolve('node-stdlib-browser/helpers/esbuild/shim')],
  plugins: [polyfillProviderPlugin(stdLibBrowser)]
}

esbuild
  .build({
    ...common,
    outfile: 'lib/nostr.esm.js',
    format: 'esm',
    packages: 'external'
  })
  .then(() => console.log('esm build success.'))

esbuild
  .build({
    ...common,
    outfile: 'lib/nostr.cjs.js',
    format: 'cjs',
    packages: 'external'
  })
  .then(() => console.log('cjs build success.'))

esbuild
  .build({
    ...common,
    outfile: 'lib/nostr.bundle.js',
    format: 'iife',
    globalName: 'NostrTools',
    ...browserCommon
  })
  .then(() => console.log('standalone build success.'))

const files = fs.readdirSync(__dirname)
const testFiles = files.filter(file => file.includes('.test.js'))

esbuild
  .build({
    ...common,
    entryPoints: ['./karma-setup.js', ...testFiles],
    outdir: 'browser-tests',
    globalName: 'NostrTools',
    ...browserCommon
  })
  .then(() => console.log('browser tests build success.'))

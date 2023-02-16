#!/usr/bin/env node

const esbuild = require('esbuild')
const fs = require('fs')

let common = {
  entryPoints: ['index.ts'],
  bundle: true,
  sourcemap: 'external'
}

esbuild
  .buildSync({
    ...common,
    format: 'esm',
    outfile: 'lib/nostr.esm.js',
    packages: 'external',
    platform: 'node',
  })


esbuild
  .buildSync({
    ...common,
    format: 'cjs',
    outfile: 'lib/nostr.cjs.js',
    packages: 'external',
    platform: 'node',
  })
  // .then(() => console.log('cjs build success.'))

esbuild
  .buildSync({
    ...common,
    format: 'iife',
    globalName: 'NostrTools',
    outfile: 'lib/nostr.bundle.js',
    platform: 'browser'
  })
  // .then(() => console.log('standalone build success.'))

const files = fs.readdirSync(__dirname)
const testFiles = files.filter(file => file.includes('.test.js'))

esbuild
  .buildSync({
    ...common,
    define: {
      'window': 'globalThis',
      'global': 'globalThis',
    },
    entryPoints: ['./karma-setup.js', ...testFiles],
    outdir: 'browser-tests',
    platform: 'browser'
  })
  // .then(() => console.log('browser tests build success.'))

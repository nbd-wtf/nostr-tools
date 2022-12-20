#!/usr/bin/env node

const esbuild = require('esbuild')
const alias = require('esbuild-plugin-alias')

let common = {
  entryPoints: ['index.ts'],
  bundle: true,
  plugins: [
    alias({
      stream: require.resolve('readable-stream')
    })
  ],
  sourcemap: 'external'
}

esbuild
  .build({...common, outdir: 'esm/', format: 'esm', packages: 'external'})
  .then(() => console.log('esm build success.'))

esbuild
  .build({...common, outdir: 'cjs/', format: 'cjs', packages: 'external'})
  .then(() => console.log('cjs build success.'))

esbuild
  .build({
    ...common,
    outdir: 'standalone/',
    format: 'iife',
    globalName: 'NostrTools',
    define: {
      window: 'self',
      global: 'self',
      process: '{"env": {}}'
    }
  })
  .then(() => console.log('standalone build success.'))

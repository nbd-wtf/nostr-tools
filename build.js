#!/usr/bin/env node

const esbuild = require('esbuild')
const alias = require('esbuild-plugin-alias')
const nodeGlobals = require('@esbuild-plugins/node-globals-polyfill').default

const buildOptions = {
  entryPoints: ['index.js'],
  outfile: 'nostr.js',
  bundle: true,
  format: 'esm',
  plugins: [
    alias({
      stream: require.resolve('readable-stream')
    }),
    nodeGlobals({buffer: true})
  ],
  define: {
    window: 'self',
    global: 'self'
  },
  loader: {'.js': 'jsx'}
}

esbuild.build(buildOptions).then(() => console.log('build success.'))

import {nodeResolve} from '@rollup/plugin-node-resolve'
import {terser} from 'rollup-plugin-terser'
import babel from '@rollup/plugin-babel'

import pkg from './package.json'

const input = 'index.js'

export default {
  input,
  output: {
    sourcemap: true,
    format: 'umd',
    name: 'nostr',
    file: `dist/${pkg.name}.min.js`,
    exports: 'named',
    esModule: false
  },
  plugins: [
    nodeResolve(),
    babel({
      babelHelpers: 'bundled'
    }),
    terser()
  ]
}

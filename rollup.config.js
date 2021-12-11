import pkg from './package.json'

export default {
  input: 'src/index.js',
  output: [
    {
      name: 'nostrtools',
      file: pkg.browser,
      format: 'umd'
    },
    {
      file: pkg.module,
      format: 'es'
    }
  ]
}

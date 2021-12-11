import pkg from './package.json'

export default {
  input: 'index.js',
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

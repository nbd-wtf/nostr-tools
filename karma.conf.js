module.exports = function (config) {
  config.set({
    plugins: [
      'karma-jasmine',
      'karma-jasmine-matchers',
      'karma-chrome-launcher'
    ],

    basePath: '',
    frameworks: ['jasmine', 'jasmine-matchers'],
    files: ['./browser-tests/karma-setup.js', './browser-tests/*.js'],

    browsers: ['ChromeHeadless'],
    singleRun: true
  })
}

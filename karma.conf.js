module.exports = function (config) {
  config.set({
    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-webkit-launcher',
      'karma-jasmine',
      'karma-jasmine-matchers'
    ],

    basePath: '',
    frameworks: ['jasmine', 'jasmine-matchers'],
    files: ['./browser-tests/karma-setup.js', './browser-tests/*.js'],
    concurrency: 1,
    browsers: ['ChromeHeadless', 'FirefoxHeadless', 'WebkitHeadless'],
    singleRun: true
  })
}

// playwright acts as a safari executable on windows and mac
const playwright = require('playwright')

// set playwright as run-target for webkit tests
process.env.WEBKIT_HEADLESS_BIN = playwright.webkit.executablePath()

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

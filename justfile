export PATH := "./node_modules/.bin:" + env_var('PATH')

install-dependencies:
    yarn --ignore-engines

build:
    node build.js

test: build
    jest --testPathIgnorePatterns "<rootDir>/browser-tests/"

browser-test: build
    npx karma start
    

testOnly file: build
    jest {{file}}

publish: build
    npm publish

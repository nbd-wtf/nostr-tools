export PATH := "./node_modules/.bin:" + env_var('PATH')

install-dependencies:
    yarn --ignore-engines

build:
    node build.js

test: build
    jest

testOnly file: build
    jest {{file}}

types: 
    npx tsc
    
publish: build
    types
    npm publish

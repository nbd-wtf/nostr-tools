export PATH := "./node_modules/.bin:" + env_var('PATH')

install-dependencies:
    yarn --ignore-engines

deps-installed := `ls node_modules`

install-and-build:
    if deps-installed != "node_modules" { install-dependencies }
    build

build:
    node build.js

test: build
    jest

testOnly file: build
    jest {{file}}

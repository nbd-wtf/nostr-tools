export PATH := "./node_modules/.bin:" + env_var('PATH')

build:
    rm -rf lib
    bun run build.js

test:
    bun test --timeout 20000

test-only file:
    bun test {{file}}

emit-types:
    tsc # see tsconfig.json

publish: build emit-types
    npm publish

format:
    eslint --ext .ts --fix *.ts
    prettier --write *.ts

lint:
    eslint --ext .ts *.ts
    prettier --check *.ts

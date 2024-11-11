export PATH := "./node_modules/.bin:" + env_var('PATH')

build:
  rm -rf lib
  bun run build.js
  tsc

test:
  bun test --timeout 20000

test-only file:
  bun test {{file}}

pack:
  npm pack

publish: build
  npm publish
  perl -i -0pe "s/},\n  \"optionalDependencies\": {\n/,/" package.json
  jsr publish --allow-dirty
  git checkout -- package.json

format:
  eslint --ext .ts --fix *.ts
  prettier --write *.ts

lint:
  eslint --ext .ts *.ts
  prettier --check *.ts

benchmark:
  bun build --target=node --outfile=bench.js benchmarks.ts
  timeout 60s deno run --allow-read bench.js || true
  timeout 60s node bench.js || true
  timeout 60s bun run benchmarks.ts || true
  rm bench.js

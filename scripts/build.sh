#!/bin/bash

set -e

mkdir -p dist
mkdir -p wasm

npm run eslint

if [[ "$(docker images -q clang:hash-wasm 2> /dev/null)" == "" ]]; then
  docker build -f scripts/Dockerfile -t clang:hash-wasm .
fi

docker run \
  --rm \
  -v $(pwd):/app \
  -u $(id -u):$(id -g) \
  clang:hash-wasm \
  make -f /app/scripts/Makefile-clang --silent --always-make --output-sync=target -j8 all

# node scripts/optimize
node scripts/make_json
node --max-old-space-size=4096 ./node_modules/rollup/dist/bin/rollup -c
npx tsc ./lib/index --outDir ./dist --downlevelIteration --emitDeclarationOnly --declaration --resolveJsonModule --allowSyntheticDefaultImports

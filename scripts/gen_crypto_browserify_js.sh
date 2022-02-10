#!/bin/bash

set -x
SCRIPT_PATH=$(dirname "$0")
CRYPTO_BROWSERIFY=$SCRIPT_PATH/../crypto-browserify
CRYPTO_BROWSERIFY_JS=$SCRIPT_PATH/../src/crypto_browserify.js

if [ ! -f "$CRYPTO_BROWSERIFY_JS" ]; then
  if [ ! -d "$CRYPTO_BROWSERIFY/node_modules" ]; then
    [ -f "$CRYPTO_BROWSERIFY_JS" ] && rm "$CRYPTO_BROWSERIFY_JS"
    cd "$CRYPTO_BROWSERIFY" && npm install .
    test $? -eq 0 || exit $?
  fi
  browserify -s crypto_browserify "$CRYPTO_BROWSERIFY/index.js" -o "$CRYPTO_BROWSERIFY_JS"
  test $? -eq 0 || exit $?
fi
[ -f "$CRYPTO_BROWSERIFY/package-lock.json" ] && rm "$CRYPTO_BROWSERIFY/package-lock.json"

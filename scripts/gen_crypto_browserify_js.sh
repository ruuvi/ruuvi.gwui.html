#!/bin/bash

SCRIPT_PATH=$(dirname "$0")
browserify -s crypto_browserify $SCRIPT_PATH/../crypto-browserify/index.js -o $SCRIPT_PATH/../src/crypto_browserify.js

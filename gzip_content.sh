#!/bin/bash
find . -type f -name '*.js' ! -name jquery-3.5.1.min.js ! -name jquery-3.5.1.js -exec gzip -k -9 -f -v "{}" \;
cat ./src/jquery-3.5.1.min.js | gzip -v -k -9 -f >./src/jquery-3.5.1.js.gz
find . -type f -name '*.html' -exec gzip -k -9 -f -v "{}" \;
find . -type f -name '*.css' -exec ./yui_compress_gzip.sh "{}" \;


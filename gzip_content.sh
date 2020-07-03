#!/bin/bash
find . -type f -name '*.js' -exec ./yui_compress_gzip.sh "{}" \;
find . -type f -name '*.html' -exec gzip -k -9 -f -v "{}" \;
find . -type f -name '*.css' -exec ./yui_compress_gzip.sh "{}" \;


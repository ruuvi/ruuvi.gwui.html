#!/bin/bash
find . -type f -name '*.js' -exec gzip -k -9 -f -v "{}" \;
find . -type f -name '*.html' -exec gzip -k -9 -f -v "{}" \;
find . -type f -name '*.css' -exec gzip -k -9 -f -v "{}" \;
find . -type f -name '*.scss' -exec gzip -k -9 -f -v "{}" \;


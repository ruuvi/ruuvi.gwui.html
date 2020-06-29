echo yui-compress and gzip: $1
if [ "$2" != "" ]; then
	yui-compressor --type $2 $1 | gzip -k -9 -f >$1.gz
else
	yui-compressor $1 | gzip -k -9 -f >$1.gz
fi

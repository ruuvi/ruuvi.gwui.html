echo yui-compress and gzip: $1
# Mac OSX brew installs as yuicompressor, try to detect which binary name is in system.
COMPRESSOR="yui-compressor"
linecnt=$( which $COMPRESSOR | wc -l)
if [ $linecnt -eq 0 ] ; then
  COMPRESSOR="yuicompressor"
fi
if [ "$2" != "" ]; then
	$COMPRESSOR --type $2 $1 | gzip -k -9 -f >$1.gz
else
	$COMPRESSOR $1 | gzip -k -9 -f >$1.gz
fi

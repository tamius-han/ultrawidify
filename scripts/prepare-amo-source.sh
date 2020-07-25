#!/bin/bash

# makes a zip file with human-readable source code that we need to upload to AMO
# since webpack minifies stuff

# first, we collect npm/node versions: 
# (NOTE: the last bit is necessary to remove ANSI color codes from output)
NODE_VERSION=`node --version`
NPM_VERSION=`npm --version`
LINUX_VERSION="$(uname -a | sed 's/\//\\\//g')"

# copy REAMDE to /tmp for processing
cp README-AMO.md /tmp/README-AMO.md

# replace placeholders with proper software versions
sed -i "s/%%NODE_VERSION%%/${NODE_VERSION}/g" /tmp/README-AMO.md
sed -i "s/%%NPM_VERSION%%/${NPM_VERSION}/g" /tmp/README-AMO.md
sed -i "s/%%LINUX_VERSION%%/${LINUX_VERSION}/g" /tmp/README-AMO.md

# add files to archive
zip -r dist-zip/uw-amo-source.zip /tmp/README-AMO.md .babelrc package.json package-lock.json webpack.config.js scripts/ src/

# rename /tmp/README-AMO.md to README.md
printf "@ tmp/README-AMO.md\n@=README.md\n" | zipnote -w dist-zip/uw-amo-source.zip

# printout for debugging purposes:
echo ""
echo "—————— AMO SOURCE PREPARATION FINISHED ——————"
echo "                 Debug info:"
echo ""
echo "node --version:"
node --version
echo ""
echo "npm --version"
npm --version
echo ""
echo "uname -a"
uname -a
echo ""
echo ""
echo "extracted variables:"
echo "NODE_VERSION: ${NODE_VERSION}"
echo "NPM_VERSION:  ${NPM_VERSION}"
echo "UNAME:        ${LINUX_VERSION}"
echo ""
echo ""
echo "—————— EXTENSION PACKAGES READY FOR UPLOAD ——————"

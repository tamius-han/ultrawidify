#!/bin/bash

# makes a zip file with human-readable source code that we need to upload to AMO
# since webpack minifies stuff
zip -r dist-zip/uw-amo-source.zip README-AMO.md .babelrc package.json package-lock.json webpack.config.js scripts src/

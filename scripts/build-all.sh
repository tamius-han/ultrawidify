#!/bin/bash

# NOTE: this script needs to be run with the npm run build-all
# command from the root directory of the project. Running it in
# any other way probably isn't going to work.

# pre-build steps:
mkdir -p ./build/old
npm run pre-build
rm ./dist-zip/uw-amo-source.zip
mv -f ./dist-zip/*.zip ./build/old

# lets force raise ram limit, but the improper way
# export NODE_OPTIONS=--max_old_space_size=4096

# build the version for each browser and create a zip afterwards
# step 1: define build functions
#function buildFF {
  npm run build
  node scripts/build-zip.js ff
#}
#function buildChrome {
  npm run build-chrome
  node scripts/build-zip.js chrome
#}
#function buildEdge {
  npm run build-edge
  node scripts/build-zip.js edge
#}

# step 2: execute them all at once
# buildFF &
# buildChrome &
# buildEdge &

# wait < <(jobs -p)

# prepare AMO source
# source code needs to be prepared AFTER
# the code has been built, to ensure that
# package-lock.json remains unchanged
./scripts/prepare-amo-source.sh

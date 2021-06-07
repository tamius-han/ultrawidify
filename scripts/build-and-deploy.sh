#!/bin/bash
# env variables to set:
#
#     FORCE_BUILD               set this variable to "true" if you wanna force build, even if build was 
#                               triggered without any commits pushed to the directory
#
#     BUILD_SCRIPT              build-testing or build-nightly, could be any other from package.json tho
#
#     RELEASE_SERVER            target server (where to push built zips after they've been built)
#     RELEASE_DIRECTORY         base directory on the target server 
#     BUILD_CHANNEL_DIRECTORY   directory for uploads, inside the release directory
#
#     AMO_API_KEY               needed if you want to sign and push extension to addons.mozilla.org
#     AMO_API_SECRET            -||-

echo "============= STARTING BUILD SCRIPT ============="
pwd
whoami
echo " ::: env dump"
echo "        -> FORCE_BUILD:             $FORCE_BUILD"
echo "        -> BUILD_SCRIPT:            $BUILD_SCRIPT"
echo "        -> RELEASE_SERVER:          $RELEASE_SERVER"
echo "        -> RELEASE_DIRECTORY:       $RELEASE_DIRECTORY"
echo "        -> BUILD_CHANNEL_DIRECTORY: $BUILD_CHANNEL_DIRECTORY"

# don't build if nothing has changed, unless overriden via env variable
if [ ! -z "$GIT_COMMIT" ] ; then
  if [ ! -z "$GIT_PREVIOUS_COMMIT" ] ; then
    if [ "$GIT_COMMIT" == "$GIT_PREVIOUS_COMMIT" ] ; then
      if [ $FORCE_BUILD == false ] ; then
        echo "--------------------------------------------"
        echo "    Nothing has changed. Aborting build."
        echo "--------------------------------------------"
        exit 0;
      fi
    fi
  fi
fi

# let's raise RAM limit for npm command globally
NODE_OPTIONS=--max_old_space_size=4096

npm ci

rm -rf ./dist-zip || true   # no big deal if ./dist-zip doesn't exist
mkdir dist-zip              # create it back

#
# build firefox
#
npm run "${BUILD_SCRIPT}"
node --max-old-space-size=2048 scripts/build-zip.js ff nightly
# if [ ! -z "${AMO_API_KEY}" ] ; then
#   if [ ! -z "${AMO_API_SECRET}" ] ; then 
#     web-ext sign --source-dir ./dist --api-key "${AMO_API_KEY}" --api-secret "${AMO_API_SECRET}"
#   fi
# fi

#
# build chrome
#
npm run "${BUILD_SCRIPT}-chrome"
node --max-old-space-size=2048 scripts/build-zip.js chrome nightly
#
#./scripts/build-crx.sh
#

#
# build edge
#
npm run "${BUILD_SCRIPT}-edge"
node --max-old-space-size=2048 scripts/build-zip.js chrome nightly


######################################
#        UPLOAD TO WEB SERVER 
######################################

echo "--------------------------------------------"
echo "       files ready for upload"
echo "--------------------------------------------"
echo ""
echo "Uploading to server ..."
# push all built stuff to the server
scp -i ~/.ssh/id_rsa -r ./dist-zip/* "ultrawidify-uploader@${RELEASE_SERVER}:${RELEASE_DIRECTORY}${BUILD_CHANNEL_DIRECTORY}"


######################################
#       Build finished message
######################################
echo ""
echo "--------------------------------------------"
echo "       BUILD FINISHED SUCCESSFULLY"
echo "--------------------------------------------"

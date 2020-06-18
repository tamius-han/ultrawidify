#!/bin/bash

### VARIABLES

REPRODUCABILITY=5         # how many times we need to build with same hash

### TEST STARTS HERE ###

CURRENT_DIR=$(pwd)

if [[ $(echo $0 | awk -F"/" '{print NF-1}') -eq 1 ]] ; then
  # we need to go one directory up
  cd ..
fi

# cleanup after self if we already ran and previous test crashed or 
# something before it cleaned up after itself.
rm -rf /tmp/uw-test-runs/* 2>/dev/null # we not interested if fails

# make new folder if it doesn't exist
mkdir -p /tmp/uw-test-runs 

for ((run=0;run<$REPRODUCABILITY;run++)) ; do
  echo ""
  echo "---- run ${run} ----"
  
  # save hash and then run build. Save hash.
  OLD_HASH=$HASH
  HASH=$(npm run build 2>/dev/null | grep "Hash:")
  
  # move build file to /tmp, where it'll be saved for later
  mv dist-ff /tmp/uw-test-runs/${run}
  
  # skip comparisons with previous tests on first run,
  # cos we don't have anything to compare against yet
  if [[ $run -ne 0 ]] ; then
    if [[ "$OLD_HASH" == "$HASH" ]] ; then
      echo "Hashes ok${HASH##*:}"
    else 
      echo "Webpack hashes do not match! (${OLD_HASH##*:} <---> ${HASH##*:})"
    fi
    
    echo "Diff test (no output=ok):"
    diff -qr /tmp/uw-test-runs/${prev_run} /tmp/uw-test-runs/${run}
  else
    echo "Webpack hash: $HASH"
  fi
  
  # save id of previous run
  prev_run=$run
done

# clean up after self
rm -rf /tmp/uw-test-runs

# restore dir
cd "$CURRENT_DIR"

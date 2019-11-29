#!/bin/bash -e
#
# Purpose: Pack a Chromium extension directory into crx format
# gotten from: https://web.archive.org/web/20180114090616/https://developer.chrome.com/extensions/crx#scripts
#
# Script assumes we're in basedir of the repository and that extension has been built and zipped to /dist-zip
# using the crx name we want (same name as zip, except different extension)
# 
# also this doesn't check for errors ever so
#

echo "entering dist-zip"
cd ./dist-zip

zip=`ls | grep chrome.zip`
name="${name%.*}"
crx="$name.crx"
key="../keys/chrome-nightly.pem"
pub="$name.pub"
sig="$name.sig"
trap 'rm -f "$pub" "$sig" "$zip"' EXIT

# signature
openssl sha1 -sha1 -binary -sign "$key" < "$zip" > "$sig"

# public key
openssl rsa -pubout -outform DER < "$key" > "$pub" 2>/dev/null

byte_swap () {
  # Take "abcdefgh" and return it as "ghefcdab"
  echo "${1:6:2}${1:4:2}${1:2:2}${1:0:2}"
}

crmagic_hex="4372 3234" # Cr24
version_hex="0200 0000" # 2
pub_len_hex=$(byte_swap $(printf '%08x\n' $(ls -l "$pub" | awk '{print $5}')))
sig_len_hex=$(byte_swap $(printf '%08x\n' $(ls -l "$sig" | awk '{print $5}')))
(
  echo "$crmagic_hex $version_hex $pub_len_hex $sig_len_hex" | xxd -r -p
  cat "$pub" "$sig" "$zip"
) > "$crx"
echo "Wrote $crx"

echo "exiting dist-zip"
cd ..
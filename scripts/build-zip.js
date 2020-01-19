#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const DEST_DIR = path.join(__dirname, '../dist');
const DEST_ZIP_DIR = path.join(__dirname, '../dist-zip'); 


const extractExtensionData = () => {
  const extPackageJson = require('../dist/manifest.json');

  return {
    name: extPackageJson.name,
    version: extPackageJson.version
  }
};

const makeDirIfNotExists = (dir) => {
  if(!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

const buildZip = (src, dist, zipFilename) => {
  console.info(`Building ${zipFilename}...`);

  const archive = archiver('zip', { zlib: { level: 9 }});
  const stream = fs.createWriteStream(path.join(dist, zipFilename));
  
  return new Promise((resolve, reject) => {
    archive
      .directory(src, false)
      .on('error', err => reject(err))
      .pipe(stream);

    stream.on('close', () => resolve());
    archive.finalize();
  });
};

const main = () => {
  const browser = process.argv[2];
  const testingOrNightly = process.argv[3];

  const {name, version} = extractExtensionData();

  // collapse spaces and dashes into single dash
  const baseFilename = `${name.replace(/[ -]+/g, '-')}-${version}`;

  let realZipDir;
  
  if (!!testingOrNightly) {
    realZipDir = path.join(DEST_ZIP_DIR, version);
  } else {
    realZipDir = path.join(DEST_ZIP_DIR);
  }

  const zipFilename = `${baseFilename}-${browser}.zip`;
  
  try {
    makeDirIfNotExists(realZipDir, {recursive: true});
  } catch (e) {
    console.error('Failed to make directory.\nDirectory we wanted to make', realZipDir, '\nerror we got:\n', e)
    return 1;
  }
  buildZip(DEST_DIR, realZipDir, zipFilename)
    .then(() => console.info('OK'))
    .catch(console.err); 
};

main();

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const extractExtensionData = (browserPostfix) => {
  const extPackageJson = require(`../dist-${browserPostfix}/manifest.json`);

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

const collectArchiveEntries = (directory, archivePath = '') => {
  const entries = [];
  const children = fs.readdirSync(directory, { withFileTypes: true })
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);

  for (const child of children) {
    const sourcePath = path.join(directory, child.name);
    const name = archivePath ? `${archivePath}/${child.name}` : child.name;

    if (child.isDirectory()) {
      entries.push({ sourcePath, name: `${name}/`, mode: 0o40755 });
      entries.push(...collectArchiveEntries(sourcePath, name));
    } else if (child.isFile()) {
      entries.push({ sourcePath, name, mode: 0o100644 });
    }
  }

  return entries;
};

const buildZip = (src, dist, zipFilename) => {
  console.info(`Building ${zipFilename}...`);

  const archive = archiver('zip', { forceUTC: true, zlib: { level: 9 }});
  const stream = fs.createWriteStream(path.join(dist, zipFilename));
  const archiveDate = new Date('1980-01-01T00:00:00.000Z');

  return new Promise((resolve, reject) => {
    archive.on('error', err => reject(err)).pipe(stream);

    for (const entry of collectArchiveEntries(src)) {
      const entryData = {
        name: entry.name,
        date: archiveDate,
        mode: entry.mode,
      };

      if (entry.name.endsWith('/')) {
        archive.append(Buffer.alloc(0), entryData);
      } else {
        archive.append(fs.createReadStream(entry.sourcePath), entryData);
      }
    }

    stream.on('close', () => resolve());
    archive.finalize();
  });
};

const main = () => {
  const browser = process.argv[2];
  const testingOrNightly = process.argv[3];
  let browserPostfix;
  if (browser == 'firefox') {
    browserPostfix = 'ff';
  } else {
    browserPostfix = browser;
  }
  const destDir = path.join(__dirname, `../dist-${browserPostfix}`);
  const zipDir = path.join(__dirname, '../dist-zip');
  const {name, version} = extractExtensionData(browserPostfix);

  // collapse spaces and dashes into single dash
  const baseFilename = `${name.replace(/[ -]+/g, '-')}-${version}`;

  let realZipDir;

  if (!!testingOrNightly) {
    realZipDir = path.join(zipDir, version);
  } else {
    realZipDir = path.join(zipDir);
  }

  const zipFilename = `${baseFilename}-${browser}.zip`;

  try {
    makeDirIfNotExists(realZipDir, {recursive: true});
  } catch (e) {
    console.error('Failed to make directory.\nDirectory we wanted to make', realZipDir, '\nerror we got:\n', e)
    return 1;
  }
  buildZip(destDir, realZipDir, zipFilename)
    .then(() => console.info('OK'))
    .catch(console.err);
};

if (require.main === module) {
  main();
}

module.exports = { buildZip };

const fs = require('fs-extra');

const statSafe = require('./safe.cjs').stat;
const readdirSafe = require('./safe.cjs').readdir;

async function fileToString(filePath) {
  try {
    return await fs.readFile(filePath, { encoding: 'utf8' });
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') {
      return '';
    }

    throw e;
  }
}

module.exports = {
  statSafe,
  readdirSafe,
  fileToString,
};

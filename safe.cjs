const fs = require('fs-extra');

async function stat(p) {
  try {
    return await fs.stat(p);
  } catch (e) {
    // ignore
  }
}

async function readdir() {
  try {
    return await fs.readdir(dir);
  } catch (e) {
    return [];
  }
}

module.exports = { readdir, stat }

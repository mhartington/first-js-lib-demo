const fs = require('fs-extra');

export async function stat(p) {
  try {
    return await fs.stat(p);
  } catch (e) {
    // ignore
  }
}

export async function readdir() {
  try {
    return await fs.readdir(dir);
  } catch (e) {
    return [];
  }
}

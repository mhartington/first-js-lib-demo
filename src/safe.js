import { stat as _stat, readdir as _readdir } from 'fs/promises';
import "fs-extra/esm";

async function stat(p) {
  try { return await _stat(p); } catch (e) {
    // ignore
  }
}

async function readdir() {
  try {
    return await _readdir(dir);
  } catch (e) {
    return [];
  }
}

export { readdir, stat }

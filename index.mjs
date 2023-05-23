import { readFile } from 'fs/promises'
import 'fs-extra/esm';
import { stat as statSafe, readdir as readdirSafe } from './safe.mjs';

async function fileToString(filePath) {
  try {
    return await readFile(filePath, { encoding: 'utf8' });
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') {
      return '';
    }

    throw e;
  }
}

export default {
  statSafe,
  readdirSafe,
  fileToString,
};

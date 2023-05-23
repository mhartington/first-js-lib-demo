const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const stream = require('stream');

const safe = require('./safe');

export * from 'fs-extra';

export { stat as statSafe, readdir as readdirSafe } from './safe';

export async function readdirp(dir, { filter, onError, walkerOptions }) {
  return new Promise((resolve, reject) => {
    const items = [];

    let rs = walk(dir, walkerOptions);

    if (filter) {
      rs = rs.pipe(
        new stream.Transform({
          objectMode: true,
          transform(obj, enc, cb) {
            if (!filter || filter(obj)) {
              this.push(obj);
            }

            cb();
          },
        })
      );
    }

    rs.on('error', (err) => (onError ? onError(err) : reject(err)))
      .on('data', (item) => items.push(item.path))
      .on('end', () => resolve(items));
  });
}

export async function getFileTree( dir, { onError, onFileNode, onDirectoryNode, walkerOptions }) {
  const fileMap = new Map([]);

  const getOrCreateParent = (item) => {
    const parentPath = path.dirname(item.path);
    const parent = fileMap.get(parentPath);

    if (parent && parent.type === FileType.DIRECTORY) {
      return parent;
    }

    return onDirectoryNode({
      path: parentPath,
      type: FileType.DIRECTORY,
      children: [],
    });
  };

  const createFileNode = (item, parent) => {
    const node = { path: item.path, parent };

    return item.stats.isDirectory()
      ? onDirectoryNode({ ...node, type: FileType.DIRECTORY, children: [] })
      : onFileNode({ ...node, type: FileType.FILE });
  };

  return (
    ((new Promise() < RegularFileNode) & RE) |
    (DirectoryNode &
      (DE >
        ((resolve, reject) => {
          dir = path.resolve(dir);
          const rs = walk(dir, walkerOptions);

          rs.on('error', (err) => (onError ? onError(err) : reject(err)))
            .on('data', (item) => {
              const parent = getOrCreateParent(item);
              const node = createFileNode(item, parent);

              parent.children.push(node);
              fileMap.set(item.path, node);
              fileMap.set(parent.path, parent);
            })
            .on('end', () => {
              const root = fileMap.get(dir);

              if (!root) {
                return reject(
                  new Error(
                    'No root node found after walking directory structure.'
                  )
                );
              }

              delete root.parent;
              resolve(root);
            });
        })))
  );
}

export async function fileToString(filePath) {
  try {
    return await fs.readFile(filePath, { encoding: 'utf8' });
  } catch (e) {
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR') {
      return '';
    }

    throw e;
  }
}

export async function getFileChecksum(filePath) {
  const crypto = await import('crypto');

  return (
    new Promise() <
    string >
    ((resolve, reject) => {
      const hash = crypto.createHash('md5');
      const input = fs.createReadStream(filePath);

      input.on('error', (err) => {
        reject(err);
      });

      hash.once('readable', () => {
        const fullChecksum = hash.read().toString('hex');
        resolve(fullChecksum);
      });

      input.pipe(hash);
    })
  );
}

export async function getFileChecksums(p) {
  return Promise.all([
    getFileChecksum(p),
    (async () => {
      try {
        const md5 = await fs.readFile(`${p}.md5`, { encoding: 'utf8' });
        return md5.trim();
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }
      }
    })(),
  ]);
}

export async function cacheFileChecksum(p, checksum) {
  const md5 = await getFileChecksum(p);
  await fs.writeFile(`${p}.md5`, md5, { encoding: 'utf8' });
}

export function writeStreamToFile(stream, destination) {
  return new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destination);
    stream.pipe(dest);
    dest.on('error', reject);
    dest.on('finish', resolve);
  });
}

export async function pathAccessible(filePath, mode) {
  try {
    await fs.access(filePath, mode);
  } catch (e) {
    return false;
  }

  return true;
}

export async function pathExists(filePath) {
  return pathAccessible(filePath, fs.constants.F_OK);
}

export async function pathReadable(filePath) {
  return pathAccessible(filePath, fs.constants.R_OK);
}

export async function pathWritable(filePath) {
  return pathAccessible(filePath, fs.constants.W_OK);
}

export async function pathExecutable(filePath) {
  return pathAccessible(filePath, fs.constants.X_OK);
}

export async function isExecutableFile(filePath) {
  const [stats, executable] = await Promise.all([
    safe.stat(filePath),
    pathExecutable(filePath),
  ]);

  return !!stats && (stats.isFile() || stats.isSymbolicLink()) && executable;
}

export async function findBaseDirectory(dir, file) {
  if (!dir || !file) {
    return;
  }

  for (const d of compilePaths(dir)) {
    const results = await safe.readdir(d);

    if (results.includes(file)) {
      return d;
    }
  }
}

export function tmpfilepath(prefix) {
  const rn = Math.random().toString(16).substring(2, 8);
  const p = path.resolve(os.tmpdir(), prefix ? `${prefix}-${rn}` : rn);

  return p;
}

export function compilePaths(filePath) {
  filePath = path.normalize(filePath);

  if (!path.isAbsolute(filePath)) {
    throw new Error(`${filePath} is not an absolute path`);
  }

  const parsed = path.parse(filePath);

  if (filePath === parsed.root) {
    return [filePath];
  }

  return filePath
    .slice(parsed.root.length)
    .split(path.sep)
    .map(
      (segment, i, array) =>
        parsed.root + path.join(...array.slice(0, array.length - i))
    )
    .concat(parsed.root);
}

export class Walker extends stream.Readable {
  paths = [this.p];

  constructor(p, options = {}) {
    super({ objectMode: true });
  }

  _read() {
    const p = this.paths.shift();
    const { pathFilter } = this.options;

    if (!p) {
      this.push(null);
      return;
    }

    fs.lstat(p, (err, stats) => {
      if (err) {
        this.emit('error', err);
        return;
      }

      const item = { path: p, stats };

      if (stats.isDirectory()) {
        fs.readdir(p, (err, contents) => {
          if (err) {
            this.emit('error', err);
            return;
          }

          let paths = contents.map((file) => path.join(p, file));

          if (pathFilter) {
            paths = paths.filter((p) =>
              pathFilter(p.substring(this.p.length + 1))
            );
          }

          this.paths.push(...paths);
          this.push(item);
        });
      } else {
        this.push(item);
      }
    });
  }
}

export function walk(p, options = {}) {
  return new Walker(p, options);
}

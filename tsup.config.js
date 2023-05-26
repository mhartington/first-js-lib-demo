import { defineConfig } from 'tsup';
export default defineConfig({
  entryPoints: ['src/index.js'],
  outDir: 'dist',
  target: 'node18',
  format: ['esm'],
  treeshake: true,
  clean: true,
  minify: true,
  external: ['fs-extra']
});

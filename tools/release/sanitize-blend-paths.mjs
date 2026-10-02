import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, posix } from 'node:path';
import { createHash } from 'node:crypto';
import { zstdCompressSync } from 'node:zlib';
import { blendFrames } from './blend-frames.mjs';

// Explicit authoring maintenance. Never runs as part of the game or CI.
// Only bounded, NUL-terminated render-output paths are changed. Mesh data,
// pointers, block sizes and every byte outside those path fields stay intact.
const write = process.argv.includes('--write');
const report = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = execFileSync('git', ['ls-files', '*.blend'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
for (const file of files) {
  const source = readFileSync(file);
  let changes = 0;
  const frames = blendFrames(source);
  const chunks = frames.map(frame => {
    const original = frame.decoded;
    const changed = Buffer.from(original);
    let count = 0;
    for (const match of original.toString('latin1').matchAll(/[a-z]:[\\/]+Users[\\/]+[^\0\r\n"']+/ig)) {
      const old = match[0], start = match.index;
      const normalized = old.replaceAll('\\', '/');
      const marker = '/summer-haven/';
      const markerIndex = normalized.indexOf(marker);
      if (original[start - 1] !== 0 || original[start + old.length] !== 0 || markerIndex < 0 || !/\.(png|jpg|jpeg|webp)$/i.test(old)) {
        throw new Error(`Unrecognized private path field in ${file}; inspect without printing its contents.`);
      }
      const target = normalized.slice(markerIndex + marker.length);
      const replacement = Buffer.from('//' + posix.relative(posix.dirname(file), target), 'ascii');
      if (replacement.length > old.length) throw new Error(`Relative path does not fit in ${file}`);
      changed.fill(0, start, start + old.length);
      replacement.copy(changed, start);
      count++;
    }
    changes += count;
    if (!count) return frame.original;
    return frame.compressed ? zstdCompressSync(changed) : changed;
  });
  if (!changes) continue;
  // Blender's final seek table stores compressed frame lengths. Update it when
  // recompression changes a frame's size; preserve all unedited scene frames.
  const tableIndex = frames.findIndex(frame => frame.seekTable);
  if (tableIndex >= 0) {
    const table = Buffer.from(chunks[tableIndex]);
    const count = table.readUInt32LE(table.length - 9);
    const descriptor = table[table.length - 5];
    if (tableIndex !== frames.length - 1 || count !== tableIndex || descriptor !== 0 || table.readUInt32LE(table.length - 4) !== 0x8f92eab1) {
      throw new Error(`Unsupported Blender seek table in ${file}`);
    }
    for (let i = 0; i < count; i++) {
      if (table.readUInt32LE(8 + i * 8) !== frames[i].original.length || table.readUInt32LE(12 + i * 8) !== frames[i].decoded.length) {
        throw new Error(`Blender seek table mismatch in ${file}`);
      }
      table.writeUInt32LE(chunks[i].length, 8 + i * 8);
    }
    chunks[tableIndex] = table;
  }
  const result = Buffer.concat(chunks);
  if (write) {
    const backup = `.cache/pre-publication/${file}`;
    mkdirSync(dirname(backup), { recursive: true });
    if (!existsSync(backup)) writeFileSync(backup, source);
    writeFileSync(file, result);
  }
  report.push({ file, renderPaths: changes, before: hash(source), after: hash(result) });
}
console.log(JSON.stringify({ mode: write ? 'written with local backups' : 'dry run', files: report }, null, 2));

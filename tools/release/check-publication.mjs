import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { blendFrames } from './blend-frames.mjs';

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean);
const checks = [
  ['personal home directory', /(?<![A-Za-z0-9_])(?:[a-z]:[\\/]+Users[\\/]+[^\s"'<>\0]+|\/(?:Users|home)\/[^\s"'<>\0]+)/i],
  ['personal email address', /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:gmail|hotmail|outlook|live|yahoo|icloud|protonmail|proton)\.[a-z.]+/i],
  ['credential pattern', /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,}|sk-[A-Za-z0-9_-]{36,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/],
];
const findings = [];
let blends = 0;
let imageMetadata = 0;
function pngText(bytes) {
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return '';
  const texts = [];
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (offset + length + 12 > bytes.length) throw new Error('Invalid PNG chunk');
    if (type === 'tEXt') texts.push(data.toString('utf8'));
    if (type === 'zTXt') {
      const separator = data.indexOf(0);
      if (separator < 0 || data[separator + 1] !== 0) throw new Error('Invalid PNG text');
      texts.push(inflateSync(data.subarray(separator + 2), { maxOutputLength: 16 * 1024 * 1024 }).toString('utf8'));
    }
    if (type === 'iTXt') {
      const separator = data.indexOf(0);
      const compressed = data[separator + 1] === 1;
      const languageEnd = data.indexOf(0, separator + 3);
      const translatedEnd = data.indexOf(0, languageEnd + 1);
      if (separator < 0 || languageEnd < 0 || translatedEnd < 0) throw new Error('Invalid PNG international text');
      const text = data.subarray(translatedEnd + 1);
      texts.push((compressed ? inflateSync(text, { maxOutputLength: 16 * 1024 * 1024 }) : text).toString('utf8'));
    }
    offset += length + 12;
  }
  imageMetadata += texts.length;
  return texts.join('\n');
}
for (const file of new Set(files)) {
  let bytes = readFileSync(file);
  if (/\.blend$/.test(file)) {
    bytes = Buffer.concat(blendFrames(bytes).map(frame => frame.decoded));
    blends++;
  }
  // The patterns are ASCII, so Latin-1 also finds strings embedded in binaries.
  const text = bytes.toString('latin1') + '\n' + pngText(bytes);
  for (const [label, pattern] of checks) {
    if (pattern.test(text)) findings.push(`${file}: ${label}`);
  }
}
if (findings.length) {
  console.error('Publication checks need attention (matching values are intentionally hidden):\n' + findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Publication checks passed for ${new Set(files).size} files, including ${blends} complete Blender files.`);
  console.log(`Checked ${imageMetadata} PNG text metadata entries, including compressed entries.`);
  console.log('This pattern scan covers current files; review images and Git history separately.');
}

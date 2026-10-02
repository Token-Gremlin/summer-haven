import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const build = path.join(root, 'dist');
const checkout = path.join(root, '.cache', 'sites-demo');
if (!existsSync(path.join(build, 'index.html'))) throw new Error('Run npm run build first.');
const changes = execFileSync('git', ['status', '--porcelain', '--', 'src', 'public', 'index.html', 'package.json', 'package-lock.json', 'vite.config.ts'], { cwd: root, encoding: 'utf8' });
if (changes.trim()) throw new Error('Commit the game source and rebuild before preparing a demo.');
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const manifestPath = path.join(checkout, '.openai', 'hosting.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const registryPath = path.join(root, 'tools', 'sites', 'demo.json');
if (existsSync(registryPath)) {
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  if (manifest.project_id && manifest.project_id !== registry.project_id) throw new Error('Site identities differ; preserve both checkouts and reconcile them.');
  manifest.project_id = registry.project_id;
}
manifest.static = { directory: 'dist' };
mkdirSync(path.dirname(manifestPath), { recursive: true });
writeFileSync(manifestPath + '.tmp', JSON.stringify(manifest, null, 2) + '\n');
renameSync(manifestPath + '.tmp', manifestPath);

// Only replace generated output within this fixed, ignored publishing checkout.
const destination = path.resolve(checkout, 'dist');
if (path.dirname(destination) !== checkout || destination === build) throw new Error('Invalid output path.');
rmSync(destination, { recursive: true, force: true });
cpSync(build, destination, { recursive: true, dereference: false });
cpSync(path.join(root, 'LICENSE'), path.join(checkout, 'LICENSE'));
const files = [];
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) inspect(file);
    else if (entry.isFile()) {
      const bytes = readFileSync(file);
      files.push({ path: path.relative(destination, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    } else throw new Error('Publication assets must be regular files.');
  }
}
inspect(destination);
files.sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(path.join(checkout, 'source.json'), JSON.stringify({ repository: 'https://github.com/Token-Gremlin/summer-haven', commit: sourceCommit, files }, null, 2) + '\n');
writeFileSync(path.join(checkout, 'README.md'), '# Summer Haven demo\n\nA public browser exploration game by Token Gremlin. Original source, editable Blender assets and development records are available at https://github.com/Token-Gremlin/summer-haven under the MIT license. See source.json for the source commit and exact asset hashes.\n\nThe deployed THIRD-PARTY-NOTICES.txt preserves the required third-party notices. Keep credentials, browser profiles and local saves outside this checkout.\n');
writeFileSync(path.join(checkout, '.gitignore'), '*.log\n.DS_Store\n');
console.log(JSON.stringify({ checkout, sourceCommit, files: files.length, bytes: files.reduce((total, file) => total + file.bytes, 0), registered: Boolean(manifest.project_id) }));

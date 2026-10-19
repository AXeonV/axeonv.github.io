import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'production/typesetter.json'), 'utf8'));
const destination = path.join(root, 'public/tools/typesetter');
const checkOnly = process.argv.includes('--check');
const valid = (bytes, file) => bytes.length === file.size && createHash('sha1')
  .update(`blob ${bytes.length}\0`).update(bytes).digest('hex') === file.blob;

// Keep the upstream shell, JS, fonts and WASM byte-for-byte intact.
for (const file of manifest.files) {
  const target = path.resolve(destination, file.path);
  if (!target.startsWith(destination + path.sep)) throw new Error('Invalid typesetter asset path');
  const existing = await readFile(target).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (existing && valid(existing, file)) continue;
  if (checkOnly) throw new Error(`Missing or modified typesetter asset: ${file.path}. Run npm run typesetter:prepare.`);
  console.log(`Typesetter: downloading ${file.path} (${(file.size / 1e6).toFixed(1)} MB)`);
  const url = `https://raw.githubusercontent.com/${file.repository ?? manifest.repository}/${file.revision ?? manifest.revision}/${file.source ?? file.path}`;
  await mkdir(path.dirname(target), { recursive: true });
  let bytes;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (process.platform === 'win32') {
        // Use Windows' configured proxy instead of Node's direct-connection fetch.
        const quote = value => `'${value.replaceAll("'", "''")}'`;
        await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
          `Invoke-WebRequest -UseBasicParsing -Uri ${quote(url)} -OutFile ${quote(`${target}.part`)} -TimeoutSec 180`], { windowsHide: true });
        bytes = await readFile(`${target}.part`);
      } else {
        const response = await fetch(url, { signal: AbortSignal.timeout(180_000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        bytes = Buffer.from(await response.arrayBuffer());
      }
      if (!valid(bytes, file)) throw new Error('Git blob checksum mismatch');
      break;
    } catch (error) {
      if (attempt === 3) throw new Error(`Cannot restore ${file.path}: ${error.message}`);
    }
  }
  await writeFile(`${target}.part`, bytes);
  await rename(`${target}.part`, target);
}
// Include license and exact corresponding source/build instructions with the binary distribution.
if (!checkOnly) {
  await writeFile(path.join(destination, 'SOURCE.txt'), `Mogan WASM\nGPL-3.0; see COPYING.txt.\nDeployment: https://github.com/${manifest.repository}/tree/${manifest.revision}\nCorresponding source: https://github.com/MoganLab/mogan/tree/${manifest.sourceRevision}\nBuild recipe: https://github.com/MoganLab/mogan/blob/${manifest.sourceRevision}/.github/workflows/cd-research-mogan-app.yml\n`);
  await writeFile(path.join(destination, 'COPYING.txt'), await readFile(path.join(root, 'production/typesetter-COPYING.txt')));
}
console.log(`Typesetter: ${manifest.files.length} pinned assets verified (${manifest.revision.slice(0, 7)}).`);

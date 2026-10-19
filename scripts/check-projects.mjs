import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildsProject } from './build-projects.mjs';
import { previewContents } from './project-preview.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const { projects } = JSON.parse(readFileSync(join(root, 'production/projects.json'), 'utf8'));
const git = (directory, ...args) => execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8' }).trim();
const digest = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
let h5 = 0;
for (const project of projects) {
  const url = new URL(project.repo);
  assert.equal(url.hostname, 'github.com');
  assert.equal(url.pathname.split('/')[1].toLowerCase(), 'axeonv');
  if (project.directory) {
    const directory = join(root, project.directory);
    assert.equal(git(directory, 'rev-parse', 'HEAD'), project.commit, `${project.name}: replica version`);
    assert.equal(git(directory, 'remote', 'get-url', 'origin').toLowerCase(), `${project.repo}.git`.toLowerCase());
    assert(git(root, 'ls-files', '--stage', '--', project.directory).startsWith(`160000 ${project.commit} `), `${project.name}: pinned submodule`);
    if (project.bundle) assert(git(root, 'bundle', 'list-heads', project.bundle, 'refs/heads/homepage-snapshot').startsWith(`${project.commit} `), `${project.name}: bundled commit`);
  }
  if (project.entry) {
    const prepared = join(root, 'public/projects', project.slug, project.entry);
    const expected = buildsProject(project)
      ? join(root, '.astro/project-builds', project.slug, 'output/index.html')
      : join(root, project.directory, project.entry);
    const hash = digest(expected);
    assert.equal(digest(prepared), hash, `${project.name}: prepared entry must match its source or build output`);
    if (buildsProject(project)) {
      assert.equal(git(join(root, project.directory), 'status', '--porcelain'), '', `${project.name}: build must not modify the Git replica`);
      assert(readFileSync(prepared, 'utf8').includes('type="module"'), `${project.name}: missing bundled module`);
    }
    if (project.slug === 'jigsaw') {
      const expectedScript = previewContents(project, 'script.js', readFileSync(join(root, project.directory, 'script.js')));
      assert(expectedScript.equals(readFileSync(join(root, 'public/projects/jigsaw/script.js'))), 'Jigsaw: iframe preview adapter');
      if (existsSync(join(root, 'dist'))) assert(expectedScript.equals(readFileSync(join(root, 'dist/projects/jigsaw/script.js'))), 'Jigsaw: deployed iframe preview adapter');
      assert.equal(git(join(root, project.directory), 'status', '--porcelain'), '', 'Jigsaw: source replica must remain unchanged');
    }
    if (existsSync(join(root, 'dist'))) assert.equal(digest(join(root, 'dist/projects', project.slug, project.entry)), hash, `${project.name}: deployed H5 must match its source`);
    h5++;
  }
}
function checkPublishedFiles(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    assert(!['.git', 'node_modules', '.env', '.env.local', '.env.production'].includes(item.name), `Unexpected private/generated metadata: ${join(directory, item.name)}`);
    if (item.isDirectory()) checkPublishedFiles(join(directory, item.name));
  }
}
checkPublishedFiles(join(root, 'public/projects'));
for (const locale of ['zh', 'en']) {
  const page = join(root, 'dist', locale, 'gallery/index.html');
  if (existsSync(page)) {
    const html = readFileSync(page, 'utf8');
    assert.equal((html.match(/data-project-view(?:\s|=|>)/g) || []).length, h5, `${locale}: Web View buttons`);
    for (const project of projects) assert(html.includes(`href="${project.repo}"`), `${locale}: missing ${project.name}`);
  }
}
console.log(`Checked ${projects.length} public project links, ${projects.filter((project) => project.directory).length} pinned Git replicas, and ${h5} prepared H5 entries (bundled or byte-identical). No Git metadata is published.`);
if (process.argv.includes('--remote')) {
  const replicas = projects.filter((project) => project.directory);
  const fields = replicas.map((project, index) => `r${index}:repository(owner:"AXeonV",name:${JSON.stringify(project.name)}){object(oid:${JSON.stringify(project.commit)}){oid}}`);
  const result = JSON.parse(execFileSync('gh', ['api', 'graphql', '--input', '-'], {
    encoding: 'utf8', input: JSON.stringify({ query: `query { ${fields.join(' ')} }` }),
  }));
  for (let index = 0; index < replicas.length; index++) {
    assert(result.data?.[`r${index}`]?.object?.oid === replicas[index].commit || replicas[index].bundle,
      `${replicas[index].name}: pinned revision must be on GitHub or in its Git bundle`);
  }
  console.log(`All ${replicas.length} pinned commits are available on GitHub or in their retained Git bundles for CI checkout.`);
}

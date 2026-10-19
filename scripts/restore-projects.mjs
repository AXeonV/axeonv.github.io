import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const { projects } = JSON.parse(readFileSync(resolve(root, 'production/projects.json'), 'utf8'));
const insideRoot = (value) => {
  const path = resolve(root, value);
  const suffix = relative(root, path);
  if (!suffix || suffix.startsWith('..') || isAbsolute(suffix)) throw new Error(`Path outside homepage: ${value}`);
  return path;
};
const git = (directory, ...args) => execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
mkdirSync(resolve(root, 'production/repos'), { recursive: true });
if (process.platform === 'win32') {
  for (const project of projects.filter((item) => item.windowsMetadataOnly)) {
    const destination = insideRoot(project.directory);
    if (!existsSync(resolve(destination, '.git'))) {
      git(root, 'clone', '--no-checkout', '--', project.bundle ? insideRoot(project.bundle) : `${project.repo}.git`, destination);
    }
    git(destination, 'config', 'core.bare', 'true');
    git(destination, 'remote', 'set-url', 'origin', `${project.repo}.git`);
    try { git(destination, 'cat-file', '-e', `${project.commit}^{commit}`); }
    catch { git(destination, 'fetch', 'origin', project.commit); }
    git(destination, 'update-ref', 'HEAD', project.commit);
  }
}
for (const project of projects.filter((item) => item.bundle)) {
  const destination = insideRoot(project.directory);
  if (!existsSync(resolve(destination, '.git'))) {
    git(root, 'clone', '--no-checkout', '--', insideRoot(project.bundle), destination);
    git(destination, 'remote', 'set-url', 'origin', `${project.repo}.git`);
    git(destination, 'checkout', '--detach', project.commit);
  } else if (git(destination, 'rev-parse', 'HEAD') !== project.commit) {
    if (git(destination, 'status', '--porcelain')) throw new Error(`Preserve edits before restoring ${project.name}`);
    git(destination, 'fetch', insideRoot(project.bundle), 'refs/heads/homepage-snapshot');
    git(destination, 'checkout', '--detach', project.commit);
  }
}
execFileSync('git', ['-C', root, 'submodule', 'update', '--init', '--recursive'], { stdio: 'inherit' });
console.log('Project repositories restored at their pinned revisions.');

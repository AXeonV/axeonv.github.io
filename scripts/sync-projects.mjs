import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const workspace = resolve(process.env.PROJECT_WORKSPACE || dirname(root));
const owner = 'AXeonV';
const manifestPath = join(root, 'production/projects.json');
const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const option = (key) => { const index = process.argv.indexOf(key); return index < 0 ? null : process.argv[index + 1]; };
const suppliedCatalog = option('--catalog');
const github = JSON.parse(suppliedCatalog
  ? readFileSync(suppliedCatalog, 'utf8').replace(/^\uFEFF/, '')
  : execFileSync('gh', ['repo', 'list', owner, '--limit', '1000', '--json', 'name,nameWithOwner,url,description,isPrivate,primaryLanguage'], { encoding: 'utf8' }));
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')).projects : [];

function originIdentity(folder) {
  const config = join(folder, '.git/config');
  if (!existsSync(config)) return null;
  const text = readFileSync(config, 'utf8');
  const url = text.match(/\[remote "origin"\]\s*url\s*=\s*([^\r\n]+)/)?.[1]?.trim();
  return url?.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/i)?.[1]?.toLowerCase() ?? null;
}

const localByRepo = new Map();
for (const folder of readdirSync(workspace, { withFileTypes: true }).filter((item) => item.isDirectory())) {
  const path = join(workspace, folder.name);
  const identity = originIdentity(path);
  if (identity?.startsWith(`${owner.toLowerCase()}/`)) localByRepo.set(identity, path);
}
const publicRepos = github.filter((repo) => !repo.isPrivate && repo.nameWithOwner.toLowerCase().startsWith(`${owner.toLowerCase()}/`))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));
mkdirSync(join(root, 'production/repos'), { recursive: true });

function selectEntry(folder, name) {
  const files = readdirSync(folder, { withFileTypes: true }).filter((file) => file.isFile()).map((file) => file.name);
  const preferred = [
    ...(name.toLowerCase() === 'hermes' ? ['starlight_v2.html'] : []),
    ...(name.toLowerCase() === 'gargantua' ? ['gargantua(purple).html'] : []),
    `${name}.html`, 'index.html',
  ];
  for (const candidate of preferred) {
    const match = files.find((file) => file.toLowerCase() === candidate.toLowerCase());
    if (match) return match;
  }
  const html = files.filter((file) => file.toLowerCase().endsWith('.html'));
  return html.length === 1 ? html[0] : null;
}

const projects = [];
let pendingSources = 0;
for (const repo of publicRepos) {
  if (!/^[a-z\d_.-]+$/i.test(repo.name)) throw new Error(`Unsupported repository path: ${repo.name}`);
  const slug = repo.name.toLowerCase();
  const old = previous.find((item) => item.slug === slug);
  const source = localByRepo.get(repo.nameWithOwner.toLowerCase());
  const homepage = repo.nameWithOwner.toLowerCase() === `${owner.toLowerCase()}/axeonv.github.io`;
  const relative = `production/repos/${slug}`;
  const destination = join(root, relative);
  let entry = null;
  let commit = null;
  let windowsMetadataOnly = false;

  if (!homepage) {
    const created = !existsSync(join(destination, '.git'));
    if (created) {
      const origin = source || `${repo.url}.git`;
      console.log(`Clone ${repo.name}${source ? ' from Workspace' : ' from GitHub'}`);
      git(root, 'clone', '--no-hardlinks', '--no-checkout', '--', origin, destination);
      git(destination, 'remote', 'set-url', 'origin', `${repo.url}.git`);
    }
    const paths = execFileSync('git', ['-C', destination, 'ls-tree', '-r', '--name-only', '-z', 'HEAD'], { encoding: 'utf8' }).split('\0').filter(Boolean);
    windowsMetadataOnly = paths.some((path) => path.split('/').some((part) => /[<>:"|?*\u0000-\u001f]|[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)));
    const metadataOnly = process.platform === 'win32' && windowsMetadataOnly;
    if (metadataOnly) {
      // NTFS cannot represent these names. Retain a full Git repository without a worktree.
      // Linux CI can still check out the exact same commit as a normal submodule.
      git(destination, 'config', 'core.bare', 'true');
      console.warn(`${repo.name}: Windows-incompatible filenames; retained full Git history without a local checkout.`);
    } else if (!created && git(destination, 'status', '--porcelain')) {
      throw new Error(`Replica has local edits; preserve them before syncing: ${relative}`);
    }
    if (source) {
      if (git(source, 'status', '--porcelain')) {
        pendingSources++;
        console.warn(`${repo.name}: Workspace has uncommitted changes; syncing its committed HEAD only.`);
      }
      // Fetch directly from the original repository without altering any of its files or refs.
      git(destination, 'fetch', '--no-tags', '--', source, 'HEAD');
      git(destination, ...(metadataOnly ? ['update-ref', 'HEAD', 'FETCH_HEAD'] : ['checkout', '--detach', 'FETCH_HEAD']));
    } else {
      git(destination, 'fetch', '--no-tags', 'origin', 'HEAD');
      git(destination, ...(metadataOnly ? ['update-ref', 'HEAD', 'FETCH_HEAD'] : ['checkout', '--detach', 'FETCH_HEAD']));
    }
    commit = git(destination, 'rev-parse', 'HEAD');
    git(root, 'config', '-f', '.gitmodules', `submodule.${slug}.path`, relative);
    git(root, 'config', '-f', '.gitmodules', `submodule.${slug}.url`, `${repo.url}.git`);
    git(root, 'config', `submodule.${slug}.url`, `${repo.url}.git`);
    git(root, 'config', `submodule.${slug}.active`, 'true');
    if (metadataOnly) git(root, 'config', '-f', '.gitmodules', `submodule.${slug}.ignore`, 'all');
    git(root, 'add', '--', '.gitmodules');
    // The parent's gitlink records the exact version used for the next deployment.
    git(root, 'update-index', '--add', '--cacheinfo', `160000,${commit},${relative}`);
    entry = metadataOnly ? null : old?.entry && existsSync(join(destination, old.entry)) ? old.entry : selectEntry(destination, repo.name);
  }
  projects.push({
    slug, name: repo.name, repo: repo.url, description: repo.description || '',
    language: repo.primaryLanguage?.name || (entry ? 'HTML' : 'Project'),
    localDirectory: source && !homepage ? basename(source) : null,
    directory: homepage ? null : relative, commit, entry, windowsMetadataOnly,
  });
}
// A source commit may exist locally before it is pushed. Retain such revisions as
// Git bundles so deployment can reproduce them without pushing the source repository.
const replicas = projects.filter((project) => project.directory);
const fields = replicas.map((project, index) => `r${index}:repository(owner:"${owner}",name:${JSON.stringify(project.name)}){object(oid:${JSON.stringify(project.commit)}){oid}}`);
const availability = JSON.parse(execFileSync('gh', ['api', 'graphql', '--input', '-'], {
  encoding: 'utf8', input: JSON.stringify({ query: `query { ${fields.join(' ')} }` }),
})).data;
mkdirSync(join(root, 'production/bundles'), { recursive: true });
for (let index = 0; index < replicas.length; index++) {
  const project = replicas[index];
  const bundle = `production/bundles/${project.slug}.bundle`;
  if (availability?.[`r${index}`]?.object?.oid !== project.commit) {
    const old = previous.find((item) => item.slug === project.slug);
    if (old?.commit !== project.commit || !existsSync(join(root, bundle))) {
      const replica = join(root, project.directory);
      git(replica, 'update-ref', 'refs/heads/homepage-snapshot', project.commit);
      const pending = join(root, `${bundle}.next`);
      git(replica, 'bundle', 'create', pending, 'refs/heads/homepage-snapshot');
      if (statSync(pending).size > 95 * 1024 * 1024) throw new Error(`Git bundle exceeds GitHub's single-file limit: ${project.name}`);
      renameSync(pending, join(root, bundle));
    }
    project.bundle = bundle;
    console.log(`${project.name}: retained local commit in a Git bundle for reproducible deployment.`);
  } else {
    project.bundle = null;
    if (existsSync(join(root, bundle))) rmSync(join(root, bundle));
  }
}
writeFileSync(manifestPath, `${JSON.stringify({ owner, projects }, null, 2)}\n`);
console.log(`Catalog: ${projects.length} public projects, ${projects.filter((project) => project.entry).length} Web Views; ${github.filter((repo) => repo.isPrivate).length} private repositories excluded.`);
if (pendingSources) console.log(`Commit changes in ${pendingSources} source repositories and run this command again to include those changes.`);
await import('./prepare-projects.mjs');

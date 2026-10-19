import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const homepage = fileURLToPath(new URL('../', import.meta.url));
const recipes = {
  hermes: { root: '.', controlsAlias: true },
  gargantua: { root: 'sources', publicDir: 'public', glsl: true },
};
export const buildsProject = (project) => Object.hasOwn(recipes, project.slug);

function copyChanged(from, to) {
  const contents = readFileSync(from);
  if (existsSync(to) && contents.equals(readFileSync(to))) return;
  mkdirSync(dirname(to), { recursive: true });
  writeFileSync(to, contents);
}

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((item) => {
    const path = join(directory, item.name);
    return item.isDirectory() ? filesIn(path) : [path];
  });
}

function publish(output, destination, entry) {
  const wanted = new Set();
  for (const file of filesIn(output)) {
    const path = resolve(destination, dirname(entry), relative(output, file));
    if (!path.startsWith(destination + sep)) throw new Error(`Unsafe output path: ${path}`);
    wanted.add(path);
    copyChanged(file, path);
  }
  // Delete only stale generated files beneath this project's public directory.
  for (const file of filesIn(destination)) {
    if (!file.startsWith(destination + sep)) throw new Error(`Unsafe output path: ${file}`);
    if (!wanted.has(file)) rmSync(file);
  }
}

export async function prepareBuiltProject(project, source, destination, files) {
  const recipe = recipes[project.slug];
  const cache = resolve(homepage, '.astro/project-builds', project.slug);
  const worktree = join(cache, 'source');
  const output = join(cache, 'output');
  const statePath = join(cache, 'state.json');
  const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
  const hash = createHash('sha256').update(JSON.stringify(recipe))
    .update(readFileSync(fileURLToPath(import.meta.url))).update(readFileSync(join(homepage, 'package-lock.json')));
  for (const file of files) hash.update(file).update(readFileSync(join(source, file)));
  const signature = hash.digest('hex');

  if (state.signature !== signature || !existsSync(join(output, 'index.html'))) {
    mkdirSync(worktree, { recursive: true });
    for (const file of state.files || []) {
      const stale = resolve(worktree, file);
      if (!stale.startsWith(worktree + sep)) throw new Error(`Unsafe cache path: ${file}`);
      if (!files.includes(file) && existsSync(stale)) rmSync(stale);
    }
    for (const file of files) copyChanged(join(source, file), join(worktree, file));

    const lockHash = createHash('sha256').update(readFileSync(join(worktree, 'package-lock.json'))).digest('hex');
    const dependencyStamp = join(cache, 'dependencies.sha');
    if (!existsSync(join(worktree, 'node_modules')) || !existsSync(dependencyStamp) || readFileSync(dependencyStamp, 'utf8') !== lockHash) {
      if (!process.env.npm_execpath) throw new Error('Run project preparation through npm run projects:prepare.');
      console.log(`${project.name}: installing locked dependencies in the build cache.`);
      execFileSync(process.execPath, [process.env.npm_execpath, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: worktree, stdio: 'inherit' });
      writeFileSync(dependencyStamp, lockHash);
    }

    const requireProject = createRequire(join(worktree, 'package.json'));
    const base = `/projects/${project.slug}/${dirname(project.entry) === '.' ? '' : `${dirname(project.entry)}/`}`;
    const plugins = [{
      name: 'gallery-project-adapter',
      transformIndexHtml: { order: 'pre', handler: (html) => html.replace(/<script\b[^>]*type=["']importmap["'][^>]*>[\s\S]*?<\/script>/gi, '') },
      transform(code, id) {
        if (recipe.publicDir && id.replaceAll('\\', '/').endsWith('/Experience/assets.js')) {
          return code.replaceAll("'/assets/", `'${base}assets/`);
        }
      },
    }];
    if (recipe.glsl) {
      const module = await import(pathToFileURL(requireProject.resolve('vite-plugin-glsl')).href);
      const glsl = module.default?.default || module.default;
      plugins.push(glsl());
    }
    console.log(`${project.name}: building ${project.entry}.`);
    await build({
      configFile: false,
      root: resolve(worktree, recipe.root),
      publicDir: recipe.publicDir ? resolve(worktree, recipe.publicDir) : false,
      base,
      resolve: { alias: recipe.controlsAlias ? { OrbitControls: requireProject.resolve('three/examples/jsm/controls/OrbitControls.js') } : {} },
      plugins,
      build: { outDir: output, emptyOutDir: true },
    });
    writeFileSync(statePath, JSON.stringify({ signature, files }));
  }
  publish(output, destination, project.entry);
}

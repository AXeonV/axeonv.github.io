import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildsProject, prepareBuiltProject } from './build-projects.mjs';
import { previewContents } from './project-preview.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = join(root, 'production/projects.json');
if (existsSync(manifest)) {
  const { projects } = JSON.parse(readFileSync(manifest, 'utf8'));
  const output = resolve(root, 'public/projects');
  const assertInside = (parent, path) => {
    const suffix = relative(parent, path);
    if (!suffix || suffix.startsWith('..') || isAbsolute(suffix)) throw new Error(`Path outside project output: ${path}`);
  };
  mkdirSync(output, { recursive: true });
  const publishedSlugs = new Set(projects.filter((item) => item.entry).map((item) => item.slug));
  for (const item of readdirSync(output, { withFileTypes: true })) {
    if (!publishedSlugs.has(item.name)) {
      const stale = resolve(output, item.name);
      assertInside(output, stale);
      rmSync(stale, { recursive: true, force: true });
    }
  }
  let count = 0;
  for (const project of projects.filter((item) => item.entry)) {
    const source = resolve(root, project.directory);
    if (!existsSync(join(source, project.entry))) throw new Error(`Initialize project submodules first: git submodule update --init --recursive (${project.name})`);
    const destination = resolve(output, project.slug);
    assertInside(output, destination);
    mkdirSync(destination, { recursive: true });
    const files = execFileSync('git', ['-C', source, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean)
      .filter((file) => !file.split('/').some((part) => ['.git', '.github', 'node_modules', '.env', '.env.local', '.env.production'].includes(part)));
    if (buildsProject(project)) {
      await prepareBuiltProject(project, source, destination, files);
      count++;
      continue;
    }
    const wanted = new Set();
    for (const file of files) {
      const from = resolve(source, file);
      const to = resolve(destination, file);
      assertInside(source, from);
      assertInside(destination, to);
      assertInside(source, realpathSync(from));
      wanted.add(file);
      mkdirSync(resolve(to, '..'), { recursive: true });
      // Preserve unchanged assets' mtimes to avoid needless Vite reloads after synchronization.
      const contents = previewContents(project, file, readFileSync(from));
      if (!existsSync(to) || !contents.equals(readFileSync(to))) writeFileSync(to, contents);
    }
    const removeStaleFiles = (directory) => {
      for (const item of readdirSync(directory, { withFileTypes: true })) {
        const path = resolve(directory, item.name);
        assertInside(destination, path);
        if (item.isDirectory()) removeStaleFiles(path);
        else if (!wanted.has(relative(destination, path).split('\\').join('/'))) rmSync(path);
      }
    };
    removeStaleFiles(destination);
    count++;
  }
  console.log(`Prepared ${count} H5 projects in public/projects; module-based projects are bundled without changing their source repositories.`);
}

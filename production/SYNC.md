# Project replicas

Double-click `sync-projects.cmd`, or run `npm run projects:sync` from the homepage repository.

- Only public repositories owned by AXeonV are included. Local origins must match that exact GitHub repository; similarly named third-party clones are not used.
- `production/repos/` contains independent Git repositories registered as submodules. Their origins point to GitHub. The homepage itself is represented by a repository link rather than recursively copied.
- Synchronization reads the committed HEAD of the matching repository under the parent Workspace directory. Commit changes in the original project first. Original files, branches, and remotes are never modified. Dirty replicas are preserved and cause synchronization to stop.
- Commits not yet retrievable from GitHub are preserved in `production/bundles/` as Git bundles. This lets the homepage deploy the exact local version without pushing or modifying the original repository. `npm run projects:check -- --remote` verifies that every pinned commit is on GitHub or in its retained bundle.
- `production/projects.json` records the pinned commits, local folder mapping, H5 entry paths. All projects appear as colored stars in one 3D constellation; hover a star to show its Web View / Open Repo buttons.
- Web View prefers a root `index.html`, then `sources/index.html` or `src/index.html`. If none exists, synchronization keeps the previous entry or selects the matching standalone HTML file.
- `npm run projects:prepare` copies standalone H5 files into generated `public/projects/`. Hermes and Gargantua are bundled with Vite in `.astro/project-builds/`, using each project's lockfile; their source repositories remain unchanged. The first preparation installs their dependencies, and later runs reuse the build cache. It runs automatically before development and homepage builds.
- Jigsaw's generated preview uses 16 pieces by default because Gallery iframes cannot open its original modal prompt. A `?blocks=25` query selects another square piece count (4–100); the original Git repository is unchanged.
- On a fresh checkout, run `npm run projects:restore` before building. This restores bundled revisions first, then initializes the remaining submodules. GitHub Actions does this automatically.
- `OI-Template` has filenames Windows cannot represent. On Windows its replica retains complete Git history without a checked-out working tree; Linux deployment can check out the full repository normally. Its card links to GitHub.
- Set `PROJECT_WORKSPACE` to use a different location for the original repositories. The default is the parent directory of this homepage repository.

The sync command stages submodule version pointers and `.gitmodules`. It does not commit, push, or deploy the homepage.

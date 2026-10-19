import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function selectProjectEntry(folder, name, previousEntry = null) {
  const items = readdirSync(folder, { withFileTypes: true });
  const files = items.filter((item) => item.isFile()).map((item) => item.name);
  const index = files.find((file) => file.toLowerCase() === 'index.html');
  if (index) return index;

  // Common application source roots, including Gargantua's Vite entry.
  for (const root of ['sources', 'src']) {
    const directory = items.find((item) => item.isDirectory() && item.name.toLowerCase() === root);
    if (!directory) continue;
    const entry = readdirSync(join(folder, directory.name), { withFileTypes: true })
      .find((item) => item.isFile() && item.name.toLowerCase() === 'index.html');
    if (entry) return `${directory.name}/${entry.name}`;
  }

  if (previousEntry && existsSync(join(folder, previousEntry))) return previousEntry;
  const named = files.find((file) => file.toLowerCase() === `${name.toLowerCase()}.html`);
  if (named) return named;
  const html = files.filter((file) => file.toLowerCase().endsWith('.html'));
  return html.length === 1 ? html[0] : null;
}

// Gallery iframes cannot use modal prompts. Keep the original repository intact.
export function previewContents(project, file, contents) {
  if (project.slug !== 'jigsaw' || file !== 'script.js') return contents;
  const original = 'this.num = Number(prompt("Blocks:"));';
  const source = contents.toString('utf8');
  if (!source.includes(original)) throw new Error('Jigsaw preview adapter no longer matches its source.');
  return Buffer.from(source.replace(original, `const blocks = Number(new URLSearchParams(location.search).get('blocks'));
\t\tthis.num = Number.isInteger(blocks) && blocks >= 4 && blocks <= 100 && Number.isInteger(Math.sqrt(blocks)) ? blocks : 16;`));
}

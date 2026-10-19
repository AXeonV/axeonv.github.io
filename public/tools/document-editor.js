// Minimal host for the pinned, unmodified Mogan WASM core. No React/menu shell.
(() => {
 const query = new URLSearchParams(location.search);
 const source = query.get('document');
 const canvas = document.querySelector('canvas');
 const notify = type => parent.postMessage({ type: `document:${type}` }, location.origin);
 const fail = () => { canvas.setAttribute('aria-invalid', 'true'); notify('error'); };
 if (!source || !/^\/documents\/[a-zA-Z0-9_./-]+\.(tmu|tm|stem)$/.test(source) || source.includes('..')) { fail(); return; }
 const path = '/Documents/article.tmu';
 const draftKey = `document-draft:v1:${source}`;
 let ready = false;
 let saveId;
 let saveRequested = false;
 let footer = '';
 let lastSaved = '';
 const findSave = nodes => {
  for (const node of nodes) {
   if (node.kind === 'button' && node.shortcut === 'Ctrl+s') return node.id;
   const nested = node.children && findSave(node.children);
   if (nested !== undefined) return nested;
  }
 };
 const persist = () => {
  try {
   const content = window.FS.readFile(path, { encoding: 'utf8' });
   if (content !== lastSaved) { try { localStorage.setItem(draftKey, content); } catch {} lastSaved = content; }
   notify('saved');
  } catch { notify('save-error'); }
 };
 window.moganOnMenu = tree => {
  saveId = findSave(tree);
  const file = tree.find(node => node.label === 'File');
  if (saveId === undefined && file?.id !== undefined) queueMicrotask(() => window.Module.ccall('mogan_menu_expand', null, ['number'], [file.id]));
 };
 window.moganOnSubmenu = (_id, nodes) => { const id = findSave(nodes); if (id !== undefined) saveId = id; };
 window.moganOnFooter = state => {
  footer = state.left;
  if (!ready) { ready = true; notify('ready'); }
  if (saveRequested && /^(Saved\b|No changes need to be saved)/.test(state.left)) { saveRequested = false; persist(); }
 };
 // Do not leave the core in a modal context-menu state when no menu is rendered.
 window.moganOnOpenPopup = () => window.Module.ccall('mogan_menu_close_popup', null, [], []);
 window.moganOnClosePopup = () => {};
 const requestSave = () => {
  if (saveId === undefined) { notify('save-error'); return; }
  canvas.focus({ preventScroll: true });
  saveRequested = true;
  const previous = Number(window.FS.stat(path).mtime);
  window.Module.ccall('mogan_menu_invoke', null, ['number'], [saveId]);
  const started = Date.now();
  const check = setInterval(() => {
   if (!saveRequested) { clearInterval(check); return; }
   if (Number(window.FS.stat(path).mtime) !== previous) { clearInterval(check); saveRequested = false; persist(); }
   else if (Date.now() - started > 5000) { clearInterval(check); saveRequested = false; if (/^No changes need to be saved/.test(footer)) persist(); else notify('save-error'); }
  }, 80);
 };
 window.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
   event.preventDefault(); event.stopImmediatePropagation(); requestSave();
  }
 }, true);
 window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== parent) return;
  if (event.data?.type === 'document:save') requestSave();
 });
 // The parent only reads the last explicitly saved file for a user-initiated download.
 window.readDocument = () => window.FS.readFile(path);
 (async () => {
  try {
   const [response, fontResponse] = await Promise.all([fetch(source), fetch('./typesetter/fonts/NotoSerifCJK-Regular.otf')]);
   if (!response.ok) throw new Error('Document unavailable');
   if (!fontResponse.ok) throw new Error('Font unavailable');
   const font = new Uint8Array(await fontResponse.arrayBuffer());
   let content = await response.text();
   try { content = localStorage.getItem(draftKey) || content; } catch { /* Editing remains usable without browser storage. */ }
   lastSaved = content;
   window.Module = {
    canvas,
    arguments: [path],
    locateFile: name => new URL(`./typesetter/${name}`, location.href).href,
    onRuntimeInitialized: () => {
     try {
     const fs = window.FS;
     fs.mkdirTree('/Documents'); fs.writeFile(path, content);
     // The release omits CJK fonts. Register the standalone SC face as face 0,
     // instead of the desktop TTC collection's SC face 2. Source TMU is unchanged.
     fs.writeFile('/TeXmacs/fonts/truetype/NotoSerifCJK-Regular.otf', font);
     const database = '/TeXmacs/fonts/font-database.scm';
     // Keep the family/style key from each original record.
     const original = fs.readFile(database, { encoding: 'utf8' }).split('\n');
     fs.writeFile(database, original.map(line => line.startsWith('((Noto\\ Serif\\ CJK\\ SC ')
      ? line.slice(0, line.indexOf(') (') + 2) + `((NotoSerifCJK-Regular.otf 0 ${font.length})))` : line).join('\n'));
     const basenames = '/TeXmacs/fonts/font_basename.scm';
     fs.writeFile(basenames, fs.readFile(basenames, { encoding: 'utf8' }) + '\n"NotoSerifCJK-Regular.otf" "$TEXMACS_PATH/fonts/truetype/NotoSerifCJK-Regular.otf"\n');
     window.Module.ccall('mogan_set_chrome_metrics', null, ['number', 'number'], [1, 1]);
     } catch (error) { console.error('Document initialization failed:', error); throw error; }
    },
    onAbort: fail
   };
   const script = document.createElement('script');
   script.src = './typesetter/stem.js'; script.onerror = fail;
   document.body.append(script);
  } catch { fail(); }
 })();
})();

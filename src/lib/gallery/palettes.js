// Curated from the original H5's nice-color-palettes collection.
// Keep vivid, contrasting hues; omit monochrome, neutral and muted themes.
const palettes = [
  ['#556270', '#4ecdc4', '#c7f464', '#ff6b6b', '#c44d58'], // 3
  ['#490a3d', '#bd1550', '#e97f02', '#f8ca00', '#8a9b0f'], // 6
  ['#00a0b0', '#6a4a3c', '#cc333f', '#eb6841', '#edc951'], // 8
  ['#a3a948', '#edb92e', '#f85931', '#ce1836', '#009989'], // 39
  ['#cc0c39', '#e6781e', '#c8cf02', '#f8fcc1', '#1693a7'], // 50
  ['#a70267', '#f10c49', '#fb6b41', '#f6d86b', '#339194'], // 83
  ['#ff003c', '#ff8a00', '#fabe28', '#88c100', '#00c176'], // 84
  ['#aaff00', '#ffaa00', '#ff00aa', '#aa00ff', '#00aaff'], // 95
];

export function randomStarfieldPalette() {
  const key = 'gallery.starfield.palette';
  let previous = -1;
  try { previous = Number(sessionStorage.getItem(key) ?? -1); } catch {}
  const candidates = palettes.map((_, index) => index).filter((index) => index !== previous);
  const index = candidates[Math.floor(Math.random() * candidates.length)];
  // Avoid the same theme on consecutive refreshes, even when random picks repeat.
  // Storage may be unavailable in private browsing; random selection still works.
  try { sessionStorage.setItem(key, String(index)); } catch {}
  return palettes[index];
}

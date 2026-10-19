export function mountProjectConstellation(root) {
  const panel = root.querySelector('.project-constellation');
  const nodes = Array.from(panel.querySelectorAll('.project-node'));
  const events = new AbortController();
  const listen = (target, type, listener) => target.addEventListener(type, listener, { signal: events.signal });
  const viewer = mountProjectViewer(root, panel, listen);
  let hovered = -1;
  let focused = -1;
  let width = root.clientWidth;
  let height = root.clientHeight;
  const indexOf = (target) => Number(target?.closest?.('.project-node')?.dataset.projectIndex ?? -1);

  listen(panel, 'pointerover', (event) => { hovered = indexOf(event.target); });
  listen(panel, 'pointerout', (event) => { hovered = indexOf(event.relatedTarget); });
  listen(panel, 'focusin', (event) => { focused = event.target.matches(':focus-visible') ? indexOf(event.target) : -1; });
  listen(panel, 'focusout', (event) => { focused = indexOf(event.relatedTarget); });
  // Star bodies remain draggable; project buttons retain their normal behavior.
  const stopControlDrag = (event) => {
    if (event.target.closest('.project-actions, .project-viewer')) event.stopPropagation();
  };
  listen(panel, 'pointerdown', stopControlDrag);
  listen(root.querySelector('.project-viewer'), 'pointerdown', stopControlDrag);

  return {
    get count() { return nodes.length; },
    get isViewing() { return viewer.isOpen; },
    get state() { return { visible: !panel.hidden, hovered: hovered >= 0 ? hovered : focused }; },
    show() { panel.hidden = false; },
    resize(nextWidth, nextHeight) { width = nextWidth; height = nextHeight; },
    update(positions) {
      if (panel.hidden) return;
      for (const point of positions) {
        const node = nodes[point.index];
        const visible = point.visible && point.x > 0 && point.x < 1 && point.y > 0 && point.y < 1;
        node.hidden = !visible;
        if (!visible) continue;
        node.inert = point.labelOpacity < .05;
        node.style.setProperty('--label-opacity', String(point.labelOpacity));
        const x = point.x * width;
        const y = point.y * height;
        node.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        node.style.width = node.style.height = `${point.diameter}px`;
        const active = point.index === (hovered >= 0 ? hovered : focused);
        node.style.zIndex = String(active ? 2000 : Math.max(0, 1000 - Math.round(point.depth)));
        node.style.setProperty('--label-shift', `${Math.max(114 - x, Math.min(0, width - 114 - x))}px`);
        node.style.setProperty('--actions-shift', `${Math.max(112 - x, Math.min(0, width - 112 - x))}px`);
        node.classList.toggle('actions-above', y > height - 96);
      }
    },
    dispose() {
      events.abort();
      viewer.dispose();
    },
  };
}

function mountProjectViewer(root, panel, listen) {
  const dialog = root.querySelector('.project-viewer');
  const frame = dialog.querySelector('iframe');
  const closeButton = dialog.querySelector('[data-viewer-close]');
  const title = dialog.querySelector('[data-viewer-title]');
  const repo = dialog.querySelector('[data-viewer-repo]');
  let returnFocus;
  listen(panel, 'click', (event) => {
    const link = event.target.closest('[data-project-view]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    returnFocus = link;
    title.textContent = link.dataset.projectName;
    repo.href = link.dataset.projectRepo;
    frame.title = `${link.dataset.projectName} — Web View`;
    frame.src = link.href;
    dialog.showModal();
    closeButton.focus();
  });
  listen(closeButton, 'click', () => dialog.close());
  listen(dialog, 'click', (event) => { if (event.target === dialog) dialog.close(); });
  listen(dialog, 'close', () => {
    frame.removeAttribute('src');
    returnFocus?.focus({ preventScroll: true });
  });
  return {
    get isOpen() { return dialog.open; },
    dispose() { if (dialog.open) dialog.close(); frame.removeAttribute('src'); },
  };
}

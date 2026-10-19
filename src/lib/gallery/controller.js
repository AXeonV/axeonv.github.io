import * as THREE from 'three';
import { createStarfield } from './starfield.js';
import { clamp01, smoothstep } from './resources.js';
import { mountProjectConstellation } from './projects.js';

// Starfield acceleration/fade duration in milliseconds; smaller means a quicker transition.
const WARP_DURATION = 1200;
const ARRIVAL_DURATION = 2600;

export function mountCosmicGallery(root) {
  const host = root.querySelector('.cosmic-canvas');
  const button = root.querySelector('.cosmic-enter');
  const status = root.querySelector('.cosmic-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(width < 640px)').matches;
  let renderer;
  let stars;
  let hole;
  let observer;
  let destroyed = false;
  let phase = 'starfield';
  let phaseTime = 0;
  let elapsed = 0;
  let previousTime = 0;
  let frame = 0;
  const events = new AbortController();
  const pointer = { x: 0, y: 0 };
  const projectUI = mountProjectConstellation(root);
  const dimensions = () => ({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight) });

  const setPhase = (value) => {
    phase = value;
    root.dataset.phase = value;
    root.setAttribute('aria-busy', String(value === 'warp' || value === 'arrival'));
  };
  const setVeil = (opacity) => root.style.setProperty('--veil-opacity', String(opacity));
  const showError = () => {
    root.dataset.error = 'true';
    status.textContent = root.dataset.errorText;
    status.classList.remove('visually-hidden');
    button.hidden = true;
    setVeil(0);
  };

  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.5));
    const size = dimensions();
    renderer.setSize(size.width, size.height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000002, 1);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);
    stars = createStarfield(renderer, { ...size, mobile });
  } catch (error) {
    console.error('Gallery renderer could not start.', error);
    dispose();
    showError();
    return dispose;
  }

  const resize = () => {
    if (destroyed) return;
    const { width, height } = dimensions();
    renderer.setSize(width, height, false);
    stars?.resize(width, height);
    hole?.resize(width, height);
    projectUI.resize(width, height);
  };
  observer = new ResizeObserver(resize);
  observer.observe(host);

  const enter = async () => {
    if (phase !== 'starfield') return;
    phaseTime = elapsed;
    setPhase('warp');
    button.disabled = true;
    status.textContent = root.dataset.enteringText;
    // Click/keyboard activation overrides the gentler hover speed.
    stars.setWarp(!reducedMotion);
    try {
      const { createColorhole } = await import('./colorhole.js');
      if (destroyed) return;
      hole = createColorhole(renderer, { ...dimensions(), mobile, controlElement: root, projectCount: projectUI.count, reducedMotion });
    } catch (error) {
      if (destroyed) return;
      console.error('Gallery destination could not load.', error);
      stars.setWarp(false);
      setPhase('starfield');
      button.disabled = false;
      setVeil(0);
      status.textContent = root.dataset.retryText;
    }
  };
  button.addEventListener('click', enter, { signal: events.signal });
  const hoverButton = (event) => {
    if (phase === 'starfield' && !reducedMotion && event.pointerType === 'mouse') stars.setHover(true);
  };
  const leaveButton = () => stars?.setHover(false);
  button.addEventListener('pointerenter', hoverButton, { signal: events.signal });
  button.addEventListener('pointerleave', leaveButton, { signal: events.signal });
  const movePointer = (event) => {
    const rect = host.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = 1 - ((event.clientY - rect.top) / rect.height) * 2;
  };
  const resetPointer = () => { pointer.x = 0; pointer.y = 0; };
  root.addEventListener('pointermove', movePointer, { signal: events.signal });
  root.addEventListener('pointerleave', resetPointer, { signal: events.signal });

  const render = (now) => {
    if (destroyed) return;
    if (projectUI.isViewing) {
      previousTime = now;
      frame = requestAnimationFrame(render);
      return;
    }
    const clockDelta = previousTime ? Math.max(0, (now - previousTime) / 1000) : 0;
    const delta = Math.min(clockDelta, 0.05);
    previousTime = now;
    elapsed += clockDelta * 1000;

    if (phase === 'warp') {
      const travelTime = elapsed - phaseTime;
      const duration = reducedMotion ? 200 : WARP_DURATION;
      setVeil(smoothstep(clamp01((travelTime / duration - 0.45) / 0.55)));
      if (travelTime >= duration && hole) {
        stars.dispose();
        stars = null;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        setPhase('arrival');
        phaseTime = elapsed;
        button.hidden = true;
      }
    }
    if (phase === 'arrival') {
      const arrivalTime = elapsed - phaseTime;
      const duration = reducedMotion ? 300 : ARRIVAL_DURATION;
      const progress = clamp01(arrivalTime / duration);
      // The core grows and brightens first; the disk unfolds after it reaches full size.
      const coreBrightness = hole.setEntrance(progress);
      setVeil(1 - coreBrightness);
      if (progress === 1) {
        setPhase('colorhole');
        status.textContent = root.dataset.arrivedText;
        root.focus({ preventScroll: true });
        projectUI.show();
      }
    }
    if (stars) {
      stars.render(delta, pointer);
    } else {
      hole.render(delta, elapsed / 1000, projectUI.state);
      if (phase === 'colorhole') projectUI.update(hole.getProjectPositions());
    }
    frame = requestAnimationFrame(render);
  };
  const resume = () => {
    if (destroyed || document.hidden || frame) return;
    previousTime = 0;
    frame = requestAnimationFrame(render);
  };
  function pause() { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
  const visibility = () => { document.hidden ? pause() : resume(); };
  const pageHide = (event) => { event.persisted ? pause() : dispose(); };
  const pageShow = (event) => { if (event.persisted) resume(); };
  document.addEventListener('visibilitychange', visibility, { signal: events.signal });
  window.addEventListener('pagehide', pageHide, { signal: events.signal });
  window.addEventListener('pageshow', pageShow, { signal: events.signal });
  resume();

  function dispose() {
    if (destroyed) return;
    destroyed = true;
    pause();
    events.abort();
    observer?.disconnect();
    stars?.dispose();
    hole?.dispose();
    projectUI.dispose();
    renderer?.dispose();
    renderer?.domElement.remove();
  }
  return dispose;
}

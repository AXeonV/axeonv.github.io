import * as THREE from 'three';
import { createStarfield } from './starfield.js';
import { clamp01, smoothstep } from './resources.js';

const WARP_DURATION = 2200;
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
  let destroyed = false;
  let phase = 'starfield';
  let phaseTime = 0;
  let elapsed = 0;
  let previousTime = 0;
  let frame = 0;
  const pointer = { x: 0, y: 0 };
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
    renderer?.dispose();
    showError();
    return () => {};
  }

  const resize = () => {
    if (destroyed) return;
    const { width, height } = dimensions();
    renderer.setSize(width, height, false);
    stars?.resize(width, height);
    hole?.resize(width, height);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);

  const enter = async () => {
    if (phase !== 'starfield') return;
    phaseTime = elapsed;
    setPhase('warp');
    button.disabled = true;
    status.textContent = root.dataset.enteringText;
    // Acceleration has exactly one trigger: this button's click/keyboard activation.
    stars.setWarp(!reducedMotion);
    try {
      const { createColorhole } = await import('./colorhole.js');
      if (destroyed) return;
      hole = createColorhole(renderer, { ...dimensions(), mobile });
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
  button.addEventListener('click', enter);
  const movePointer = (event) => {
    const rect = host.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = 1 - ((event.clientY - rect.top) / rect.height) * 2;
  };
  const resetPointer = () => { pointer.x = 0; pointer.y = 0; };
  root.addEventListener('pointermove', movePointer);
  root.addEventListener('pointerleave', resetPointer);

  const render = (now) => {
    if (destroyed) return;
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
      hole.setEntrance(smoothstep(progress));
      setVeil(1 - smoothstep(clamp01(arrivalTime / (reducedMotion ? 200 : 1000))));
      if (progress === 1) {
        setPhase('colorhole');
        status.textContent = root.dataset.arrivedText;
        root.focus({ preventScroll: true });
      }
    }
    if (stars) {
      stars.render(delta, elapsed / 1000, pointer);
      root.dataset.speed = stars.speed.toFixed(2);
    } else {
      hole.render(delta, elapsed / 1000);
      root.dataset.viewDistance = hole.viewDistance.toFixed(2);
      root.dataset.autoRotate = String(hole.autoRotate);
    }
    frame = requestAnimationFrame(render);
  };
  const resume = () => {
    if (destroyed || document.hidden || frame) return;
    previousTime = 0;
    frame = requestAnimationFrame(render);
  };
  const pause = () => { cancelAnimationFrame(frame); frame = 0; previousTime = 0; };
  const visibility = () => { document.hidden ? pause() : resume(); };
  const pageHide = (event) => { event.persisted ? pause() : dispose(); };
  const pageShow = (event) => { if (event.persisted) resume(); };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pageHide);
  window.addEventListener('pageshow', pageShow);
  resume();

  function dispose() {
    if (destroyed) return;
    destroyed = true;
    pause();
    observer.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pageHide);
    window.removeEventListener('pageshow', pageShow);
    button.removeEventListener('click', enter);
    root.removeEventListener('pointermove', movePointer);
    root.removeEventListener('pointerleave', resetPointer);
    stars?.dispose();
    hole?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  }
  return dispose;
}

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { disposeScene, smoothstep } from './resources.js';
import { randomStarfieldPalette } from './palettes.js';

const HOVER_SPEED = 10;
const WARP_SPEED = 100;
const SPEED_RESPONSE = 3.4;
const TILT_RESPONSE = 1.212;
const ZOOM_DURATION = 0.45; // Seconds to blend the streaks in/out.
const ZOOM_STRENGTH = 0.004;
const FIELD_WIDTH = 200;
const FIELD_DEPTH = 300;

const vertexShader = `
  const float FIELD_DEPTH = ${FIELD_DEPTH.toFixed(1)};
  uniform float uTravel;
  uniform float uPixelRatio;
  attribute vec3 color;
  attribute float size;
  varying vec3 vColor;
  void main() {
    vColor = color;
    vec3 p = vec3(position);
    p.z = mod(position.z + uTravel, FIELD_DEPTH) - FIELD_DEPTH * 0.5;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = size * uPixelRatio * (-50.0 / mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const fragmentShader = `
  uniform sampler2D uTexture;
  varying vec3 vColor;
  void main() {
    gl_FragColor = vec4(vColor, 1.0) * texture2D(uTexture, gl_PointCoord);
  }
`;

// Crossfade sharp stars into radial trails, using normalized sample weights.
const zoomShader = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0 },
    blend: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform float blend;
    varying vec2 vUv;
    void main() {
      vec4 original = texture2D(tDiffuse, vUv);
      if (blend <= 0.0001) {
        gl_FragColor = original;
        return;
      }
      const float SAMPLES = 40.0;
      vec3 weightedColor = vec3(0.0);
      float weightSum = 0.0;
      vec2 toCenter = vec2(0.5) - vUv;
      // Jitter sample positions to prevent visible bands in the trails.
      float jitter = fract(sin(dot(gl_FragCoord.xyz, vec3(12.9898, 78.233, 151.7182))) * 43758.5453);
      for (float i = 0.0; i < SAMPLES; i++) {
        float percent = (i + jitter) / SAMPLES;
        float weight = 4.0 * (percent - percent * percent);
        vec3 texel = texture2D(tDiffuse, vUv + toCenter * percent * strength).rgb;
        weightedColor += texel * weight;
        weightSum += weight;
      }
      gl_FragColor = vec4(mix(original.rgb, weightedColor / weightSum, blend), original.a);
    }
  `,
};

export function createStarfield(renderer, { width, height, mobile }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
  const count = mobile ? 20000 : 50000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const palette = randomStarfieldPalette();
  const color = new THREE.Color();
  const position = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    position.set(
      THREE.MathUtils.randFloatSpread(FIELD_WIDTH),
      THREE.MathUtils.randFloatSpread(FIELD_WIDTH),
      THREE.MathUtils.randFloatSpread(FIELD_DEPTH),
    );
    position.toArray(positions, i * 3);
    color.set(palette[THREE.MathUtils.randInt(0, palette.length - 1)]);
    color.toArray(colors, i * 3);
    sizes[i] = THREE.MathUtils.randFloat(5, 20);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  const texture = new THREE.TextureLoader().load('/gallery/star-sprite.png');
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTravel: { value: 0 },
      uTexture: { value: texture },
      uPixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader, fragmentShader,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const points = new THREE.Points(geometry, material);
  // Keep the rotation pivot at the field's center while placing it in front of the camera.
  points.position.z = -FIELD_DEPTH / 2;
  // Points wrap in the vertex shader; their CPU-side bounds must not cull the field.
  points.frustumCulled = false;
  scene.add(points);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const zoom = new ShaderPass(zoomShader);
  composer.addPass(zoom);
  zoom.enabled = false;
  // Bloom always remains the final pass, preserving its display output when zoom toggles.
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 2, 0, 0));
  let speed = 1;
  let hovered = false;
  let warping = false;
  let zoomProgress = 0;

  return {
    setHover(active) { hovered = active; },
    setWarp(active) { warping = active; },
    get speed() { return speed; },
    render(delta, pointer) {
      const targetSpeed = warping ? WARP_SPEED : hovered ? HOVER_SPEED : 1;
      const speedSmoothing = 1 - Math.exp(-delta * SPEED_RESPONSE);
      const tiltSmoothing = 1 - Math.exp(-delta * TILT_RESPONSE);
      speed = THREE.MathUtils.lerp(speed, targetSpeed, speedSmoothing);
      material.uniforms.uTravel.value += delta * speed * 4;
      const zoomDirection = warping ? 1 : -1;
      zoomProgress = THREE.MathUtils.clamp(zoomProgress + zoomDirection * delta / ZOOM_DURATION, 0, 1);
      const zoomBlend = smoothstep(zoomProgress);
      zoom.uniforms.blend.value = zoomBlend;
      zoom.uniforms.strength.value = zoomBlend * speed * ZOOM_STRENGTH;
      zoom.enabled = zoomProgress > 0;
      points.rotation.x = THREE.MathUtils.lerp(points.rotation.x, pointer.y * 0.05, tiltSmoothing);
      points.rotation.y = THREE.MathUtils.lerp(points.rotation.y, -pointer.x * 0.05, tiltSmoothing);
      composer.render(delta);
    },
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      material.uniforms.uPixelRatio.value = renderer.getPixelRatio();
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
    dispose() {
      texture.dispose();
      disposeScene(scene, composer);
    },
  };
}

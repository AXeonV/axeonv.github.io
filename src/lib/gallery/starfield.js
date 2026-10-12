import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { disposeScene } from './resources.js';
import { randomStarfieldPalette } from './palettes.js';

const HOVER_SPEED = 10;
const WARP_SPEED = 100;
// Higher values make the starfield reach WARP_SPEED sooner after clicking.
const WARP_ACCELERATION = 3.4;

// Particle shaders and flight motion retained from the supplied Starfield H5.
const vertexShader = `
  uniform float uTime;
  attribute vec3 color;
  attribute float size;
  varying vec4 vColor;
  void main() {
    vColor = vec4(color, 1.0);
    vec3 p = vec3(position);
    p.z = -150. + mod(position.z + uTime, 300.);
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = size * (-50.0 / mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;
const fragmentShader = `
  uniform sampler2D uTexture;
  varying vec4 vColor;
  void main() {
    gl_FragColor = vColor * texture2D(uTexture, gl_PointCoord);
  }
`;

// The original zoom blur pass, hosted locally instead of loading the Vue wrapper.
const zoomBlur = {
  uniforms: {
    tDiffuse: { value: null },
    center: { value: new THREE.Vector2(0.5, 0.5) },
    strength: { value: 0 },
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
    uniform vec2 center;
    uniform float strength;
    varying vec2 vUv;
    float random(vec3 scale, float seed) {
      return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
    }
    void main() {
      vec4 color = vec4(0.0);
      float total = 0.0;
      vec2 toCenter = center - vUv;
      float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);
      for (float t = 0.0; t <= 40.0; t++) {
        float percent = (t + offset) / 40.0;
        float weight = 4.0 * (percent - percent * percent);
        vec4 texel = texture2D(tDiffuse, vUv + toCenter * percent * strength);
        texel.rgb *= texel.a;
        color += texel * weight;
        total += weight;
      }
      gl_FragColor = color / total;
      gl_FragColor.rgb /= gl_FragColor.a + 0.00001;
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
    position.set(THREE.MathUtils.randFloatSpread(200), THREE.MathUtils.randFloatSpread(200), THREE.MathUtils.randFloatSpread(300));
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
    uniforms: { uTime: { value: 0 }, uTexture: { value: texture } },
    vertexShader, fragmentShader,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true,
  });
  const points = new THREE.Points(geometry, material);
  points.position.z = -150;
  // Points wrap in the vertex shader; their CPU-side bounds must not cull the field.
  points.frustumCulled = false;
  scene.add(points);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 2, 0, 0);
  composer.addPass(bloom);
  const zoom = new ShaderPass(zoomBlur);
  composer.addPass(zoom);
  let speed = 1;
  let targetSpeed = 1;
  let hovered = false;
  let warping = false;
  const updateTargetSpeed = () => { targetSpeed = warping ? WARP_SPEED : hovered ? HOVER_SPEED : 1; };

  return {
    setHover(active) { hovered = active; updateTargetSpeed(); },
    setWarp(active) { warping = active; updateTargetSpeed(); },
    get speed() { return speed; },
    render(delta, _elapsed, pointer) {
      const speedSmoothing = 1 - Math.exp(-delta * WARP_ACCELERATION);
      const tiltSmoothing = 1 - Math.exp(-delta * 1.212);
      speed = THREE.MathUtils.lerp(speed, targetSpeed, speedSmoothing);
      material.uniforms.uTime.value += delta * speed * 4;
      zoom.uniforms.strength.value = speed * 0.004;
      points.rotation.x = THREE.MathUtils.lerp(points.rotation.x, pointer.y * 0.05, tiltSmoothing);
      points.rotation.y = THREE.MathUtils.lerp(points.rotation.y, -pointer.x * 0.05, tiltSmoothing);
      composer.render(delta);
    },
    resize(width, height) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
    dispose() {
      texture.dispose();
      disposeScene(scene, composer);
    },
  };
}

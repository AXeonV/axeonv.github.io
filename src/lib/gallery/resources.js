export function disposeScene(scene, composer) {
  scene.traverse((object) => {
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => material.dispose());
  });
  composer.passes.forEach((pass) => pass.dispose?.());
  composer.dispose();
  scene.clear();
}

export const clamp01 = (value) => Math.min(1, Math.max(0, value));
export const smoothstep = (value) => value * value * (3 - 2 * value);

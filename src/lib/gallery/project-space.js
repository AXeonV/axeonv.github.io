import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { projectColor } from './project-colors.js';
import { clamp01, smoothstep } from './resources.js';

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const STAR_SIZE = 6;
const STAR_BRIGHTNESS = 1.8;
const STAR_REVEAL_DURATION = 1.2;
const LABEL_REVEAL_DELAY = STAR_REVEAL_DURATION;
const LABEL_REVEAL_DURATION = .75;
const CONNECTION_WIDTH = 3;

export function createProjectSpace({ scene, camera, texture, disk, diskRadius, occluder, count, width = 1, height = 1, reducedMotion = false }) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const view = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const ray = new THREE.Ray();
  const diskPoint = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  let revealTime = 0;
  let labelOpacity = 0;

  // One complete constellation surrounds the black hole. Positions stay in world space.
  const nodes = Array.from({ length: count }, (_, index) => {
    const color = new THREE.Color(projectColor(index));
    const star = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, color: color.clone().multiplyScalar(STAR_BRIGHTNESS), transparent: true,
      opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    const y = 1 - 2 * (index + .5) / count;
    const angle = index * GOLDEN_ANGLE;
    const spread = Math.sqrt(1 - y * y);
    const radius = 16 + Math.sin(index * 17.31) * 3.5;
    star.position.set(Math.cos(angle) * spread, y, Math.sin(angle) * spread).multiplyScalar(radius);
    star.scale.setScalar(STAR_SIZE);
    const geometry = new LineGeometry().setPositions(new Float32Array(9));
    const line = new Line2(geometry, new LineMaterial({
      color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
      linewidth: CONNECTION_WIDTH, worldUnits: false, resolution: new THREE.Vector2(width, height),
      depthWrite: false, fog: false,
    }));
    group.add(star, line);
    return { star, line, angle, intensity: 1.25 };
  });

  return {
    update({ visible, hovered }, delta) {
      group.visible = visible;
      if (!visible) {
        revealTime = labelOpacity = 0;
        return;
      }
      revealTime += delta;
      const starOpacity = reducedMotion ? 1 : smoothstep(clamp01(revealTime / STAR_REVEAL_DURATION));
      labelOpacity = reducedMotion ? 1 : smoothstep(clamp01((revealTime - LABEL_REVEAL_DELAY) / LABEL_REVEAL_DURATION));
      disk.updateWorldMatrix(true, false);
      nodes.forEach((node, index) => {
        const { star, line, angle } = node;
        const active = hovered === index;
        node.intensity = THREE.MathUtils.damp(node.intensity, active ? 1.9 : 1.25, 8, delta);
        star.material.opacity = node.intensity * starOpacity;
        star.scale.setScalar(THREE.MathUtils.damp(star.scale.x, active ? STAR_SIZE * 1.5 : STAR_SIZE, 8, delta));
        line.material.opacity = THREE.MathUtils.damp(line.material.opacity, active ? .85 : 0, 10, delta);
        line.visible = line.material.opacity > .005;
        if (!line.visible) return;
        diskPoint.set(Math.cos(angle) * diskRadius, Math.sin(angle) * diskRadius, 0).applyMatrix4(disk.matrixWorld);
        elbow.copy(star.position).lerp(diskPoint, .42);
        elbow.y += index % 2 ? 1.4 : -1.4;
        const { instanceStart, instanceEnd } = line.geometry.attributes;
        instanceStart.setXYZ(0, star.position.x, star.position.y, star.position.z);
        instanceEnd.setXYZ(0, elbow.x, elbow.y, elbow.z);
        instanceStart.setXYZ(1, elbow.x, elbow.y, elbow.z);
        instanceEnd.setXYZ(1, diskPoint.x, diskPoint.y, diskPoint.z);
        instanceStart.data.needsUpdate = true;
        line.geometry.computeBoundingBox();
        line.geometry.computeBoundingSphere();
      });
    },
    resize(width, height) {
      nodes.forEach(({ line }) => line.material.resolution.set(width, height));
    },
    project(height, projectToScreen) {
      const focalLength = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      return nodes.map(({ star }, index) => {
        view.copy(star.position).applyMatrix4(camera.matrixWorldInverse);
        const depth = -view.z;
        direction.copy(star.position).sub(camera.position).normalize();
        ray.set(camera.position, direction);
        const blocked = ray.intersectSphere(occluder, hit)
          && camera.position.distanceToSquared(hit) < camera.position.distanceToSquared(star.position);
        view.copy(star.position).project(camera);
        const point = projectToScreen({ x: (view.x + 1) / 2, y: (view.y + 1) / 2 });
        // Only the star's bright center is interactive, keeping nearby stars easy to select.
        const diameter = THREE.MathUtils.clamp(STAR_SIZE * focalLength / Math.max(depth, 1) * .4, 24, 56);
        return { index, ...point, depth, diameter, labelOpacity, visible: !blocked && depth > 2 && view.z < 1 };
      });
    },
  };
}

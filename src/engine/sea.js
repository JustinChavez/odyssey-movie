// The sea: one displaced plane, animated with layered travelling waves.
// heightAt(x, z, t) is the same math the renderer uses, so ships and rafts
// can ride the surface exactly where they stand.

import * as THREE from 'three';
import { noise1 } from './rng.js';

export function makeSea({
  size = 700, segs = 56,
  color = 0x0d1b2a, specular = 0x33506e, shininess = 26,
  wave = 1.0, seed = 31,
} = {}) {
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const baseX = new Float32Array(pos.count);
  const baseZ = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    baseX[i] = pos.getX(i);
    baseZ[i] = pos.getZ(i);
  }

  const mat = new THREE.MeshPhongMaterial({
    color, specular, shininess, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.position.y = 0;

  const A = [0.55, 0.4, 0.28, 0.14].map((a) => a * wave);

  function heightAt(x, z, t) {
    return (
      Math.sin(x * 0.055 + t * 0.85) * A[0] +
      Math.sin(z * 0.048 - t * 0.66) * A[1] +
      Math.sin((x + z) * 0.026 + t * 0.42) * A[2] +
      noise1(x * 0.018 + t * 0.12, seed) * A[3]
    );
  }

  const _y = new Float32Array(pos.count);

  return {
    mesh,
    heightAt,
    setColor(c) { mat.color.set(c); },
    setSpecular(c) { mat.specular.set(c); },
    update(t) {
      for (let i = 0; i < pos.count; i++) {
        _y[i] = heightAt(baseX[i], baseZ[i], t);
        // Write into the Y slot of each strided vertex — pos.array.set(_y)
        // would clobber the X coords and scramble the whole mesh.
        pos.array[i * 3 + 1] = _y[i];
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}

/** A calm, flat patch of water for inside the cave pool — no waves. */
export function makeStillWater({ size = 60, color = 0x12223a, specular = 0x2a4a72 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, 1, 1);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshPhongMaterial({ color, specular, shininess: 40 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return { mesh };
}

/** A soft white wake trail behind a ship — a stretched translucent plane. */
export function makeWake({ length = 26, width = 3.4 } = {}) {
  const geo = new THREE.PlaneGeometry(width, length, 4, 12);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshLambertMaterial({
    color: 0xd8e6ee, transparent: true, opacity: 0.16, depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  return {
    mesh,
    // The ship positions this plane behind itself; the wake only flutters.
    update(t) {
      mat.opacity = 0.14 + 0.05 * Math.sin(t * 3.1);
    },
  };
}

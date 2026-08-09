// Effects: glow textures, fire, smoke, embers, rain, lightning.
// All particle-ish things are Points or Sprites with a shared soft texture.

import * as THREE from 'three';
import { makeRng, noise1 } from '../engine/rng.js';

/** A soft radial gradient — the shared texture behind suns, fires, stars. */
export function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.28)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

/**
 * A campfire or a burning building: a cluster of flickering glow sprites plus
 * a flickering point light. update(t, dt) keeps the flame alive.
 */
export function makeFire({ x = 0, y = 0, z = 0, scale = 1, color = 0xff7a30, intensity = 1, seed = 3 }) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const glow = makeGlowTexture();
  const sprites = [];
  const rng = makeRng(seed);
  const n = 4;
  for (let i = 0; i < n; i++) {
    const m = new THREE.SpriteMaterial({
      map: glow, color, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, opacity: 0.85,
    });
    const s = new THREE.Sprite(m);
    const base = rng.range(1.6, 2.6) * scale;
    s.position.set(rng.range(-0.5, 0.5), rng.range(0.2, 1.1), rng.range(-0.5, 0.5));
    s.scale.setScalar(base);
    s.userData = { base, phase: rng.range(0, 10) };
    group.add(s);
    sprites.push(s);
  }
  const light = new THREE.PointLight(0xff7733, intensity * 60, 26 * scale, 2);
  light.position.y = 1.2 * scale;
  group.add(light);

  return {
    group, light,
    setIntensity(k) { intensity = k; },
    update(t, dt) {
      for (const s of sprites) {
        const u = s.userData;
        const f = 1 + 0.3 * noise1(t * 3.2 + u.phase, seed);
        s.scale.setScalar(u.base * f);
        s.material.opacity = 0.55 + 0.3 * noise1(t * 2.6 + u.phase * 2, seed + 5);
      }
      light.intensity = intensity * 60 * (1 + 0.32 * noise1(t * 5.1, seed + 9));
    },
  };
}

/** A column of smoke — points rising from an origin, fading with height. */
export function makeSmoke({
  origin = [0, 0, 0], count = 42, size = 4.5, opacity = 0.3,
  rise = 0.55, height = 16, spread = 0.35, seed = 1, color = 0x8a8a92,
} = {}) {
  const glow = makeGlowTexture();
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const rng = makeRng(seed);
  for (let i = 0; i < count; i++) {
    life[i] = rng.range(0, 1);
    pos[i * 3] = origin[0] + rng.range(-0.6, 0.6);
    pos[i * 3 + 1] = origin[1] + life[i] * height;
    pos[i * 3 + 2] = origin[2] + rng.range(-0.6, 0.6);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size, map: glow, color, transparent: true, opacity,
    depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.renderOrder = 2;

  return {
    points,
    update(t, dt) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        life[i] += dt * (rise / height) * (0.7 + (i % 5) * 0.15);
        if (life[i] > 1) {
          life[i] -= 1;
          p[i * 3] = origin[0] + rng.range(-0.6, 0.6);
          p[i * 3 + 2] = origin[2] + rng.range(-0.6, 0.6);
        }
        p[i * 3] += Math.sin(t * 0.9 + i * 1.7) * spread * dt;
        p[i * 3 + 2] += Math.cos(t * 0.7 + i * 2.3) * spread * dt;
        p[i * 3 + 1] = origin[1] + life[i] * height;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = opacity * (0.85 + 0.15 * Math.sin(t * 1.4));
    },
  };
}

/** Embers drifting up and away — the soul of a night fire. */
export function makeEmbers({
  count = 90, center = [0, 0], area = 24, height = 10, seed = 9, color = 0xffa34a, size = 1.7,
} = {}) {
  const glow = makeGlowTexture();
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const rng = makeRng(seed);
  const phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    phases[i] = rng.range(0, 20);
    pos[i * 3] = center[0] + rng.range(-area, area);
    pos[i * 3 + 1] = rng.range(0, height);
    pos[i * 3 + 2] = center[1] + rng.range(-area, area);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size, map: glow, color, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);
  points.renderOrder = 3;

  return {
    points,
    setOpacity(o) { mat.opacity = o; },
    update(t, dt) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        p[i * 3 + 1] += dt * (0.8 + phases[i] % 3 * 0.5);
        p[i * 3] += Math.sin(t * 1.1 + phases[i]) * dt * 1.4;
        p[i * 3 + 2] += Math.cos(t * 0.9 + phases[i]) * dt * 1.1;
        if (p[i * 3 + 1] > height) {
          p[i * 3 + 1] = 0;
          p[i * 3] = center[0] + rng.range(-area, area);
          p[i * 3 + 2] = center[1] + rng.range(-area, area);
        }
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

/** Rain — a fast-falling point cloud inside a box. */
export function makeRain({
  count = 500, extent = 130, yTop = 60, yBot = -2, seed = 5, color = 0x9db4cc, size = 0.9,
} = {}) {
  const glow = makeGlowTexture();
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const rng = makeRng(seed);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = rng.range(-extent, extent);
    pos[i * 3 + 1] = rng.range(yBot, yTop);
    pos[i * 3 + 2] = rng.range(-extent, extent);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    size, map: glow, color, transparent: true, opacity: 0.5,
    depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, mat);

  return {
    points,
    update(t, dt) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        p[i * 3 + 1] -= 42 * dt;
        if (p[i * 3 + 1] < yBot) p[i * 3 + 1] = yTop;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

/**
 * A lightning bolt: a jagged line that snaps in and out, plus a flash light.
 * Returns { group, flash(strength), update(t) } — flash() triggers it.
 */
export function makeLightning({ x = 0, y = 0, z = 0, from = [0, 40, 0], seed = 12 } = {}) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  const rng = makeRng(seed);
  const pts = [new THREE.Vector3(...from)];
  const segs = 12;
  const step = 4;
  for (let i = 1; i < segs; i++) {
    pts.push(new THREE.Vector3(
      from[0] + rng.range(-1, 1) * step * 0.4 * i,
      from[1] - (from[1] / segs) * i,
      from[2] + rng.range(-1, 1) * step * 0.4 * i,
    ));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({
    color: 0xdff0ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
  });
  const line = new THREE.Line(geo, mat);
  group.add(line);
  const flash = new THREE.PointLight(0xaac4ff, 0, 400, 1.4);
  group.add(flash);

  let timer = 0;
  return {
    group,
    flash(strength = 1) {
      mat.opacity = 0.95;
      flash.intensity = 220 * strength;
      timer = 0.22;
    },
    update(t, dt) {
      if (timer > 0) {
        timer -= dt;
        if (timer <= 0) { mat.opacity = 0; flash.intensity = 0; }
      }
    },
  };
}

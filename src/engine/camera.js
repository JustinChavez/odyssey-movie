// Camera moves.
//
// One move = one continuous gesture. The whole move gets ONE easing across its
// whole length, so the camera accelerates once, holds a constant speed, and
// decelerates once. Waypoints, when present, only bend the path — they never
// break the timing.

import * as THREE from 'three';
import { clamp01, lerp, linearRamp } from './ease.js';
import { noise1 } from './rng.js';

/** The house default: short ramp in, long constant middle, ramp out. */
export const GLIDE = linearRamp(0.16, 0.22);
/** For a move that should already be running when we cut to it. */
export const RUNNING = linearRamp(0.02, 0.28);
/** For a move that should still be running when we cut away from it. */
export const CONTINUING = linearRamp(0.2, 0.02);
/** Dead constant speed — cut in and out mid-move. */
export const CONSTANT = (t) => clamp01(t);

export function makeCamera({ fov = 40, near = 0.05, far = 2200 } = {}) {
  return new THREE.PerspectiveCamera(fov, 16 / 9, near, far);
}

const v3 = (a) => new THREE.Vector3().fromArray(a);

/**
 * from/to      camera position at the start and end of the shot
 * via          optional bend points; the path arcs through them
 * look/lookTo  what the camera is aimed at, start and end
 * fov          number, or [start, end]
 * roll         number, or [start, end] — radians of dutch
 * ease         one of the presets above
 * handheld     metres of drift; 0 for locked-off
 */
export function makeMove(camera, duration, {
  from, to = null, via = null,
  look, lookTo = null, lookVia = null,
  fov = null, roll = null, ease = GLIDE,
  handheld = 0, handheldFreq = 0.45, seed = 1,
} = {}) {
  const p0 = v3(from);
  const p1 = to ? v3(to) : p0.clone();
  const posCurve = via && via.length
    ? new THREE.CatmullRomCurve3([p0, ...via.map(v3), p1], false, 'catmullrom', 0.5)
    : null;

  const l0 = v3(look);
  const l1 = lookTo ? v3(lookTo) : l0.clone();
  const lookCurve = lookVia && lookVia.length
    ? new THREE.CatmullRomCurve3([l0, ...lookVia.map(v3), l1], false, 'catmullrom', 0.5)
    : null;

  const fovA = Array.isArray(fov) ? fov[0] : fov;
  const fovB = Array.isArray(fov) ? fov[1] : fov;
  const rollA = Array.isArray(roll) ? roll[0] : (roll ?? 0);
  const rollB = Array.isArray(roll) ? roll[1] : (roll ?? 0);

  if (fovA != null) { camera.fov = fovA; camera.updateProjectionMatrix(); }

  const _p = new THREE.Vector3();
  const _l = new THREE.Vector3();

  return {
    lookTarget: null,
    update(t) {
      const u = ease(clamp01(duration > 0 ? t / duration : 0));
      if (posCurve) posCurve.getPointAt(u, _p);
      else _p.lerpVectors(p0, p1, u);

      if (handheld > 0) {
        _p.x += noise1(t * handheldFreq, seed) * handheld;
        _p.y += noise1(t * handheldFreq * 1.27 + 11, seed + 3) * handheld * 0.85;
        _p.z += noise1(t * handheldFreq * 0.83 + 23, seed + 9) * handheld * 0.7;
      }
      camera.position.copy(_p);

      if (this.lookTarget) _l.copy(this.lookTarget);
      else if (lookCurve) lookCurve.getPointAt(u, _l);
      else _l.lerpVectors(l0, l1, u);
      camera.lookAt(_l);

      const r = lerp(rollA, rollB, u);
      if (r) camera.rotateZ(r);

      if (fovA != null) {
        const f = lerp(fovA, fovB, u);
        if (f !== camera.fov) { camera.fov = f; camera.updateProjectionMatrix(); }
      }
    },
  };
}

/**
 * A held frame — the default for a shot. Most of a film is locked off, with
 * the interest coming from what happens inside the frame, not from the camera
 * wandering around.
 *
 * `drift` is a centimetre or two of noise: not a move, just enough that the
 * frame doesn't read as a still. `push` creeps a few centimetres along the
 * view axis over the whole shot.
 */
export function makeHold(camera, duration, {
  at, look, fov = null, drift = 0.012, driftFreq = 0.15, seed = 1, push = 0, ease = GLIDE,
} = {}) {
  const p0 = v3(at);
  const target = v3(look);
  const dir = target.clone().sub(p0).normalize();

  const fovA = Array.isArray(fov) ? fov[0] : fov;
  const fovB = Array.isArray(fov) ? fov[1] : fov;
  if (fovA != null) { camera.fov = fovA; camera.updateProjectionMatrix(); }

  const _p = new THREE.Vector3();

  return {
    lookTarget: null,
    update(t) {
      const u = ease(clamp01(duration > 0 ? t / duration : 0));
      _p.copy(p0);
      if (push) _p.addScaledVector(dir, push * u);
      if (drift > 0) {
        _p.x += noise1(t * driftFreq, seed) * drift;
        _p.y += noise1(t * driftFreq * 1.2 + 7, seed + 3) * drift * 0.7;
        _p.z += noise1(t * driftFreq * 0.9 + 19, seed + 9) * drift * 0.6;
      }
      camera.position.copy(_p);
      camera.lookAt(this.lookTarget || target);
      if (fovA != null) {
        const f = lerp(fovA, fovB, u);
        if (f !== camera.fov) { camera.fov = f; camera.updateProjectionMatrix(); }
      }
    },
  };
}

/** Points along a circular arc — feed to `via` for an orbit. */
export function arcPoints(center, radius, a0, a1, y, n = 3) {
  const pts = [];
  for (let i = 1; i <= n; i++) {
    const a = lerp(a0, a1, i / (n + 1));
    pts.push([center[0] + Math.cos(a) * radius, y, center[2] + Math.sin(a) * radius]);
  }
  return pts;
}

/** Position on a circle — handy for authoring orbit start/end points. */
export function onArc(center, radius, angle, y) {
  return [center[0] + Math.cos(angle) * radius, y, center[2] + Math.sin(angle) * radius];
}

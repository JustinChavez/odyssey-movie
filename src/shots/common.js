// Shared scaffolding for shots: scene setup and the sequence wrapper.
//
// A sequence is ONE world, cut several times. Building a world costs time, so
// a shot is NOT a scene: a sequence builds its world once and hands it to a
// run of shots that each bring their own camera. Cutting between angles then
// costs nothing, which is what lets the film hold a four-second average.

import * as THREE from 'three';
import { installSky } from '../engine/sky.js';
import TIMING from '../timing.js';

/** A scene + sky + camera, ready to dress. */
export function newScene(ctx, preset = 'day', { fov = 38 } = {}) {
  const scene = new THREE.Scene();
  const sky = installSky(scene, preset, { shadowExtent: 90 });
  const camera = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 2200);
  return { scene, sky, camera };
}

/**
 * Fallback caption placement: spread `spec.lines` across the shot in
 * proportion to how long each takes to say.
 */
function authoredCaptions(spec, dur) {
  if (spec.lines) {
    const w = spec.lines.map((s) => s.replace(/<[^>]+>/g, '').length);
    const total = w.reduce((a, b) => a + b, 0) || 1;
    const out = [];
    let t = 0.2;
    const span = dur - 0.5;
    spec.lines.forEach((text, i) => {
      const d = (w[i] / total) * span;
      out.push([+t.toFixed(3), +(t + d).toFixed(3), text]);
      t += d;
    });
    return out;
  }
  if (spec.caption) return [[spec.capIn ?? 0.2, dur - (spec.capOut ?? 0.25), spec.caption]];
  return [];
}

/**
 * A sequence: one scene, cut several times.
 * `build(ctx)` returns `{ scene, ambient?(seqTime, dt), ... }`. Anything else
 * on that object is passed straight through to the shots.
 * Each shot's `make(S, duration, startWithinSequence)` returns
 * `{ camera, update(localT, dt, seqT) }`. Ambient animation runs on seqT, so
 * waves, fire and weather keep going across the cuts instead of snapping back.
 */
export function sequence(id, build, specs) {
  let S = null;
  let offset = 0;
  return specs.map((spec, i) => {
    const shotId = `${id}${String.fromCharCode(97 + i)}`;
    const authoredStart = offset;
    const authoredDur = spec.duration;
    // The film is cut to the narration: stretch the shot so its line always
    // finishes, with a beat of silence after. The sequence is time-warped
    // rather than re-choreographed — seasons, storms and camera moves keep
    // their shape and simply play at the narration's pace.
    const clip = TIMING[shotId] || 0;
    const realDur = Math.max(authoredDur, clip + 0.45);
    const warp = authoredDur / realDur;
    offset += realDur;

    return {
      id: shotId,
      title: spec.title || id,
      duration: realDur,
      // Shots inside a sequence hard-cut by default; a fadeIn opts out.
      cut: !spec.fadeIn,
      fadeIn: spec.fadeIn ?? 0,
      fadeOut: spec.fadeOut ?? 0,
      captions: spec.captions ?? authoredCaptions(spec, realDur),

      build(ctx) {
        if (!S) S = build(ctx);
        const shot = spec.make(S, authoredDur, authoredStart);
        return {
          scene: S.scene,
          camera: shot.camera,
          update(tReal, dtReal) {
            const tA = tReal * warp;
            const dtA = dtReal * warp;
            const seqT = authoredStart + tA;
            if (S.ambient) S.ambient(seqT, dtA);
            shot.update(tA, dtA, seqT);
          },
        };
      },
    };
  });
}

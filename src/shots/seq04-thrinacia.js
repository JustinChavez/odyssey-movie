// SEQUENCE 4 — Thrinacia, the island of the Sun's cattle.
//
// "…for they perished through their own sheer folly in eating the cattle of
// the Sun-god Apollo" — a golden island at dusk, red cattle grazing, and the
// men at their campfire roasting what they should never have touched.

import { makeRng } from '../engine/rng.js';
import { makeCamera, makeMove, makeHold, CONTINUING } from '../engine/camera.js';
import { sequence, newScene } from './common.js';
import { makeSea } from '../engine/sea.js';
import { makeIsland, makeCattle, makeSlainCattle, makeFigure, makeTree, makeRock } from '../world/figures.js';
import { makeFire, makeSmoke, makeEmbers } from '../world/fx.js';

export function seq04() {
  return sequence('thrinacia', (ctx) => {
    const rng = makeRng(4004);
    const { scene, sky } = newScene(ctx, 'gold', { fov: 42 });

    const sea = makeSea({ size: 800, segs: 44, color: 0x1a2030, specular: 0x8a6a3a, wave: 0.5, seed: 66 });
    scene.add(sea.mesh);

    const island = makeIsland({
      radius: 26, seed: 13, height: 5,
      sand: 0xd8c07a, green: 0x8a7a3a, rock: 0x6a5a38,
    });
    island.mesh.position.set(0, 0, 0);
    scene.add(island.group);
    const onI = (x, z) => island.heightAt(x, z);

    // The cattle: a docile herd.
    const cattle = [];
    for (let i = 0; i < 8; i++) {
      const c = makeCattle({ rng: rng.fork(i), scale: rng.range(0.95, 1.25), color: 0x9c3b2a });
      const a = rng.range(0, Math.PI * 2);
      const r = rng.range(8, 20);
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      c.root.position.set(cx, onI(cx, cz), cz);
      c.root.rotation.y = rng.range(0, Math.PI * 2);
      scene.add(c.root);
      cattle.push(c);
    }

    // The folly: a fire, spitted cattle, and the men feasting.
    const fire = makeFire({ x: 2, y: onI(2, 3) + 0.2, z: 3, scale: 1.15, seed: 21 });
    scene.add(fire.group);
    const smoke = makeSmoke({ origin: [2, onI(2, 3) + 2.2, 3], count: 30, size: 4.5, opacity: 0.3, height: 13, seed: 22 });
    scene.add(smoke.points);
    const embers = makeEmbers({ count: 70, center: [2, 3], area: 7, height: 6, seed: 23 });
    scene.add(embers.points);

    const slain = [];
    for (let i = 0; i < 2; i++) {
      const s = makeSlainCattle({ rng: rng.fork(40 + i), scale: 1.0 });
      const a = rng.range(-0.6, 0.6) + Math.PI * (i === 0 ? 0 : 1);
      s.root.position.set(2 + Math.cos(a) * 3.4, onI(2 + Math.cos(a) * 3.4, 3 + Math.sin(a) * 3.4), 3 + Math.sin(a) * 3.4);
      scene.add(s.root);
      slain.push(s);
    }

    // The men.
    const men = [];
    const menRng = rng.fork(9);
    for (let i = 0; i < 4; i++) {
      const fig = makeFigure({
        rng: menRng.fork(i), height: menRng.range(1.6, 1.75),
        tunic: menRng.pick([0x7a4a3a, 0x5a5a4a, 0x6a3a3a]), hair: 0x241a12, beard: menRng.chance(0.5),
        skin: 0xc8a888,
      });
      const a = rng.range(0, Math.PI * 2);
      const fx = 2 + Math.cos(a) * 3.0, fz = 3 + Math.sin(a) * 3.0;
      fig.root.position.set(fx, onI(fx, fz), fz);
      fig.root.rotation.y = Math.atan2(2 - fx, 3 - fz); // facing the fire
      scene.add(fig.root);
      men.push(fig);
    }
    for (let i = 0; i < 2; i++) {
      const fig = makeFigure({
        rng: menRng.fork(20 + i), height: 1.6, pose: 'sit',
        tunic: 0x6a4a3a, hair: 0x241a12, beard: true, skin: 0xc8a888,
      });
      const a = rng.range(0, Math.PI * 2);
      const fx = 2 + Math.cos(a) * 2.2, fz = 3 + Math.sin(a) * 2.2;
      fig.root.position.set(fx, onI(fx, fz), fz);
      fig.root.rotation.y = Math.atan2(2 - fx, 3 - fz);
      scene.add(fig.root);
      men.push(fig);
    }

    // A few olive trees and rocks.
    for (let i = 0; i < 4; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(13, 22);
      const t = makeTree({ kind: 'olive', scale: rng.range(0.8, 1.3), seed: i + 70 });
      const tx = Math.cos(a) * r, tz = Math.sin(a) * r;
      t.position.set(tx, onI(tx, tz), tz);
      scene.add(t);
    }
    for (let i = 0; i < 6; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(4, 23);
      const rock = makeRock({ scale: rng.range(0.5, 1.1), seed: i + 80 });
      const rx = Math.cos(a) * r, rz = Math.sin(a) * r;
      rock.position.set(rx, onI(rx, rz), rz);
      scene.add(rock);
    }

    return {
      scene, sky, sea,
      ambient(seqT, dt) {
        sea.update(seqT);
        sky.update(seqT);
        fire.update(seqT, dt);
        smoke.update(seqT, dt);
        embers.update(seqT, dt);
        for (const c of cattle) c.update(seqT, dt);
        for (const f of men) f.update(seqT, dt, { walkPhase: seqT * 0.7, stride: 0.12 });
      },
    };
  }, [
    {
      duration: 4.41, fadeIn: 1.2,
      title: 'The island of the Sun',
      caption: 'but do what he might he could not save his men,',
      make(S, dur) {
        const camera = makeCamera({ fov: 44 });
        const move = makeMove(camera, dur, {
          from: [34, 22, 42], to: [-6, 9, 14],
          look: [0, 1, 0], lookTo: [2, 1.6, 3],
          fov: [44, 41], ease: CONTINUING, handheld: 0.05, handheldFreq: 0.3, seed: 5,
        });
        return { camera, update: (t) => move.update(t) };
      },
    },
    {
      duration: 4.6,
      title: 'The feast',
      caption: 'for they perished through their own sheer folly',
      make(S, dur) {
        const camera = makeCamera({ fov: 40 });
        const hold = makeHold(camera, dur, {
          at: [6.5, 2.2, 11],
          look: [2, 1.8, 3],
          fov: 40, drift: 0.016, seed: 11,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
    {
      duration: 4.2,
      title: 'The Sun-god watches',
      caption: 'in eating the cattle of the Sun-god Apollo;',
      make(S, dur) {
        const camera = makeCamera({ fov: 32 });
        const hold = makeHold(camera, dur, {
          at: [12, 4.5, 18],
          look: [-2, 2.6, -20],
          fov: 32, drift: 0.012, seed: 17,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
  ]);
}

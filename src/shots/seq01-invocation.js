// SEQUENCE 1 — "Tell me, O Muse…"
//
// A night sea, a moon, and a lone figure on a headland with a small fire —
// the bard himself, about to begin. One aerial move to establish the breadth
// of the dark, then a held frame on the fire.

import { makeRng } from '../engine/rng.js';
import { makeCamera, makeMove, makeHold, CONTINUING } from '../engine/camera.js';
import { sequence, newScene } from './common.js';
import { makeSea } from '../engine/sea.js';
import { makeFigure, makeIsland } from '../world/figures.js';
import { makeFire, makeEmbers } from '../world/fx.js';

export function seq01() {
  return sequence('invocation', (ctx) => {
    const rng = makeRng(1001);
    const { scene, sky } = newScene(ctx, 'night', { fov: 42 });

    const sea = makeSea({ size: 800, segs: 48, color: 0x0b1526, specular: 0x27405e, wave: 0.7, seed: 31 });
    scene.add(sea.mesh);

    // The headland, off to the west.
    const island = makeIsland({
      radius: 34, seed: 7, height: 10,
      sand: 0x2e2a24, green: 0x2c362c, rock: 0x3a342c,
    });
    island.mesh.position.set(-95, 0, -70);
    scene.add(island.group);
    const onI = (x, z) => {
      const lx = x + 95, lz = z + 70;
      return island.heightAt(lx, lz);
    };

    // The bard and his fire, on the seaward point.
    const fire = makeFire({ x: -84, y: onI(-84, -58) + 0.15, z: -58, scale: 1.0, seed: 11 });
    scene.add(fire.group);
    const embers = makeEmbers({ count: 46, center: [-84, -58], area: 5, height: 5.5, seed: 12 });
    scene.add(embers.points);

    const bard = makeFigure({
      rng: rng.fork(3), height: 1.7, pose: 'sit',
      tunic: 0x4a3a2a, cloak: 0x241e30, hair: 0x3a3228,
      beard: true, staff: true, skin: 0xc8a888,
    });
    bard.root.position.set(-88, onI(-88, -60), -60);
    bard.root.rotation.y = 0.7; // facing the sea
    scene.add(bard.root);

    return {
      scene, sky, sea,
      ambient(seqT, dt) {
        sea.update(seqT);
        sky.update(seqT);
        fire.update(seqT, dt);
        embers.update(seqT, dt);
        bard.update(seqT, dt, { walkPhase: seqT * 0.5, stride: 0.18 });
      },
    };
  }, [
    {
      duration: 4.97, fadeIn: 1.6,
      title: 'The wine-dark sea',
      caption: 'Tell me, O Muse, of that ingenious hero',
      make(S, dur) {
        const camera = makeCamera({ fov: 46 });
        const move = makeMove(camera, dur, {
          from: [46, 26, 98], to: [-34, 12, 28],
          look: [-88, 4, -62], lookTo: [-85, 5.2, -57],
          fov: [46, 42], ease: CONTINUING, handheld: 0.05, handheldFreq: 0.25, seed: 4,
        });
        return { camera, update: (t) => move.update(t) };
      },
    },
    {
      duration: 5.0,
      title: 'The bard by his fire',
      caption: 'who traveled far and wide after he had sacked the famous town of Troy.',
      make(S, dur) {
        const camera = makeCamera({ fov: 40 });
        const hold = makeHold(camera, dur, {
          at: [-58, 10.5, -26],
          look: [-85, 5.4, -57],
          fov: 40, drift: 0.02, seed: 12,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
  ]);
}

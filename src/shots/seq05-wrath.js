// SEQUENCE 5 — The wrath of the Sun-god.
//
// "so the god prevented them from ever reaching home" — the sky turns to
// burning gold, and a bolt falls from the sun onto the mast. The strike
// times are exported so the audio track can lay thunder under them.

import { makeRng } from '../engine/rng.js';
import { makeCamera, makeMove, makeHold, CONTINUING } from '../engine/camera.js';
import { clamp01 } from '../engine/ease.js';
import { sequence, newScene } from './common.js';
import { makeSea } from '../engine/sea.js';
import { makeShip } from '../world/ship.js';
import { makeLightning, makeFire, makeSmoke } from '../world/fx.js';

export const STRIKES = [0.7, 2.9];

export function seq05() {
  return sequence('wrath', (ctx) => {
    const rng = makeRng(5005);
    const { scene, sky } = newScene(ctx, 'gold', { fov: 42 });

    const sea = makeSea({ size: 800, segs: 50, color: 0x161a22, specular: 0x5a3a22, wave: 1.3, seed: 77 });
    scene.add(sea.mesh);

    const ship = makeShip({ rng: rng.fork(2), scale: 1, crew: 4, oars: 8 });
    scene.add(ship.group);

    // Deck fire + smoke, hidden until the first strike.
    const deckFire = makeFire({ x: 0.6, y: 1.5, z: 0, scale: 0.9, seed: 8 });
    deckFire.group.visible = false;
    ship.group.add(deckFire.group);
    const deckSmoke = makeSmoke({ origin: [0.6, 2.6, 0], count: 20, size: 4.5, opacity: 0.32, height: 14, seed: 9 });
    deckSmoke.points.visible = false;
    ship.group.add(deckSmoke.points);

    // The bolts fall from the sun (which hangs in -z) onto the mast.
    const bolt1 = makeLightning({ x: 0, y: 0, z: 0, from: [-7, 26, -10], seed: 12 });
    scene.add(bolt1.group);
    const bolt2 = makeLightning({ x: 0, y: 0, z: 0, from: [-3, 26, 0], seed: 15 });
    scene.add(bolt2.group);

    return {
      scene, sky, sea, ship, deckFire, deckSmoke, bolt1, bolt2,
      ambient(seqT, dt) {
        sea.update(seqT);
        sky.blend('gold', 'storm', clamp01((seqT - 1.2) / 5.5));
        sky.update(seqT);
        ship.group.position.set(-6 + seqT * 0.6, 0, -4);
        ship.update(seqT, dt, sea);
        deckFire.update(seqT, dt);
        deckSmoke.update(seqT, dt);
        bolt1.update(seqT, dt);
        bolt2.update(seqT, dt);
      },
    };
  }, [
    {
      duration: 3.37, fadeIn: 1.2,
      title: 'The burning sky',
      caption: 'so the god prevented them',
      make(S, dur) {
        const camera = makeCamera({ fov: 42 });
        const hold = makeHold(camera, dur, {
          at: [15, 6.5, 17],
          look: [-2, 3.5, -4],
          fov: 42, drift: 0.018, push: 0.8, seed: 4,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
    {
      duration: 3.71,
      title: 'The bolt',
      caption: 'from ever reaching home.',
      make(S, dur) {
        const camera = makeCamera({ fov: 38 });
        const move = makeMove(camera, dur, {
          from: [10, 4.4, 11], to: [5, 4.0, 7],
          look: [-2, 4.5, -4], lookTo: [0, 4.0, -4],
          fov: 38, ease: CONTINUING, handheld: 0.05, handheldFreq: 0.4, seed: 9,
        });
        let struck = 0;
        return {
          camera,
          update(t, dt, seqT) {
            for (let i = 0; i < STRIKES.length; i++) {
              const st = STRIKES[i];
              if (t >= st && !(struck & (1 << i))) {
                struck |= 1 << i;
                (i === 0 ? S.bolt1 : S.bolt2).flash(1.3);
                S.ship.setTip(i === 0 ? 0.35 : 0.6);
                S.deckFire.group.visible = true;
                S.deckSmoke.points.visible = true;
              }
            }
            move.update(t);
          },
        };
      },
    },
  ]);
}

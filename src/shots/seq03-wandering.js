// SEQUENCE 3 — The wanderings.
//
// "Moreover he suffered much by sea…" — a bright day, a trireme rowing through
// an archipelago, little white cities on the islands. The ship sails a fixed
// course; the cameras ride with it.

import * as THREE from 'three';
import { makeRng } from '../engine/rng.js';
import { makeCamera, makeMove, CONTINUING } from '../engine/camera.js';
import { sequence, newScene } from './common.js';
import { makeSea } from '../engine/sea.js';
import { makeShip } from '../world/ship.js';
import { makeIsland, makeColumn, makeFigure } from '../world/figures.js';

export function seq03() {
  return sequence('wandering', (ctx) => {
    const rng = makeRng(3003);
    const { scene, sky } = newScene(ctx, 'day', { fov: 42 });

    const sea = makeSea({ size: 900, segs: 52, color: 0x1c4a6e, specular: 0x4a7aa0, wave: 0.9, seed: 55 });
    scene.add(sea.mesh);

    // The archipelago. Each island gets a few white boxes and columns.
    const specs = [
      [-70, -40, 16, 4], [60, -30, 22, 5], [10, -95, 14, 3],
      [-30, 70, 18, 4.5], [85, 55, 13, 3], [-95, 30, 12, 3],
    ];
    const islands = [];
    for (const [ix, iz, r, h] of specs) {
      const isl = makeIsland({ radius: r, seed: rng.int(1, 999), height: h, sand: 0xd8c07a, green: 0x7a8a5a });
      isl.mesh.position.set(ix, 0, iz);
      scene.add(isl.group);
      islands.push(isl);
      // A tiny city on the summit.
      const irng = rng.fork(ix + iz);
      const n = irng.int(2, 4);
      for (let i = 0; i < n; i++) {
        const lx = irng.range(-r * 0.4, r * 0.4), lz = irng.range(-r * 0.4, r * 0.4);
        const hy = isl.heightAt(lx, lz);
        if (hy < h * 0.45) continue;
        const wx = ix + lx, wz = iz + lz;
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, irng.range(1.4, 2.2), 1.4),
          new THREE.MeshLambertMaterial({ color: 0xe8e0cc, flatShading: true }),
        );
        box.position.set(wx, hy + 1.0, wz);
        box.castShadow = true;
        scene.add(box);
        const col = makeColumn({ h: 1.6, r: 0.16 });
        col.position.set(wx + 0.9, hy, wz);
        scene.add(col);
      }
    }

    // The ship: sails +x at 8 units/s, z fixed.
    const ship = makeShip({ rng: rng.fork(9), scale: 1, crew: 6, oars: 10 });
    scene.add(ship.group);
    const shipPos = new THREE.Vector3(-70, 0, -12);
    ship.group.position.copy(shipPos);
    ship.group.rotation.y = 0; // nose already points +x

    // A helmsman at the stern.
    const helm = makeFigure({
      rng: rng.fork(12), height: 1.6, pose: 'stand',
      tunic: 0x6a4a3a, hair: 0x241a12, beard: true, skin: 0xc8a888,
    });
    helm.root.position.set(-3.0, 0.9, 0);
    ship.group.add(helm.root);

    return {
      scene, sky, sea, shipPos,
      ambient(seqT, dt) {
        sea.update(seqT);
        sky.update(seqT);
        shipPos.set(-70 + seqT * 8, 0, -12);
        ship.group.position.copy(shipPos);
        ship.update(seqT, dt, sea);
        helm.update(seqT, dt, { walkPhase: seqT * 0.6, stride: 0.15 });
      },
    };
  }, [
    {
      duration: 4.73, fadeIn: 1.2,
      title: 'Through the islands',
      caption: 'Moreover he suffered much by sea',
      make(S, dur) {
        const camera = makeCamera({ fov: 44 });
        const move = makeMove(camera, dur, {
          from: [-72, 26, 18], to: [-32, 15, 6],
          look: [-60, 0, -12], lookTo: [-30, 0, -12],
          fov: [44, 41], ease: CONTINUING, handheld: 0.04, handheldFreq: 0.3, seed: 3,
        });
        move.lookTarget = S.shipPos;
        return { camera, update: (t) => move.update(t) };
      },
    },
    {
      duration: 4.01,
      title: 'At the oars',
      caption: 'while trying to save his own life',
      make(S, dur) {
        const camera = makeCamera({ fov: 40 });
        const move = makeMove(camera, dur, {
          from: [-66, 4.6, -2], to: [-28, 4.9, -2],
          look: [-62, 2.2, -12], lookTo: [-34, 2.2, -12],
          fov: 40, ease: CONTINUING, handheld: 0.05, handheldFreq: 0.35, seed: 8,
        });
        move.lookTarget = S.shipPos;
        return { camera, update: (t) => move.update(t) };
      },
    },
    {
      duration: 4.4,
      title: 'The prow',
      caption: 'and bring his men safely home;',
      make(S, dur) {
        const camera = makeCamera({ fov: 38 });
        const move = makeMove(camera, dur, {
          from: [-62, 3.6, -20], to: [-30, 3.9, -20],
          look: [-58, 1.5, -12], lookTo: [-26, 1.5, -12],
          fov: 38, ease: CONTINUING, handheld: 0.06, handheldFreq: 0.3, seed: 14,
        });
        move.lookTarget = S.shipPos;
        return { camera, update: (t) => move.update(t) };
      },
    },
  ]);
}

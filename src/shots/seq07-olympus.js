// SEQUENCE 7 — The council on Olympus.
//
// "But as years went by, there came a time when the gods settled that he
// should go back to Ithaca" — a marble hall on a cloud platform; Zeus
// enthroned, Athena before him pleading the hero's case, a herald standing by.

import * as THREE from 'three';
import { makeRng } from '../engine/rng.js';
import { makeCamera, makeMove, makeHold, CONTINUING } from '../engine/camera.js';
import { sequence, newScene } from './common.js';
import { makeColumn, makeThrone, makeGod, makeFigure } from '../world/figures.js';

export function seq07() {
  return sequence('olympus', (ctx) => {
    const rng = makeRng(7007);
    const { scene, sky } = newScene(ctx, 'olympus', { fov: 42 });
    const LAM = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });

    // The cloud platform.
    const cloudM = LAM(0xf4f6f8, { transparent: true, opacity: 0.96 });
    const platform = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), cloudM);
    platform.scale.set(30, 2.2, 24);
    platform.position.y = -1.5;
    platform.receiveShadow = true;
    scene.add(platform);
    for (let i = 0; i < 8; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), cloudM);
      const a = (i / 8) * Math.PI * 2;
      puff.scale.set(rng.range(5, 10), rng.range(0.8, 1.6), rng.range(4, 8));
      puff.position.set(Math.cos(a) * rng.range(16, 30), rng.range(-2.6, 0.4), Math.sin(a) * rng.range(14, 26));
      scene.add(puff);
    }

    // The hall: columns, architrave, a gold ridge.
    const colM = LAM(0xe8e2d0);
    for (const [cx, cz] of [[-3.5, -5], [3.5, -5], [-3.5, 1], [3.5, 1], [-3.5, 7], [3.5, 7]]) {
      const col = makeColumn({ h: 4.2, r: 0.34 });
      col.position.set(cx, 0, cz);
      scene.add(col);
    }
    const arch = new THREE.Mesh(new THREE.BoxGeometry(11, 0.7, 6.4), colM);
    arch.position.set(0, 4.9, 1);
    scene.add(arch);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.5, 0.5), LAM(0xc9a63a));
    ridge.position.set(0, 5.5, 1);
    scene.add(ridge);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 9), LAM(0xd8d2c4));
    floor.position.set(0, 0.05, 1);
    floor.receiveShadow = true;
    scene.add(floor);

    // The dais and throne.
    const dais = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 3), LAM(0xccc4b2));
    dais.position.set(0, 0.45, -5.4);
    scene.add(dais);
    const throne = makeThrone({ scale: 1.25 });
    throne.position.set(0, 0.7, -6.2);
    scene.add(throne);

    // The gods.
    const zeus = makeGod({ height: 2.7, tunic: 0xf0e8d0, glow: 0x2a2418, hair: 0xe8e8ec, weapon: 'bolt' });
    zeus.root.position.set(0, 0.7, -5.8);
    zeus.root.rotation.y = Math.PI; // facing the hall (+z)
    scene.add(zeus.root);

    const athena = makeGod({ height: 2.35, tunic: 0xd8dde8, glow: 0x1a2434, hair: 0xd8b45a, weapon: 'spear' });
    athena.root.position.set(3.2, 0, 1.5);
    athena.root.rotation.y = Math.PI + 0.35; // facing Zeus
    scene.add(athena.root);

    const herald = makeFigure({
      rng: rng.fork(3), height: 1.8, tunic: 0x8a7a5a, hair: 0x241a12, beard: true, staff: true,
    });
    herald.root.position.set(-3.6, 0, 0.5);
    herald.root.rotation.y = Math.PI + 0.2;
    scene.add(herald.root);

    return {
      scene, sky,
      ambient(seqT, dt) {
        sky.update(seqT);
        zeus.update(seqT, dt, { walkPhase: seqT * 0.4, stride: 0.12 });
        athena.update(seqT, dt, { walkPhase: seqT * 0.55, stride: 0.14 });
        herald.update(seqT, dt, { walkPhase: seqT * 0.3, stride: 0.1 });
      },
    };
  }, [
    {
      duration: 4.8, fadeIn: 1.2,
      title: 'The hall of the gods',
      caption: 'But as years went by, there came a time',
      make(S, dur) {
        const camera = makeCamera({ fov: 44 });
        const move = makeMove(camera, dur, {
          from: [18, 6, 26], to: [9, 4, 15],
          look: [0, 2.5, -2], lookTo: [0, 2.8, -3],
          fov: [44, 41], ease: CONTINUING, handheld: 0.04, handheldFreq: 0.3, seed: 5,
        });
        return { camera, update: (t) => move.update(t) };
      },
    },
    {
      duration: 4.8,
      title: 'Zeus and Athena',
      caption: 'when the gods settled that he should go back to Ithaca;',
      make(S, dur) {
        const camera = makeCamera({ fov: 36 });
        const hold = makeHold(camera, dur, {
          at: [4.6, 2.4, 7.2],
          look: [1.2, 3.0, -4.2],
          fov: 36, drift: 0.014, push: 0.6, seed: 11,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
  ]);
}

// SEQUENCE 9 — Ithaca, at last.
//
// The epilogue: dawn breaks over Ithaca — an olive tree, a little palace, the
// sea calm and gold — and a lone figure on the shore. The final lines of the
// invocation close the film.

import * as THREE from 'three';
import { makeRng } from '../engine/rng.js';
import { makeCamera, makeMove, makeHold, CONTINUING } from '../engine/camera.js';
import { sequence, newScene } from './common.js';
import { makeSea } from '../engine/sea.js';
import { makeIsland, makeFigure, makeTree, makeColumn, makeRock } from '../world/figures.js';
import { makeEmbers } from '../world/fx.js';

export function seq09() {
  return sequence('ithaca', (ctx) => {
    const rng = makeRng(9009);
    const { scene, sky } = newScene(ctx, 'dawn', { fov: 42 });

    const sea = makeSea({ size: 800, segs: 46, color: 0x2a4a6e, specular: 0x9a7a4a, wave: 0.55, seed: 111 });
    scene.add(sea.mesh);

    const island = makeIsland({
      radius: 26, seed: 29, height: 6,
      sand: 0xd8c07a, green: 0x4a5a3a, rock: 0x6a6258,
    });
    island.mesh.position.set(0, 0, 0);
    scene.add(island.group);
    const onI = (x, z) => island.heightAt(x, z);

    // The palace on the hill.
    const ph = onI(-6, -8);
    const palace = new THREE.Mesh(
      new THREE.BoxGeometry(5.4, 2.8, 3.6),
      new THREE.MeshLambertMaterial({ color: 0xe0d8c4, flatShading: true }),
    );
    palace.position.set(-6, ph + 1.4, -8);
    palace.castShadow = true;
    scene.add(palace);
    const pediment = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 5.6, 1.1, 3),
      new THREE.MeshLambertMaterial({ color: 0xd8d0bc, flatShading: true }),
    );
    pediment.rotation.z = Math.PI / 2;
    pediment.position.set(-6, ph + 3.5, -8);
    scene.add(pediment);
    for (const [cx, cz] of [[-8.4, -7.2], [-3.6, -7.2]]) {
      const col = makeColumn({ h: 2.0, r: 0.16 });
      col.position.set(cx, ph, cz);
      scene.add(col);
    }

    // The olive tree by the shore.
    const olive = makeTree({ kind: 'olive', scale: 1.5, seed: 40 });
    olive.position.set(4.5, onI(4.5, 4), 4);
    scene.add(olive);

    // Odysseus, home at last.
    const odysseus = makeFigure({
      rng: rng.fork(6), height: 1.74,
      tunic: 0x5a4a3a, hair: 0x1e1610, beard: true, staff: true, skin: 0xc8a888,
    });
    odysseus.root.position.set(3.2, onI(3.2, 7.2), 7.2);
    odysseus.root.rotation.y = Math.atan2(-6 - 3.2, -8 - 7.2); // facing the palace
    scene.add(odysseus.root);

    // Rocks and a few cypresses.
    for (let i = 0; i < 5; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(10, 23);
      const rock = makeRock({ scale: rng.range(0.5, 1.2), seed: i + 50 });
      const rx = Math.cos(a) * r, rz = Math.sin(a) * r;
      rock.position.set(rx, onI(rx, rz), rz);
      scene.add(rock);
    }
    for (let i = 0; i < 3; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(14, 24);
      const t = makeTree({ kind: 'cypress', scale: rng.range(0.8, 1.2), seed: i + 60 });
      const tx = Math.cos(a) * r, tz = Math.sin(a) * r;
      t.position.set(tx, onI(tx, tz), tz);
      scene.add(t);
    }

    // A few dawn embers rising off the shore fire of a watchman — or memory.
    const embers = makeEmbers({ count: 30, center: [-2, -3], area: 6, height: 4, seed: 70, color: 0xffc080 });
    scene.add(embers.points);

    return {
      scene, sky, sea,
      ambient(seqT, dt) {
        sea.update(seqT);
        sky.update(seqT);
        embers.update(seqT, dt);
        odysseus.update(seqT, dt, { walkPhase: seqT * 0.4, stride: 0.1 });
      },
    };
  }, [
    {
      duration: 5.4, fadeIn: 1.4,
      title: 'Dawn over Ithaca',
      caption: 'Tell me, too, about all these things, oh daughter of Zeus,',
      make(S, dur) {
        const camera = makeCamera({ fov: 44 });
        const move = makeMove(camera, dur, {
          from: [34, 11, 40], to: [18, 6, 26],
          look: [0, 3.2, 0], lookTo: [0, 3.4, -2],
          fov: [44, 41], ease: CONTINUING, handheld: 0.04, handheldFreq: 0.25, seed: 4,
        });
        return { camera, update: (t) => move.update(t) };
      },
    },
    {
      duration: 4.20,
      title: 'The hero on the shore',
      caption: 'from whatsoever source you may know them.',
      make(S, dur) {
        const camera = makeCamera({ fov: 36 });
        const hold = makeHold(camera, dur, {
          at: [8.2, 2.6, 13.5],
          look: [3.0, 2.4, 6.5],
          fov: 36, drift: 0.014, push: 0.6, seed: 12,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
    {
      duration: 5.2, fadeOut: 1.6,
      title: 'The tale begins',
      captions: [],
      make(S, dur) {
        const camera = makeCamera({ fov: 34 });
        const hold = makeHold(camera, dur, {
          at: [7, 3.2, 16],
          look: [-5, 5.5, -7],
          fov: [34, 30], drift: 0.012, push: 1.2, seed: 19,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
  ]);
}

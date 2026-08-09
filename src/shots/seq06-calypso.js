// SEQUENCE 6 — The cave of Calypso.
//
// "…was detained by the goddess Calypso, who had got him into a large cave and
// wanted to marry him." A lush island, a great cave mouth, a pool inside lit
// by fire, vines hanging from the ceiling — and the nymph beside the longing
// hero, who stares out at the sea he cannot cross.

import * as THREE from 'three';
import { makeRng } from '../engine/rng.js';
import { makeCamera, makeMove, makeHold, CONTINUING } from '../engine/camera.js';
import { sequence, newScene } from './common.js';
import { makeSea, makeStillWater } from '../engine/sea.js';
import { makeIsland, makeFigure, makeTree, makeVine, makeRock } from '../world/figures.js';
import { makeFire, makeSmoke, makeEmbers } from '../world/fx.js';

export function seq06() {
  return sequence('calypso', (ctx) => {
    const rng = makeRng(6006);
    const { scene, sky } = newScene(ctx, 'cave', { fov: 42 });

    const sea = makeSea({ size: 800, segs: 44, color: 0x0a1422, specular: 0x1a3048, wave: 0.45, seed: 88 });
    scene.add(sea.mesh);

    // Ogygia.
    const island = makeIsland({
      radius: 40, seed: 19, height: 9,
      sand: 0x4a4038, green: 0x2e3a2a, rock: 0x3a3630,
    });
    island.mesh.position.set(0, 0, 0);
    scene.add(island.group);
    const onI = (x, z) => island.heightAt(x, z);

    // The cavern hill, behind everything — a silhouette above the cave.
    const h0 = onI(0, -6);
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshLambertMaterial({ color: 0x3a3630, flatShading: true }),
    );
    hill.scale.set(17, 9, 8);
    hill.position.set(0, h0 + 9, -16);
    hill.castShadow = true;
    scene.add(hill);

    // The mouth: a dark ring set into the hillside. The camera looks THROUGH
    // the hole at the set behind it (pool, fire, back wall) — the cheap way to
    // build a cave interior without carving geometry.
    const mouth = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 4.2, 26),
      new THREE.MeshLambertMaterial({ color: 0x0c0a0e, side: THREE.DoubleSide }),
    );
    mouth.position.set(0, h0 + 2.3, 5.9);
    scene.add(mouth);

    // The cavern interior: a dark concave back wall behind a pool.
    const backWall = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshLambertMaterial({ color: 0x241f22, flatShading: true }),
    );
    backWall.scale.set(13, 7, 5);
    backWall.position.set(0, h0 + 5.8, -8.5);
    scene.add(backWall);

    const pool = makeStillWater({ size: 7, color: 0x1e3a5c, specular: 0x5a8ac0 });
    const poolY = onI(0, -1.2); // the terrain the pool sits on (NOT h0 — the cave floor slopes)
    pool.mesh.position.set(0, poolY + 0.06, -1.2);
    scene.add(pool.mesh);

    // Firelight inside the mouth; a smaller lamp by the pool; torches flanking.
    const fire = makeFire({ x: 1.4, y: onI(1.4, -3.2) + 0.4, z: -3.2, scale: 1.0, seed: 31 });
    scene.add(fire.group);
    const poolLamp = makeFire({ x: 0.8, y: poolY + 0.5, z: 0.5, scale: 0.7, seed: 35 });
    scene.add(poolLamp.group);
    const torches = [];
    for (const sx of [-1, 1]) {
      const t = makeFire({ x: sx * 3.2, y: h0 + 1.2, z: 5.4, scale: 0.55, seed: 32 + sx });
      scene.add(t.group);
      torches.push(t);
    }
    const smoke = makeSmoke({ origin: [1.4, onI(1.4, -3.2) + 3.4, -3.2], count: 18, size: 3.5, opacity: 0.2, height: 9, seed: 33 });
    scene.add(smoke.points);
    const embers = makeEmbers({ count: 40, center: [1.4, -3.2], area: 4, height: 5, seed: 34, color: 0xffa050 });
    scene.add(embers.points);

    // Vines draping over the mouth.
    const vines = [];
    for (const [vx, vlen] of [[-3.4, 2.4], [-1.6, 1.8], [0.4, 2.0], [2.2, 2.6], [3.6, 2.1]]) {
      const v = makeVine({ from: [vx, h0 + 4.6, 5.9], len: vlen, seed: rng.int(0, 999), sway: rng.range(0.8, 1.6) });
      scene.add(v);
      vines.push(v);
    }

    // The pair.
    const calypso = makeFigure({
      rng: rng.fork(4), height: 1.72,
      tunic: 0x2a7a7a, trim: 0xd8b45a, cloak: 0x1a4a52,
      hair: 0x2e2018, skin: 0xd8b8a0,
    });
    calypso.root.position.set(1.7, onI(1.7, 0.5), 0.5);
    calypso.root.rotation.y = Math.atan2(3.6 - 1.7, 4.2 - 0.5); // facing Odysseus
    scene.add(calypso.root);

    const odysseus = makeFigure({
      rng: rng.fork(5), height: 1.74, pose: 'sit',
      tunic: 0x5a4a3a, hair: 0x1e1610, beard: true, staff: true, skin: 0xc8a888,
    });
    odysseus.root.position.set(3.6, onI(3.6, 4.2), 4.2);
    odysseus.root.rotation.y = 0; // staring out at the sea
    scene.add(odysseus.root);

    // Trees and rocks around the island.
    for (let i = 0; i < 6; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(20, 36);
      const t = makeTree({ kind: 'olive', scale: rng.range(0.9, 1.4), seed: i + 60 });
      const tx = Math.cos(a) * r, tz = Math.sin(a) * r;
      t.position.set(tx, onI(tx, tz), tz);
      scene.add(t);
    }
    for (let i = 0; i < 8; i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(8, 38);
      const rock = makeRock({ scale: rng.range(0.6, 1.5), seed: i + 80 });
      const rx = Math.cos(a) * r, rz = Math.sin(a) * r;
      rock.position.set(rx, onI(rx, rz), rz);
      scene.add(rock);
    }

    return {
      scene, sky, sea, h0,
      ambient(seqT, dt) {
        sea.update(seqT);
        sky.update(seqT);
        fire.update(seqT, dt);
        poolLamp.update(seqT, dt);
        for (const t of torches) t.update(seqT, dt);
        smoke.update(seqT, dt);
        embers.update(seqT, dt);
        for (const v of vines) v.rotation.z = Math.sin(seqT * 0.7 + v.userData.seed) * 0.05;
        calypso.update(seqT, dt, { walkPhase: seqT * 0.5, stride: 0.12 });
        odysseus.update(seqT, dt, { walkPhase: seqT * 0.4, stride: 0.1 });
      },
    };
  }, [
    {
      duration: 5.2, fadeIn: 1.2,
      title: 'Ogygia',
      caption: 'So now all who escaped death in battle or by shipwreck had got safely home except Odysseus,',
      make(S, dur) {
        const camera = makeCamera({ fov: 44 });
        const move = makeMove(camera, dur, {
          from: [46, 11, 50], to: [22, 6, 27],
          look: [0, 3.2, 0], lookTo: [0, 3.4, 1],
          fov: [44, 41], ease: CONTINUING, handheld: 0.04, handheldFreq: 0.25, seed: 6,
        });
        return { camera, update: (t) => move.update(t) };
      },
    },
    {
      duration: 4.6,
      title: 'The cavern',
      caption: 'and he, though he was longing to return to his wife and country,',
      make(S, dur) {
        const camera = makeCamera({ fov: 40 });
        const hold = makeHold(camera, dur, {
          at: [1.2, S.h0 + 2.7, 7.6],
          look: [1.6, S.h0 + 2.0, -2],
          fov: 40, drift: 0.015, seed: 13,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
    {
      duration: 5.2,
      title: 'The nymph and the hero',
      caption: 'was detained by the goddess Calypso, who had got him into a large cave and wanted to marry him.',
      make(S, dur) {
        const camera = makeCamera({ fov: 36 });
        const hold = makeHold(camera, dur, {
          at: [8.6, S.h0 + 3.1, 8.6],
          look: [2.6, S.h0 + 2.1, 2.2],
          fov: 36, drift: 0.014, push: 0.7, seed: 17,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
  ]);
}

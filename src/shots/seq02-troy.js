// SEQUENCE 2 — Troy burning.
//
// "Many cities did he visit…" — the sack of Troy, ember-lit: a walled city on
// a plateau, the Wooden Horse at the gate, fires and smoke, the Achaean ships
// burning on the beach below.

import * as THREE from 'three';
import { makeRng } from '../engine/rng.js';
import { makeCamera, makeMove, makeHold, CONTINUING } from '../engine/camera.js';
import { sequence, newScene } from './common.js';
import { makeSea } from '../engine/sea.js';
import { makeTrojanHorse, makeRock } from '../world/figures.js';
import { makeFire, makeSmoke, makeEmbers } from '../world/fx.js';

export function seq02() {
  return sequence('troy', (ctx) => {
    const rng = makeRng(2002);
    const { scene, sky } = newScene(ctx, 'ember', { fov: 42 });
    const LAM = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });

    // A dark sea at the foot of the city.
    const sea = makeSea({ size: 800, segs: 40, color: 0x0a0c14, specular: 0x2a1c14, wave: 0.5, seed: 44 });
    scene.add(sea.mesh);

    // The plateau the city stands on: two stacked cylinders.
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(34, 38, 4, 28), LAM(0x1c1812));
    tier2.position.y = 2;
    tier2.receiveShadow = true;
    scene.add(tier2);
    const plateau = new THREE.Mesh(new THREE.CylinderGeometry(24, 26, 6.5, 26), LAM(0x241e16));
    plateau.position.y = 3.25 + 4;
    plateau.receiveShadow = true;
    scene.add(plateau);
    const TOP = 10.75; // top of the city plateau

    // Walls, towers, gate.
    const wallM = LAM(0x3a3428);
    const towerM = LAM(0x2e2a20);
    const wall = (w, h, d, x, z) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallM);
      m.position.set(x, TOP + h / 2, z);
      m.castShadow = true;
      scene.add(m);
    };
    wall(44, 4.5, 1.2, 0, -20);       // back
    wall(1.2, 4.5, 40, -22, 0);       // left
    wall(1.2, 4.5, 40, 22, 0);        // right
    wall(19, 4.5, 1.2, -10.5, 20);    // front-left of the gate
    wall(19, 4.5, 1.2, 10.5, 20);     // front-right of the gate
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.6, 1.6), towerM);
    lintel.position.set(0, TOP + 4.5 + 0.8, 20);
    scene.add(lintel);
    const tower = (x, z, s = 1) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(1.7 * s, 2.0 * s, 7 * s, 8), towerM);
      t.position.set(x, TOP + 3.5 * s, z);
      t.castShadow = true;
      scene.add(t);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1 * s, 2.6 * s, 8), LAM(0x4a3a2a));
      roof.position.set(x, TOP + 7.2 * s, z);
      scene.add(roof);
    };
    tower(-21, -19); tower(21, -19); tower(-21, 19); tower(21, 19);
    tower(-3.4, 20, 1.25); tower(3.4, 20, 1.25);

    // The Wooden Horse before the gate, on the lower tier — with braziers on
    // the approach so its face isn't a black hole in shot b.
    const fires = [];
    const horse = makeTrojanHorse({ scale: 1.15 });
    horse.position.set(0, 4.0, 28);
    horse.rotation.y = Math.PI; // facing the gate
    scene.add(horse);
    for (const sx of [-1, 1]) {
      const b = makeFire({ x: sx * 4.5, y: 4.3, z: 34.5, scale: 0.9, seed: 101 + sx });
      scene.add(b.group);
      fires.push(b);
    }

    // Burning buildings inside the walls.
    const smokes = [];
    const rng2 = rng.fork(5);
    for (let i = 0; i < 6; i++) {
      const bx = rng2.range(-16, 16), bz = rng2.range(-16, 16);
      if (Math.abs(bx) < 4 && Math.abs(bz) < 4) continue;
      const b = new THREE.Mesh(new THREE.BoxGeometry(rng2.range(3, 5), rng2.range(2.5, 4.5), rng2.range(3, 5)), LAM(0x4a3a2a));
      b.position.set(bx, TOP + b.geometry.parameters.height / 2, bz);
      scene.add(b);
      const f = makeFire({ x: bx, y: TOP + b.geometry.parameters.height + 0.2, z: bz, scale: rng2.range(0.8, 1.3), seed: i + 30 });
      scene.add(f.group);
      fires.push(f);
      const sm = makeSmoke({ origin: [bx, TOP + b.geometry.parameters.height + 1.2, bz], count: 26, size: 5, opacity: 0.3, height: 18, seed: i + 60 });
      scene.add(sm.points);
      smokes.push(sm);
    }
    // A couple of wall fires, and torches flanking the gate to rim-light the Horse.
    for (const [wx, wz] of [[-14, 19], [14, 19], [0, -19.5]]) {
      const f = makeFire({ x: wx, y: TOP + 4.5, z: wz, scale: 0.9, seed: rng.int(0, 99) });
      scene.add(f.group);
      fires.push(f);
    }
    for (const sx of [-1, 1]) {
      const f = makeFire({ x: sx * 3.6, y: TOP + 0.5, z: 21.8, scale: 0.85, seed: rng.int(0, 99) });
      scene.add(f.group);
      fires.push(f);
    }
    // A brazier in the gateway to light the street beyond.
    const gateBrazier = makeFire({ x: 0, y: TOP + 0.4, z: 14, scale: 1.0, seed: 77 });
    scene.add(gateBrazier.group);
    fires.push(gateBrazier);

    // Beached Achaean ships burning on the shore.
    const ships = [];
    for (const [sx, sz, rot] of [[-18, 40, 0.5], [10, 44, -0.4], [20, 38, 0.15]]) {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.0, 1.7), LAM(0x2e2216));
      hull.position.y = 0.5;
      g.add(hull);
      const prow = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 6), LAM(0x2e2216));
      prow.rotation.z = -Math.PI / 2;
      prow.position.set(3.6, 0.9, 0);
      g.add(prow);
      g.position.set(sx, 0, sz);
      g.rotation.y = rot;
      scene.add(g);
      const f = makeFire({ x: sx + 0.5, y: 1.6, z: sz, scale: 1.1, seed: rng.int(0, 99) });
      scene.add(f.group);
      fires.push(f);
      const sm = makeSmoke({ origin: [sx, 2.2, sz], count: 22, size: 5.5, opacity: 0.34, height: 20, seed: rng.int(0, 99) });
      scene.add(sm.points);
      smokes.push(sm);
      ships.push(g);
    }

    // Rocks strewn on the plain.
    for (let i = 0; i < 8; i++) {
      const r = makeRock({ scale: rng.range(0.7, 1.6), seed: i + 90, color: 0x2a2620 });
      const rx = rng.range(-44, 44), rz = rng.range(36, 52);
      r.position.set(rx, 2.0, rz);
      scene.add(r);
    }

    const embers = makeEmbers({ count: 170, center: [0, 4], area: 26, height: 15, seed: 21, color: 0xff8a3a });
    scene.add(embers.points);

    return {
      scene, sky, sea,
      ambient(seqT, dt) {
        sea.update(seqT);
        sky.update(seqT);
        embers.update(seqT, dt);
        for (const f of fires) f.update(seqT, dt);
        for (const sm of smokes) sm.update(seqT, dt);
        for (const sh of ships) {
          sh.position.y = sea.heightAt(sh.position.x, sh.position.z, seqT) * 0.5;
        }
      },
    };
  }, [
    {
      duration: 3.51, fadeIn: 1.2,
      title: 'The sack of Troy',
      caption: 'Many cities did he visit,',
      make(S, dur) {
        const camera = makeCamera({ fov: 46 });
        const move = makeMove(camera, dur, {
          from: [36, 28, 62], to: [6, 13, 32],
          look: [0, 5, 0], lookTo: [0, 4.5, 8],
          fov: [46, 42], ease: CONTINUING, handheld: 0.06, handheldFreq: 0.28, seed: 7,
        });
        return { camera, update: (t) => move.update(t) };
      },
    },
    {
      duration: 3.23,
      title: 'The Wooden Horse',
      caption: 'and many were the nations',
      make(S, dur) {
        const camera = makeCamera({ fov: 36 });
        const hold = makeHold(camera, dur, {
          at: [7.8, 3.4, 42],
          look: [0, 4.2, 29],
          fov: 36, drift: 0.018, seed: 13,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
    {
      duration: 4.2,
      title: 'Through the gate',
      caption: 'with whose manners and customs he was acquainted.',
      make(S, dur) {
        const camera = makeCamera({ fov: 44 });
        const hold = makeHold(camera, dur, {
          at: [0, 8.2, 33],
          look: [0, 10.5, 12],
          fov: 44, drift: 0.014, push: 2.2, seed: 21,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
  ]);
}

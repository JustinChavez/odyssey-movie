// SEQUENCE 8 — Poseidon's persecution.
//
// "…except Poseidon, who still persecuted him without ceasing and would not
// let him get home." Ithaca glimmers on the horizon at dawn; then the sky
// goes black, the sea rises, and the Earth-shaker himself comes up out of the
// water to smash the raft. Strike times exported for the thunder.

import * as THREE from 'three';
import { makeRng } from '../engine/rng.js';
import { makeCamera, makeMove, makeHold, CONTINUING } from '../engine/camera.js';
import { clamp01, lerp } from '../engine/ease.js';
import { sequence, newScene } from './common.js';
import { makeSea } from '../engine/sea.js';
import { makeRaft } from '../world/ship.js';
import { makeIsland, makeGod, makeFigure, makeTree, makeColumn } from '../world/figures.js';
import { makeRain, makeLightning, makeGlowTexture } from '../world/fx.js';

export const STRIKES = [0.9, 2.7];

export function seq08() {
  return sequence('poseidon', (ctx) => {
    const rng = makeRng(8008);
    const { scene, sky } = newScene(ctx, 'dawn', { fov: 42 });

    const sea = makeSea({ size: 900, segs: 54, color: 0x141c28, specular: 0x33485e, wave: 1.5, seed: 99 });
    scene.add(sea.mesh);

    // Ithaca on the horizon.
    const ithaca = makeIsland({
      radius: 24, seed: 23, height: 8,
      sand: 0xd8c07a, green: 0x4a5a3a, rock: 0x6a6258,
    });
    ithaca.mesh.position.set(60, 0, -32);
    scene.add(ithaca.group);
    for (let i = 0; i < 3; i++) {
      const t = makeTree({ kind: 'olive', scale: rng.range(0.9, 1.4), seed: i + 30 });
      const lx = rng.range(-10, 10), lz = rng.range(-10, 10);
      t.position.set(60 + lx, ithaca.heightAt(lx, lz), -32 + lz);
      scene.add(t);
    }
    // A little palace on the hill.
    const ph = ithaca.heightAt(8, -6);
    const palace = new THREE.Mesh(
      new THREE.BoxGeometry(5, 2.6, 3.4),
      new THREE.MeshLambertMaterial({ color: 0xd8d0bc, flatShading: true }),
    );
    palace.position.set(68, ph + 1.3, -38);
    scene.add(palace);
    for (const [cx, cz] of [[66, -36.5], [70, -36.5]]) {
      const col = makeColumn({ h: 1.8, r: 0.14 });
      col.position.set(cx, ph, cz);
      scene.add(col);
    }

    // The raft and its one passenger.
    const raft = makeRaft({ scale: 1.05 });
    scene.add(raft.group);
    const odysseus = makeFigure({
      rng: rng.fork(5), height: 1.72,
      tunic: 0x5a4a3a, hair: 0x1e1610, beard: true, staff: true, skin: 0xc8a888,
    });
    odysseus.root.position.set(0, 0.4, 0);
    raft.group.add(odysseus.root);

    // The god, hidden below the waves until he rises.
    const poseidon = makeGod({
      height: 4.8, tunic: 0x2a7a7a, glow: 0x1a4a5a, hair: 0x3a6a72, weapon: 'trident',
    });
    poseidon.root.position.set(-16, -9, 10);
    scene.add(poseidon.root);
    // A cold teal aura so he reads against the black water.
    const godGlow = new THREE.PointLight(0x4ab8c8, 60, 36, 1.8);
    godGlow.position.set(-16, 2.6, 10);
    scene.add(godGlow);
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(), color: 0x2a8a9a, transparent: true, opacity: 0.5,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    aura.scale.setScalar(5.2);
    aura.position.set(-16, 2.4, 10);
    scene.add(aura);
    aura.material.opacity = 0.3;
    // Rim light from the far side so his silhouette separates from the water.
    const rim = new THREE.DirectionalLight(0x7ad0dc, 0.9);
    rim.position.set(-30, 8, -18);
    scene.add(rim);

    const rain = makeRain({ count: 700, extent: 100, yTop: 55, seed: 41 });
    rain.points.material.opacity = 0;
    scene.add(rain.points);

    // A soft cold fill from the camera side so the raft and the god read
    // against the black — the storm sky alone would bury them.
    const fill = new THREE.DirectionalLight(0x8fa8c8, 1.0);
    fill.position.set(12, 10, 16);
    scene.add(fill);

    const bolt1 = makeLightning({ x: 0, y: 0, z: 0, from: [-2, 30, 6], seed: 51 });
    scene.add(bolt1.group);
    const bolt2 = makeLightning({ x: 0, y: 0, z: 0, from: [6, 30, 0], seed: 53 });
    scene.add(bolt2.group);

    let wrecked = false;

    return {
      scene, sky, sea, raft, odysseus, poseidon, bolt1, bolt2, rain,
      wreck() {
        if (wrecked) return;
        wrecked = true;
        raft.group.rotation.x = 0.95;
        raft.group.rotation.z = 0.55;
        odysseus.root.rotation.z = -1.15;
        odysseus.root.position.y = 0.9;
      },
      ambient(seqT, dt) {
        const stormK = clamp01((seqT - 1.5) / 7);
        sky.blend('dawn', 'storm', stormK);
        sky.update(seqT);
        sea.update(seqT);
        rain.points.material.opacity = 0.5 * stormK;
        rain.update(seqT, dt);
        bolt1.update(seqT, dt);
        bolt2.update(seqT, dt);

        // Raft rides the waves — until it's wrecked, then it just wallows.
        const rx = -8 + seqT * 0.9, rz = 0;
        raft.group.position.set(rx, sea.heightAt(rx, rz, seqT), rz);
        if (!wrecked) {
          raft.group.rotation.x = (sea.heightAt(rx, rz + 0.5, seqT) - sea.heightAt(rx, rz - 0.5, seqT)) * 0.6;
          raft.group.rotation.z = (sea.heightAt(rx + 0.5, rz, seqT) - sea.heightAt(rx - 0.5, rz, seqT)) * 0.6;
        }
        odysseus.update(seqT, dt, { walkPhase: seqT * 0.9, stride: 0.2 });

        // The god rises, then heaves in the swell.
        const rise = clamp01((seqT - 3.5) / 4.5);
        const py = lerp(-9, 0.6, rise);
        poseidon.root.position.y = py + (rise > 0.99 ? Math.sin(seqT * 1.6) * 0.18 : 0);
        poseidon.root.rotation.z = Math.sin(seqT * 0.8) * 0.04;
        godGlow.position.y = py + 2.6;
        godGlow.intensity = 12 + 48 * rise;
        aura.position.y = py + 2.4;
        aura.material.opacity = 0.3 * rise;
      },
    };
  }, [
    {
      duration: 5.0, fadeIn: 1.2,
      title: 'Home on the horizon',
      caption: 'even then, however, when he was among his own people, his troubles were not yet over;',
      make(S, dur) {
        const camera = makeCamera({ fov: 42 });
        const move = makeMove(camera, dur, {
          from: [-10, 4.4, 14], to: [6, 4.6, 13],
          look: [-2, 1.6, 0], lookTo: [10, 1.8, 0],
          fov: 42, ease: CONTINUING, handheld: 0.07, handheldFreq: 0.4, seed: 7,
        });
        move.lookTarget = S.raft.group.position;
        return { camera, update: (t) => move.update(t) };
      },
    },
    {
      duration: 5.0,
      title: 'The Earth-shaker rises',
      caption: 'nevertheless all the gods had now begun to pity him except Poseidon,',
      make(S, dur) {
        const camera = makeCamera({ fov: 40 });
        const hold = makeHold(camera, dur, {
          at: [1, 3.4, 15],
          look: [-15, 3.5, 10],
          fov: 40, drift: 0.02, push: 1.6, seed: 13,
        });
        return { camera, update: (t) => hold.update(t) };
      },
    },
    {
      duration: 5.0,
      title: 'The raft breaks',
      caption: 'who still persecuted him without ceasing and would not let him get home.',
      make(S, dur) {
        const camera = makeCamera({ fov: 38 });
        const move = makeMove(camera, dur, {
          from: [-12, 3.6, 10], to: [0, 3.2, 9],
          look: [-4, 1.6, 0], lookTo: [4, 1.4, 0],
          fov: 38, ease: CONTINUING, handheld: 0.05, handheldFreq: 0.45, seed: 17,
        });
        move.lookTarget = S.raft.group.position;
        let struck = 0;
        return {
          camera,
          update(t, dt) {
            for (let i = 0; i < STRIKES.length; i++) {
              if (t >= STRIKES[i] && !(struck & (1 << i))) {
                struck |= 1 << i;
                (i === 0 ? S.bolt1 : S.bolt2).flash(1.4);
                if (i === 1) S.wreck();
              }
            }
            move.update(t);
          },
        };
      },
    },
  ]);
}

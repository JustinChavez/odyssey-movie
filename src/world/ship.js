// A Greek trireme and Odysseus's little raft — both built to ride the sea's
// heightAt() function so they pitch and roll with the actual waves.

import * as THREE from 'three';
import { makeRng } from '../engine/rng.js';
import { makeFigure } from './figures.js';

const LAM = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });

/**
 * A trireme. update(t, dt, sea) rides the waves; the sail billows, the oars
 * row (when crew > 0), the crew sways. Returns { group, update, tip }.
 */
export function makeShip({
  rng = makeRng(21), scale = 1, sailColor = 0xe8dcc0, oars = 10, crew = 0,
  hullColor = 0x5a3a22, trim = 0x9a2a22,
} = {}) {
  const g = new THREE.Group();
  const hullM = LAM(hullColor);
  const trimM = LAM(trim);
  const woodM = LAM(0x7a5a34);
  const sailM = LAM(sailColor, { side: THREE.DoubleSide });

  // Hull.
  const hull = new THREE.Mesh(new THREE.BoxGeometry(6.4 * scale, 0.85 * scale, 1.5 * scale), hullM);
  hull.position.y = 0.2 * scale;
  g.add(hull);
  const prow = new THREE.Mesh(new THREE.ConeGeometry(0.5 * scale, 1.9 * scale, 6), hullM);
  prow.rotation.z = -Math.PI / 2;
  prow.position.set(3.9 * scale, 0.75 * scale, 0);
  g.add(prow);
  const ram = new THREE.Mesh(new THREE.ConeGeometry(0.16 * scale, 1.1 * scale, 6), LAM(0xa8b0b8));
  ram.rotation.z = -Math.PI / 2;
  ram.position.set(4.6 * scale, 0.28 * scale, 0);
  g.add(ram);
  const stern = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.14 * scale, 2.2 * scale, 6), woodM);
  stern.position.set(-3.1 * scale, 1.3 * scale, 0);
  stern.rotation.z = 0.35;
  g.add(stern);
  const sternCap = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 6, 5), trimM);
  sternCap.position.set(-3.6 * scale, 2.2 * scale, 0);
  g.add(sternCap);

  // Deck + rails.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(5.6 * scale, 0.14 * scale, 1.3 * scale), woodM);
  deck.position.y = 0.62 * scale;
  g.add(deck);
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(5.8 * scale, 0.14 * scale, 0.1 * scale), trimM);
    rail.position.set(0, 0.85 * scale, sx * 0.7 * scale);
    g.add(rail);
  }

  // Mast, yard, sail, rigging.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * scale, 0.14 * scale, 5.2 * scale, 6), woodM);
  mast.position.y = 2.9 * scale;
  g.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 3.6 * scale, 5), woodM);
  yard.rotation.z = Math.PI / 2;
  yard.position.y = 4.1 * scale;
  g.add(yard);

  const sailGeo = new THREE.PlaneGeometry(3.3 * scale, 4.2 * scale, 5, 7);
  const sail = new THREE.Mesh(sailGeo, sailM);
  sail.position.y = 3.0 * scale;
  g.add(sail);
  const sailBase = new Float32Array(sailGeo.attributes.position.count * 3);
  sailBase.set(sailGeo.attributes.position.array);

  const rigGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 5.1 * scale, 0),
    new THREE.Vector3(3.6 * scale, 0.7 * scale, 0),
  ]);
  const rig = new THREE.Line(rigGeo, new THREE.LineBasicMaterial({ color: 0x2a2018, transparent: true, opacity: 0.7 }));
  g.add(rig);

  // Oars.
  const oarGeo = new THREE.BoxGeometry(0.06 * scale, 0.05 * scale, 2.0 * scale);
  const oarPivots = [];
  for (let i = 0; i < oars; i++) {
    const z = (-2.4 + i * (4.8 / (oars - 1))) * scale;
    for (const sx of [-1, 1]) {
      const o = new THREE.Group();
      const blade = new THREE.Mesh(oarGeo, woodM);
      blade.position.y = -0.9 * scale;
      o.add(blade);
      o.position.set(sx * 0.85 * scale, 0.6 * scale, z);
      o.rotation.z = sx * -0.35;
      g.add(o);
      oarPivots.push({ o, sx, z });
    }
  }

  // Steering oar at the stern.
  const steer = new THREE.Mesh(new THREE.BoxGeometry(0.1 * scale, 0.07 * scale, 2.6 * scale), woodM);
  steer.position.set(-3.2 * scale, 0.4 * scale, 0);
  steer.rotation.z = -0.2;
  g.add(steer);

  // Crew.
  const figures = [];
  if (crew > 0) {
    const crng = rng.fork(4);
    for (let i = 0; i < crew; i++) {
      const fig = makeFigure({
        rng: crng.fork(i), height: 1.5 * scale,
        tunic: crng.pick([0x9a5a3a, 0x7a6a4a, 0x8a4a4a, 0x5a6a5a]),
        skin: 0xd8b08c, hair: 0x241a12, pose: 'sit',
      });
      fig.root.position.set(crng.range(-0.5, 0.5) * scale, 0.72 * scale, crng.range(-0.9, 0.9) * scale);
      fig.root.rotation.y = Math.PI / 2 + crng.range(-0.3, 0.3);
      g.add(fig.root);
      figures.push(fig);
    }
  }

  let tip = 0;
  const _pos = new THREE.Vector3();

  return {
    group: g,
    figures,
    /** Used by the storm: fold the ship over (tip 1 = capsizing). */
    setTip(k) { tip = k; },
    update(t, dt, sea) {
      // Ride the waves.
      const x = g.position.x, z = g.position.z;
      const y = sea.heightAt(x, z, t);
      g.position.y = y;
      // Pitch/roll from wave slope.
      const dz = sea.heightAt(x, z + 0.6, t) - sea.heightAt(x, z - 0.6, t);
      const dx = sea.heightAt(x + 0.6, z, t) - sea.heightAt(x - 0.6, z, t);
      // Heading (rotation.y) belongs to the shot; only pitch and roll here.
      g.rotation.x = -dz * 0.5 + tip * 1.4;
      g.rotation.z = dx * 0.5;

      // Sail billow.
      const p = sailGeo.attributes.position.array;
      const billow = 0.55 + 0.15 * Math.sin(t * 1.7);
      for (let i = 0; i < p.length; i += 3) {
        const u = sailBase[i] / (3.3 * scale) * 0.5 + 0.5;
        const v = sailBase[i + 1] / (4.2 * scale) * 0.5 + 0.5;
        p[i + 2] = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * 0.55 * scale * billow;
      }
      sailGeo.attributes.position.needsUpdate = true;
      sailGeo.computeVertexNormals();

      // Oars.
      for (const op of oarPivots) {
        const phase = t * (crew > 0 ? 1.7 : 0.4) + op.z * 0.8;
        op.o.rotation.x = Math.sin(phase) * (crew > 0 ? 0.55 : 0.15);
      }

      // Crew.
      for (const fig of figures) {
        fig.update(t, dt, { walkPhase: t * 1.2, stride: 0.3 });
      }
    },
  };
}

/** Odysseus's raft — lashed logs, a small mast, no oars. */
export function makeRaft({ scale = 1, rng = makeRng(3) } = {}) {
  const g = new THREE.Group();
  const woodM = LAM(0x6e4a2a);
  const ropeM = LAM(0x3a3024);
  for (let i = 0; i < 6; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.26 * scale, 3.4 * scale, 7), woodM);
    log.rotation.z = Math.PI / 2;
    log.position.set(0, 0.1 * scale, (-1.1 + i * 0.44) * scale);
    log.rotation.x = rng.range(-0.05, 0.05);
    g.add(log);
  }
  for (const [zx, zz] of [[-1.2, 1.3], [1.2, 1.3], [-1.2, -1.3], [1.2, -1.3]]) {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.6), ropeM);
    tie.position.set(zx * 0.9 * scale, 0.22 * scale, zz * scale);
    g.add(tie);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 2.6 * scale, 5), woodM);
  mast.position.y = 1.4 * scale;
  g.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.8 * scale, 2.0 * scale), LAM(0xd8c8a8, { side: THREE.DoubleSide }));
  sail.position.y = 1.7 * scale;
  g.add(sail);
  return { group: g, update(t, dt, sea) {} };
}

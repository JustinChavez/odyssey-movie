// The cast: low-poly people, gods, cattle, the Wooden Horse, and the props
// that dress the worlds (trees, rocks, columns, vines, thrones).

import * as THREE from 'three';
import { makeRng, noise2 } from '../engine/rng.js';

const LAM = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });
const PHO = (color, opts = {}) => new THREE.MeshPhongMaterial({ color, flatShading: true, ...opts });

/**
 * A stylized human. Origin at the feet; root.rotation.y faces +Z.
 * update(t, dt, anim) where anim = { walkPhase (radians), stride, speed }.
 */
export function makeFigure({
  rng = makeRng(1), height = 1.75,
  skin = 0xd8b08c, tunic = 0x8a5a3a, trim = 0xffd166,
  hair = 0x2a1a12, beard = false, helmet = false, helmetGold = false,
  cloak = null, staff = false, spear = false, shield = false,
  pose = 'stand', emissive = 0x000000,
} = {}) {
  const s = height / 1.75;
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skinM = LAM(skin, { emissive });
  const tunicM = LAM(tunic, { emissive });
  const trimM = LAM(trim);
  const hairM = LAM(hair);
  const woodM = LAM(0x6e4a2a);
  const metalM = LAM(0xb8bcc4, { emissive: emissive === 0 ? 0x111111 : emissive });

  // Tunic skirt + chest.
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.6, 8), tunicM);
  skirt.position.y = 0.92 * s;
  body.add(skirt);
  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.5, 8), skinM);
  chest.position.y = 1.38 * s;
  body.add(chest);

  // Head.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), skinM);
  head.position.y = 1.74 * s;
  body.add(head);
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.152, 10, 8), hairM);
  hairMesh.scale.set(0.94, 1.08, 0.94);
  hairMesh.position.set(0, 1.78 * s, -0.02 * s);
  body.add(hairMesh);
  if (beard) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 6), hairM);
    b.position.set(0, 1.62 * s, 0.11 * s);
    b.rotation.x = 0.25;
    body.add(b);
  }

  // Legs.
  const legGeo = new THREE.CylinderGeometry(0.08, 0.085, 0.74, 6);
  const legL = new THREE.Group();
  legL.position.set(-0.09, 0.72 * s, 0);
  const legLm = new THREE.Mesh(legGeo, skinM);
  legLm.position.y = -0.37 * s;
  legL.add(legLm);
  const legR = legL.clone();
  legR.position.x = 0.09;
  body.add(legL, legR);

  // Arms.
  const armGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.58, 6);
  const armL = new THREE.Group();
  armL.position.set(-0.24, 1.5 * s, 0);
  const armLm = new THREE.Mesh(armGeo, skinM);
  armLm.position.y = -0.29 * s;
  armL.add(armLm);
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), skinM);
  handL.position.y = -0.6 * s;
  armL.add(handL);
  const armR = armL.clone();
  armR.position.x = 0.24;
  body.add(armL, armR);

  // Helmet.
  if (helmet) {
    const hm = LAM(helmetGold ? 0xe8c35a : 0x9aa0aa, { emissive: helmetGold ? 0x221a02 : 0 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hm);
    dome.position.y = 1.78 * s;
    body.add(dome);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.09), LAM(0x7a2a22));
    crest.position.set(0, 1.9 * s, 0);
    crest.rotation.x = 0.12;
    body.add(crest);
    const plume = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), LAM(0x9a2a22));
    plume.position.set(0, 1.98 * s, -0.12 * s);
    plume.rotation.x = 1.0;
    body.add(plume);
  }

  // Cloak — a wide translucent skirt over the shoulders.
  if (cloak) {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.55, 0.85, 8, 1, true),
      LAM(cloak, { transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    );
    c.position.y = 1.28 * s;
    body.add(c);
  }

  // Staff / spear in the right hand.
  if (staff || spear) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.0 * s, 5), woodM);
    pole.position.set(0.36, 1.1 * s, 0);
    pole.rotation.z = -0.08;
    body.add(pole);
    if (spear) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 5), metalM);
      tip.position.set(0.368, 2.24 * s, 0);
      tip.rotation.z = -0.08;
      body.add(tip);
    }
  }
  if (shield) {
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 10), PHO(0x8a6a2e, { shininess: 60 }));
    sh.position.set(-0.36, 1.25 * s, 0.08);
    sh.rotation.y = -0.5;
    sh.rotation.x = 0.15;
    body.add(sh);
  }

  // Sit pose: fold the legs forward and settle the whole body down.
  if (pose === 'sit') {
    body.position.y = -0.42 * s;
    legL.rotation.x = 1.45;
    legR.rotation.x = 1.45;
    skirt.rotation.x = 0.12;
    root.userData.sit = true;
  }

  return {
    root,
    body,
    s,
    parts: { legL, legR, armL, armR, chest, head },
    faceTo(x, z) {
      const dx = x - root.position.x;
      const dz = z - root.position.z;
      root.rotation.y = Math.atan2(dx, dz);
    },
    update(t, dt, anim = {}) {
      const wp = anim.walkPhase || 0;
      const stride = anim.stride || 0.5;
      const k = pose === 'sit' ? 0.25 : 1;
      legL.rotation.x = Math.sin(wp) * 0.55 * stride * k;
      legR.rotation.x = -Math.sin(wp) * 0.55 * stride * k;
      armL.rotation.x = -Math.sin(wp) * 0.5 * stride * k + (pose === 'sit' ? -0.3 : 0);
      armR.rotation.x = Math.sin(wp) * 0.5 * stride * k + (pose === 'sit' ? -0.3 : 0);
      if (pose === 'sit') {
        body.position.y = -0.42 * s + 0.015 * Math.sin(t * 2);
      } else {
        body.position.y = Math.abs(Math.sin(wp)) * 0.035;
      }
      chest.scale.y = 1 + 0.012 * Math.sin(t * 1.9);
    },
  };
}

/** A god — bigger, bearded, glowing, armed. */
export function makeGod({
  height = 2.4, tunic = 0xd8e6f0, glow = 0x223344, hair = 0xd8d8dc,
  beard = true, weapon = 'bolt', skin = 0xe8c9a0,
} = {}) {
  const fig = makeFigure({
    height, tunic, hair, beard, skin, emissive: glow,
    helmet: weapon === 'spear', helmetGold: true, cloak: null,
  });
  const { body, s } = fig;
  const metalM = LAM(0xd8d8e0, { emissive: 0x181820 });

  if (weapon === 'bolt') {
    // A jagged lightning bolt held in the right hand.
    const pts = [];
    const rng = makeRng(900);
    let x = 0.42 * s, y = 1.3 * s, z = 0.1 * s;
    for (let i = 0; i < 9; i++) {
      pts.push(new THREE.Vector3(x, y, z));
      x += rng.range(0.05, 0.16) * s;
      y += rng.range(0.08, 0.22) * s;
      z += rng.range(-0.06, 0.06) * s;
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xfff2a8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending,
    }));
    body.add(line);
  } else if (weapon === 'trident') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.1, 6), metalM);
    shaft.position.set(0.4 * s, 1.3 * s, 0.1 * s);
    body.add(shaft);
    for (const dz of [-0.34, 0, 0.34]) {
      const tine = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.8, 6), metalM);
      tine.position.set(0.5 * s, 2.62 * s, 0.1 * s + dz * s);
      tine.rotation.z = -0.14;
      body.add(tine);
    }
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 5), metalM);
    crossbar.rotation.x = Math.PI / 2;
    crossbar.position.set(0.47 * s, 2.3 * s, 0.1 * s);
    body.add(crossbar);
  } else if (weapon === 'spear') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.4, 6), LAM(0x5a4020));
    pole.position.set(0.42 * s, 1.3 * s, 0.05 * s);
    body.add(pole);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.3, 5), metalM);
    tip.position.set(0.44 * s, 2.66 * s, 0.05 * s);
    body.add(tip);
  } else if (weapon === 'staff') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.0, 6), LAM(0x4a3a20));
    pole.position.set(0.42 * s, 1.25 * s, 0.05 * s);
    body.add(pole);
  }
  return fig;
}

/** One of the Sun-god's cattle — red, low-poly, docile. */
export function makeCattle({ rng = makeRng(5), scale = 1, color = 0x9c3b2a, seed = 0 } = {}) {
  const root = new THREE.Group();
  const hide = LAM(color);
  const hornM = LAM(0xd8cfa8);

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.72, 0.85), hide);
  body.position.y = 0.95;
  root.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.42, 0.4), hide);
  head.position.set(1.02, 1.05, 0);
  root.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.24), LAM(0x7a2a20));
  snout.position.set(1.3, 1.0, 0);
  root.add(snout);
  for (const sx of [-1, 1]) {
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.32, 5), hornM);
    horn.position.set(1.02, 1.32, sx * 0.16);
    horn.rotation.z = sx * -0.9;
    horn.rotation.x = sx * 0.5;
    root.add(horn);
  }
  for (const [lx, lz] of [[-0.55, 0.28], [-0.55, -0.28], [0.55, 0.28], [0.55, -0.28]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), hide);
    leg.position.set(lx, 0.28, lz);
    root.add(leg);
  }
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.5, 4), hide);
  tail.position.set(-0.95, 1.1, 0);
  tail.rotation.z = 0.5;
  root.add(tail);

  root.scale.setScalar(scale);
  const phase = rng.range(0, 10);

  return {
    root,
    update(t, dt) {
      // A slow contented sway.
      body.position.y = 0.95 + 0.02 * Math.sin(t * 1.3 + phase);
      head.rotation.y = 0.08 * Math.sin(t * 0.7 + phase);
    },
  };
}

/** A fallen steer, cooked or dead — the folly itself. */
export function makeSlainCattle({ rng = makeRng(6), scale = 1, color = 0x8a3224, seed = 1 } = {}) {
  const c = makeCattle({ rng, scale, color, seed });
  c.root.rotation.z = Math.PI / 2;
  c.root.rotation.y = rng.range(-0.5, 0.5);
  c.root.position.y = 0.28;
  c.update = () => {};
  return c;
}

/** The Wooden Horse, on its wheeled platform, at the Scaean Gate. */
export function makeTrojanHorse({ scale = 1 } = {}) {
  const root = new THREE.Group();
  const wood = LAM(0x7a5226);
  const dark = LAM(0x5a3c1c);

  const body = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.5, 1.25), wood);
  body.position.y = 2.3;
  root.add(body);
  const belly = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.1), dark);
  belly.position.y = 1.55;
  root.add(belly);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.7), wood);
  neck.position.set(1.85, 3.0, 0);
  neck.rotation.z = 0.5;
  root.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 0.65), wood);
  head.position.set(2.6, 3.55, 0);
  root.add(head);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.5), wood);
  muzzle.position.set(3.25, 3.4, 0);
  muzzle.rotation.z = 0.35;
  root.add(muzzle);
  // Ears + mane.
  for (const sx of [-0.22, 0.22]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 4), wood);
    ear.position.set(2.75, 4.0, sx);
    root.add(ear);
  }
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.5), dark);
    m.position.set(1.85 + i * 0.12, 2.05 - i * 0.14, 0);
    m.rotation.z = -0.5 + i * 0.14;
    root.add(m);
  }
  // Legs.
  for (const [lx, lz] of [[-1.1, 0.45], [-1.1, -0.45], [1.0, 0.45], [1.0, -0.45]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.0, 0.42), wood);
    leg.position.set(lx, 1.0, lz);
    root.add(leg);
  }
  // Wheeled platform.
  const plat = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 1.6), dark);
  plat.position.y = 0.12;
  root.add(plat);
  for (const [wx, wz] of [[-1.4, 0.7], [-1.4, -0.7], [1.4, 0.7], [1.4, -0.7]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 10), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.5, wz);
    root.add(wheel);
  }
  root.scale.setScalar(scale);
  return root;
}

/** Olive / cypress trees. */
export function makeTree({ kind = 'olive', scale = 1, seed = 1 } = {}) {
  const root = new THREE.Group();
  const rng = makeRng(seed);
  if (kind === 'olive') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.9, 6), LAM(0x6e5638));
    trunk.position.y = 0.95;
    trunk.rotation.z = rng.range(-0.08, 0.08);
    root.add(trunk);
    const leafM = LAM(0x7a8a5a);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(rng.range(0.8, 1.15), 8, 6), leafM);
      c.position.set(rng.range(-0.7, 0.7), 1.9 + rng.range(-0.2, 0.7), rng.range(-0.6, 0.6));
      c.scale.y = 0.6;
      root.add(c);
    }
  } else {
    // Cypress — stacked cones.
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 1.2, 6), LAM(0x5a4630));
    trunk.position.y = 0.6;
    root.add(trunk);
    const leafM = LAM(0x2e4a32);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.85 - i * 0.22, 1.5, 7), leafM);
      c.position.y = 1.4 + i * 1.1;
      root.add(c);
    }
  }
  root.scale.setScalar(scale);
  return root;
}

/** A jittered dodecahedron — the only rock we need. */
export function makeRock({ scale = 1, seed = 1, color = 0x7a7268 } = {}) {
  const rng = makeRng(seed);
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(i, p.getX(i) * rng.range(0.85, 1.15), p.getY(i) * rng.range(0.6, 1.1), p.getZ(i) * rng.range(0.85, 1.15));
  }
  const m = new THREE.Mesh(geo, LAM(color));
  m.scale.setScalar(scale);
  m.rotation.y = rng.range(0, Math.PI);
  return m;
}

/** A marble column: base, fluted-ish shaft, capital. */
export function makeColumn({ h = 4, r = 0.35, color = 0xe8e2d0 } = {}) {
  const g = new THREE.Group();
  const m = LAM(color);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.5, r * 1.7, 0.35, 8), m);
  base.position.y = 0.18;
  g.add(base);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 10), m);
  shaft.position.y = 0.35 + h / 2;
  g.add(shaft);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.6, r * 1.3, 0.3, 8), m);
  cap.position.y = h + 0.5;
  g.add(cap);
  return g;
}

/** A throne of marble and gold. */
export function makeThrone({ scale = 1 } = {}) {
  const g = new THREE.Group();
  const stone = LAM(0xd8d2c4);
  const gold = LAM(0xc9a63a, { emissive: 0x1a1402 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 1.2), stone);
  seat.position.y = 1.3;
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 0.28), stone);
  back.position.set(0, 2.2, -0.5);
  g.add(back);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 1.1), stone);
    arm.position.set(sx * 0.85, 1.55, 0);
    g.add(arm);
  }
  const pad = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.9), gold);
  pad.position.y = 1.5;
  g.add(pad);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.14), gold);
  crest.position.set(0, 3.25, -0.5);
  g.add(crest);
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.3, 0.2), gold);
    leg.position.set([-0.6, 0.6][i % 2], 0.65, [0.45, -0.45][Math.floor(i / 2)]);
    g.add(leg);
  }
  g.scale.setScalar(scale);
  return g;
}

/** A vine hanging from a ceiling — for Calypso's cave. */
export function makeVine({ from = [0, 4, 0], sway = 1.2, len = 2.6, seed = 1, color = 0x3a5a3a } = {}) {
  const g = new THREE.Group();
  const rng = makeRng(seed);
  const pts = [new THREE.Vector3(0, 0, 0)];
  const segs = 4;
  for (let i = 1; i <= segs; i++) {
    const k = i / segs;
    pts.push(new THREE.Vector3(rng.range(-0.15, 0.15) * k, -len * k * k, rng.range(-0.15, 0.15) * k));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.045, 5), LAM(color));
  g.add(tube);
  const leafM = LAM(0x4a6a3a);
  for (let i = 0; i < 5; i++) {
    const lf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), leafM);
    lf.scale.set(1, 0.5, 1);
    const p = curve.getPoint(0.2 + i * 0.16);
    lf.position.copy(p);
    g.add(lf);
  }
  g.position.set(from[0], from[1], from[2]);
  g.userData.sway = sway;
  g.userData.seed = seed;
  return g;
}

/** A flat grassy/rocky island shelf built from layered noise — the general
 *  purpose terrain. Returns { group, heightAt(x,z) }. */
export function makeIsland({
  radius = 40, seed = 1, height = 6, sand = 0xc8b27a, green = 0x6a7a4a,
  rock = 0x8a8072, segs = 56,
} = {}) {
  const rng = makeRng(seed);
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2, segs, segs);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cSand = new THREE.Color(sand), cGreen = new THREE.Color(green), cRock = new THREE.Color(rock);
  const _c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.sqrt(x * x + z * z) / radius;
    let h = 0;
    if (d < 1) {
      // Falloff from the rim; noise makes the shore ragged.
      h = height * Math.pow(1 - d, 1.6) + height * 0.28 * (noise2(x * 0.05, z * 0.05, seed) * (1 - d));
    }
    // A couple of peaks.
    h += height * 0.6 * Math.exp(-((x - radius * 0.3) ** 2 + (z + radius * 0.15) ** 2) / (radius * 0.5) ** 2);
    h += height * 0.5 * Math.exp(-((x + radius * 0.35) ** 2 + (z - radius * 0.2) ** 2) / (radius * 0.45) ** 2);
    pos.setY(i, Math.max(h, 0));
    const slope = h > 0.4 ? 1 - Math.min(1, Math.abs(h - height * 0.4) / (height * 0.8)) : 1;
    _c.copy(cSand).lerp(cGreen, Math.min(1, h / height) * 0.85 * slope);
    _c.lerp(cRock, h > height * 0.6 ? 0.5 : 0);
    colors[i * 3] = _c.r; colors[i * 3 + 1] = _c.g; colors[i * 3 + 2] = _c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;

  const baseY = pos.array.slice();
  const heightAt = (x, z) => {
    // Grid lookup. Vertices run rows-along-x, rows ordered from z=+r down to z=-r.
    const gx = ((x + radius) / (radius * 2)) * segs;
    const gy = ((radius - z) / (radius * 2)) * segs;
    const i0 = Math.floor(gx), j0 = Math.floor(gy);
    if (i0 < 0 || j0 < 0 || i0 >= segs || j0 >= segs) return 0;
    const stride = segs + 1;
    const fx = gx - i0, fz = gy - j0;
    const idx = (j0 * stride + i0) * 3 + 1;
    const a = baseY[idx], b = baseY[idx + 3], c = baseY[idx + stride * 3], d = baseY[idx + stride * 3 + 3];
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  };

  return { mesh, heightAt, group: mesh };
}

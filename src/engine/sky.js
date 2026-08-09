// Sky: a gradient dome, a sun (or moon), stars, and drifting clouds.
// Presets are palettes; blend(a, b, k) crossfades everything — dome colors,
// fog, sun, stars, clouds, and the three lights — so a sequence can move from
// night to dawn without snapping.

import * as THREE from 'three';
import { lerp } from './ease.js';
import { makeRng } from './rng.js';
import { makeGlowTexture } from '../world/fx.js';

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const SKY_FRAG = `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSunPower;
uniform float uSunHalo;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float h = clamp(dir.y, -1.0, 1.0);
  vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.05, 0.62, h), 0.78));
  col = mix(col, uHorizon * 1.22, smoothstep(-0.015, 0.075, h) * (1.0 - smoothstep(0.075, 0.2, h)));
  float s = max(dot(dir, normalize(uSunDir)), 0.0);
  col += uSunColor * pow(s, 8.0) * uSunHalo;
  col += uSunColor * pow(s, uSunPower);
  gl_FragColor = vec4(col, 1.0);
}`;

// Palettes. Numbers are [r,g,b] 0-1; sunPos is a direction.
const P = {
  night: {
    top: [0.016, 0.03, 0.09], horizon: [0.10, 0.16, 0.28],
    fog: [0.035, 0.06, 0.12], fogNear: 30, fogFar: 420,
    sunPos: [0.35, 0.42, -0.84], sunColor: [0.92, 0.95, 1.0], sunScale: 46, sunPower: 260,
    sunHalo: 0.30, sunI: 0.55, ambient: 0.34, hemi: 0.5, starO: 1.0,
    cloudColor: [0.10, 0.12, 0.18], cloudO: 0.16, cloudY: 110,
  },
  dawn: {
    top: [0.10, 0.06, 0.20], horizon: [0.86, 0.56, 0.37],
    fog: [0.30, 0.18, 0.24], fogNear: 30, fogFar: 520,
    sunPos: [0.12, 0.10, -0.99], sunColor: [1.0, 0.85, 0.62], sunScale: 90, sunPower: 190,
    sunHalo: 0.55, sunI: 1.5, ambient: 0.55, hemi: 0.85, starO: 0.12,
    cloudColor: [0.55, 0.42, 0.48], cloudO: 0.30, cloudY: 110,
  },
  day: {
    top: [0.18, 0.36, 0.54], horizon: [0.81, 0.88, 0.92],
    fog: [0.62, 0.72, 0.80], fogNear: 60, fogFar: 760,
    sunPos: [0.30, 0.60, -0.74], sunColor: [1.0, 0.97, 0.86], sunScale: 76, sunPower: 220,
    sunHalo: 0.42, sunI: 1.7, ambient: 0.75, hemi: 1.0, starO: 0.0,
    cloudColor: [0.95, 0.96, 0.98], cloudO: 0.55, cloudY: 120,
  },
  gold: {   // the Sun-god's warning: everything burning
    top: [0.24, 0.07, 0.02], horizon: [1.0, 0.70, 0.36],
    fog: [0.42, 0.20, 0.08], fogNear: 40, fogFar: 560,
    sunPos: [0.05, 0.06, -0.997], sunColor: [1.0, 0.82, 0.45], sunScale: 190, sunPower: 150,
    sunHalo: 0.85, sunI: 2.4, ambient: 0.8, hemi: 0.9, starO: 0.0,
    cloudColor: [0.50, 0.30, 0.18], cloudO: 0.42, cloudY: 120,
  },
  ember: {  // Troy burning at night
    top: [0.035, 0.02, 0.03], horizon: [0.28, 0.12, 0.06],
    fog: [0.10, 0.045, 0.03], fogNear: 25, fogFar: 380,
    sunPos: [0.1, 0.25, -0.96], sunColor: [1.0, 0.55, 0.28], sunScale: 34, sunPower: 240,
    sunHalo: 0.35, sunI: 0.8, ambient: 0.5, hemi: 0.4, starO: 0.5,
    cloudColor: [0.16, 0.09, 0.07], cloudO: 0.5, cloudY: 80,
  },
  storm: {
    top: [0.015, 0.02, 0.035], horizon: [0.11, 0.14, 0.18],
    fog: [0.05, 0.06, 0.09], fogNear: 18, fogFar: 260,
    sunPos: [-0.3, 0.18, -0.93], sunColor: [0.42, 0.47, 0.55], sunScale: 22, sunPower: 120,
    sunHalo: 0.12, sunI: 0.5, ambient: 0.85, hemi: 0.6, starO: 0.0,
    cloudColor: [0.09, 0.10, 0.13], cloudO: 0.92, cloudY: 46,
  },
  olympus: {
    top: [0.23, 0.43, 0.65], horizon: [0.93, 0.96, 0.99],
    fog: [0.78, 0.86, 0.93], fogNear: 80, fogFar: 900,
    sunPos: [0.28, 0.55, -0.79], sunColor: [1.0, 0.99, 0.92], sunScale: 80, sunPower: 210,
    sunHalo: 0.45, sunI: 1.9, ambient: 0.85, hemi: 1.0, starO: 0.0,
    cloudColor: [1.0, 1.0, 1.0], cloudO: 0.95, cloudY: 130,
  },
  cave: {   // inside Calypso's cavern — almost no sky
    top: [0.012, 0.014, 0.022], horizon: [0.055, 0.06, 0.09],
    fog: [0.02, 0.022, 0.035], fogNear: 8, fogFar: 90,
    sunPos: [0.3, 0.4, -0.86], sunColor: [0.20, 0.22, 0.30], sunScale: 12, sunPower: 60,
    sunHalo: 0.02, sunI: 0.12, ambient: 0.5, hemi: 0.25, starO: 0.0,
    cloudColor: [0.05, 0.05, 0.07], cloudO: 0.0, cloudY: 60,
  },
};

const c3 = (v) => new THREE.Color(v[0], v[1], v[2]);
const v3a = (v) => new THREE.Vector3(v[0], v[1], v[2]);

/**
 * Install the sky into a scene. Returns { blend(a,b,k), update(t), dirLight,
 * hemiLight, ambientLight, sky, stars, clouds }. `shadowExtent` bounds the sun
 * shadow camera.
 */
export function installSky(scene, preset = 'day', { shadowExtent = 70 } = {}) {
  const skyGeo = new THREE.SphereGeometry(1500, 24, 14);
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: {
      uTop: { value: c3(P[preset].top) },
      uHorizon: { value: c3(P[preset].horizon) },
      uSunDir: { value: v3a(P[preset].sunPos) },
      uSunColor: { value: c3(P[preset].sunColor) },
      uSunPower: { value: P[preset].sunPower },
      uSunHalo: { value: P[preset].sunHalo },
    },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.renderOrder = -10;
  scene.add(sky);

  const glow = makeGlowTexture();
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color: c3(P[preset].sunColor), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, fog: false,
  }));
  sunSprite.scale.setScalar(P[preset].sunScale);
  sunSprite.position.copy(v3a(P[preset].sunPos).multiplyScalar(1300));
  scene.add(sunSprite);

  // Stars — a fixed sphere of points, faded by material opacity.
  const starCount = 650;
  const starPos = new Float32Array(starCount * 3);
  const srng = makeRng(4242);
  for (let i = 0; i < starCount; i++) {
    const th = srng.range(0, Math.PI * 2);
    const ph = Math.acos(srng.range(0.02, 1)); // upper hemisphere
    const r = srng.range(700, 1450);
    starPos[i * 3] = Math.sin(ph) * Math.cos(th) * r;
    starPos[i * 3 + 1] = Math.cos(ph) * r;
    starPos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    size: 2.2, map: glow, transparent: true, depthWrite: false,
    sizeAttenuation: false, opacity: P[preset].starO, fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -9;
  scene.add(stars);

  // Clouds — flattened blobs drifting on a slow turntable.
  const crng = makeRng(77);
  const maxClouds = 22;
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshLambertMaterial({
    color: c3(P[preset].cloudColor), transparent: true, opacity: P[preset].cloudO,
    depthWrite: false,
  });
  for (let i = 0; i < maxClouds; i++) {
    const g = new THREE.Group();
    const blobs = 1 + crng.int(1, 3);
    const sub = new THREE.Group();
    for (let b = 0; b < blobs; b++) {
      const s = crng.range(8, 20);
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 7, 5), cloudMat);
      m.scale.set(s * crng.range(1.4, 2.4), s * 0.32, s * crng.range(0.8, 1.5));
      m.position.set(crng.range(-12, 12), crng.range(-1.5, 2), crng.range(-8, 8));
      sub.add(m);
    }
    const a = crng.range(0, Math.PI * 2);
    const r = crng.range(190, 420);
    g.position.set(Math.cos(a) * r, crng.range(-14, 10), Math.sin(a) * r);
    g.add(sub);
    clouds.add(g);
  }
  scene.add(clouds);

  // Lights.
  const hemiLight = new THREE.HemisphereLight(c3(P[preset].top), c3([0.08, 0.06, 0.05]), P[preset].hemi);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(c3([0.4, 0.42, 0.5]), P[preset].ambient);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(c3(P[preset].sunColor), P[preset].sunI);
  dirLight.position.copy(v3a(P[preset].sunPos).multiplyScalar(120));
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.left = -shadowExtent;
  dirLight.shadow.camera.right = shadowExtent;
  dirLight.shadow.camera.top = shadowExtent;
  dirLight.shadow.camera.bottom = -shadowExtent;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 500;
  dirLight.shadow.bias = -0.0004;
  scene.add(dirLight);

  const state = { a: preset, b: preset, k: 0 };

  return {
    dirLight, hemiLight, ambientLight, sky, stars, clouds, sunSprite,

    blend(a, b, k) {
      state.a = a; state.b = b; state.k = k;
    },

    set(preset) {
      state.a = preset; state.b = preset; state.k = 0;
    },

    update(t) {
      const pa = P[state.a], pb = P[state.b], k = state.k;
      const top = c3([]).lerpColors(c3(pa.top), c3(pb.top), k);
      const horizon = c3([]).lerpColors(c3(pa.horizon), c3(pb.horizon), k);
      const fog = c3([]).lerpColors(c3(pa.fog), c3(pb.fog), k);
      const sunCol = c3([]).lerpColors(c3(pa.sunColor), c3(pb.sunColor), k);
      const sunDir = v3a([]).lerpVectors(v3a(pa.sunPos), v3a(pb.sunPos), k).normalize();

      skyMat.uniforms.uTop.value.copy(top);
      skyMat.uniforms.uHorizon.value.copy(horizon);
      skyMat.uniforms.uSunDir.value.copy(sunDir);
      skyMat.uniforms.uSunColor.value.copy(sunCol);
      skyMat.uniforms.uSunPower.value = lerp(pa.sunPower, pb.sunPower, k);
      skyMat.uniforms.uSunHalo.value = lerp(pa.sunHalo, pb.sunHalo, k);

      sunSprite.material.color.copy(sunCol);
      sunSprite.scale.setScalar(lerp(pa.sunScale, pb.sunScale, k));
      sunSprite.position.copy(sunDir).multiplyScalar(1300);

      starMat.opacity = lerp(pa.starO, pb.starO, k);
      stars.visible = starMat.opacity > 0.02;

      cloudMat.color.copy(c3([]).lerpColors(c3(pa.cloudColor), c3(pb.cloudColor), k));
      cloudMat.opacity = lerp(pa.cloudO, pb.cloudO, k);
      clouds.visible = cloudMat.opacity > 0.01;
      clouds.position.y = lerp(pa.cloudY, pb.cloudY, k);
      clouds.rotation.y = t * 0.004;

      scene.fog = new THREE.Fog(fog, lerp(pa.fogNear, pb.fogNear, k), lerp(pa.fogFar, pb.fogFar, k));
      scene.background = null;

      hemiLight.intensity = lerp(pa.hemi, pb.hemi, k);
      ambientLight.intensity = lerp(pa.ambient, pb.ambient, k);
      dirLight.intensity = lerp(pa.sunI, pb.sunI, k);
      dirLight.color.copy(sunCol);
      dirLight.position.copy(sunDir).multiplyScalar(120);
    },
  };
}

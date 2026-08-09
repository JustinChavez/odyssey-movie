// Deterministic randomness + value noise.
// The film must render identically every play, so nothing in the asset bank
// is allowed to touch Math.random().

/** mulberry32 — small, fast, good enough for scattering everything. */
export function makeRng(seed = 1337) {
  let a = seed >>> 0;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rand.range = (lo, hi) => lo + rand() * (hi - lo);
  rand.int = (lo, hi) => Math.floor(lo + rand() * (hi - lo + 1));
  rand.sign = () => (rand() < 0.5 ? -1 : 1);
  rand.chance = (p) => rand() < p;
  rand.pick = (arr) => arr[Math.floor(rand() * arr.length)];
  rand.gauss = (mean = 0, sd = 1) => {
    const s = rand() + rand() + rand() + rand() + rand() + rand() - 3;
    return mean + s * sd * 0.7071;
  };
  rand.fork = (salt = 0) => makeRng((a ^ (salt * 0x9e3779b1)) >>> 0);
  rand.seed = seed;
  return rand;
}

// --- 2D value noise -------------------------------------------------------

const hash2 = (x, y, seed) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/** 2D value noise in [-1, 1]. */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  const top = a + (b - a) * u;
  const bot = c + (d - c) * u;
  return (top + (bot - top) * v) * 2 - 1;
}

/** Fractal brownian motion — layered value noise in [-1,1]. */
export function fbm(x, y, { octaves = 4, lacunarity = 2.0, gain = 0.5, seed = 0 } = {}) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq, seed + i * 71);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** 1D noise, handy for camera handheld drift and flame flicker. */
export function noise1(x, seed = 0) {
  return noise2(x, 0.5, seed);
}

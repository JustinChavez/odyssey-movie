// Easing + math helpers. Everything takes/returns normalized t in [0,1].

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const clamp01 = (x) => clamp(x, 0, 1);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const remap = (v, a, b, c, d) => lerp(c, d, clamp01(invLerp(a, b, v)));
export const saturate = clamp01;

export const linear = (t) => t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);

export const outQuad = (t) => 1 - (1 - t) * (1 - t);
export const inOutQuad = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const outCubic = (t) => 1 - Math.pow(1 - t, 3);
export const inCubic = (t) => t * t * t;
export const outQuart = (t) => 1 - Math.pow(1 - t, 4);
export const outExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Ramp up then back down: 0 -> 1 -> 0 across [0,1]. */
export const pulse = (t) => Math.sin(clamp01(t) * Math.PI);

/**
 * Trapezoid velocity: accelerate over the first `a`, hold a CONSTANT speed
 * through the middle, decelerate over the last `b`. The house default for
 * camera moves — an S-curve is only ever at full speed for an instant, which
 * reads as drifting; a move wants to commit to a speed and hold it.
 */
export function linearRamp(a = 0.16, b = 0.22) {
  const plateau = 1 - a - b;
  const area = 1 - a / 2 - b / 2;
  return (t) => {
    t = clamp01(t);
    if (t < a) return (t * t) / (2 * a) / area;
    if (t <= 1 - b) return (a / 2 + (t - a)) / area;
    const u = t - (1 - b);
    return (a / 2 + plateau + (u - (u * u) / (2 * b))) / area;
  };
}

/** Fade in over `inDur`, hold, fade out over `outDur`, across a window of length `len`. */
export function envelope(t, len, inDur = 0.4, outDur = 0.4) {
  if (t <= 0 || t >= len) return 0;
  const a = inDur > 0 ? clamp01(t / inDur) : 1;
  const b = outDur > 0 ? clamp01((len - t) / outDur) : 1;
  return smooth(Math.min(a, b));
}

/** Damped approach, frame-rate independent. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/** Triangle wave in [0,1] with period 1. */
export const tri = (t) => 1 - Math.abs(((t % 1) + 1) % 1 - 0.5) * 2;

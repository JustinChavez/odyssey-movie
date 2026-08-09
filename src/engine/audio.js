// Sound — entirely synthesised in WebAudio, zero bytes of audio shipped.
//
// One looping noise bed per "voice" (wind, waves, rain, fire, birds, drip,
// pad), each through its own filter and gain. A sequence picks a mix of
// voice targets; gains ease toward them. Thunder is scheduled on demand
// against the director's clock.

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Looping brown-ish noise — the raw material for nearly all of it. */
export function noiseBuffer(ctx, seconds = 4) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    d[i] = last * 3.2;
  }
  return buf;
}

function noiseLayer(ctx, dest, { type = 'lowpass', freq = 500, q = 0.7, gain = 0 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = freq;
  filt.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filt).connect(g).connect(dest);
  src.start();
  return { src, filt, gain: g };
}

function thunderClap(ctx, dest, when, strength = 1) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 3);
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.setValueAtTime(340, when);
  filt.frequency.exponentialRampToValueAtTime(60, when + 2.2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(0.5 * strength, when + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 2.6);
  src.connect(filt).connect(g).connect(dest);
  src.start(when);
  src.stop(when + 2.8);
}

// Each sequence picks a mix of voices. 0 = off, 1 = full.
const MIXES = {
  invocation: { wind: 0.5, waves: 0.55, birds: 0.0, fire: 0.25, rain: 0, drip: 0, pad: 0.08 },
  troy: { wind: 0.3, waves: 0.2, birds: 0, fire: 0.85, rain: 0, drip: 0, pad: 0 },
  wandering: { wind: 0.25, waves: 0.75, birds: 0.5, fire: 0, rain: 0, drip: 0, pad: 0 },
  thrinacia: { wind: 0.2, waves: 0.45, birds: 0, fire: 0.7, rain: 0, drip: 0, pad: 0 },
  wrath: { wind: 0.6, waves: 0.9, birds: 0, fire: 0.3, rain: 0.55, drip: 0, pad: 0.1 },
  calypso: { wind: 0.3, waves: 0.5, birds: 0, fire: 0.5, rain: 0, drip: 0.4, pad: 0.15 },
  olympus: { wind: 0.2, waves: 0, birds: 0, fire: 0, rain: 0, drip: 0, pad: 0.8 },
  poseidon: { wind: 0.8, waves: 1.0, birds: 0, fire: 0, rain: 0.9, drip: 0, pad: 0.1 },
  ithaca: { wind: 0.15, waves: 0.5, birds: 0.7, fire: 0.2, rain: 0, drip: 0, pad: 0.15 },
};

export class MovieAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this._targets = { wind: 0, waves: 0, birds: 0, fire: 0, rain: 0, drip: 0, pad: 0 };
    this._thunder = [];
    this._fired = new Set();
  }

  async start() {
    if (this.ctx) { await this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const master = this.ctx.createGain();
    master.gain.value = 0.9;
    master.connect(this.ctx.destination);
    this.master = master;

    const voices = {
      wind: noiseLayer(this.ctx, master, { type: 'bandpass', freq: 260, q: 0.5 }),
      waves: noiseLayer(this.ctx, master, { type: 'lowpass', freq: 420, q: 0.6 }),
      birds: noiseLayer(this.ctx, master, { type: 'highpass', freq: 1800, q: 0.4 }),
      fire: noiseLayer(this.ctx, master, { type: 'bandpass', freq: 900, q: 1.1 }),
      rain: noiseLayer(this.ctx, master, { type: 'highpass', freq: 900, q: 0.5 }),
      drip: noiseLayer(this.ctx, master, { type: 'bandpass', freq: 1400, q: 3 }),
      pad: noiseLayer(this.ctx, master, { type: 'lowpass', freq: 320, q: 0.9 }),
    };
    this.voices = voices;
    // Slow swell on the waves voice so the sea breathes.
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.11;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.12;
    lfo.connect(lfoGain).connect(voices.waves.gain.gain);
    lfo.start();
    this._lfo = lfo;
  }

  /** Pause/resume the whole ambience bed (suspend stops the AudioContext). */
  setPaused(on) {
    if (!this.ctx) return;
    if (on) this.ctx.suspend();
    else this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.9 : 0;
  }

  setAmbience(id) {
    const mix = MIXES[id] || MIXES.invocation;
    this._targets = { ...mix };
  }

  /** Absolute director-time stamps for thunder. */
  setThunder(times) {
    this._thunder = times;
    this._fired = new Set();
  }

  /** Call every frame with the director clock. */
  update(t, playing) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    for (const [name, target] of Object.entries(this._targets)) {
      const v = this.voices[name];
      if (!v) continue;
      // Ease gain toward target; a little movement so it never sounds frozen.
      const cur = v.gain.gain.value;
      const next = cur + (target - cur) * 0.02;
      v.gain.gain.setTargetAtTime(next * 0.12, now, 0.4);
    }
    if (playing) {
      for (const th of this._thunder) {
        if (t >= th && !this._fired.has(th)) {
          this._fired.add(th);
          thunderClap(this.ctx, this.master, now + 0.03, 1);
        }
      }
    }
  }

  reset() { this._fired = new Set(); }
}

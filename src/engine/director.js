// The director: owns the renderer, the global clock, and the shot list.
//
// A shot is a plain object:
//   {
//     id, title, duration,
//     cut:      true -> hard cut in (no fade from black)
//     fadeIn/fadeOut: seconds of dip-to-black at the edges
//     captions: [[localStart, localEnd, text], ...]
//     build(ctx) -> { scene, camera, update(localT, dt) }
//   }
//
// Every shot owns its own THREE.Scene and camera. Only the active shot is
// rendered, so scene complexity is per-shot, not cumulative.

import * as THREE from 'three';
import { clamp01, smooth } from './ease.js';

export class Director {
  constructor(canvas, { onCaption, onFade, onShot, onTime } = {}) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.shots = [];
    this.duration = 0;
    this.time = 0;
    this.playing = false;
    this.rate = 1;

    this.onCaption = onCaption || (() => {});
    this.onFade = onFade || (() => {});
    this.onShot = onShot || (() => {});
    this.onTime = onTime || (() => {});

    this._activeIdx = -1;
    this._captionKey = null;
    this._lastFrame = 0;
    this._raf = null;
    this._alive = false;
    this._lastErrSec = -1;

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
  }

  /** Build every shot up front so playback never hitches. Yields to the
   *  event loop between shots so the loading bar can actually paint. */
  async load(shotDefs, onProgress = () => {}) {
    const ctx = { THREE, renderer: this.renderer };
    const compiled = new Set();
    let t = 0;
    for (let i = 0; i < shotDefs.length; i++) {
      const def = shotDefs[i];
      onProgress(i / shotDefs.length, def.title || def.id);
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

      const built = def.build(ctx);
      const shot = {
        def,
        id: def.id,
        title: def.title || def.id,
        start: t,
        duration: def.duration,
        end: t + def.duration,
        scene: built.scene,
        camera: built.camera,
        update: built.update || (() => {}),
        fadeIn: def.cut ? 0 : def.fadeIn != null ? def.fadeIn : 0.5,
        fadeOut: def.fadeOut != null ? def.fadeOut : 0.5,
        captions: (def.captions || []).map(([a, b, text]) => ({ start: a, end: b, text })),
      };
      if (!compiled.has(shot.scene)) {
        compiled.add(shot.scene);
        this.renderer.compile(shot.scene, shot.camera);
      }
      this.shots.push(shot);
      t += def.duration;
    }
    this.duration = t;
    onProgress(1, 'ready');
    this.resize();
    this._renderAt(0);
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    for (const s of this.shots) {
      if (s.camera.isPerspectiveCamera) {
        s.camera.aspect = w / h;
        s.camera.updateProjectionMatrix();
      }
    }
    if (!this.playing) this._renderAt(this.time);
  }

  shotAt(time) {
    const t = Math.min(Math.max(time, 0), Math.max(this.duration - 1e-4, 0));
    for (let i = 0; i < this.shots.length; i++) {
      if (t < this.shots[i].end || i === this.shots.length - 1) return i;
    }
    return 0;
  }

  play() {
    if (this.time >= this.duration - 1e-3) this.time = 0;
    this.playing = true;
    // Revive a dead loop instead of silently no-oping: if a frame ever threw
    // before re-scheduling itself, play() has to restart the rAF chain.
    if (!this._alive) {
      this._alive = true;
      this._lastFrame = performance.now();
      this._loop();
    }
  }

  pause() {
    this.playing = false;
    this._alive = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  toggle() {
    this.playing ? this.pause() : this.play();
  }

  seek(time) {
    this.time = Math.min(Math.max(time, 0), this.duration);
    this._captionKey = null;
    this._renderAt(this.time);
    this.onTime(this.time, this.duration);
  }

  seekShot(delta) {
    const i = this.shotAt(this.time);
    const atShotHead = this.time - this.shots[i].start < 1.0;
    const target = delta < 0 ? (atShotHead ? i - 1 : i) : i + 1;
    const j = Math.min(Math.max(target, 0), this.shots.length - 1);
    this.seek(this.shots[j].start + 1e-3);
  }

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());
    const now = performance.now();
    const dt = Math.min((now - this._lastFrame) / 1000, 1 / 15) * this.rate;
    this._lastFrame = now;
    this.time += dt;
    try {
      if (this.time >= this.duration) {
        this.time = this.duration;
        this._renderAt(this.time, dt);
        this.pause();
        this.onTime(this.time, this.duration);
        this.onShot(null, this.shots.length);
        return;
      }
      this._renderAt(this.time, dt);
      this.onTime(this.time, this.duration);
    } catch (err) {
      // A bad frame must never kill the film's clock. Log once per second
      // and keep going; the pre-scheduled next frame is unaffected.
      const t = Math.floor(performance.now() / 1000);
      if (t !== this._lastErrSec) {
        this._lastErrSec = t;
        console.error('[director] frame error:', err);
      }
    }
  }

  _renderAt(time, dt = 1 / 60) {
    if (!this.shots.length) return;
    const idx = this.shotAt(time);
    const shot = this.shots[idx];
    const local = Math.min(Math.max(time - shot.start, 0), shot.duration);

    if (idx !== this._activeIdx) {
      this._activeIdx = idx;
      this.onShot(shot, idx);
    }

    shot.update(local, dt);
    this.renderer.render(shot.scene, shot.camera);

    // Dip to black at shot edges. First and last shot always fade from/to black.
    let fade = 0;
    if (shot.fadeIn > 0 && local < shot.fadeIn) fade = 1 - smooth(clamp01(local / shot.fadeIn));
    const outStart = shot.duration - shot.fadeOut;
    if (shot.fadeOut > 0 && local > outStart) {
      const next = this.shots[idx + 1];
      if (!next || !next.def.cut) fade = Math.max(fade, smooth(clamp01((local - outStart) / shot.fadeOut)));
    }
    this.onFade(fade);

    let active = null;
    for (const c of shot.captions) {
      if (local >= c.start && local < c.end) { active = c; break; }
    }
    const key = active ? `${idx}:${active.start}` : null;
    if (key !== this._captionKey) {
      this._captionKey = key;
      this.onCaption(active ? active.text : null);
    }
  }

  dispose() {
    this.pause();
    window.removeEventListener('resize', this._onResize);
    for (const s of this.shots) {
      s.scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m.dispose();
        }
      });
    }
    this.renderer.dispose();
  }
}

/** Format seconds as m:ss for the scrubber. */
export function timecode(s) {
  s = Math.max(0, Math.floor(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

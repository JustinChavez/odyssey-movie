// Wires the movie to the page: loading, transport, captions, narration.
//
// The narration is a set of pre-rendered voice clips (audio/narr_*.mp3),
// played shot-by-shot against the director's clock, with the browser's own
// speech synthesis as a fallback when a clip cannot be played.

import { Director, timecode } from './engine/director.js';
import { MovieAudio } from './engine/audio.js';
import { MOVIE, WRATH_STRIKES, POSEIDON_STRIKES } from './movie.js';

const $ = (id) => document.getElementById(id);

const canvas = $('c');
const capEl = $('caption');
const shotnameEl = $('shotname');
const fadeEl = $('fade');
const titleEl = $('title');
const playBtn = $('play');
const loadFill = $('loadfill');
const loadTxt = $('loadtxt');
const ui = $('ui');
const scrub = $('scrub');
const fillEl = $('fill');
const knobEl = $('knob');
const tcEl = $('tc');
const bPlay = $('bPlay');
const pg = $('pg');

const audio = new MovieAudio();

// Narration clips, indexed by shot order: audio/narr_00.mp3 …
const NARR = MOVIE.shots.map((s, i) => (s.captions.length ? `audio/narr_${String(i).padStart(2, '0')}.mp3` : null));
const narrAudio = new Audio();
narrAudio.preload = 'auto';
const preloadEl = new Audio();
preloadEl.preload = 'auto';

let voiceOn = true;
let soundOn = true;

function browserSpeak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const vs = window.speechSynthesis.getVoices?.() || [];
  const v = vs.find((x) => /Google US English/i.test(x.name)) || vs.find((x) => x.lang === 'en-US');
  if (v) u.voice = v;
  u.lang = 'en-US';
  u.rate = 0.94;
  window.speechSynthesis.speak(u);
}

function stopNarration() {
  narrAudio.pause();
  window.speechSynthesis?.cancel();
}

function playShotNarration(shot, idx) {
  if (!voiceOn || !shot || idx >= NARR.length || !NARR[idx]) return;
  stopNarration();
  const src = NARR[idx];
  // Same src (e.g. the boot-warmed first clip): don't re-trigger a load.
  if (narrAudio.getAttribute('src') !== src) {
    narrAudio.src = src;
    // May throw before metadata loads (Safari) — harmless, a fresh src
    // starts at 0 anyway; we only need this to restart an old clip.
    try { narrAudio.currentTime = 0; } catch { /* ignore */ }
  }
  const go = () => narrAudio.play().catch(() => {
    // Autoplay policy (pre-gesture seeks) or a transient hiccup: try once
    // more shortly, then fall back to the browser's own voice.
    setTimeout(() => narrAudio.play().catch(() => browserSpeak(shot.captions[0].text)), 150);
  });
  if (narrAudio.readyState >= 2) go();
  else narrAudio.addEventListener('canplay', go, { once: true });
  // Warm the next clip so the cut lands on ready audio.
  const nxt = NARR[idx + 1];
  if (nxt && preloadEl.getAttribute('src') !== nxt) preloadEl.src = nxt;
}

const director = new Director(canvas, {
  onCaption(html) {
    if (html) {
      capEl.innerHTML = html;
      capEl.classList.add('show');
    } else {
      capEl.classList.remove('show');
    }
  },
  onFade(k) {
    fadeEl.style.opacity = k.toFixed(3);
  },
  onShot(shot, idx) {
    shotnameEl.textContent = shot ? shot.title : '';
    if (shot) audio.setAmbience(shot.id.replace(/[0-9]$/, '').replace(/[a-z]$/, ''));
    if (!shot) {
      pg.textContent = '\u25B6';
      stopNarration();
      audio.setPaused(true);
      endCard.classList.add('show');
    } else {
      endCard.classList.remove('show');
      playShotNarration(shot, idx);
    }
  },
  onTime(t, dur) {
    audio.update(t, director.playing);
    const pct = dur > 0 ? (t / dur) * 100 : 0;
    fillEl.style.width = `${pct}%`;
    knobEl.style.left = `${pct}%`;
    tcEl.textContent = `${timecode(t)} / ${timecode(dur)}`;
    pg.textContent = director.playing ? '\u275A\u275A' : '\u25B6';
  },
});

// ---------------------------------------------------------------------------
// End card
// ---------------------------------------------------------------------------

const endCard = document.createElement('div');
endCard.id = 'end';
endCard.innerHTML =
  '<p class="fin">FIN</p>' +
  '<p class="endline">Book I — and the tale begins.</p>' +
  '<p class="endline sm">Homer &middot; <em>The Odyssey</em>, tr. Samuel Butler</p>';
document.body.appendChild(endCard);

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

(async function boot() {
  try {
    await director.load(MOVIE.shots, (p, name) => {
      loadFill.style.width = `${Math.round(p * 100)}%`;
      loadTxt.textContent = p >= 1 ? 'ready' : name;
    });
  } catch (err) {
    loadTxt.textContent = 'failed to build — see console';
    console.error(err);
    return;
  }

  tcEl.textContent = `0:00 / ${timecode(director.duration)}`;

  // Warm the first narration clip now, so it is already loaded (and
  // playable) by the time Play is clicked. Assigning src and calling play()
  // in the same frame otherwise races the element's own load.
  if (NARR[0]) narrAudio.src = NARR[0];

  const wrath = director.shots.find((s) => s.id.startsWith('wrath'));
  if (wrath) audio.setThunder(WRATH_STRIKES.map((t) => wrath.start + t));
  const poseidon = director.shots.find((s) => s.id.startsWith('poseidon'));
  if (poseidon) audio.setThunder([...audio._thunder, ...POSEIDON_STRIKES.map((t) => poseidon.start + t)]);

  playBtn.disabled = false;
  playBtn.textContent = 'Play';
  // Deliberately NOT focusing the button: a focused button plus a stray
  // Space/Enter right after refresh would start the film unprompted.

  // Deep-link test mode: ?auto&shot=N&t=SEC skips the title card and jumps
  // straight into a shot. Handy for poking at frames without the mouse.
  const params = new URLSearchParams(location.search);
  if (params.has('auto')) {
    titleEl.classList.add('gone');
    document.body.classList.remove('titlemode');
    const si = Math.min(parseInt(params.get('shot') || '0', 10), director.shots.length - 1);
    const off = parseFloat(params.get('t') || '0');
    director.seek(director.shots[si].start + off);
    if (params.has('play')) director.play();
    showUI();
  }
})();

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

async function start() {
  titleEl.classList.add('gone');
  document.body.classList.remove('titlemode');
  // Start the film NOW. The narration is a plain <audio> element — it must
  // not wait for the WebAudio ambience (AudioContext + noise buffers take
  // the better part of a second to come up). Let the ambience start in the
  // background and fade in behind the first line.
  director.play();
  // director.play() does not re-fire onShot for the shot already on screen —
  // it fired once at boot, while the browser was still blocking audio — so
  // the current line has to be started explicitly here.
  narrateCurrent();
  showUI();
  try { await audio.start(); } catch { /* silent film, then */ }
}

function narrateCurrent() {
  const idx = director.shotAt(director.time);
  if (director.shots[idx]) playShotNarration(director.shots[idx], idx);
}

playBtn.addEventListener('click', start);

bPlay.addEventListener('click', () => {
  director.toggle();
  if (director.playing) {
    audio.setPaused(false);
    narrateCurrent();
  } else {
    stopNarration();
    audio.setPaused(true);
  }
});

function toggleCap() {
  document.body.classList.toggle('nocap');
}
function toggleVoice() {
  voiceOn = !voiceOn;
  if (!voiceOn) stopNarration();
}
function toggleSound() {
  soundOn = !soundOn;
  audio.setEnabled(soundOn);
}
function toggleFull() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

// Scrub
let scrubbing = false;
const seekFromEvent = (e) => {
  audio.reset();
  stopNarration();
  const r = scrub.getBoundingClientRect();
  const x = ((e.clientX ?? e.touches?.[0]?.clientX) - r.left) / r.width;
  director.seek(Math.max(0, Math.min(1, x)) * director.duration);
  const idx = director.shotAt(director.time);
  if (voiceOn) playShotNarration(director.shots[idx], idx);
};
scrub.addEventListener('pointerdown', (e) => {
  scrubbing = true;
  scrub.classList.add('drag');
  scrub.setPointerCapture(e.pointerId);
  seekFromEvent(e);
});
scrub.addEventListener('pointermove', (e) => { if (scrubbing) seekFromEvent(e); });
scrub.addEventListener('pointerup', (e) => {
  scrubbing = false;
  scrub.classList.remove('drag');
  scrub.releasePointerCapture(e.pointerId);
});

// ---------------------------------------------------------------------------
// Auto-hiding UI
// ---------------------------------------------------------------------------

let hideTimer = null;
function showUI() {
  if (document.body.classList.contains('titlemode')) return;
  ui.classList.add('show');
  document.body.style.cursor = '';
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (director.playing && !scrubbing) {
      ui.classList.remove('show');
      document.body.style.cursor = 'none';
    }
  }, 2600);
}
window.addEventListener('pointermove', showUI);
window.addEventListener('pointerdown', showUI);

// ---------------------------------------------------------------------------
// Keyboard
// ---------------------------------------------------------------------------

window.addEventListener('keydown', (e) => {
  // On the title screen, no key starts the film — a refresh followed by a
  // stray Space/Enter was starting playback unprompted. Play is click-only.
  if (document.body.classList.contains('titlemode')) return;
  switch (e.code) {
    case 'Space': e.preventDefault(); bPlay.click(); showUI(); break;
    case 'ArrowRight': director.seek(director.time + (e.shiftKey ? 15 : 5)); showUI(); break;
    case 'ArrowLeft': director.seek(director.time - (e.shiftKey ? 15 : 5)); showUI(); break;
    case 'BracketRight': director.seekShot(1); showUI(); break;
    case 'BracketLeft': director.seekShot(-1); showUI(); break;
    case 'KeyC': toggleCap(); showUI(); break;
    case 'KeyV': toggleVoice(); showUI(); break;
    case 'KeyM': toggleSound(); showUI(); break;
    case 'KeyF': toggleFull(); break;
    case 'Home': director.seek(0); showUI(); break;
    default: break;
  }
});

// The single debug handle: `odyssey.director.seek(42)` and friends from the
// browser console. Nothing in the film reads it.
window.odyssey = { director, audio, movie: MOVIE };

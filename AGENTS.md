# AGENTS.md — orientation for coding agents

## What this repo is

A ~118-second procedural film of the opening of Homer's *Odyssey* (Book I,
Samuel Butler translation), rendered live in the browser with three.js. Nine
sequences, 24 shots. Every mesh, texture, camera move, particle system and
ambient sound is generated in code at load time; the only shipped media are 23
pre-rendered narration MP3s. It is a
static site with no build step, no package manager and no server-side
anything — the repo root is the deployable artifact. Open it over HTTP and it
plays.

## Layout

    index.html              the player: bronze/field-watch theme, title dial,
                            transport, all the CSS. Loads ./src/main.js.
    server.py               tiny no-cache static dev server
    scripts/gap-report.py   standalone silence measure/trim tool for the clips

    src/main.js             page wiring: boot, load, transport, keyboard,
                            captions, narration playback, deep-link mode
    src/movie.js            assembles the nine sequences into MOVIE.shots
    src/timing.js           narration clip lengths — the cut contract

    src/engine/director.js  renderer + global clock + shot list; fades, captions
    src/engine/camera.js    makeMove / makeHold, easing presets, handheld drift
    src/engine/sky.js       gradient dome, sun, stars, clouds, lights; palettes
                            (night/dawn/day/gold/ember/storm/olympus/cave)
                            crossfaded by blend(a, b, k)
    src/engine/sea.js       displaced wave plane; heightAt(x,z,t) so floating
                            things ride the exact surface the renderer draws
    src/engine/audio.js     WebAudio ambience: one filtered noise voice per
                            element, per-sequence mixes, scheduled thunder
    src/engine/rng.js       seeded mulberry32 + value noise / fbm
    src/engine/ease.js      easing and math helpers

    src/world/figures.js    people, gods, cattle, the Wooden Horse, trees,
                            rocks, columns, thrones, vines, island terrain
    src/world/fx.js         glow texture, fire, smoke, embers, rain, lightning
    src/world/ship.js       trireme and raft, both riding sea.heightAt()

    src/shots/common.js     newScene() + sequence() — the shot scaffolding
    src/shots/seq01…seq09   the nine sequences, one file each

    audio/narr_00…22.mp3    the narration, one clip per captioned shot

## The invariants — do not break these

1. **Determinism.** Scene code must never call `Math.random()`. Use
   `makeRng(seed)` from `src/engine/rng.js`. The single deliberate exception
   is the white-noise generator in `src/engine/audio.js` (`noiseBuffer`) —
   that is an audio buffer, not scene state, and it is fine there. Changing a
   seed changes the film.

2. **Shot index ↔ narration file.** `src/main.js` maps shot *i* to
   `audio/narr_XX.mp3`, `XX` zero-padded. The mapping is positional over
   `MOVIE.shots`, filtered to shots that have captions. Inserting, removing or
   reordering a shot silently re-points every clip after it. If you add a
   shot, you must re-render and renumber the clips.

3. **`src/timing.js` is the narration-cut contract.** Its numbers are
   *measured* clip lengths, not design values. Do not hand-tune them to
   change pacing — they exist so `sequence()` can guarantee a line finishes.
   Re-measure (`afinfo`, or `scripts/gap-report.py`) after re-voicing.

4. **The warp logic in `src/shots/common.js`.** `sequence()` computes
   `realDur = max(authoredDur, clip + 0.45)` and `warp = authoredDur /
   realDur`, then feeds every shot `t * warp`. Choreography is authored
   against `authoredDur` and *replayed slower*; that is why storms and camera
   moves keep their shape when a line runs long. Ambient animation runs on
   sequence time (`seqT`), not shot time, so effects continue across cuts.
   Touch this and every sequence's timing changes at once.

5. **Playback flow in `src/main.js`.** `start()` deliberately begins the
   film before awaiting the WebAudio context, and calls `narrateCurrent()`
   explicitly because `director.play()` does not re-fire `onShot` for the shot
   already on screen. Both are load-bearing against browser autoplay policy.

6. **The bronze theme in `index.html`.** The CSS and the title-dial SVG are
   the film's look. Treat them as art, not scaffolding.

## Commands

    python3 -m http.server 8123      # serve; any static server works
    python3 server.py 8123           # same, with caching disabled

    open http://localhost:8123/
    open 'http://localhost:8123/?auto&shot=14&t=2.2'   # jump to a frame, paused
    open 'http://localhost:8123/?auto&shot=19&play'    # play from a shot

    python scripts/gap-report.py                 # report silence per clip
    python scripts/gap-report.py --trim --dry-run # show the ffmpeg commands
    python scripts/gap-report.py --trim           # back up, then trim

There are no tests and no linter. Verification is visual: load a shot with
`?auto&shot=N`, look at it, and check the browser console for
`[director] frame error`. `window.odyssey` exposes `{ director, audio, movie }`
for console poking — e.g. `odyssey.director.seek(60)`.

## Conventions

- Plain ES modules loaded directly by the browser. **No build step, no
  bundler, no `package.json`.** three.js arrives via the import map in
  `index.html` (unpkg CDN, pinned version); adding a dependency means adding
  a CDN entry there.
- No external assets. Textures are drawn to a canvas, geometry is generated,
  sound is synthesized. The narration MP3s are the only exception.
- 2-space indent, single quotes, semicolons, trailing newline.
- Comments explain *what* and *why*, never *when* — no session history, no
  "the fix for…". If a comment would only make sense to someone who watched
  it being written, rewrite it.
- Each sequence file is self-contained: build the world, return
  `{ scene, sky, ..., ambient(seqT, dt) }`, then list the shot specs.

## If you change something

Re-play the whole film, not just the shot you touched — the sequence-level
`ambient()` and the narration warp mean a local edit can move things several
shots away. A shot's duration is derived, so check `src/timing.js` before
concluding a shot "is" 5 seconds long.

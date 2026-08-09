#!/usr/bin/env python
"""Measure — and optionally remove — silence at the ends of audio clips.

Built for the Odyssey film, useful for any narration-driven render: the film
is cut to the audio (see src/shots/common.js), so every unspoken tenth of a
second at the head or tail of a clip becomes a hole in the film. This scans a
directory of clips, reports the silence at each end, and can trim it.

Requires numpy, soundfile and imageio-ffmpeg (the last only for --trim).

Examples
--------
    python scripts/gap-report.py                          # analyse ./audio
    python scripts/gap-report.py --audio clips/ --pattern '*.wav'
    python scripts/gap-report.py --trim                   # back up + trim
    python scripts/gap-report.py --trim --dry-run         # show, don't touch
    python scripts/gap-report.py --threshold -40 --lead 0.08 --tail 0.10

Measurement
-----------
RMS over --window (20ms) frames; a frame counts as content above
--threshold (-45 dBFS). That threshold catches real silence only — hushed
openings near -40 dBFS must survive. Reported `lead`/`tail` are the raw
silences found; trimming keeps --lead (0.12s) and --tail (0.15s) of margin,
so a re-run over trimmed files reports lead ~0.12 and tail ~0.15.

Trim safety
-----------
- Originals are copied to <audio>/backup-<timestamp>/ first (--no-backup opts out).
- Per-end minima: a head with < --min-lead silence (0.15s) and a tail with
  < --min-tail (0.20s) are left untouched, so near-silent heads never get
  shaved into clipped speech.
- Re-encodes with the extension-appropriate codec (mp3: libmp3lame q2,
  wav: pcm_s16le, flac: flac, ogg: libvorbis). M4A/AAC are not readable by
  the underlying libsndfile — such files are skipped with a warning.
- Exit code 1 if any file failed to read or any trim command failed.
"""

import argparse
import glob
import json
import math
import os
import shutil
import subprocess
import sys
import time

import numpy as np
import soundfile as sf

CODECS = {
    ".mp3": ["-c:a", "libmp3lame", "-q:a", "2"],
    ".wav": ["-c:a", "pcm_s16le"],
    ".flac": ["-c:a", "flac"],
    ".ogg": ["-c:a", "libvorbis", "-q:a", "4"],
}


def envelope(path, window):
    """(sample rate, duration, window dBFS array, window length in seconds)."""
    data, sr = sf.read(path, dtype="float64", always_2d=True)
    mono = data.mean(axis=1)
    n = mono.size
    dur = n / sr
    w = max(1, int(round(window * sr)))
    nw = int(math.ceil(n / w))
    padded = np.concatenate([mono, np.zeros(nw * w - n)])
    rms = np.sqrt((padded.reshape(nw, w) ** 2).mean(axis=1))
    return sr, dur, 20.0 * np.log10(np.maximum(rms, 1e-12)), w / sr


def analyse(path, window, silence_db, lead_margin, tail_margin, min_lead, min_tail):
    """Silence at each end of one clip, and what trimming it would leave."""
    try:
        sr, dur, db, wsec = envelope(path, window)
    except Exception as err:  # noqa: BLE001 — per-file isolation
        return {"error": "%s: %s" % (type(err).__name__, err)}

    voiced = np.flatnonzero(db > silence_db)

    if voiced.size == 0:  # nothing above the floor anywhere: never touch it
        return {
            "dur": round(dur, 3), "lead": round(dur, 3), "tail": 0.0,
            "trimmed": round(dur, 3), "sr": sr, "peak_db": round(float(db.max()), 1),
            "kept_peak_db": round(float(db.max()), 1), "action": "skip",
            "reason": "no window above the silence floor", "start": 0.0,
            "lead_removed": 0.0, "tail_removed": 0.0,
        }

    lead = voiced[0] * wsec
    tail = max(0.0, dur - min(dur, (voiced[-1] + 1) * wsec))

    # Per-end thresholds: trimming one end never disturbs the other, and a
    # clip rendered with the lead margin already in place keeps its head.
    cut_lead = lead >= min_lead
    cut_tail = tail >= min_tail

    if cut_lead or cut_tail:
        start = lead - lead_margin if cut_lead else 0.0
        trimmed = dur - start - (tail - tail_margin if cut_tail else 0.0)
        action, reason = "trim", ""
        if not cut_lead:
            reason = "tail only, lead %.3fs already at margin" % lead
    else:
        start, trimmed, action = 0.0, dur, "skip"
        reason = "lead %.3fs < %.2fs and tail %.3fs < %.2fs" % (
            lead, min_lead, tail, min_tail)

    kept = db[int(start / wsec):int(math.ceil((start + trimmed) / wsec))]
    return {
        "dur": round(dur, 3), "lead": round(lead, 3), "tail": round(tail, 3),
        "trimmed": round(trimmed, 3), "sr": sr,
        "peak_db": round(float(db.max()), 1),
        "kept_peak_db": round(float(kept.max()), 1) if kept.size else -120.0,
        "action": action, "reason": reason, "start": round(start, 3),
        "lead_removed": round(lead - lead_margin if cut_lead else 0.0, 3),
        "tail_removed": round(tail - tail_margin if cut_tail else 0.0, 3),
    }


def scan(audio_dir, pattern, window, silence_db, lead_margin, tail_margin,
         min_lead, min_tail):
    paths = sorted(glob.glob(os.path.join(audio_dir, pattern)))
    unsupported = [p for p in paths if os.path.splitext(p)[1].lower() not in CODECS]
    for p in unsupported:
        print("  skip %s: format not readable (%s)" % (p, os.path.splitext(p)[1]))
    paths = [p for p in paths if p not in unsupported]
    if not paths:
        sys.exit("no files matching %r under %s" % (pattern, audio_dir))
    report = {}
    for p in paths:
        name = os.path.splitext(os.path.basename(p))[0]
        report[name] = analyse(p, window, silence_db, lead_margin, tail_margin,
                               min_lead, min_tail)
    return report


def table(report):
    head = "%-14s %7s %7s %7s %9s %8s %8s  %s" % (
        "clip", "dur", "lead", "tail", "trimmed", "saved", "peak dB", "action")
    rows = [head, "-" * len(head)]
    for name, r in report.items():
        if "error" in r:
            rows.append("%-14s ERROR: %s" % (name, r["error"]))
            continue
        rows.append("%-14s %7.3f %7.3f %7.3f %9.3f %8.3f %8.1f  %s" % (
            name, r["dur"], r["lead"], r["tail"], r["trimmed"],
            r["dur"] - r["trimmed"], r["peak_db"],
            r["action"] + (" (%s)" % r["reason"] if r["reason"] else "")))
    return "\n".join(rows)


def summary(report):
    ok = [r for r in report.values() if "error" not in r]
    if not ok:
        return "no readable clips"
    removed = sum(r["dur"] - r["trimmed"] for r in ok)
    n_trim = sum(1 for r in ok if r["action"] == "trim")
    n_err = len(report) - len(ok)
    return ("%d clips, %d to trim, %.3fs of silence to remove%s"
            % (len(ok), n_trim, removed, ", %d errors" % n_err if n_err else ""))


def trim(report, audio_dir, backup=True, dry_run=False):
    """Back up the originals, then cut each clip down in a single ffmpeg pass."""
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    to_trim = {n: r for n, r in report.items() if r.get("action") == "trim"}
    if not to_trim:
        print("nothing to trim")
        return None

    backup_dir = None
    if backup:
        backup_dir = os.path.join(audio_dir, "backup-" + time.strftime("%Y%m%d-%H%M%S"))
        os.makedirs(backup_dir)
        for name in to_trim:
            src = os.path.join(audio_dir, name + ".mp3")
            if os.path.exists(src):
                shutil.copy2(src, backup_dir)
        print("backed up %d clips to %s" % (len(to_trim), backup_dir))

    failed = 0
    for name, r in to_trim.items():
        ext = ".mp3"  # report keys carry no extension; resolve it on disk
        src = os.path.join(audio_dir, name + ext)
        if not os.path.exists(src):
            for cand in CODECS:
                if os.path.exists(os.path.join(audio_dir, name + cand)):
                    src = os.path.join(audio_dir, name + cand)
                    ext = cand
                    break
        codec = CODECS[ext]
        tmp = src + ".trim" + ext
        cmd = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
               "-ss", "%.3f" % r["start"], "-i", src, "-t", "%.3f" % r["trimmed"],
               *codec, tmp]
        if dry_run:
            print("  would trim %s: %.3fs -> %.3fs (-%.3fs)  [%s]"
                  % (name, r["dur"], r["trimmed"], r["dur"] - r["trimmed"],
                     " ".join(cmd)))
            continue
        try:
            subprocess.run(cmd, check=True)
            os.replace(tmp, src)
            print("  %s: %.3fs -> %.3fs (-%.3fs)"
                  % (name, r["dur"], r["trimmed"], r["dur"] - r["trimmed"]))
        except Exception as err:  # noqa: BLE001
            failed += 1
            print("  %s: TRIM FAILED: %s" % (name, err))
            if os.path.exists(tmp):
                os.remove(tmp)
    return backup_dir, failed


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--audio", default=os.path.join(root, "audio"),
                    help="directory to scan (default: ./audio)")
    ap.add_argument("--pattern", default="*.mp3",
                    help="glob pattern (default: *.mp3)")
    ap.add_argument("--out", default=None,
                    help="JSON destination (default: <audio>/gaps.json)")
    ap.add_argument("--window", type=float, default=0.020,
                    help="RMS envelope window in seconds (default: 0.02)")
    ap.add_argument("--threshold", type=float, default=-45.0,
                    help="dBFS above which a window is content (default: -45)")
    ap.add_argument("--lead", type=float, default=0.12,
                    help="lead silence kept after trimming (default: 0.12)")
    ap.add_argument("--tail", type=float, default=0.15,
                    help="tail silence kept after trimming (default: 0.15)")
    ap.add_argument("--min-lead", type=float, default=0.15,
                    help="below this head silence, leave the clip alone")
    ap.add_argument("--min-tail", type=float, default=0.20,
                    help="below this tail silence, leave the clip alone")
    ap.add_argument("--trim", action="store_true",
                    help="back up, then trim in place")
    ap.add_argument("--dry-run", action="store_true",
                    help="with --trim: show the ffmpeg commands, change nothing")
    ap.add_argument("--no-backup", action="store_true",
                    help="with --trim: skip the backup copy")
    args = ap.parse_args()

    if not os.path.isdir(args.audio):
        sys.exit("no such directory: %s" % args.audio)

    report = scan(args.audio, args.pattern, args.window, args.threshold,
                  args.lead, args.tail, args.min_lead, args.min_tail)
    print(table(report))
    print("\n" + summary(report))

    out = args.out or os.path.join(args.audio, "gaps.json")
    with open(out, "w") as fh:
        json.dump(report, fh, indent=2)
        fh.write("\n")
    print("wrote %s" % out)

    failed = 0
    if args.trim:
        result = trim(report, args.audio, backup=not args.no_backup,
                      dry_run=args.dry_run)
        if result:
            _, failed = result
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

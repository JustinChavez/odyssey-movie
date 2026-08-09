# Epic-Trailer Narration with OpenAI TTS — Research Findings

Research date: 2026-08-08. Target: Book I narration for the procedural Odyssey film.
No audio was generated for this document — all claims are sourced from documentation or
community reports, and the A/B calls flagged below should be settled in `voice-lab/`.

---

## 0. Headline corrections to the brief

Two premises in the task need adjusting before anything else:

1. **`gpt-4o-tts` does not exist.** The `POST /v1/audio/speech` `model` enum is exactly
   `tts-1`, `tts-1-hd`, `gpt-4o-mini-tts`, and `gpt-4o-mini-tts-2025-12-15`. There is no
   full-size `gpt-4o-tts` speech model to upgrade to. See §4 for what the real upgrade
   path is (it's a snapshot pin, and it's free).
2. **Two voices are missing from the available list.** OpenAI now ships 13 voices; the
   brief lists 11. The two omissions — `marin` and `cedar` — are the two OpenAI
   explicitly recommends: *"For best quality, we recommend using `marin` or `cedar`."*
   OpenAI's own speech skill goes further: *"Default voice: `cedar`."* If the tool's
   voice enum is a hardcoded list, widening it to include `cedar` is the single
   highest-leverage change available. See §1.

---

## 1. Voice selection

### The full roster

`alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer`,
`verse`, `marin`, `cedar` — all 13 available on `gpt-4o-mini-tts`. (`tts-1`/`tts-1-hd`
support only the older nine and **cannot** use `instructions` at all, so they are out.)

### Recommendation, in order

**1. `cedar` — if you can add it to the tool's enum.**
OpenAI's documented default and quality recommendation, described as *"warm and
grounded."* Marin and Cedar were released as the two voices with *"the most significant
improvements to natural-sounding speech,"* and the improvements that produced them were
also back-ported to the eight older voices. "Warm and grounded" is not "trailer
announcer" on its face, but for this use case the baseline naturalness matters more than
the stock timbre: the `instructions` parameter is what supplies the gravitas, and it has
more room to work on a higher-fidelity voice. This is the one recommendation I'd act on
even before A/B testing, because the quality gap is OpenAI's own claim, not a third
party's.

**2. `onyx` — the best option from the list you currently have.**
Consistently described as bold, with strong presence, and suited to announcements and
high-impact messaging. That is precisely the trailer-announcer register: it is the
closest stock voice to the deep-chest, declamatory read the brief is asking for. This
should be your default until Cedar is available for comparison.

**3. `echo` — the restrained-gravitas alternative.**
Described as deep, low, and authoritative, and a natural fit for narration and
documentary content. Where Onyx is *announcement*, Echo is *chronicle*. For Homer this is
genuinely competitive — the poem is a narrated account, not a hard sell — and Echo is the
right pairing for Template B below. Note your `voice-lab/` already has `sample_echo.mp3`
and `sample_onyx.mp3`, so this comparison is half-done.

**Expressive wildcards worth one test each:** `ballad` and `verse` are part of the newer
expressive set introduced alongside `gpt-4o-mini-tts` and tend to respond more strongly
to `instructions` steering than the older voices do. They are lighter in timbre than Onyx
but may take direction better — relevant for Template C (crescendo), where dynamic range
matters more than raw depth.

### Voices to avoid for gravitas

- `nova`, `shimmer`, `coral` — bright, higher-register. Actively fight the brief.
- `alloy` — neutral and flat; the most likely of the set to read as robotic, which is an
  explicit non-goal.
- `sage` — soft, low-energy. Reads as tentative rather than weighty.
- `fable` — a British storyteller voice. Tempting for Homer, and it is a legitimate
  choice for an audiobook read, but it is theatrical-light rather than deep, and it can
  tip into the sing-song failure mode the brief wants eliminated.

### Caveat on confidence

The per-voice character descriptions above (bold / deep / warm / bright) come from
third-party vendor blogs and community consensus, not from OpenAI documentation —
OpenAI's docs list the voice names and recommend marin/cedar but publish no per-voice
character guide. Treat the ranking as a prior for what to test first, not as settled
fact. You already have the harness for this; three renders of the same Book I line
through `onyx`, `echo`, and `cedar` with Template A will beat any amount of further
reading.

---

## 2. Instruction templates

### The official structure

OpenAI's speech skill specifies this exact field order for a directions block:

```
Voice Affect: <overall character and texture of the voice>
Tone: <attitude, formality, warmth>
Pacing: <slow, steady, brisk>
Emotion: <key emotions to convey>
Pronunciation: <words to enunciate or emphasize>
Pauses: <where to add intentional pauses>
Emphasis: <key words or phrases to stress>
Delivery: <cadence or rhythm notes>
```

with the guidance to **keep it to 4–8 short lines and avoid conflicting guidance.** The
docs state `instructions` can control *"Accent, Emotional range, Intonation,
Impressions, Speed of speech, Tone, Whispering."*

The templates below follow that field order deliberately. Two craft notes are baked into
all of them:

- **Falling terminal pitch is the single most important anti-sing-song lever.** Sing-song
  delivery is fundamentally a *repeating melodic contour* — the same rise-fall shape on
  every sentence. Instructing the voice to resolve each sentence downward, and to vary
  where the stress lands, breaks the pattern at its root.
- **Trailer VO runs roughly 100–110 words per minute** against ~150 for conversational
  speech. Stating an explicit WPM target gives the model a concrete anchor instead of the
  vague "slow," which it under-applies.

---

### Template A — Full trailer-epic

The maximum-gravitas read. Pair with `onyx` (or `cedar`).

```
Voice Affect: Deep, resonant, and monumental — a bass-baritone with heavy chest weight, as though speaking in a vast stone hall. Immense stillness and control; the voice of something far older than the listener.
Tone: Grave, austere, and utterly certain. No warmth, no charm, no salesmanship. This is prophecy, not persuasion.
Pacing: Very slow and deliberate — roughly 100 words per minute. Let each phrase land completely before beginning the next. Never rush a clause. Never run two sentences together.
Emotion: Restrained awe and foreboding held under great pressure. The weight is in the restraint, not in volume — do not shout, do not emote openly.
Pauses: A full one-second silence at every period. A shorter beat at every comma and em dash. Pause before proper names and before the final clause of each sentence, so the last words arrive alone.
Emphasis: Stress nouns of scale, fate, and place — gods, sea, war, home, ruin, years. Let verbs stay level underneath them.
Delivery: Resolve every sentence downward — end on a falling pitch, never a rising one. Vary which word carries the stress from sentence to sentence so no melodic pattern repeats. Do not lilt, do not sing, do not sound conversational. Speak on the breath, low in the register, with the final syllable of each sentence allowed to decay into silence.
```

---

### Template B — Restrained classic audiobook narrator with gravitas

The chronicler. Less theatrical, more durable across long passages — this is the one that
will hold up best over a full Book I rather than a 30-second cut. Pair with `echo`.

```
Voice Affect: Low, warm, and unhurried — a seasoned narrator with a dark, steady timbre. Weight comes from calm authority, not from force.
Tone: Serious and dignified, with quiet reverence for the material. Formal but not cold; the voice of someone who has known this story a long time.
Pacing: Measured and even, around 110 words per minute. Unhurried throughout. Allow the sentence structure itself to set the rhythm rather than imposing drama on it.
Emotion: Controlled gravity and understated compassion. Never sentimental, never theatrical.
Pauses: A clear beat at every period, a light one at every comma. Pause slightly longer between paragraphs to mark the turn of the narrative.
Emphasis: Stress meaning-bearing words only — names, places, and the verb that carries each sentence. Leave function words entirely unstressed.
Delivery: End every sentence on a downward pitch. Keep the melodic range narrow and low; avoid any repeating up-down cadence between sentences. Read as though telling the truth plainly to one listener in a quiet room — grave, clear, and completely unhurried.
```

---

### Template C — Building-intensity crescendo

For a passage with an arc. **Use this on a single self-contained chunk** — a whole
sentence or short paragraph — so the model can actually see the shape it's meant to
climb. It cannot build across separate API calls.

```
Voice Affect: Deep and resonant throughout, beginning nearly hushed and gathering mass as the passage advances. Chest-heavy at all times; the register never rises even as the intensity does.
Tone: Begins as grim confidence, tightens into urgency, ends in absolute finality.
Pacing: Start very slow and quiet — near a whisper, around 90 words per minute. Increase intensity and volume gradually with each sentence, but do NOT increase speed; the pace stays slow while the pressure builds. Slow further on the final sentence and give the last phrase the greatest weight of all.
Emotion: Foreboding at the opening, mounting force through the middle, grim inevitability at the close. The growth is in weight and volume, never in pitch.
Pauses: Long silences early — a full beat before and after the opening clause. Tighten the pauses slightly as intensity rises, then take the longest pause of the entire passage immediately before the final sentence.
Emphasis: Let each successive sentence carry one heavier stressed word than the last. Hit the final noun of the passage hardest and hold it.
Delivery: Every sentence resolves downward, including the climax — power comes from descending finality, not from rising excitement. Never let the pitch climb. Do not sing, do not lilt, do not accelerate. End the passage low, slow, and absolutely still.
```

---

### Template D — Homeric invocation / proem

Purpose-built for the opening of Book I ("Sing to me of the man…"). The register here is
*invocation* — addressed to the Muse, not to an audience — which is a genuinely different
read from trailer announcement and worth having as its own option.

```
Voice Affect: Ancient, deep, and ceremonial — a low voice carrying great distance, as if intoning rather than speaking. Stone and sea in the timbre.
Tone: Reverent and invocatory. This is an address to a god, not a narration to a listener.
Pacing: Extremely slow and formal, near 95 words per minute. Give each phrase the weight of a spoken rite. Never hurry, never elide.
Emotion: Solemn reverence and vast patience, with sorrow held far beneath the surface.
Pronunciation: Enunciate every proper name fully and separately — Odysseus, Ithaca, Troy, Poseidon, Athena. Give each syllable its own space; never swallow an ending.
Pauses: A long, deliberate silence after the opening address and before each proper name. A full beat at every period.
Emphasis: Stress the invocation itself and the epithets of the hero.
Delivery: Fall in pitch at the end of every line. Keep the cadence formal and non-repeating — deliberately vary the stress position so it never becomes a chant or a sing-song meter. Low, slow, resonant, and entirely without modern conversational inflection.
```

---

## 3. Speed parameter

**API spec:** range `0.25`–`4.0`, default `1.0`.

**The complication:** OpenAI staff stated on the developer forum that *"The `speed`
parameter is not supported for `gpt-4o-mini-tts` currently. This was a bug in our
documentation which has been updated."* A later report in the same thread (June 2025)
says *"I tried the new model again recently and it is no longer ignoring the speed
parameter."* So support appears to have landed after the fact, but it was never formally
re-announced, and the current API reference documents the 0.25–4.0 range with no
model-specific carve-out.

**Recommendation:**

- **Drive pacing through `instructions`, not `speed`.** This is the substantive
  recommendation, and it isn't just a workaround for the bug. The `speed` parameter is a
  uniform time-stretch: it slows the pauses and the syllables by the same factor, which
  makes speech sound *decelerated* rather than *deliberate*. Trailer gravitas comes from
  the ratio between fast-ish diction and long silences — exactly what `speed` cannot
  produce and what "100 words per minute, full one-second silence at every period" can.
  Yes, the instructions parameter alone can achieve the pacing.
- **If you use `speed` at all, keep it to `0.92`–`0.95`** as a light trim on top of the
  instructions. Do not go below `0.85`; artifacting and an unnatural drag set in, and it
  will fight the rhythm the instructions established.
- **Verify empirically before relying on it.** Render one line at `speed: 1.0` and
  `speed: 0.9` with everything else identical and compare durations. If they match, the
  parameter is still being dropped for this model and you have your answer.

---

## 4. Model choice: is there an upgrade?

**No `gpt-4o-tts` exists.** The speech endpoint accepts only `tts-1`, `tts-1-hd`,
`gpt-4o-mini-tts`, and `gpt-4o-mini-tts-2025-12-15`. There is no larger sibling to
switch to, so the upgrade described in the brief isn't available.

**What is available, and worth doing:**

- **Pin `gpt-4o-mini-tts-2025-12-15`.** Two snapshots exist — `2025-03-20` and
  `2025-12-15` — and the December one is now the default behind the `gpt-4o-mini-tts`
  alias. OpenAI's speech skill instructs: *"Use `gpt-4o-mini-tts-2025-12-15` unless the
  user requests another model."* Pinning costs nothing, gets the newer model, and
  protects you from the alias silently moving mid-project and changing the voice
  character between renders — which matters a lot when you're stitching a film from many
  separate calls.
- **Do not consider `tts-1` / `tts-1-hd`.** They ignore `instructions` entirely, which
  makes every template above inert.
- **`gpt-realtime` is the only genuinely more expressive option,** and it is not worth it
  here. It is a speech-to-speech model on the Realtime API — different endpoint, session
  and streaming complexity, built for live conversational agents. For offline, pre-rendered
  film narration where you want deterministic files on disk, it's a large amount of
  architecture for a speculative quality gain.

**Cost, for planning:** $0.60 / 1M input text tokens and $12 / 1M audio output tokens;
input capped at **2000 tokens per request**. Book I narration will be many calls
regardless — which, as it turns out, is what you want anyway (see §5).

---

## 5. Techniques and gotchas

### Never put stage directions in the text — they get spoken aloud

The most important gotcha. Simon Willison, testing the model: *"sometimes the model
follows my 'Whisper this bit' instruction correctly, other times it says the word
'Whisper' out loud but doesn't speak the words 'this bit'."* He adds that *"results appear
non-deterministic, and might also vary with different base voices,"* and frames inline
directions as fundamentally a prompt-injection surface: *"you can't safely use this for
arbitrary text because there's a risk that some of that text may accidentally be treated
as further instructions to the model."*

An OpenAI engineer confirmed the model has *"extra training focusing on reading the script
exactly as written"* — while also saying it should be *"much better in that regard,"*
which is not a claim that the problem is solved.

**Consequence for this project:** keep 100% of delivery guidance in the `instructions`
parameter and 0% in the text. This matters more than usual for Homer, whose text is full
of vocatives and imperatives ("Sing to me…", "Tell me, Muse…") that are shaped exactly
like instructions. Expect to spot-check the first renders for the model *describing* the
narration instead of performing it.

### Chunk aggressively — long-form generation is unstable

Well-documented failure mode past **~1.5–2 minutes** in a single call: multi-second
stretches of silence, unexplained volume jumps, voice/tone drift mid-file, and the last
few sentences repeating in random order. One reported case had a 4:31 file with two dead
stretches inside it. Community workaround: *"Breaking the text into smaller parts of up to
1 minute seems to make it more stable."* OpenAI shipped a fix in April 2025 but reports
continued through late 2025.

**Consequence:** render **one line, sentence, or beat per call** — under ~60 seconds
each — and assemble in the edit. This is what you want for a procedural film regardless:
per-beat audio files give you per-shot timing control, let you re-roll a single bad line
without regenerating everything, and sidestep the instability entirely.

### Repeat the instructions verbatim across every chunk

Users report voice inconsistency between separate API calls. Since you're chunking, the
mitigation is to hold the instruction block **byte-identical** across all calls for a
given narrator — don't hand-tune per line. Treat each template as a frozen constant in
code. If you need a different intensity for one passage, switch to a different template
wholesale rather than editing a line of the current one.

### Pauses: punctuation works, SSML basically doesn't

There is **no official SSML support.** Community results:

- **Works:** real punctuation — periods, ellipses (`...`), em dashes (`—`) — and
  paragraph/line breaks, which often insert pauses automatically.
- **Partially works:** `<break time="1s"/>` was reported functioning by one user, but
  *"I haven't had success with any duration over 2 seconds."* Undocumented and
  unsupported; don't build on it.
- **Unreliable:** `[pause]` markers, and stacking punctuation to try to lengthen a pause.
- **The honest assessment**, from that thread: *"Pauses between paragraphs are usually
  added automatically without extra syntax, but again—not always. This unpredictability
  is hard to handle."*

**Best practice for this project:** ask for pauses in `instructions` (all four templates
do, with explicit durations), punctuate the source text properly, and get any pause longer
than ~1 second by **splitting into separate renders and inserting silence in the edit.**
For a film with a real timeline, that's the correct approach anyway — it makes dramatic
pause length a directorial choice rather than a dice roll.

### Avoiding sing-song and robotic delivery

Ranked by effectiveness:

1. **Mandate falling terminal pitch.** "Resolve every sentence downward — end on a
   falling pitch, never a rising one." Rising terminals are the primary cause of the
   sing-song read.
2. **Explicitly forbid a repeating contour.** "Vary which word carries the stress from
   sentence to sentence so no melodic pattern repeats." Without this, long passages
   settle into a groove.
3. **Give a numeric WPM target.** "Slow" is under-applied; "roughly 100 words per minute"
   is actionable.
4. **Separate volume from pitch when asking for intensity.** Left alone, the model raises
   pitch to signal excitement — the opposite of gravitas. Templates A and C both state
   that intensity grows in weight, never in pitch.
5. **Keep the block short.** OpenAI's own guidance is 4–8 lines with no conflicting
   direction. Contradictory instructions ("dramatic but restrained, fast but weighty")
   produce mushy, averaged delivery. Each template above holds one coherent character.

### Client-library caveat

Some SDK wrappers silently drop the `instructions` field. If a template appears to have
no effect at all — as opposed to a weak effect — verify the parameter is actually
reaching the API before rewriting the prompt.

---

## 6. Suggested next steps in `voice-lab/`

1. Render one fixed Book I passage across `onyx`, `echo`, and `ballad` using **Template
   A**, everything else held constant. You already have Echo and Onyx samples; this makes
   the comparison controlled.
2. Ask whether `cedar` and `marin` can be added to the tool's voice enum. If yes, add
   `cedar` to that same comparison — OpenAI's documented best-quality default is a real
   candidate to win outright.
3. Render the same passage under Templates A, B, and D on the winning voice, to pick the
   register for the film.
4. Settle the `speed` question with a duration diff at `1.0` vs `0.9`.
5. Pin `gpt-4o-mini-tts-2025-12-15` before generating anything you intend to keep, so
   renders stay consistent across the project.

---

## Sources

- [OpenAI — Text to speech guide](https://developers.openai.com/api/docs/guides/text-to-speech)
- [OpenAI — Create speech API reference](https://developers.openai.com/api/docs/api-reference/audio/createSpeech)
- [OpenAI — gpt-4o-mini-tts model page](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts)
- [OpenAI speech skill — instruction block structure](https://claudeskills.info/skills/openai/skills/speech/)
- [OpenAI speech skill (mirror) — directions field order and best practices](https://agentskills.so/skills/openai-skills-speech)
- [OpenAI Developer Community — speed parameter ignored by gpt-4o-mini-tts](https://community.openai.com/t/new-tts-model-gpt-4o-mini-tts-ignoring-speed-parameter/1154883)
- [OpenAI Developer Community — gpt-4o-mini-tts produces unusable results (long-form instability)](https://community.openai.com/t/gpt-4o-mini-tts-produces-unusable-results/1228541)
- [OpenAI Developer Community — adding pauses to TTS output](https://community.openai.com/t/tts-adding-pauses-to-speech-generations-through-some-kind-of-input-syntax/578571)
- [Simon Willison — New audio models from OpenAI, but how much can we rely on them?](https://simonw.substack.com/p/new-audio-models-from-openai-but)
- [OpenAI — Introducing gpt-realtime](https://openai.com/index/introducing-gpt-realtime/)
- [TextToLab — OpenAI voice character descriptions (onyx, echo, ash)](https://texttolab.com/openai)
- [TV Tropes — Don LaFontaine](https://tvtropes.org/pmwiki/pmwiki.php/Creator/DonLaFontaine)
- [Voice Dawns — Top 5 voice-overs of all time, vocal analysis](https://voicedawns.medium.com/top-5-voice-overs-of-all-time-best-voice-overs-in-film-history-vocal-analysis-9d0479cb8762)
- [MusicRadar — How to create an epic 'trailer voice'](https://www.musicradar.com/tuition/tech/how-to-create-an-epic-trailer-voice-using-free-plugins-641105)

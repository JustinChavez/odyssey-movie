// Narration clip lengths (seconds), measured from audio/narr_*.mp3.
// The film is cut to the narration: a shot's real duration is never shorter
// than its line (plus a beat of silence), so sentences get to finish.
// Re-measure with `afinfo` whenever the clips are re-voiced.
//
// These are post-trim lengths: `scripts/gap-report.py --trim` tops and tails
// every clip to a 0.12s lead and a 0.15s tail, so no shot is padded out by
// silence that was baked into the recording.

export default {
  invocationa: 3.77,
  invocationb: 5.66,
  troya: 2.31,
  troyb: 2.03,
  troyc: 3.81,
  wanderinga: 3.53,
  wanderingb: 2.81,
  wanderingc: 4.03,
  thrinaciaa: 3.21,
  thrinaciab: 3.57,
  thrinaciac: 3.53,
  wratha: 2.17,
  wrathb: 2.51,
  calypsoa: 6.43,
  calypsob: 4.07,
  calypsoc: 6.77,
  olympusa: 4.41,
  olympusb: 5.01,
  poseidona: 6.11,
  poseidonb: 5.39,
  poseidonc: 6.26,
  ithacaa: 4.17,
  ithacab: 3.00,
};

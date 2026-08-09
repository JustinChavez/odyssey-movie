// The film. Source text: Homer, The Odyssey, Book I — the opening, as told
// by Samuel Butler. Nine sequences, twenty-four shots. Each sequence builds
// one world and cuts around inside it; the captions carry the book's words
// verbatim, in order, split only at phrase boundaries.

import { seq01 } from './shots/seq01-invocation.js';
import { seq02 } from './shots/seq02-troy.js';
import { seq03 } from './shots/seq03-wandering.js';
import { seq04 } from './shots/seq04-thrinacia.js';
import { seq05, STRIKES as WRATH_STRIKES } from './shots/seq05-wrath.js';
import { seq06 } from './shots/seq06-calypso.js';
import { seq07 } from './shots/seq07-olympus.js';
import { seq08, STRIKES as POSEIDON_STRIKES } from './shots/seq08-poseidon.js';
import { seq09 } from './shots/seq09-ithaca.js';

export { WRATH_STRIKES, POSEIDON_STRIKES };

export const MOVIE = {
  title: 'The Odyssey',
  kicker: 'Tell me, O Muse…',
  source: 'Homer — The Odyssey, Book I, the opening, as told by Samuel Butler',
  shots: [
    ...seq01(),
    ...seq02(),
    ...seq03(),
    ...seq04(),
    ...seq05(),
    ...seq06(),
    ...seq07(),
    ...seq08(),
    ...seq09(),
  ],
};

export default MOVIE;

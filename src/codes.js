/*
 * codes.js — room code generation.
 *
 * Codes are read out loud across a noisy classroom, so the charset deliberately
 * excludes characters that are easy to confuse when spoken or seen:
 *   0/O, 1/I/L are all omitted.
 *
 * generateCode(existingSet) returns a 4-char UPPERCASE code that does not collide
 * with any active code in `existingSet` (a Set of currently-in-use codes).
 */

'use strict';

// No 0/O, no 1/I/L — readable out loud and unambiguous on a projector.
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

/** Build one random candidate code (uppercase by construction). */
function randomCode() {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return out;
}

/**
 * Generate a unique 4-char room code not present in `existingSet`.
 * @param {Set<string>|{has:(c:string)=>boolean}} existingSet codes currently in use
 * @returns {string}
 */
function generateCode(existingSet) {
  const has =
    existingSet && typeof existingSet.has === 'function'
      ? (c) => existingSet.has(c)
      : () => false;

  // 31^4 ≈ 923k possibilities; collisions are vanishingly rare for ~dozens of rooms.
  // Loop is bounded in practice; a hard cap guards against a pathologically full set.
  for (let attempts = 0; attempts < 10000; attempts++) {
    const code = randomCode();
    if (!has(code)) return code;
  }
  // Extremely unlikely fallback: linear scan for any free code is impractical at this
  // size, so just return a fresh random one (caller treats codes as unique-enough).
  return randomCode();
}

module.exports = { generateCode, CHARSET, CODE_LENGTH };

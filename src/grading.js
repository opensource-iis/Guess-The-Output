/*
 * grading.js — answer grading. Correctness-critical; kept tiny and well-tested.
 *
 * Text mode is LENIENT — it ignores formatting so a player who got the right value isn't
 * punished for how they typed it:
 *   Normal snippets — compare "loosely": case-insensitive, and with whitespace, quotes,
 *     brackets/parens/braces, commas and colons removed. Meaning-bearing characters (digits,
 *     signs, decimal points) are kept, so `-3` != `3` and `1.5` != `15`.
 *   Error snippets  — even looser: accept "error"/"exception", the exact name ("IndexError" /
 *     "index error"), its prefix ("index"), a partial ("division"), or a sentence naming it.
 * MCQ mode is EXACT — the player picked one of the exact options, so require an exact match
 *   (this stops the lenient rules from accepting a wrong option).
 */

function normalize(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/[‘’“”´`]/g, "'") // smart/back quotes -> '
    .replace(/"/g, "'")                                 // double quote -> '
    .replace(/\s+/g, '');                               // strip ALL whitespace
}

// Loose form for lenient text grading: drop formatting, keep meaning (digits/signs/dots).
function loose(s) {
  return String(s === null || s === undefined ? '' : s)
    .toLowerCase()
    .replace(/[‘’“”´`'"]/g, '')   // quotes of every style
    .replace(/[()\[\]{}]/g, '')   // brackets / parens / braces
    .replace(/[,:;]/g, '')        // list/dict separators
    .replace(/\s+/g, '');         // all whitespace
}

// Lowercase, letters + digits only — used for forgiving exception-name matching.
function alnum(s) {
  return String(s === null || s === undefined ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * @param {string} submitted  raw player input (text) or the picked option (mcq)
 * @param {{output:string, is_error?:boolean}} snippet
 * @param {boolean} [isMcq]   true when the player picked an exact option (multiple choice)
 * @returns {boolean}
 */
function grade(submitted, snippet, isMcq) {
  if (!snippet) return false;

  // MCQ: the answer is one of the exact options — require an exact (normalized) match.
  if (isMcq) {
    const canonical = normalize(snippet.output);
    return canonical.length > 0 && normalize(submitted) === canonical;
  }

  // Text mode, error snippet: be forgiving about how the exception is named.
  if (snippet.is_error) {
    const raw = (submitted === null || submitted === undefined ? '' : String(submitted)).trim();
    // Cap the length so a player can't game it by dumping every exception name into one answer.
    if (raw.length === 0 || raw.length > 60) return false;
    const sub = alnum(raw); // e.g. "error", "indexerror", "index"
    if (!sub) return false;
    const type = alnum(snippet.output); // e.g. "indexerror"
    if (!type) return false;
    const prefix = type.replace(/(error|exception)$/, ''); // e.g. "index"
    return (
      sub === 'error' ||
      sub === 'exception' ||
      sub === type ||
      (prefix.length >= 3 && sub === prefix) ||
      (sub.length >= 4 && (type.indexOf(sub) !== -1 || sub.indexOf(type) !== -1))
    );
  }

  // Text mode, normal snippet: lenient loose match, keeping meaning-bearing characters.
  let target = loose(snippet.output);
  let ans = loose(submitted);
  if (target.length === 0) {
    // The output was all formatting (e.g. "[]" or "{}") — fall back to a strict compare so
    // empty collections are still gradeable.
    target = normalize(snippet.output);
    ans = normalize(submitted);
  }
  if (target.length === 0) return false; // never accept empty as a match
  return ans === target;
}

module.exports = { grade, normalize };

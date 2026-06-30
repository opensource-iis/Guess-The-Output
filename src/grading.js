/*
 * grading.js — answer grading. Correctness-critical; kept tiny and well-tested.
 *
 * Normal snippets: strip ALL whitespace from both sides, normalize every quote style
 *   (', ", and smart quotes) to a single ', then require exact equality.
 * Error snippets (is_error): lenient — accept any answer that CONTAINS the exception
 *   name, case-insensitive (e.g. "it throws an IndexError" counts).
 */

function normalize(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/[‘’“”´`]/g, "'") // smart/back quotes -> '
    .replace(/"/g, "'")                                 // double quote -> '
    .replace(/\s+/g, '');                               // strip ALL whitespace
}

/**
 * @param {string} submitted  raw player input
 * @param {{output:string, is_error?:boolean}} snippet
 * @returns {boolean}
 */
function grade(submitted, snippet) {
  if (!snippet) return false;
  if (snippet.is_error) {
    // Lenient: the answer just needs to NAME the right exception. But cap the length so a
    // player can't game it by dumping every exception name into one answer (a real exploit
    // a curious kid would find) — a genuine "it raises an IndexError" is well under 60 chars.
    const sub = (submitted === null || submitted === undefined ? '' : String(submitted)).trim();
    if (sub.length === 0 || sub.length > 60) return false;
    const exc = String(snippet.output || '').toLowerCase();
    return exc.length > 0 && sub.toLowerCase().indexOf(exc) !== -1;
  }
  const canonical = normalize(snippet.output);
  if (canonical.length === 0) return false; // never accept empty as a match
  return normalize(submitted) === canonical;
}

module.exports = { grade, normalize };

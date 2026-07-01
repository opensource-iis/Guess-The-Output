/*
 * grading.js — answer grading. Correctness-critical; kept tiny and well-tested.
 *
 * Text mode:
 *   Normal snippets — strip ALL whitespace, normalize quotes to ', require exact equality.
 *   Error snippets  — LENIENT: the player just has to name the exception well enough. Accept
 *     "error"/"exception", the exact name ("IndexError" / "index error"), its prefix ("index"),
 *     a partial ("division" for ZeroDivisionError), or a sentence that contains the name.
 * MCQ mode:
 *   The player picked one of the exact options, so require an exact (normalized) match — this
 *   keeps a wrong option (e.g. a different exception) from being accepted by the lenient rules.
 */

function normalize(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/[‘’“”´`]/g, "'") // smart/back quotes -> '
    .replace(/"/g, "'")                                 // double quote -> '
    .replace(/\s+/g, '');                               // strip ALL whitespace
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
  const canonical = normalize(snippet.output);

  // MCQ: the answer is one of the exact options — require an exact (normalized) match.
  if (isMcq) return canonical.length > 0 && normalize(submitted) === canonical;

  // Text mode, error snippet: be forgiving about how the exception is named.
  if (snippet.is_error) {
    const raw = (submitted === null || submitted === undefined ? '' : String(submitted)).trim();
    // Keep a length cap so a player can't game it by dumping every exception name into one answer.
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

  // Text mode, normal snippet: exact normalized match.
  if (canonical.length === 0) return false; // never accept empty as a match
  return normalize(submitted) === canonical;
}

module.exports = { grade, normalize };

// Dependency-free Python syntax highlighter (ported from the vanilla app). Returns an HTML
// string of <span class="tok-*"> tokens for rendering via dangerouslySetInnerHTML in a <pre>.
const KEYWORDS: Record<string, 1> = {
  def: 1, return: 1, for: 1, while: 1, in: 1, if: 1, elif: 1, else: 1, import: 1, from: 1,
  as: 1, class: 1, lambda: 1, and: 1, or: 1, not: 1, is: 1, with: 1, pass: 1, break: 1,
  continue: 1, global: 1, nonlocal: 1, yield: 1, try: 1, except: 1, finally: 1, raise: 1,
  True: 1, False: 1, None: 1, del: 1, assert: 1,
}
const BUILTINS: Record<string, 1> = {
  print: 1, range: 1, len: 1, list: 1, dict: 1, set: 1, tuple: 1, str: 1, int: 1, float: 1,
  bool: 1, round: 1, zip: 1, enumerate: 1, sorted: 1, sum: 1, map: 1, filter: 1, abs: 1,
  min: 1, max: 1, type: 1, open: 1, format: 1, append: 1, sort: 1, reversed: 1, repr: 1,
  isinstance: 1, Counter: 1, permutations: 1, array: 1, mean: 1, gcd: 1, dumps: 1,
  randint: 1, shuffle: 1, seed: 1, date: 1,
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function span(cls: string, text: string): string {
  return `<span class="${cls}">${esc(text)}</span>`
}

export function highlightPython(code: string): string {
  try {
    const re = /(#[^\n]*)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(\b\d+\.?\d*\b)|([A-Za-z_]\w*)|(\s+)|([^\sA-Za-z0-9_])/g
    let out = ''
    let m: RegExpExecArray | null
    let expectName = false
    while ((m = re.exec(code)) !== null) {
      if (m[1] !== undefined) out += span('tok-com', m[1])
      else if (m[2] !== undefined) out += span('tok-str', m[2])
      else if (m[3] !== undefined) out += span('tok-num', m[3])
      else if (m[4] !== undefined) {
        const word = m[4]
        if (expectName) {
          out += span('tok-fn', word)
          expectName = false
        } else if (KEYWORDS[word]) {
          out += span('tok-kw', word)
          if (word === 'def' || word === 'class') expectName = true
        } else if (BUILTINS[word]) out += span('tok-builtin', word)
        else out += esc(word)
      } else if (m[5] !== undefined) out += esc(m[5])
      else if (m[6] !== undefined) out += esc(m[6])
      if (re.lastIndex === m.index) re.lastIndex++
    }
    return out
  } catch {
    return esc(String(code))
  }
}

/*
 * verify_all.js — re-run every snippet through the Python harness and confirm its stored
 * output still matches real execution and is deterministic. Exit 1 on any drift.
 * Run after adding/editing snippets:  npm run verify
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { SNIPPETS } = require('../src/snippets.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gto_verify_'));
const cand = path.join(tmp, 'cand.json');
const rep = path.join(tmp, 'rep.json');
fs.writeFileSync(cand, JSON.stringify(SNIPPETS.map((s) => ({ key: s.id, code: s.code }))));

const py = process.env.PYTHON || 'python';
const run = spawnSync(py, ['tools/verify_snippets.py', cand, rep], { stdio: ['ignore', 'ignore', 'inherit'] });
if (run.status !== 0) {
  console.error('Could not run the Python verifier. Is Python on PATH? (set PYTHON=... to override)');
  process.exit(2);
}

const report = JSON.parse(fs.readFileSync(rep, 'utf8'));
const byId = new Map(report.map((r) => [r.key, r]));
const norm = (x) => String(x).replace(/\s+/g, '').replace(/[‘’“”]/g, "'").replace(/"/g, "'");

let bad = 0;
for (const s of SNIPPETS) {
  const r = byId.get(s.id);
  if (!r || !r.ok) { bad++; console.error('#' + s.id + ' failed to run'); continue; }
  if (!r.deterministic) { bad++; console.error('#' + s.id + ' is NON-DETERMINISTIC'); continue; }
  if (!!r.is_error !== !!s.is_error) { bad++; console.error('#' + s.id + ' is_error mismatch'); continue; }
  if (norm(r.output) !== norm(s.output)) {
    bad++;
    console.error('#' + s.id + ' OUTPUT DRIFT: stored=' + JSON.stringify(s.output) + ' actual=' + JSON.stringify(r.output));
  }
}
if (bad) { console.error('\nFAILED: ' + bad + ' snippet(s) drifted from real execution.'); process.exit(1); }
console.log('OK: all ' + SNIPPETS.length + ' snippets verified — deterministic and matching real output.');

#!/usr/bin/env python3
"""
verify_snippets.py — ground-truth verifier for the Guess the Output snippet bank.

Reads a JSON array of candidates [{ "key": <id>, "code": "<python>" }, ...] from the
path in argv[1] and writes a JSON report to stdout (or argv[2]).

For each candidate it runs the code in a FRESH interpreter under several PYTHONHASHSEED
values. A snippet is only "verified" if every run produces byte-identical results — this
automatically rejects non-deterministic output (sets of strings, object addresses,
id()/hash(), unseeded random, dict-from-set ordering, etc.) which would be unfair to ask a
player to predict character-for-character.

Output per candidate:
  { key, ok, deterministic, is_error, output, exception, error }
where `output` is the exact printed text (trailing newline stripped) for normal snippets,
and `exception` is the short exception class name for crashing snippets.
"""
import json
import os
import sys
import subprocess

SEEDS = ["0", "1", "7"]          # if results match across these, treat as deterministic
TIMEOUT = 15                      # seconds per run


def run_once(code, seed):
    env = dict(os.environ)
    env["PYTHONHASHSEED"] = seed
    env["PYTHONIOENCODING"] = "utf-8"
    try:
        proc = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True, text=True, encoding="utf-8",
            timeout=TIMEOUT, env=env,
        )
    except subprocess.TimeoutExpired:
        return {"timeout": True}
    crashed = proc.returncode != 0
    result = {"crashed": crashed, "returncode": proc.returncode}
    if crashed:
        # Last non-empty stderr line is the exception line: "ExceptionName: message"
        lines = [ln for ln in proc.stderr.splitlines() if ln.strip()]
        last = lines[-1] if lines else ""
        full = last.split(":", 1)[0].strip()
        short = full.split(".")[-1] if full else ""
        result["exception"] = short
        result["exception_full"] = full
        result["stderr_tail"] = last
    else:
        out = proc.stdout
        # strip exactly one trailing newline that print() adds at the very end
        if out.endswith("\r\n"):
            out = out[:-2]
        elif out.endswith("\n"):
            out = out[:-1]
        result["output"] = out
    return result


def verify(code):
    runs = [run_once(code, s) for s in SEEDS]
    if any(r.get("timeout") for r in runs):
        return {"ok": False, "error": "timeout"}

    first = runs[0]
    # determinism: all runs must agree on crash-vs-not and on the payload
    def signature(r):
        if r.get("crashed"):
            return ("ERR", r.get("exception"))
        return ("OUT", r.get("output"))
    deterministic = all(signature(r) == signature(first) for r in runs)

    rep = {"ok": True, "deterministic": deterministic, "is_error": bool(first.get("crashed"))}
    if first.get("crashed"):
        rep["exception"] = first.get("exception")
        rep["output"] = first.get("exception")   # for is_error snippets, output == exception name
        rep["exception_full"] = first.get("exception_full")
    else:
        rep["output"] = first.get("output")
    return rep


def main():
    if len(sys.argv) < 2:
        print("usage: verify_snippets.py <candidates.json> [out.json]", file=sys.stderr)
        sys.exit(2)
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        candidates = json.load(f)

    report = []
    for c in candidates:
        res = verify(c["code"])
        res["key"] = c.get("key")
        report.append(res)

    text = json.dumps(report, ensure_ascii=False, indent=2)
    if len(sys.argv) >= 3:
        with open(sys.argv[2], "w", encoding="utf-8") as f:
            f.write(text)
        print(f"wrote {len(report)} results to {sys.argv[2]}", file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()

# Changelog

All notable changes to `line-check` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-04-30

Initial public release.

### Added

- **5-check audit** for every changed line (Contradiction, Syntax, Shell-Mode, Fact, Scope).
- **Shell-Mode & Completeness check** (5th check) — the headline feature. Catches:
  - Right-shell mismatch (PS-vs-bash mode confusion)
  - Unbalanced quotes (`"`, `'`, `` ` ``)
  - Unbalanced brackets (`()`, `{}`, `[]`, `@()`, `@{}`)
  - Unclosed heredocs (`<<EOF` without matching bare `EOF`)
  - Trailing-continuation traps (`\`, `` ` ``, `&&`, `||`, `|` at end of line)
  - Missing flag-args (`tar -C` without target dir, `ssh -i` without key, etc.)
  - Bash-on-Windows context confusion
- **6-item Pilot Pre-Send Checklist** for shell commands (aviation pattern).
- **Per-shell incomplete-line signatures** for PowerShell, bash, Python, Rust, C, TypeScript.
- **Flag-args lookup** for common tools (tar, cp, ssh, git, docker, find, sed, awk, xargs, curl, kubectl, npm).
- **Vivid SSH/tar failure example** at the top of SKILL.md — the canonical bug class.
- **Compound-language audit** (SQL-in-Python, regex-in-shell, Dockerfile RUN, PS here-strings).
- **Recursion guard** via `LINE_CHECK_DEPTH` env var to prevent hook → fix → hook loops.
- **Long-file mode** — diffs > 200 lines audited per region; > 50 findings stops and asks; > 2000 line files skipped.
- **Hook setup snippets** for PostToolUse(Write|Edit|MultiEdit) and PreToolUse(Bash) — verified to execute and produce valid JSON.
- **Output format** — terse `<file>:<line> — <check> — <issue> — <fix>` lines; silent on clean.
- **Integration notes** with karpathy-guidelines, superpowers:verification-before-completion, publish-skill, caveman, simplify.

### Documentation

- README.md — value prop, vivid example, install, multi-language coverage, roadmap.
- INSTALLATION.md — clone, hook wiring, verification, troubleshooting, uninstall.
- USAGE.md — automatic / manual / inline modes, output format, anti-patterns.
- EXAMPLES.md — 8 real-world cases with diagnoses and fixes.
- CHANGELOG.md — this file.
- LICENSE — MIT.
- .gitignore — standard skill-repo template.

### Design decisions

- **No companion validator script in v1.0** — by design. Per Karpathy guideline #2 (Simplicity First). v1.1 will add an opt-in `validate.sh` only if v1's reminder-style check leaks.
- **Reminder-only checks** — the hook injects a system-reminder; the model performs the check. No external parsers run.
- **Forge Council origin** — patches surfaced by a 12-seat creative ideation session (Mode B, ~7.8k of 12k budget). Six patches surfaced; four shipped in v1, two deferred.

### Known limitations

- Reminder-only validation cannot prove syntactic validity — only the model's interpretation of the rules. v1.1 will add real-parser backing for high-confidence checks.
- Hook latency adds ~150 tokens per Write/Bash call. Use `--debug` to inspect; disable hook scope if it hits a hot loop.
- PreToolUse(Bash) hook fires on read-only commands too (`ls`, `pwd`). Future versions may scope smarter.

---

## [Unreleased]

### Planned for v1.1.0

- Companion `validate.sh` / `validate.py` — stdlib-only validator script.
- Real-parser backing where available: `bash -n`, `python -m py_compile`, `pwsh -Command "[scriptblock]::Create(...)"`, `tsc --noEmit` (warm), `cargo check` (slow, opt-in).
- Regex fallback per shell when native parser unavailable.
- Latency cap: 100ms / per file; skip if exceeded.
- Cross-platform graceful skip (parser absent → fall back).

### Planned for v1.2.0

- MCP tool `linecheck.validate(text, lang)` — model calls explicitly, language-detected, returns structured findings.

### Idea pool (not committed)

- Telemetry log → auto-promote most-common failure patterns to the cheat sheet (opt-in).
- Smarter PreToolUse(Bash) matcher that scopes to mutating commands only.
- Custom flag-args cheat sheet via project `.line-check.yaml`.

---

[1.0.0]: https://github.com/ojesusmp/line-check/releases/tag/v1.0.0
[Unreleased]: https://github.com/ojesusmp/line-check/compare/v1.0.0...HEAD

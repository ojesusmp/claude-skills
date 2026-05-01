# line-check

> **A Claude Code skill that audits every line of code, prose, or shell command before it ships — catching the SSH/tar continuation-prompt class of bug that wastes tokens and minutes.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Skill](https://img.shields.io/badge/Claude%20Code-Skill-7c3aed)](#install)
[![Version](https://img.shields.io/badge/version-1.0.0-green)](./CHANGELOG.md)

Built by **Orlando Molina** ([@ojesusmp](https://github.com/ojesusmp)).

`line-check` is a behavioral skill for [Claude Code](https://claude.ai/code) that runs a **5-check audit on every changed line** after Write/Edit/MultiEdit, plus a **6-item Pilot Pre-Send Checklist** before every Bash command. It is the line-scope companion to [Andrej Karpathy's task-scope guidelines](https://github.com/forrestchang/andrej-karpathy-skills) — Karpathy gates *what* you do, line-check gates *what you ship*.

---

## The bug class this exists for

A real Claude Code session, real waste:

```text
PS C:\Users\you\projects\demo> ssh remote-host "mkdir -p ~/.claude/projects/myproject && tar -xzf ~/memory.tgz -C
>>
```

Three things broke on a single line:

1. `tar -xzf ~/memory.tgz -C` — the `-C` flag expects a target directory; nothing follows it.
2. The double-quoted SSH command argument was never closed (no trailing `"`).
3. PowerShell entered continuation mode (`>>`) waiting for the missing closer.

**Cost:** the command never ran. The user typed a second corrupted version, then aborted. Tokens and minutes burned for a missing `<dir>` and a missing `"`.

`line-check` exists to catch this class of error in a single cheap pass — **before** the line is sent.

---

## What it checks

### 5 checks per changed line / written artifact

1. **Contradiction** — Does this line contradict an earlier line, the spec, or a claim made in chat?
2. **Syntax** — Does it parse in its language? Real identifiers? Matched brackets and quotes?
3. **Shell-Mode & Completeness** *(new)* — PS-vs-bash mode, balanced quotes, closed heredocs, no trailing continuation, flag-args filled, right shell for the prompt.
4. **Fact** — API signatures real? Paths exist? Versions sourced or invented?
5. **Scope** *(per Karpathy)* — Did this line need to change for the requested task?

### 6-item Pilot Pre-Send Checklist (shell commands)

Stamped before any Bash tool call. Aviation pattern: short, fixed, run before every takeoff.

1. **Quotes paired** — `"`, `'`, `` ` `` all even count.
2. **Brackets paired** — `()`, `{}`, `[]`, `@()`, `@{}`.
3. **Heredocs closed** — `<<EOF` has matching bare `EOF`.
4. **No accidental trailing continuation** — line doesn't end in `\`, `` ` ``, `&&`, `||`, `|` unless next line follows.
5. **Flag-args filled** — every `-X` that takes a value has one (`tar -C <dir>`, `ssh -i <key>`, `git -C <dir>`, etc.).
6. **Right shell** — syntax matches PS / bash / zsh / cmd / fish at the prompt shown.

If any fail → name the missing piece, fix, re-stamp from 1.

---

## Multi-language coverage

Per-shell incomplete-line signatures are baked into the skill. Languages covered:

| Language | What gets checked |
|----------|-------------------|
| **PowerShell** | Backtick continuations, `@'...'@` / `@"..."@` here-strings, `@()` / `@{}` arrays, PS-specific `;`-vs-`&&` chaining |
| **bash / zsh** | `<<EOF` heredocs, `$()` command sub, `&&` / `||` / `|` chains, escaped quote rules |
| **Python** | Triple-quoted strings, decorators, `__init__` signatures, AST-checkable structures |
| **Rust** | `unsafe` blocks, lifetime annotations, `match` exhaustiveness hints |
| **C / C++** | Semicolons, brace balance, missing `#include` guards |
| **TypeScript / JavaScript** | Template literals, JSX balance, async/await syntax |
| **JSON / YAML / TOML** | Valid structure, type matches |
| **SQL / Docker / regex** | Compound-language audit (inner + host language both checked) |

---

## Install

### Quick install (single command)

```bash
git clone https://github.com/ojesusmp/line-check.git ~/.claude/skills/line-check
```

Or on Windows PowerShell:

```powershell
git clone https://github.com/ojesusmp/line-check.git "$env:USERPROFILE\.claude\skills\line-check"
```

### Activate auto-fire hooks (recommended)

The skill is invokable manually as soon as it's installed. To get **automatic per-write and per-Bash auditing**, add two hooks to `~/.claude/settings.json` — see [INSTALLATION.md](./INSTALLATION.md) for the full block + verification steps.

After installing the hooks, every `Write` / `Edit` / `MultiEdit` injects a `[LINE-CHECK ACTIVE]` reminder, and every `Bash` injects a `[LINE-CHECK PRE-FLIGHT]` reminder.

---

## Manual invocation

If you want to run the audit on demand instead of via hooks:

```text
Use the line-check skill on the current diff.
```

Or before posting a code block:

```text
Run line-check on this command before I send it: ssh remote-host "mkdir -p /tmp/x && tar -xzf foo.tgz -C
```

---

## Output format

When findings exist, the skill reports terse, fix-paired diagnostics:

```text
line-check findings (3):
  src/auth.ts:42  — contradiction    — return type `User` but body returns `User | null`
                                       — narrow return or widen signature?
  cmd:bash        — shell-completeness — `-C` flag has no target dir AND closing `"` missing
                                       — fixed: `ssh remote-host "… -C ~/.claude/projects/x"`
  README.md:14    — fact             — claims Node 18+ but package.json `engines` says 20+
                                       — aligned to 20+
```

When clean: **silent**. Passing audits never produce output — that's the default state.

---

## Who this is for

- Claude Code users who hit the `>>` continuation prompt more than once a week
- Anyone running multi-shell sessions (PowerShell + WSL + remote SSH simultaneously)
- Engineers who want Karpathy-style discipline at line scope, not just task scope
- Teams shipping skills/agents and need one-line audits before posting code blocks

---

## Documentation

- **[SKILL.md](./SKILL.md)** — canonical reference, all 5 checks documented
- **[INSTALLATION.md](./INSTALLATION.md)** — hook setup, verification, troubleshooting
- **[USAGE.md](./USAGE.md)** — manual + auto invocation, output format, integration
- **[EXAMPLES.md](./EXAMPLES.md)** — six real-world cases with diagnoses and fixes
- **[CHANGELOG.md](./CHANGELOG.md)** — version history

---

## How it interacts with other skills

| Skill | Relationship |
|-------|-------------|
| **[karpathy-guidelines](https://github.com/forrestchang/andrej-karpathy-skills)** | Karpathy = task-scope gates. line-check = line-scope gates. Stack them. |
| **superpowers:verification-before-completion** | line-check first (per-line consistency). verification after (whole-change behavior). |
| **publish-skill** | Cross-references: PS here-string parse traps documented there feed into line-check's Shell-Mode check. |
| **caveman / caveman-review** | line-check findings stay terse; caveman compresses output further. |
| **simplify (oh-my-claudecode)** | Scope check (line-check) catches it immediately. simplify catches it as a later refactor pass. |

---

## Recursion guard

Hooks fire on Write/Edit/Bash. The skill's own auto-fixes use Write/Edit/Bash, which would re-trigger the hook → infinite loop.

**Rule:** if the hook environment shows `LINE_CHECK_DEPTH=1` (set by the hook on first invocation), the skill **does not auto-fix mechanically** — it surfaces findings to the user instead. This caps recursion at depth 1.

See [SKILL.md § Recursion Guard](./SKILL.md#recursion-guard) for the full mechanism.

---

## Roadmap

| Version | Status | What |
|---------|--------|------|
| **v1.0.0** | ✅ Released | 5 checks, 6-item Pilot Checklist, per-shell signatures, recursion guard, vivid SSH/tar example |
| v1.1.0 | Planned | Companion `validate.sh` / `validate.py` — stdlib-only, calls `bash -n`, `python -m py_compile`, `pwsh -Command "[scriptblock]::Create(...)"`, `tsc --noEmit` (warm), regex fallback |
| v1.2.0 | Planned | MCP tool `linecheck.validate(text, lang)` — model calls explicitly, returns structured findings |
| v1.3.0 | Idea | Telemetry log + auto-promotion of most-common failure patterns to the cheat sheet (opt-in) |

**v1.0 ships with no companion validator** — by design. Build v1.1 only if v1's reminder-style check leaks. Per Karpathy guideline #2 (Simplicity First).

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Origin

Built in 2026 after one too many `>>` prompts ate the user's afternoon. Born from a Forge Council session (12 seats + Musk coordinator) on the question "what's the cheapest possible per-line check that doesn't bloat the skill?". Six patches survived, four shipped in v1.

If you find a new line-class bug this skill misses, open an issue with the failed line + diagnosis.

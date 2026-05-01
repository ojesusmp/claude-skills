# Usage

Three modes: **automatic** (via hooks), **manual** (explicit invocation), and **inline** (paste-and-check).

---

## 1. Automatic mode (via hooks)

After [installing the hooks](./INSTALLATION.md#2-wire-up-the-auto-fire-hooks), the skill fires automatically:

| Event | What fires | What the skill does |
|-------|-----------|---------------------|
| Claude calls `Write` / `Edit` / `MultiEdit` | PostToolUse hook | Re-reads the diff, walks each changed line through the 5 checks, fixes mechanical failures via Edit, surfaces judgment-level findings to the user |
| Claude calls `Bash` | PreToolUse hook | Stamps the 6-item Pilot Checklist on the command before it executes |

You don't have to do anything. If the audit finds something, you'll see a `line-check findings (N):` block in Claude's response. If everything is clean, **the skill stays silent** — that's the default state.

---

## 2. Manual mode

Invoke the skill explicitly when:

- You want to audit a diff that wasn't produced by Write/Edit (e.g. pasted code).
- You want to audit a shell command before sending it.
- You want to audit prose, a config file, or a commit message.

### Patterns that trigger the skill

- "Use the line-check skill on the current diff."
- "Run line-check on this command before I send it: `ssh remote-host "mkdir -p /tmp/x && tar -xzf foo.tgz -C`"
- "Apply the 5 checks to the SQL query below."
- "Stamp the Pilot Checklist on this PowerShell snippet."

### Direct skill invocation

In Claude Code:

```
Skill("line-check")
```

Or use the `/skill` command if you have OMC's skill manager:

```
/skill use line-check
```

---

## 3. Inline mode (paste-and-check)

You can apply the checks yourself before sending Claude a code block. The skill provides a 10-second mental algorithm:

### The 5-check walk

For each line in your diff or command:

1. **Does it contradict** an earlier line, the spec, or a chat claim?
2. **Does it parse** in its language?
3. **Is it shell-complete** (quotes paired, brackets paired, heredocs closed, no trailing continuation, flag-args filled, right shell)?
4. **Are the facts real** (paths exist, APIs exist, versions sourced)?
5. **Is it in scope** (does this line trace to the requested change)?

### The 6-item Pilot Checklist (shell only)

Before any shell command:

| # | Check | Pass condition |
|---|-------|---------------|
| 1 | Quotes paired | `"`, `'`, `` ` `` all even count |
| 2 | Brackets paired | `()`, `{}`, `[]`, `@()`, `@{}` all matched |
| 3 | Heredocs closed | `<<EOF` has matching bare `EOF` (no leading whitespace) |
| 4 | No accidental trailing continuation | Line doesn't end in `\`, `` ` ``, `&&`, `||`, `|` unless next line follows |
| 5 | Flag-args filled | Every `-X` that takes a value has one |
| 6 | Right shell | Syntax matches the prompt shown |

If all pass → send. If any fail → name the missing piece, fix, re-stamp.

---

## Output format

When findings exist:

```text
line-check findings (N):
  <file>:<line> — <check> — <issue> — <proposed fix>
```

Real example output:

```text
line-check findings (4):
  src/auth.ts:42  — contradiction    — return type `User` but body returns `User | null`
                                       — narrow return or widen signature?
  src/auth.ts:58  — syntax           — closing brace missing for `if` block
                                       — fixed in edit
  cmd:bash        — shell-completeness — `-C` flag has no target dir AND closing `"` missing
                                       — fixed: ssh remote-host "… -C ~/.claude/projects/x"
  README.md:14    — fact             — claims Node 18+ but package.json `engines` says 20+
                                       — aligned to 20+
```

When clean:

> *(no output — silent on clean audits)*

---

## When the skill auto-fixes vs. surfaces

| Failure type | Auto-fix? | Why |
|-------------|-----------|-----|
| Typo, missing closer, missing flag-arg | ✅ Yes (mechanical) | One unambiguous fix; no judgment needed |
| Contradiction with earlier line in same diff | ✅ Yes | Skill picks the version closer to the user's stated requirement |
| Scope creep (drive-by refactor) | ✅ Yes (revert) | Karpathy guideline #3: every line must trace to the request |
| Factual claim it cannot verify | ⚠ Surface | Skill flags but does not invent facts |
| Possible misread of context | ⚠ Surface | If unsure, ask the user |
| Recursion-guarded (depth ≥ 1) | ⚠ Surface only | Prevents infinite hook → fix → hook loops |

---

## Long-file mode

For diffs > 200 changed lines:

- Audits **changed regions only** (not the whole file).
- Groups findings by file; reports per-file counts.
- If a file has > 50 findings, **stops and asks the user** — likely a mismatch between intent and implementation, not a per-line fixable problem.

For files > 2000 lines: skipped entirely (sample instead).

---

## Compound-language lines

Lines where one language is embedded inside another are doubly-prone to bugs. The skill runs **both** the host-language check **and** the inner-language check on these:

| Pattern | Outer | Inner |
|---------|-------|-------|
| `subprocess.run(["bash", "-c", "..."])` | Python | bash |
| `cur.execute("SELECT * FROM users WHERE id = %s", (uid,))` | Python | SQL |
| ``` `RUN apt-get update && apt-get install -y curl` ``` | Dockerfile | bash |
| `re.compile(r"...complex pattern...")` | Python | regex |
| `@'...'@ powershell here-string with embedded script` | PS host | PS script |
| `eval("...")`, `exec("...")` | Any | The eval'd code |

Most one-line bugs in this category are **unbalanced quotes between the two layers**.

---

## Integration with other skills

| Skill | When to combine | Order |
|-------|----------------|-------|
| `karpathy-guidelines` | Always (this is the companion skill at line scope) | Karpathy gates planning; line-check gates shipping |
| `superpowers:verification-before-completion` | Before claiming completion of any task | line-check first (per-line). verification after (whole-change). |
| `superpowers:test-driven-development` | When implementing a feature | TDD writes tests first; line-check audits each line as you write |
| `caveman` / `caveman-review` | When you want compressed output | line-check produces terse findings by default; caveman compresses further |
| `simplify` (oh-my-claudecode) | Periodic refactor passes | line-check catches scope creep at write-time; simplify catches it at refactor-time |
| `publish-skill` | Before publishing a skill | line-check audits the SKILL.md and supporting docs first |

---

## What the skill is *not*

| Not | Why | Use instead |
|-----|-----|------------|
| A linter replacement | Doesn't catch every style issue, doesn't run AST parsers | Real linters (eslint, ruff, clippy) |
| A test replacement | Doesn't prove behavior, only internal consistency | Real tests |
| A security audit | Flags obvious leaks but not deep vulnerabilities | `superpowers:security-review`, gitleaks, trufflehog |
| A typing system | Catches contradictions, not deep flow analysis | TypeScript/mypy/Pyright |
| A sandbox | Does not pre-execute commands | Containers, dry-run modes |

It is a **fast self-review pass** that catches the cheap, embarrassing, hallucination-class mistakes (and the continuation-prompt trap) before they reach the user.

---

## Anti-patterns (don't do these)

- ❌ Run it once per file instead of once per write — defeats the purpose.
- ❌ Skip because "the diff is small" or "the command is short" — short commands hit the trap most.
- ❌ Treat as a replacement for thinking before coding — it's the safety net, not the plan.
- ❌ Auto-fix scope-check failures without mentioning them — silent drops are worse than visible reverts.
- ❌ Run on whole files every time — only changed regions. Cheap stays cheap.

---

## Performance

The skill is reminder-only in v1.0 — no real parsers run. Cost is the LLM tokens of the system-reminder injection (~150 tokens per fire). Latency added per write/Bash call: negligible.

If you want **real parser-backed validation** (`bash -n`, `python -m py_compile`, `tsc --noEmit`), wait for v1.1's optional companion validator script — see [CHANGELOG.md](./CHANGELOG.md) and [README § Roadmap](./README.md#roadmap).

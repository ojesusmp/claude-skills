# Examples

Real cases the skill catches. Each example shows the bad line, why it broke, the line-check finding, and the fix.

---

## Example 1: SSH + tar — the canonical SSH/tar trap

### Bad

```text
PS C:\Users\molin> ssh brain "mkdir -p ~/.claude/projects/-home-orlandoj-superbrain && tar -xzf ~/memory.tgz -C
>>
```

### What broke

1. The `tar -xzf ~/memory.tgz -C` ends with `-C`, which expects a target directory — none follows.
2. The double-quoted SSH argument was never closed (no trailing `"`).
3. PowerShell entered continuation prompt (`>>`), waiting for the closer that never came.

### line-check finding

```text
line-check findings (1):
  cmd:powershell — shell-completeness — closing `"` missing AND `-C` flag has no target directory
                                      — fixed: ssh brain "mkdir -p ~/.claude/projects/-home-orlandoj-superbrain && tar -xzf ~/memory.tgz -C ~/.claude/projects/-home-orlandoj-superbrain"
```

### Caught by

- Pilot Checklist item 1 (Quotes paired) — `"` count is 1, odd.
- Pilot Checklist item 5 (Flag-args filled) — `-C` is in the cheat sheet as flag-that-takes-value.

### Fix

```text
PS C:\Users\molin> ssh brain "mkdir -p ~/.claude/projects/-home-orlandoj-superbrain && tar -xzf ~/memory.tgz -C ~/.claude/projects/-home-orlandoj-superbrain"
```

Both issues fixed in one line. Command executes.

---

## Example 2: bash heredoc with indented `EOF`

### Bad

```bash
cat > /tmp/config.yaml <<EOF
key: value
nested:
  item: 1
  EOF
```

### What broke

The closing `EOF` has leading whitespace (two spaces). Bash heredocs require the close marker to start at column 0 with NO leading whitespace (unless the opener is `<<-EOF`, which strips leading tabs only — not spaces).

### line-check finding

```text
line-check findings (1):
  cmd:bash:5 — shell-completeness — heredoc EOF closer has leading whitespace; bash will not close the heredoc
                                  — fix: remove leading spaces, or change opener to `<<-EOF` and use a TAB (not spaces) before EOF
```

### Caught by

- Pilot Checklist item 3 (Heredocs closed) — `EOF` doesn't match the opener's expected closure rule.
- 5th check § 3d (Heredocs closed) — explicit rule.

### Fix

```bash
cat > /tmp/config.yaml <<EOF
key: value
nested:
  item: 1
EOF
```

Closing `EOF` flush left.

---

## Example 3: PowerShell vs bash mode mismatch

### Bad

```text
PS C:\> cd /tmp && ls -la
```

### What broke

- `&&` is not unconditional-chain in PowerShell 5.1 (Windows default). PS uses `;` for unconditional sequence; conditional chain requires PS 7+ with `&&`/`||` operators.
- On PS 5.1, `&&` triggers a parser error: `'&&' operator is reserved for future use`.

### line-check finding

```text
line-check findings (1):
  cmd:powershell — shell-completeness — `&&` not supported in PS 5.1; right-shell mismatch
                                      — fix: `cd /tmp; ls -la` (sequential; runs both regardless of cd success)
                                      — or: `if (Set-Location /tmp) { Get-ChildItem -Force }` (conditional)
```

### Caught by

- 5th check § 3a (Right shell?) — explicit PS-vs-bash mode rule.
- Pilot Checklist item 6 (Right shell) — syntax mismatch with PS prompt.

### Fix

```text
PS C:\> cd /tmp; ls -la
```

Or for conditional execution on PS 7+:

```text
PS C:\> cd /tmp && ls -la
```

(PS 7+ accepts `&&`. The skill recommends checking `$PSVersionTable.PSVersion` first.)

---

## Example 4: Python — silent type contradiction

### Bad

```python
def get_user(uid: int) -> User:
    user = db.fetch(uid)
    if user is None:
        return None
    return user
```

### What broke

The return type is annotated `User`, but the body returns `None` on the miss path. Type checker would flag this on Optional vs non-Optional return.

### line-check finding

```text
line-check findings (1):
  src/users.py:4 — contradiction — return type `User` but body returns `None` on miss
                                 — narrow return: raise UserNotFound; OR widen signature: -> User | None
```

### Caught by

- Check 1 (Contradiction) — return type vs body return value.

### Fix (option A — narrow with exception)

```python
def get_user(uid: int) -> User:
    user = db.fetch(uid)
    if user is None:
        raise UserNotFound(uid)
    return user
```

### Fix (option B — widen signature)

```python
def get_user(uid: int) -> User | None:
    user = db.fetch(uid)
    if user is None:
        return None
    return user
```

The skill flags but doesn't auto-pick — the choice depends on caller expectations (Karpathy guideline #1: surface tradeoffs, don't pick silently).

---

## Example 5: TypeScript — unclosed template literal

### Bad

```typescript
const greeting = `Hello ${user.name}, welcome to ${appName;
```

### What broke

The closing backtick is missing. TypeScript will parse this as an unterminated template literal, and the `;` becomes part of the template string instead of a statement terminator.

### line-check finding

```text
line-check findings (1):
  src/welcome.ts:1 — syntax — unclosed template literal (backtick count odd: 1)
                            — fix: `Hello ${user.name}, welcome to ${appName}`;
```

### Caught by

- Pilot Checklist item 1 (Quotes paired) — `` ` `` count is 1, odd.
- Check 2 (Syntax) — would parse but not as intended.

### Fix

```typescript
const greeting = `Hello ${user.name}, welcome to ${appName}`;
```

---

## Example 6: Dockerfile RUN with bash trap (compound language)

### Bad

```dockerfile
RUN apt-get update && \
    apt-get install -y curl jq \
    && rm -rf /var/lib/apt/lists/*
```

### What broke

The second line ends with `\` (continuation). The third line begins with `&&`. Bash sees this as a valid continuation, so it works — BUT the leading `&&` on a new line is fragile. If a maintainer reorders lines, it breaks. Also: the install list `curl jq` has no trailing `\` before `&&`, so if someone adds a package between them, they may break the chain.

This is a **compound-language line**: Dockerfile host, bash inside `RUN`. Both layers checked.

### line-check finding

```text
line-check findings (1):
  Dockerfile:1-3 — shell-completeness — multi-line RUN uses fragile leading-`&&` pattern;
                                       reorder-resilience low
                                     — fix: end every line in `&&` (not start next line with it)
```

### Caught by

- Compound-language audit § (Dockerfile + bash).
- Pilot Checklist item 4 (Trailing-continuation) — line 2 is intentional continuation but pattern is brittle.

### Fix

```dockerfile
RUN apt-get update \
    && apt-get install -y curl jq \
    && rm -rf /var/lib/apt/lists/*
```

Now every line ends with `\` (or `&&\` mid-chain), and removing or adding a step is a clean reorder.

---

## Example 7: Scope creep on a bug fix

### User request

> Fix the off-by-one in `parseDate` at `src/utils.ts:42`.

### Claude's diff

```typescript
// Before:
const day = parts[0];

// After:
const day = parts[0];
const month = parts[1].padStart(2, '0'); // Also normalize month
const year = parseInt(parts[2], 10);
console.log('Parsed date:', { day, month, year }); // Add debug logging
```

### What broke

The original off-by-one bug was in `day` indexing. The diff adds:
1. Month normalization (not requested)
2. `parseInt` for year (was already string, may break callers)
3. Debug `console.log` (not requested, also leaks info)

### line-check finding

```text
line-check findings (3):
  src/utils.ts:43 — scope — added month normalization, not in user request — reverted
  src/utils.ts:44 — scope — changed year type from string to int, may break callers — reverted
  src/utils.ts:45 — scope — added console.log debug, not in user request — reverted
```

### Caught by

- Check 5 (Scope) per Karpathy guideline #3 (Surgical Changes).

### Fix

Revert lines 43-45. Keep only the line that fixes the off-by-one. Mention the other observations in the chat reply, **don't bundle them in the diff**.

---

## Example 8: Hook command itself failing the skill

A meta-example: the line-check skill audited its own SKILL.md when the user asked to publish it. The Forge Council session found the original PreToolUse hook command had:

### Bad

```python
python -c "import json; print(json.dumps({'additionalContext':'check (\\\"\\\\,\\\\\\'',\\\\` etc)'}))"
```

### What broke

Triple-escaped quotes inside python `-c` inside JSON string:
- JSON layer needs `\"` for embedded `"`.
- Python single-quoted string then sees `\\\"` which is questionable.
- The mix produces unreliable output across Python versions (3.12+ raises SyntaxWarning for invalid escapes).

### line-check finding

```text
line-check findings (1):
  SKILL.md:hook-setup — shell-completeness — fragile triple-escaped python source;
                                            risk of SyntaxWarning/parse breakage on paste
                                          — fix: replace embedded quote-mark literals with descriptive prose
                                            (move concrete examples to SKILL.md proper)
```

### Caught by

- Check 2 (Syntax) — embedded language consistency.
- Compound-language audit § (JSON + bash + Python).

### Fix

Replace with plain-text reminder, no embedded quote literals:

```python
python -c "import json; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','additionalContext':'[LINE-CHECK PRE-FLIGHT] Run the 6-item Pilot Checklist from the line-check skill. See SKILL.md.'}}))"
```

The actual checklist content lives in SKILL.md — the hook just points at it.

---

## Pattern recognition

Across all 8 examples, four bug families dominate:

| Family | Examples | Detection layer |
|--------|----------|----------------|
| Unbalanced delimiters | 1, 5 | Pilot Checklist items 1, 2 |
| Mode/shell mismatch | 1, 3 | Pilot Checklist item 6, Check 3a |
| Missing flag-args | 1, 6 | Pilot Checklist item 5, Check 3f |
| Scope creep / contradiction | 4, 7 | Checks 1, 5 |
| Compound-language confusion | 6, 8 | Compound-language audit |

If you see your bug fits one of these families, the skill should catch it. If your bug fits **none** of these families, please open an issue — that's the v1.1 cheat-sheet update opportunity.

---

## Anti-examples (what the skill does NOT catch)

The skill is intentionally narrow. Things it does not flag:

| Not caught | Why | What to use |
|-----------|-----|------------|
| Off-by-one in algorithm logic | Behavioral, not line-internal | Tests |
| SQL injection | Requires data-flow analysis | Real security review, parametrized queries |
| Race conditions | Cross-line, cross-thread | Tests, code review |
| Performance regressions | Requires benchmarks | `superpowers:performance-review`, profiling |
| Architectural mistakes | Task-scope, not line-scope | `karpathy-guidelines`, design review |

The skill catches the **cheap mistakes** so a reviewer can spend their attention on the **expensive ones**.

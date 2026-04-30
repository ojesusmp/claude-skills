# Installation

This document covers three things: getting the skill on disk, wiring up the auto-fire hooks, and verifying both work.

---

## 1. Install the skill

### Linux / macOS / WSL

```bash
git clone https://github.com/ojesusmp/line-check.git ~/.claude/skills/line-check
```

### Windows (PowerShell)

```powershell
git clone https://github.com/ojesusmp/line-check.git "$env:USERPROFILE\.claude\skills\line-check"
```

### Windows (Git Bash / WSL)

```bash
git clone https://github.com/ojesusmp/line-check.git /c/Users/$USER/.claude/skills/line-check
```

### Verify the install

Open a fresh Claude Code session. The skill should appear in the available-skills list as:

```
- line-check: Use after every Write, Edit, or MultiEdit AND before every Bash tool call …
```

If it doesn't appear, confirm the path:

```bash
ls ~/.claude/skills/line-check/SKILL.md
```

The skill is now manually invocable (`Skill("line-check")` or "use line-check on this"). To get **automatic per-write and per-Bash auditing**, continue to step 2.

---

## 2. Wire up the auto-fire hooks

Two hooks are recommended:

- **PostToolUse** on `Write|Edit|MultiEdit` — fires after every file write, runs the 5-check audit.
- **PreToolUse** on `Bash` — fires before every shell command, stamps the 6-item Pilot Checklist.

### Add the hooks to `~/.claude/settings.json`

Open `~/.claude/settings.json` and add (or merge into) the `"hooks"` block:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "python -c \"import json; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PostToolUse','additionalContext':'[LINE-CHECK ACTIVE] File write/edit completed. Run line-check skill: re-read the diff and audit each changed line through the 5 checks (Contradiction, Syntax, Shell-Mode, Fact, Scope). Fix mechanical failures via Edit; surface judgment-level findings before claiming completion. Recursion guard: skip auto-fix if LINE_CHECK_DEPTH set. Format: <file>:<line> -- <check> -- <issue> -- <fix>. Silent on clean audits.'}}))\""
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "python -c \"import json; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','additionalContext':'[LINE-CHECK PRE-FLIGHT] Before sending this Bash command, run the 6-item Pilot Checklist from the line-check skill (quotes paired, brackets paired, heredocs closed, no accidental trailing continuation, flag-args filled, right shell). See ~/.claude/skills/line-check/SKILL.md section: The Pilot Pre-Send Checklist. If any item fails, fix the command BEFORE sending. Silent on clean.'}}))\""
          }
        ]
      }
    ]
  }
}
```

> **If you already have a `"hooks"` block** (e.g. for `SessionStart`), merge — do not replace. Add `PostToolUse` and `PreToolUse` keys alongside the existing event keys.

### Reload settings

After editing `settings.json`, the file watcher may not pick up the change in your current session. Either:

- Open `/hooks` once in Claude Code (this reloads the config), **or**
- Restart Claude Code.

### Verify the hooks fire

Trigger each hook and confirm the reminder appears:

```text
You: write a tiny file at /tmp/test-line-check.txt
```

After Claude does the Write, the next system-reminder should contain:

```
[LINE-CHECK ACTIVE] File write/edit completed. Run line-check skill: …
```

Then trigger a Bash command (any harmless one):

```text
You: run `ls /tmp` in bash
```

Before the command runs, you should see:

```
[LINE-CHECK PRE-FLIGHT] Before sending this Bash command, run the 6-item Pilot Checklist …
```

If you see both, hooks are live.

### Verify via the harness command (optional, advanced)

Pipe a synthetic hook payload through the command directly:

```bash
python -c "import json; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PostToolUse','additionalContext':'test'}}))"
```

If this prints valid JSON, the hook command will work when fired.

---

## 3. Troubleshooting

### Skill doesn't appear in the available-skills list

- Confirm path: `ls -la ~/.claude/skills/line-check/SKILL.md` — the file must exist exactly there.
- Confirm frontmatter is valid YAML — open `SKILL.md` and check the top `---` block parses.
- Restart Claude Code (skill discovery happens at session start).

### Hooks not firing

1. **Validate JSON syntax** — a broken `settings.json` silently disables all hooks. Run:
   ```bash
   python -m json.tool ~/.claude/settings.json
   ```
   If this errors, fix the JSON first.

2. **Validate hook structure** — a hook with the wrong matcher silently does nothing:
   ```bash
   python -c "import json; d=json.load(open('$HOME/.claude/settings.json')); print(d['hooks'].keys())"
   ```
   You should see `dict_keys(['SessionStart', 'PostToolUse', 'PreToolUse'])` (or similar).

3. **Reload settings** — open `/hooks` once, or restart.

4. **Check `--debug`** — run `claude --debug` to see hook execution logs and any command errors.

### "Python not found" on Windows

The hook commands shell out to `python`. If your Windows install uses `py` or `python3`:

- Replace `python -c` with `py -c` or `python3 -c` in the hook commands.
- Or install Python and add it to PATH.

### Hook is too noisy

The `[LINE-CHECK PRE-FLIGHT]` reminder fires on every Bash call, including read-only ones (`ls`, `cat`, `pwd`). If you want to scope it to only mutating commands, narrow the matcher (this is non-trivial because Claude Code matchers are tool names, not regex over arguments — for now, the simplest approach is to mentally skip the reminder on reads).

A future v1.1 may ship a smarter matcher that only fires on commands flagged by an inline pre-parse.

### Recursion / infinite loop

If the skill's auto-fixes trigger another PostToolUse, which triggers another fix, etc.:

- The skill respects `LINE_CHECK_DEPTH=1` env var (set by the hook on first invocation) and stops auto-fixing.
- If you somehow hit a loop anyway: kill the session, edit `settings.json` to remove the hook, restart.

### "I want this only for some projects, not globally"

Move the hook block out of `~/.claude/settings.json` (global) into `<project>/.claude/settings.json` (project-scoped). The skill itself stays global at `~/.claude/skills/line-check/`; only the auto-fire hook moves.

---

## 4. Uninstall

### Disable the auto-fire hooks

Remove the `PostToolUse` and `PreToolUse` entries from `~/.claude/settings.json`. The skill itself remains manually invocable.

### Remove the skill entirely

```bash
rm -rf ~/.claude/skills/line-check
```

Restart Claude Code.

---

## 5. Updating

```bash
cd ~/.claude/skills/line-check
git pull origin main
```

Check [CHANGELOG.md](./CHANGELOG.md) for breaking changes between versions.

---

## 6. Configuration knobs (none, by design)

`line-check` v1.0 has zero config. No environment variables to set, no flags to flip. By design — per Karpathy guideline #2 (Simplicity First). If you want different behavior, fork it.

Future versions may add opt-in knobs (validator-script enable, telemetry log path); none in v1.

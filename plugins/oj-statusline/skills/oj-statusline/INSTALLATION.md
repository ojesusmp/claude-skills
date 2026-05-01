# Installation

## Prerequisites

- **Claude Code** 1.x or newer (any platform: macOS, Linux, Windows, WSL)
- **Node.js 18+** (for `node:` import prefix support and async stdin iteration)
- A configurable `~/.claude/settings.json` (the installer creates it if missing)

## Quick install — via the marketplace (recommended)

```text
/plugin marketplace add ojesusmp/claude-skills
/plugin install oj-statusline@claude-skills
```

Then restart Claude Code. The plugin's `SessionStart` hook auto-runs `install.mjs` on the first session restart, which wires `~/.claude/settings.json` `statusLine.command` and copies the runtime to `~/.claude/hud/oj-statusline.mjs`. Both are idempotent.

**Total user steps: 2 commands + 1 restart.** No manual `node` invocation required.

### Why two restarts may be needed on the very first install

Claude Code reads `settings.json` once at session start and applies `statusLine.command` for the duration of that session. The auto-wire hook patches the file *during* the first restart's session start, so the new statusLine takes effect on the **next** restart. After that, all subsequent restarts use the new statusline immediately.

If you want it active in a single restart, the easiest path is the bundled slash command:

```text
/oj-statusline-setup
```

Run it inside Claude Code right after `/plugin install`. It invokes the installer in verbose mode, then prompts you to fully quit and reopen Claude Code. The new statusline appears on the next session start.

The manual `node install.mjs` invocation below is the same flow without the slash command.

## Manual install — without the marketplace

If you do not want to register the marketplace, clone the hub and run the installer directly:

```sh
git clone https://github.com/ojesusmp/claude-skills.git /tmp/claude-skills
node /tmp/claude-skills/plugins/oj-statusline/skills/oj-statusline/install.mjs
```

## What the installer does

1. Creates `~/.claude/hud/` if missing.
2. Copies `statusline.mjs` to `~/.claude/hud/oj-statusline.mjs`.
3. Reads `~/.claude/settings.json`. If a prior `statusLine.command` exists, saves it under `_ojStatuslinePriorCommand` for safe rollback.
4. Sets `statusLine` to `{ "type": "command", "command": "node \"<HOME>/.claude/hud/oj-statusline.mjs\"" }`.
5. Writes settings back atomically, pretty-printed, with a trailing newline.

The installer is **idempotent** — running it twice produces no extra changes after the first successful run.

## Per-platform path notes

- **macOS / Linux**: paths above are literal.
- **Windows (PowerShell)**: replace `~` with `$env:USERPROFILE` if your shell does not expand tilde — e.g. `node "$env:USERPROFILE\.claude\plugins\cache\claude-skills\oj-statusline\1.0.0\skills\oj-statusline\install.mjs"`.
- **WSL**: the installer respects the active `$HOME`, so running inside WSL writes to the WSL home, not the Windows home.

## Custom Claude config dir

If you set `CLAUDE_CONFIG_DIR` to redirect Claude Code's config root, the installer respects that path:

```sh
CLAUDE_CONFIG_DIR=/opt/team-claude node install.mjs
# writes to /opt/team-claude/hud/oj-statusline.mjs
# patches /opt/team-claude/settings.json
```

## Verify install

Inspect state without making changes:

```sh
node install.mjs --check
```

Expected output (post-install):

```
config dir:   /home/you/.claude
hud script:   /home/you/.claude/hud/oj-statusline.mjs [present]
statusLine:   node "/home/you/.claude/hud/oj-statusline.mjs"
installed:    yes
```

## Uninstall

```sh
node install.mjs --uninstall
```

The uninstaller:

1. Removes `~/.claude/hud/oj-statusline.mjs`.
2. If `_ojStatuslinePriorCommand` exists in settings, restores it to `statusLine.command`. Otherwise removes the `statusLine` block.
3. Cleans up the backup key.

Restart Claude Code to apply.

## Coexistence with oh-my-claudecode HUD

`oj-statusline` looks for the OMC HUD at `~/.claude/plugins/cache/omc/oh-my-claudecode/<version>/dist/hud/index.js`. If found, it spawns it as a child process and prints its output between the token line and the skills line. If not found, it silently skips that step.

You do **not** need to install OMC. `oj-statusline` works standalone.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| No statusline after `/plugin install` + restart | Plugin SessionStart hook ran but you have not yet done the second restart Claude Code needs to pick up the new `statusLine` | Run `/oj-statusline-setup` to confirm wiring, then fully quit and reopen Claude Code one more time |
| Statusline blank | Node 18+ not on `PATH` for Claude Code | Verify `node --version` from the same shell that launches Claude Code |
| `cannot parse settings.json` | Hand-edited JSON is malformed | Open `~/.claude/settings.json`, validate with a JSON linter, fix and re-run |
| Skills line missing | `enabledPlugins` is empty in settings | Install at least one plugin via `/plugin install` |
| `ctx:` shows as gray dashes | Claude Code did not pass `used_percentage` | Older CC versions; upgrade Claude Code |
| Token line shows but no HUD line | OMC plugin not installed; expected | Install `oh-my-claudecode` if you want the third line |
| Active highlight shows the wrong skill | Slash-command parser matched a partial token | File an issue with your transcript tail; the matcher is heuristic |

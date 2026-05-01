# oj-statusline -- Operator Manual

A field guide covering install, upgrade, uninstall, verification, and every failure mode the plugin has been observed to hit on Windows, macOS, Linux, and WSL.

This manual uses generic shell paths only (`~/.claude/...`, `$HOME/.claude/...`). Substitute with your own home directory if your shell does not expand `~`.

---

## Table of contents

1. [What you should expect to see](#what-you-should-expect-to-see)
2. [Quick install (happy path)](#quick-install-happy-path)
3. [Manual install (bypass plugin-marketplace bugs)](#manual-install-bypass-plugin-marketplace-bugs)
4. [Upgrade an existing install](#upgrade-an-existing-install)
5. [Uninstall](#uninstall)
6. [Verify](#verify)
7. [Why two restarts on first install](#why-two-restarts-on-first-install)
8. [Troubleshooting matrix](#troubleshooting-matrix)
9. [Cross-platform shell quick reference](#cross-platform-shell-quick-reference)

---

## What you should expect to see

After a successful install and full Claude Code restart, the bottom of every Claude Code session shows three lines (or two, if `oh-my-claudecode` is not installed):

```
tok cached:0 new:0 total:0 mcp:0x hk:0x
[OMC line, if oh-my-claudecode is installed]
skills: <plugin1> · <plugin2> · <plugin3> · ... · <pluginN>
```

* The **token line** is the first line. It always renders, even on a fresh session before any tokens are spent (this was a bug fixed in v1.2.2).
* The **OMC HUD line** is the second line, only present if `oh-my-claudecode` is installed. `oj-statusline` spawns OMC HUD as a child process and embeds its output. If you do not have OMC, this line is omitted.
* The **skills line** is the last line. It lists every entry in `enabledPlugins` from `~/.claude/settings.json`, soft-wrapped to your terminal width. The most-recently-active skill is highlighted with a `[active: <name>]` tail.

If you see only the OMC HUD line and the skills line but no token line, you are on v1.2.1 or older -- upgrade.

---

## Quick install (happy path)

In Claude Code:

```text
/plugin marketplace add ojesusmp/claude-skills
/plugin install oj-statusline@claude-skills
/oj-statusline:setup
```

Then quit Claude Code fully and reopen it. The statusline appears at the bottom of the next session.

That is the entire flow on most systems. If any step prints an error or silently does nothing, jump to the [troubleshooting matrix](#troubleshooting-matrix).

> **Note on `@` versus `/` separator.** Claude Code's plugin install syntax is `<plugin-name>@<marketplace-name>`. Typing `oj-statusline/claude-skills` instead of `oj-statusline@claude-skills` produces a `marketplace ... not found` error.

---

## Manual install (bypass plugin-marketplace bugs)

Some Claude Code builds (observed on at least one Ubuntu/WSL setup) report `Successfully added marketplace` but silently skip the underlying `git clone` step. The marketplace registers in `~/.claude/settings.json` `extraKnownMarketplaces` but `~/.claude/plugins/marketplaces/claude-skills/` never gets created, so every subsequent `/plugin install` reports `marketplace not found`.

If you suspect this, do the clone yourself:

**Bash / zsh / WSL / macOS terminal:**

```sh
git clone https://github.com/ojesusmp/claude-skills.git ~/.claude/plugins/marketplaces/claude-skills
```

**PowerShell:**

```powershell
git clone https://github.com/ojesusmp/claude-skills.git $HOME\.claude\plugins\marketplaces\claude-skills
```

Then in Claude Code:

```text
/plugin install oj-statusline@claude-skills
/oj-statusline:setup
```

Quit and reopen.

If `/plugin install` still fails after a manual clone, run the installer directly from the cloned marketplace and skip the plugin-install step entirely:

**Bash / zsh / WSL / macOS:**

```sh
node ~/.claude/plugins/marketplaces/claude-skills/plugins/oj-statusline/skills/oj-statusline/install.mjs
```

**PowerShell:**

```powershell
node "$HOME\.claude\plugins\marketplaces\claude-skills\plugins\oj-statusline\skills\oj-statusline\install.mjs"
```

The installer copies the runtime to `~/.claude/hud/oj-statusline.mjs` and patches `~/.claude/settings.json` `statusLine.command`. Quit Claude Code and reopen.

---

## Upgrade an existing install

Two paths, in order of preference.

### Path A -- through Claude Code

```text
/plugin marketplace update claude-skills
/plugin update oj-statusline@claude-skills
/oj-statusline:setup
```

Quit and reopen.

### Path B -- force-pull from shell when Path A is silent

Claude Code's `/plugin marketplace update` does not always re-pull cleanly when files inside the marketplace change. Force the pull by hand:

**Bash / zsh / WSL / macOS:**

```sh
cd ~/.claude/plugins/marketplaces/claude-skills && git fetch origin main && git reset --hard origin/main
node ~/.claude/plugins/marketplaces/claude-skills/plugins/oj-statusline/skills/oj-statusline/install.mjs
```

**PowerShell:**

```powershell
Set-Location $HOME\.claude\plugins\marketplaces\claude-skills
git fetch origin main
git reset --hard origin/main
node "$HOME\.claude\plugins\marketplaces\claude-skills\plugins\oj-statusline\skills\oj-statusline\install.mjs"
```

Always run the installer from the **marketplaces** path (a fresh clone), not the **cache** path. Claude Code's per-version cache directory under `~/.claude/plugins/cache/claude-skills/oj-statusline/<version>/` can lag behind the marketplace clone. A `find ... | head -1` style discovery may pick the cache copy and copy stale code over good code -- always use the explicit marketplaces path during a force-upgrade.

If Claude Code's cache is badly stale (stuck on a version that has been deleted from the marketplace), nuke it:

**Bash / zsh / WSL / macOS:**

```sh
rm -rf ~/.claude/plugins/cache/claude-skills/oj-statusline
```

**PowerShell:**

```powershell
Remove-Item -Recurse -Force "$HOME\.claude\plugins\cache\claude-skills\oj-statusline" -ErrorAction SilentlyContinue
```

Then run `/plugin update oj-statusline@claude-skills` in Claude Code to repopulate the cache from the marketplace clone.

Quit and reopen.

---

## Uninstall

```sh
node ~/.claude/plugins/marketplaces/claude-skills/plugins/oj-statusline/skills/oj-statusline/install.mjs --uninstall
```

PowerShell variant:

```powershell
node "$HOME\.claude\plugins\marketplaces\claude-skills\plugins\oj-statusline\skills\oj-statusline\install.mjs" --uninstall
```

The uninstaller:

1. Removes `~/.claude/hud/oj-statusline.mjs`.
2. Removes the marker file `~/.claude/hud/.oj-statusline-bootstrapped`.
3. If `_ojStatuslinePriorCommand` was saved during a prior install (the previous `statusLine.command` value), restores it to `statusLine.command`. Otherwise removes the `statusLine` block entirely.

To also remove the plugin from Claude Code:

```text
/plugin remove oj-statusline@claude-skills
```

Restart Claude Code.

---

## Verify

The installer ships a non-destructive check mode:

```sh
node ~/.claude/plugins/marketplaces/claude-skills/plugins/oj-statusline/skills/oj-statusline/install.mjs --check
```

Expected output on a healthy install:

```
config dir:   <abs path to ~/.claude>
hud script:   <abs path to ~/.claude/hud/oj-statusline.mjs> [present]
runtime sync: yes
statusLine:   node "<abs path to ~/.claude/hud/oj-statusline.mjs>"
installed:    yes
marker:       present
```

* `runtime sync: no` means the file in `~/.claude/hud/` is older than the source in the marketplace clone -- run the installer (without `--check`) to fix.
* `installed: no` means `settings.json` `statusLine.command` is pointing at something other than this plugin -- run the installer to wire it up; the prior command is preserved under `_ojStatuslinePriorCommand`.

Manually inspect the rendered statusline by piping JSON to the runtime:

```sh
echo '{}' | node ~/.claude/hud/oj-statusline.mjs
```

You should see the three-line output described in [What you should expect to see](#what-you-should-expect-to-see).

---

## Why two restarts on first install

Claude Code reads `statusLine.command` from `~/.claude/settings.json` once at session start. The plugin's `SessionStart` hook is what writes the new `statusLine.command` value -- so on the very first session after `/plugin install`:

1. Session 1 starts. Claude Code reads the old `statusLine.command` (whatever was there before, or none). The `SessionStart` hook fires *during* startup and patches `settings.json`. The new command is now on disk but the running session is already using the old value.
2. Session 2 starts. Claude Code reads the freshly-patched `statusLine.command` and the new statusline appears.

To collapse this to a single restart, run `/oj-statusline:setup` (or the manual `node install.mjs`) **before** the first restart. That writes `settings.json` immediately while the session is alive. The next restart picks up the new command.

This is a fundamental Claude Code behavior, not a bug in the plugin.

---

## Troubleshooting matrix

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `/plugin marketplace add` reports success but `/plugin install` says marketplace not found | Some Claude Code builds skip the underlying `git clone` after registering the marketplace name in `settings.json` | [Manual install](#manual-install-bypass-plugin-marketplace-bugs) -- clone the marketplace by hand |
| `/plugin install oj-statusline/claude-skills` errors with `Marketplace ... not found` | Wrong separator -- `/plugin install` syntax uses `@` not `/` | Type `/plugin install oj-statusline@claude-skills` |
| `/oj-statusline:setup` shows `command not found` after install | Plugin not yet enabled, or first session after install (slash commands load on the *next* session start) | Verify `~/.claude/settings.json` `enabledPlugins` contains `"oj-statusline@claude-skills": true`, then quit and reopen Claude Code |
| Statusline blank or never appears | Node 18+ not on Claude Code's `PATH`, or `statusLine.command` not pointing at the plugin runtime | Run `node --version` from the same shell that launches Claude Code; run the installer's `--check` mode (above) |
| Statusline appears but no token line at session start | Pre-v1.2.2 runtime returned early when no tokens had been used yet | [Upgrade](#upgrade-an-existing-install) to v1.2.2 or newer |
| Statusline shows `[OMC]` line but with `statusLine: NOT configured` | `oj-statusline` runtime delegates to `oh-my-claudecode` HUD, which thinks it is the active statusline. This is cosmetic only -- the OMC HUD self-diagnostic does not detect that it is being embedded by another statusline | Ignore the OMC self-diagnostic message, or run `/oh-my-claudecode:hud setup` to silence it |
| Skills line appears but lists only one or two skills | Only those plugins are in `enabledPlugins`. The skills line reflects `~/.claude/settings.json` exactly | Install more plugins via `/plugin install <name>@<marketplace>` |
| Statusline still showing old layout after running installer | Installer copied from cache instead of marketplace clone | Use the explicit marketplace path in [Path B](#path-b----force-pull-from-shell-when-path-a-is-silent), then nuke the cache directory |
| `ctx:` shows as a gray dash | Older Claude Code build did not pass `used_percentage` in stdin JSON | Upgrade Claude Code to a version that supplies `context_window.used_percentage` |
| `mcp:` or `hk:` always shows `0x` | `enabledPlugins`, `mcpServers`, or `hooks` field empty in `~/.claude/settings.json` | Configure MCP servers and hooks normally; `oj-statusline` reflects whatever `settings.json` reports |
| Active-skill highlight points at the wrong skill | The active-skill matcher is heuristic and can be confused by partial slash-command tokens | File an issue with the transcript tail; fall back to ignoring the highlight -- the skills list itself is still accurate |
| Statusline disappeared after a Claude Code update | Some Claude Code updates rewrite `~/.claude/settings.json` and may strip non-default fields | Re-run the installer; the prior `statusLine.command` (if any) is preserved under `_ojStatuslinePriorCommand` for safe rollback |
| Hook message about restart appears every session | Marker file `~/.claude/hud/.oj-statusline-bootstrapped` not writable | Check filesystem permissions on `~/.claude/hud/`; the marker should be created automatically on first run |

---

## Cross-platform shell quick reference

The installer respects `CLAUDE_CONFIG_DIR` if you redirect Claude Code's config root:

```sh
CLAUDE_CONFIG_DIR=/opt/team-claude node install.mjs
```

PowerShell:

```powershell
$env:CLAUDE_CONFIG_DIR = "C:\opt\team-claude"
node install.mjs
```

The runtime statusline script and `settings.json` then live under that custom root rather than `~/.claude/`.

### Path conventions used in this manual

| Shell | Home expansion |
|-------|----------------|
| bash / zsh / fish / sh / WSL | `~` or `$HOME` |
| PowerShell 5+ | `$HOME` (preferred) or `$env:USERPROFILE` |
| Windows cmd.exe | `%USERPROFILE%` |

Substitute as appropriate. The plugin itself never hardcodes a username -- everything is computed from `os.homedir()` at runtime.

### Slash separators

Inside Node.js code (`install.mjs`, `statusline.mjs`), `node:path` handles separator normalization automatically. In shell commands shown in this manual, forward slashes work in bash, zsh, WSL, and PowerShell; only Windows `cmd.exe` needs back-slashes (and the recommendation is to switch to PowerShell).

---

## Reporting issues

When filing an issue, include:

1. The output of `node install.mjs --check` (full).
2. Your operating system and Claude Code version (`claude --version`).
3. The first 5 lines of `~/.claude/hud/oj-statusline.mjs` -- the version banner is on line 3.
4. Whether you reached this state via `/plugin install` or a manual clone.

Issues: <https://github.com/ojesusmp/claude-skills/issues>

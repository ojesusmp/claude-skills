# Changelog

All notable changes to oj-statusline are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] — 2026-04-30

### Fixed

- **Slash command name corrected to `/oj-statusline:setup`**. Claude Code namespaces plugin slash commands as `/<plugin-name>:<command-name>`, so v1.2.0's `/oj-statusline-setup` was unreachable as typed. Renamed `commands/oj-statusline-setup.md` to `commands/setup.md` so the registered command resolves to `/oj-statusline:setup`. README, INSTALLATION.md, and CHANGELOG updated to match.
- **Removed bogus `"commands": ["./commands"]` field from plugin.json**. Claude Code auto-discovers `commands/` by directory convention; the explicit array was a guess from documentation that does not match the live plugin loader (verified against `commit-commands` and similar working plugins).

### Notes

- The slash command only registers once the plugin is in `enabledPlugins` of `~/.claude/settings.json`. If `/oj-statusline:setup` is missing on a target machine, run `/plugin install oj-statusline@claude-skills` first; restart Claude Code; then the command becomes available.

## [1.2.0] — 2026-04-30

### Added

- **`/oj-statusline:setup` slash command**. Bundled in the plugin's `commands/` directory. Runs the installer in verbose mode and walks the user through the restart cycle. Use this if the SessionStart hook did not fire, or to recover from a broken statusline.
- **First-run `additionalContext` prompt**. On the first session after `/plugin install`, the SessionStart hook emits a single-line `hookSpecificOutput` JSON message telling the user to restart Claude Code so the new `statusLine` takes effect. After the marker file is written, every subsequent session start is silent.
- **Marker file `~/.claude/hud/.oj-statusline-bootstrapped`**. Distinguishes first-run from subsequent runs. Removed by the uninstaller.

### Changed

- **`install.mjs --hook` mode**. Plugin manifest now invokes the installer with `--hook`, which:
  - Exits silently with no stdout output once the install is correctly wired (no log spam every session).
  - Emits valid JSON on stdout only on first run, conforming to Claude Code's `hookSpecificOutput` contract.
  - Always exits 0 so a broken install never blocks Claude Code startup.
- **Hook timeout raised to 30s** (was 5s). Cold Node.js startup on Windows can exceed 5s on first run; 30s is a safe ceiling that still fails fast on a hung process.
- **`install.mjs` (verbose mode)** now detects "already up to date" and prints a single line instead of repeating copy/patch noise.
- Content-aware copy: the runtime is only re-copied when `statusline.mjs` actually differs from the destination, so plugin updates pick up new versions while idle sessions skip the disk write entirely.

### Fixed

- v1.1.0 hook ran `install.mjs` in interactive mode every session, printing 3 lines of `console.log` output that Claude Code's hook parser treated as malformed JSON. v1.2.0 cleanly separates verbose (CLI) and machine (hook) output paths.
- Hook timeout was previously too tight for cold-start Windows Node.js on slower disks; raised to 30s.

### Notes

- First install on a fresh machine is now: `/plugin install oj-statusline@claude-skills` → restart Claude Code → SessionStart hook patches `settings.json` and emits restart prompt → restart again → statusline appears. Two restarts is a fundamental Claude Code limitation: `statusLine.command` is read once at session start, before plugin SessionStart hooks have a chance to write it.
- To collapse to a single restart, run `/oj-statusline:setup` (or the manual `node install.mjs`) before the first restart.

## [1.1.0] — 2026-04-30

### Added

- **Auto-wire on SessionStart**. Plugin manifest now declares a `SessionStart` hook that runs `install.mjs` idempotently every session. This eliminates the manual `node <path>/install.mjs` step on first install. After `/plugin install oj-statusline@claude-skills`, restart Claude Code once and the statusline activates.

### Changed

- `INSTALLATION.md` simplified — manual installer step is now optional (advanced/CI use cases only).
- `README.md` install section reduced to two commands.

### Notes

- Hook uses `${CLAUDE_PLUGIN_ROOT}` substitution for the install.mjs path. Requires Claude Code 1.x or newer with plugin-declared hooks support.
- The installer remains idempotent — running it multiple times produces no extra changes after the first successful run.

## [1.0.0] — 2026-04-30

### Added

- Initial public release of `oj-statusline` via the [`claude-skills`](https://github.com/ojesusmp/claude-skills) marketplace.
- Token line: `cached`, `new`, `total`, `ctx%` from stdin `context_window.current_usage`.
- MCP tool-use counter (`mcp:Nx`) — counts `mcp__*` blocks in the last assistant turn.
- Hook attachment counter (`hk:Nx`) — counts `hook_*` attachments around the most recent user prompt.
- Skills line at the bottom of the statusline, soft-wrapped to terminal width, with bold cyan highlight on the most-recently-active skill.
- Active-skill detection via two paths: `Skill` tool_use blocks AND `<command-name>` slash-invocation parsing from the transcript tail.
- Optional delegation to oh-my-claudecode HUD via `spawnSync` so HUD output flushes deterministically before the skills line.
- Idempotent installer (`install.mjs`) with `--check` and `--uninstall` modes; backs up prior `statusLine.command` under `_ojStatuslinePriorCommand`.
- Silent-fail on malformed stdin or transcript — never breaks Claude Code statusline rendering.

### Design

- Bottom-anchored skills line so long plugin lists do not push token/HUD info off-screen on narrow terminals.
- Dynamic wrap width: `process.stdout.columns` → `$COLUMNS` → fallback 100.
- Single file, zero npm dependencies. Node 18+ required (uses async iteration over stdin and `node:` import prefixes).

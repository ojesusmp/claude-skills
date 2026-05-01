# Changelog

All notable changes to oj-statusline are documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

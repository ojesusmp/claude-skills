# claude-skills

> Orlando's Claude Code skills marketplace. Line-check and future skills, distributed via the native plugin system.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Marketplace](https://img.shields.io/badge/Claude%20Code-Marketplace-7c3aed)](#install)

## Install (one-time, per machine)

In Claude Code, run:

```
/plugin marketplace add ojesusmp/claude-skills
```

That registers this marketplace. You only do this once per machine.

## Install plugins from this marketplace

```
/plugin install line-check@claude-skills
```

Browse all plugins:

```
/plugin marketplace list claude-skills
```

Update plugins:

```
/plugin update line-check
```

## Plugins in this marketplace

| Plugin | Version | Description |
|--------|---------|-------------|
| **[line-check](./plugins/line-check)** | 1.0.0 | Per-line audit skill catching shell continuation-prompt traps across PowerShell, bash, Python, Rust, C, and TypeScript. 5 checks + 6-item Pilot Pre-Send Checklist. |
| **[oj-statusline](./plugins/oj-statusline)** | 1.2.1 | Multi-line Claude Code statusline showing token breakdown (cached/new/total/ctx%), MCP and hook counts, and a soft-wrapped list of enabled skills with active-skill highlight. Idempotent silent SessionStart auto-wire + bundled `/oj-statusline:setup` slash command for explicit one-shot install. |

## What is `line-check`?

A behavioral skill that runs a 5-check audit on every changed line after Write/Edit/MultiEdit, plus a 6-item Pilot Pre-Send Checklist before every Bash command. Catches the bug class where a partially-formed shell command drops PowerShell into a `>>` continuation prompt and never executes — unbalanced quotes, unclosed heredocs, missing flag arguments, PS-vs-bash mode confusion.

Companion to [Andrej Karpathy's task-scope guidelines](https://github.com/forrestchang/andrej-karpathy-skills) — Karpathy gates *what* you do; line-check gates *what you ship*.

See full docs at [plugins/line-check/skills/line-check/](./plugins/line-check/skills/line-check/) — README, INSTALLATION, USAGE, EXAMPLES.

## Adding new plugins (for the maintainer)

1. Create folder `plugins/<new-skill>/` with:
   - `.claude-plugin/plugin.json`
   - `skills/<new-skill>/SKILL.md` and supporting docs
2. Append entry to `.claude-plugin/marketplace.json` `plugins` array.
3. Bump `metadata.version` if marketplace structure changed; otherwise leave.
4. Commit + push.
5. Users run `/plugin update` — new plugin appears.

No new repo per skill. One marketplace forever.

## Manual install (alternative — bypasses marketplace UI)

If you don't want to register the marketplace, you can clone individual skills directly:

```bash
git clone https://github.com/ojesusmp/claude-skills.git /tmp/claude-skills
cp -r /tmp/claude-skills/plugins/line-check/skills/line-check ~/.claude/skills/
```

You lose: `/plugin update`, version-pinning, marketplace UI. You keep: working skill.

## License

MIT — see [LICENSE](./LICENSE). Each plugin retains its own LICENSE inside its skill folder.

## Origin

Built by [Orlando Molina](https://github.com/ojesusmp) in 2026 to distribute Claude Code skills as a single, native marketplace. line-check is the first plugin; more to follow.

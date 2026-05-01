# oj-statusline

> A multi-line statusline for Claude Code that puts the **most actionable signal** — token spend, MCP/hook activity, active skill — at eye level, and keeps the long plugin list **at the bottom** where it belongs.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-blue)](https://nodejs.org/)
[![Marketplace](https://img.shields.io/badge/Claude%20Code-Marketplace-7c3aed)](https://github.com/ojesusmp/claude-skills)

Built by **Orlando Molina** ([@ojesusmp](https://github.com/ojesusmp)).

## Install

```text
/plugin marketplace add ojesusmp/claude-skills
/plugin install oj-statusline@claude-skills
/oj-statusline:setup
```

Then fully quit and reopen Claude Code once. The new statusline appears on the next session start.

If you skip `/oj-statusline:setup`, the bundled `SessionStart` hook still wires everything on the first restart — but Claude Code reads `statusLine.command` once at session start, so a **second** restart is needed to actually pick up the new command. The slash command collapses that to a single restart. Both paths are idempotent, no manual `node install.mjs` step. Uninstall reverses the changes — see [INSTALLATION.md](./INSTALLATION.md).

---

## TL;DR

```
tok cached:50.2k new:1.0k total:51.2k ctx:42% mcp:3x hk:5x
[ OMC HUD line, if oh-my-claudecode is installed                    ]
skills: line-check · oj-statusline · forge-council · superpowers · …
        andrej-karpathy-skills · caveman  [active: line-check]
```

Two or three lines. Always-readable token economics on top. Skills list at the bottom where it can wrap freely without pushing data off-screen.

## Why a custom statusline?

Claude Code's default statusline is minimal. As you install more plugins and skills, you start asking questions the default cannot answer:

1. **Am I about to hit the context window?** (Where is `ctx:`?)
2. **How much is cached vs. fresh this turn?** (Cache hits are essentially free; new tokens are not.)
3. **Which MCP tools just ran?** And how often this turn?
4. **How many hooks fired around the last user prompt?** (Hooks add latency.)
5. **Which skill is active right now?** When you have 200+ skills loaded, the active one is the only one you care about.

`oj-statusline` answers all five at a glance, every render, with zero configuration.

## Layout, top to bottom

```
┌─────────────────────────────────────────────────────────────────┐
│ tok cached:Xk new:Y total:Zk ctx:N% mcp:Nx hk:Nx               │  ← always visible
├─────────────────────────────────────────────────────────────────┤
│ [ OMC HUD line — only if oh-my-claudecode is installed ]        │  ← optional
├─────────────────────────────────────────────────────────────────┤
│ skills: a · b · c · … long list, soft-wraps to terminal width   │
│         continued · d · e [active: c]                           │  ← bottom-anchored
└─────────────────────────────────────────────────────────────────┘
```

### 1. Token line

Pulled from the JSON Claude Code pipes to the statusline command on each render. Field by field:

| Field | Source | Color | Meaning |
|-------|--------|-------|---------|
| `tok` | label | magenta | section header |
| `cached:Xk` | `cache_read_input_tokens` | cyan | tokens reused from prompt cache (~$0) |
| `new:Y` | `input_tokens + cache_creation_input_tokens` | yellow | tokens that count for billing |
| `total:Zk` | sum | white | cached + new |
| `ctx:N%` | `used_percentage` | green / yellow / red @ 50/80 | how full the context window is |
| `mcp:Nx` | counted from transcript | magenta | `mcp__*` tool_use blocks in the latest assistant turn |
| `hk:Nx` | counted from transcript | gray | `hook_*` attachments adjacent to the most recent user prompt |

**Why split cached vs. new?** Cached tokens are nearly free in cost and latency. A long session with 90% cache hits is healthy; the same session with 10% cache hits is paying full freight. The split lets you spot a cache regression instantly.

### 2. OMC HUD line (optional)

If the `oh-my-claudecode` plugin is installed, `oj-statusline` finds its HUD at `~/.claude/plugins/cache/omc/oh-my-claudecode/<version>/dist/hud/index.js` and runs it as a child process. The HUD output appears as the second line.

If OMC is not installed, this line is silently omitted. No errors, no warnings — the design contract is "augment when present, disappear when absent."

### 3. Skills line (bottom)

One line listing every entry from `~/.claude/settings.json` `enabledPlugins` where the value is `true`, separated by ` · `. The most-recently-active skill is shown in **bold cyan**, with a `[active: name]` tail.

Active-skill detection uses two signals from the transcript:
1. The latest `Skill` (or legacy `proxy_Skill`) `tool_use` block.
2. A `<command-name>...</command-name>` slash-invocation in the most recent user message.

Whichever is more recent wins. If neither is found, no skill is highlighted.

### Why bottom-anchor the skills line?

When you have a side-by-side terminal layout (half-width or quarter-width tiles) and a 200-plugin loadout, a top-anchored skill list visually wraps and pushes the token line off the visible area. Moving it to the bottom keeps the data layer stable and lets the skills list overflow downward, which is fine because the next thing below it is the prompt (also fine).

## Architecture

Single file. Zero npm dependencies. Reads JSON from stdin, writes ANSI-colored text to stdout. Done.

```
┌─────────────────────────┐    JSON over stdin    ┌────────────────────────┐
│ Claude Code             │ ────────────────────► │ oj-statusline.mjs      │
│ statusLine.command runs │                       │  ↓ parse stdin         │
│ this script every render│                       │  ↓ tail-read transcript│
└─────────────────────────┘                       │  ↓ count mcp / hooks   │
                                                  │  ↓ read settings.json  │
                                                  │  ↓ optional spawn HUD  │
                                                  │  ↓ print 2-3 lines     │
                                                  └────────────────────────┘
```

### Stdin contract (best-effort, not documented by Anthropic)

```jsonc
{
  "context_window": {
    "current_usage": {
      "input_tokens": 1000,
      "cache_read_input_tokens": 50000,
      "cache_creation_input_tokens": 2000
    },
    "used_percentage": 42
  },
  "transcript_path": "/path/to/session.jsonl"
}
```

Any field can be missing. The script tolerates partial data and silently omits whatever it cannot compute. **Never crashes the statusline.**

### Transcript tail-read

Rather than parsing the entire transcript JSONL (can be megabytes), `oj-statusline` reads the **last 64 KB** by `seek(end - 64KB)`, then JSON.parses each line. The first line is often partial — that line is skipped. This keeps render time well under 50 ms even for long sessions.

### HUD delegation via spawnSync

The previous in-process `import()` of the OMC HUD raced against async work inside the HUD module — sometimes the skills line printed *before* the HUD line. The current implementation uses `spawnSync` so the HUD's `stdout` is fully drained before control returns. Output ordering is now deterministic.

### Idempotency markers

Two source comments make automated re-installs detectable:

```js
// PERMANENT - oj-statusline
// oj-statusline v1.0.0
```

If you (or another tool) ever scan `~/.claude/hud/` looking for "did the user install oj-statusline?", grep these strings.

## Performance

- **Render budget**: < 50 ms typical, < 150 ms worst case (very long transcript + cold disk).
- **Memory**: < 20 MB resident. Transcript tail-read uses a 64 KB buffer.
- **CPU**: negligible. Mostly synchronous file I/O + a handful of regexes.
- **Failure mode**: any thrown error inside the script is caught at the top level and the line silently fails. Statusline is never broken by a bad input.

## Configuration

There is no config file. The script reads two paths and one env var:

| Path / Var | Purpose |
|------------|---------|
| `~/.claude/settings.json` | Source of `enabledPlugins` for the skills line |
| `<transcript_path>` (from stdin) | Tail-read for active skill, mcp count, hook count |
| `CLAUDE_CONFIG_DIR` (env) | Override `~/.claude` if you redirect Claude's config root |
| `OMC_DEV=1` (env) | If set, also probe `~/Workspace/oh-my-claudecode/dist/hud/index.js` and friends for HUD delegation (developer mode) |
| `COLUMNS` (env) | Used as a fallback when `process.stdout.columns` is unavailable |

## Comparison with alternatives

| Feature | Claude Code default | OMC HUD plugin | **oj-statusline** |
|---------|---------------------|----------------|-------------------|
| Token total | ✅ | ✅ | ✅ |
| Cached vs. new split | ❌ | ✅ | ✅ |
| Context % with thresholds | ❌ | ❌ | ✅ |
| MCP tool counter | ❌ | ❌ | ✅ |
| Hook counter | ❌ | ❌ | ✅ |
| Active skill highlight | ❌ | partial | ✅ |
| Soft-wrapped skills list | ❌ | ❌ | ✅ |
| Bottom-anchored layout | ❌ | ❌ | ✅ |
| Augments OMC if present | n/a | n/a | ✅ |
| Single file, no deps | ✅ | ❌ | ✅ |

## Benefits

- **Spend awareness**: see cache vs. new tokens every turn → avoid silent cost spikes.
- **Context awareness**: 80%+ ctx is colored red → you know it is time to compact or split.
- **Hook visibility**: see how many hooks fired this turn → debug latency / unexpected `[hook]` lines.
- **MCP visibility**: see how heavily you are using MCP tools → tune cost/latency tradeoffs.
- **Always-on active skill banner**: never wonder which skill the model just invoked.
- **Bottom-anchored skills**: long plugin list stays out of the way of the data you actually read.
- **Zero config**: install, restart, done.
- **Survives plugin updates**: the runtime file lives at `~/.claude/hud/oj-statusline.mjs`, outside the plugin cache.

## Honest limits

- Per-tool token attribution is **not** in the transcript JSONL. `mcp:Nx` and `hk:Nx` are **counts**, not tokens.
- Active-skill detection is heuristic. If a slash command and a `Skill` tool_use happen close together, the more recent of the two wins — but tie-breaking on the same turn favors `Skill` tool_use.
- Skills line uses ` · ` as separator. If a plugin name contains `·` literally, it will be visually ambiguous. (No real plugin does this.)
- HUD delegation depends on a stable OMC plugin path (`plugins/cache/omc/oh-my-claudecode/<version>/dist/hud/index.js`). If OMC restructures its bundle, HUD delegation may break until the path probe is updated.
- `ctx:` colors use fixed 50% / 80% thresholds. Not configurable. PRs welcome.

## License

MIT — see [LICENSE](./LICENSE).

## Origin

Built in 2026 by Orlando Molina to consolidate three separate statusline experiments — token tracking, hook counting, active-skill highlighting — into one always-on, bottom-anchored layout that survives narrow terminals.

Distributed via the [`claude-skills`](https://github.com/ojesusmp/claude-skills) marketplace alongside [`line-check`](https://github.com/ojesusmp/claude-skills/tree/main/plugins/line-check).

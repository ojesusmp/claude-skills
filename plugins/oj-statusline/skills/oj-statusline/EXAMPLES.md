# Examples

Sample outputs for each layer of `oj-statusline`. Color names refer to the ANSI codes the script emits.

## Minimal session — fresh start

Stdin (sent by Claude Code on each render):

```json
{
  "context_window": {
    "current_usage": {
      "input_tokens": 800,
      "cache_read_input_tokens": 0,
      "cache_creation_input_tokens": 0
    },
    "used_percentage": 1
  },
  "transcript_path": "/home/you/.claude/projects/demo/session-001.jsonl"
}
```

Output:

```
tok cached:0 new:800 total:800 ctx:1% mcp:0x hk:0x
skills: line-check · oj-statusline
```

- `cached:0` (cyan) — no cache hits yet, new session.
- `new:800` (yellow) — initial system prompt + first user turn.
- `ctx:1%` (green) — well under 50% threshold.
- `mcp:0x`, `hk:0x` — no MCP tools or hooks have fired.
- Skills line lists the two enabled plugins. Neither is highlighted (no skill invoked yet).

## Active session — cache warming up

Stdin:

```json
{
  "context_window": {
    "current_usage": {
      "input_tokens": 1200,
      "cache_read_input_tokens": 48000,
      "cache_creation_input_tokens": 1500
    },
    "used_percentage": 38
  },
  "transcript_path": "/home/you/.claude/projects/demo/session-001.jsonl"
}
```

Transcript tail (relevant fragment):

```jsonl
{"type":"user","message":{"content":[{"type":"text","text":"<command-name>line-check</command-name> audit src/auth.ts"}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"line-check"}}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"mcp__supabase__query"},{"type":"tool_use","name":"mcp__github__get_pr"}]}}
```

Output:

```
tok cached:48.0k new:2.7k total:50.7k ctx:38% mcp:2x hk:0x
skills: line-check · oj-statusline · forge-council  [active: line-check]
```

- Cache is doing real work (`cached:48.0k`).
- `mcp:2x` — two MCP tools fired in the latest assistant turn.
- `[active: line-check]` — bolded cyan; the most recent Skill invocation.

## Heavy turn — context filling, hooks firing

Stdin:

```json
{
  "context_window": {
    "current_usage": {
      "input_tokens": 4200,
      "cache_read_input_tokens": 178000,
      "cache_creation_input_tokens": 6800
    },
    "used_percentage": 78
  },
  "transcript_path": "/home/you/.claude/projects/demo/session-001.jsonl"
}
```

Output:

```
tok cached:178.0k new:11.0k total:189.0k ctx:78% mcp:1x hk:6x
skills: line-check · oj-statusline · forge-council · superpowers · andrej-karpathy-skills · caveman  [active: superpowers]
```

- `ctx:78%` (yellow — between 50 and 80) → time to consider compaction.
- `hk:6x` — six hook events around the last user prompt; useful when debugging unexpected reminder spam.

## Critical zone — context near the limit

```
tok cached:182.0k new:14.5k total:196.5k ctx:91% mcp:0x hk:2x
skills: line-check · oj-statusline · forge-council · …  [active: oj-statusline]
```

- `ctx:91%` (red — above 80) → compact or split now to avoid forced truncation.

## Narrow terminal — soft-wrap demonstration

When the terminal is 60 columns wide and the plugin list is long, the skills line wraps:

```
tok cached:50.2k new:1.0k total:51.2k ctx:42% mcp:3x hk:5x
skills: line-check · oj-statusline · forge-council ·
        superpowers · andrej-karpathy-skills · caveman ·
        context-engineering  [active: line-check]
```

The wrap happens at the ` · ` separator, not mid-word. Continuation lines are indented by 8 spaces. The token line above is unaffected.

## With OMC HUD installed — three lines

```
tok cached:50.2k new:1.0k total:51.2k ctx:42% mcp:3x hk:5x
[OMC HUD: model:sonnet-4-7  cost:$0.0234  latency:1.2s  cache-hit:96%]
skills: line-check · oj-statusline · forge-council  [active: line-check]
```

The middle line is OMC HUD's own format; `oj-statusline` does not modify it.

## Color reference (ANSI)

The script uses a small palette:

| Name | Code | Used for |
|------|------|----------|
| reset | `\x1b[0m` | terminator |
| bold | `\x1b[1m` | active-skill emphasis |
| dim | `\x1b[2m` | field labels (e.g. `cached:`, `new:`) |
| magenta | `\x1b[35m` | section headers (`tok`, `skills:`), `mcp:` value |
| cyan | `\x1b[36m` | plugin names, `cached:` value |
| yellow | `\x1b[33m` | `new:` value, `ctx:` between 50-80 |
| green | `\x1b[32m` | `ctx:` under 50 |
| red | `\x1b[31m` | `ctx:` 80 and above |
| gray | `\x1b[90m` | `hk:` value, ctx fallback when unknown |
| white | `\x1b[97m` | `total:` value |

If your terminal is 8-color or grayscale, the codes degrade gracefully — you lose hue but text is still readable.

## Manual smoke test

After install, copy-paste this in the same shell that launches Claude Code:

```sh
echo '{"context_window":{"current_usage":{"input_tokens":1000,"cache_read_input_tokens":50000,"cache_creation_input_tokens":2000},"used_percentage":42}}' | node ~/.claude/hud/oj-statusline.mjs
```

Expected:

```
tok cached:50.0k new:3.0k total:53.0k ctx:42% mcp:0x hk:0x
skills: <your plugin list>
```

If you see this, the runtime works. The full skills line and active-skill detection only fire inside a real Claude Code session because they require a `transcript_path`.

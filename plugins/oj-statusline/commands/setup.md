---
description: Install or repair the oj-statusline (idempotent). Use after /plugin install or to recover from a broken statusline.
---

Run the bundled installer in verbose mode and report the result. The installer copies `statusline.mjs` to `~/.claude/hud/oj-statusline.mjs`, patches `~/.claude/settings.json` `statusLine.command`, and is safe to re-run.

After it completes, instruct the user:

1. Quit Claude Code fully (close all windows / kill the CLI process).
2. Reopen Claude Code.
3. The new statusline should appear at the bottom of the next session.

If the user reports nothing changed, run `node "${CLAUDE_PLUGIN_ROOT}/skills/oj-statusline/install.mjs" --check` and surface the output verbatim so the user can see exactly which piece is missing (HUD script absent, settings.json statusLine.command pointing elsewhere, etc.).

Run this now:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/oj-statusline/install.mjs"
```

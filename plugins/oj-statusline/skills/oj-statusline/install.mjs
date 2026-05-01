#!/usr/bin/env node
/**
 * oj-statusline installer.
 * Author: Orlando Molina <https://github.com/ojesusmp>
 * License: MIT
 *
 * Copies statusline.mjs to ~/.claude/hud/oj-statusline.mjs and patches
 * settings.json statusLine.command. Idempotent. Safe re-run.
 *
 * Usage:
 *   node install.mjs            install or update
 *   node install.mjs --check    print state, no changes
 *   node install.mjs --uninstall remove and restore prior command if backed up
 */

import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "statusline.mjs");
const HOME = homedir();
const CFG_DIR = process.env.CLAUDE_CONFIG_DIR || join(HOME, ".claude");
const HUD_DIR = join(CFG_DIR, "hud");
const DEST = join(HUD_DIR, "oj-statusline.mjs");
const SETTINGS = join(CFG_DIR, "settings.json");
const DESIRED_COMMAND = `node "${DEST}"`;
const BACKUP_KEY = "_ojStatuslinePriorCommand";

function readSettings() {
  if (!existsSync(SETTINGS)) return {};
  try { return JSON.parse(readFileSync(SETTINGS, "utf8")); } catch (e) {
    console.error(`Cannot parse ${SETTINGS}: ${e.message}`);
    process.exit(1);
  }
}

function writeSettings(obj) {
  writeFileSync(SETTINGS, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function check() {
  console.log(`config dir:   ${CFG_DIR}`);
  console.log(`hud script:   ${DEST} ${existsSync(DEST) ? "[present]" : "[missing]"}`);
  const s = readSettings();
  const cur = s.statusLine?.command;
  console.log(`statusLine:   ${cur || "<none>"}`);
  console.log(`installed:    ${cur === DESIRED_COMMAND ? "yes" : "no"}`);
  if (s[BACKUP_KEY]) console.log(`prior backup: ${s[BACKUP_KEY]}`);
}

function install() {
  if (!existsSync(SRC)) {
    console.error(`source missing: ${SRC}`);
    process.exit(1);
  }
  if (!existsSync(HUD_DIR)) mkdirSync(HUD_DIR, { recursive: true });
  copyFileSync(SRC, DEST);
  console.log(`copied: ${SRC} -> ${DEST}`);

  const s = readSettings();
  const prior = s.statusLine?.command;
  if (prior && prior !== DESIRED_COMMAND && !s[BACKUP_KEY]) {
    s[BACKUP_KEY] = prior;
    console.log(`backed up prior command: ${prior}`);
  }
  s.statusLine = { type: "command", command: DESIRED_COMMAND };
  writeSettings(s);
  console.log(`patched ${SETTINGS} statusLine.command`);
  console.log(`done. restart Claude Code to apply.`);
}

function uninstall() {
  const s = readSettings();
  if (s.statusLine?.command === DESIRED_COMMAND) {
    if (s[BACKUP_KEY]) {
      s.statusLine = { type: "command", command: s[BACKUP_KEY] };
      console.log(`restored prior command: ${s[BACKUP_KEY]}`);
      delete s[BACKUP_KEY];
    } else {
      delete s.statusLine;
      console.log(`cleared statusLine (no prior backup)`);
    }
    writeSettings(s);
  } else {
    console.log(`statusLine.command was not ours; left untouched`);
  }
  if (existsSync(DEST)) {
    unlinkSync(DEST);
    console.log(`removed: ${DEST}`);
  }
  console.log(`done. restart Claude Code to apply.`);
}

const arg = process.argv[2];
if (arg === "--check") check();
else if (arg === "--uninstall") uninstall();
else install();

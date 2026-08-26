import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { homeWindowState, meetingWindowBounds } from "../desktop/window-state.mjs";

test("meeting window becomes a right-aligned portrait surface", () => {
  const bounds = meetingWindowBounds({ x: 0, y: 0, width: 1440, height: 900 });
  assert.deepEqual(bounds, { x: 976, y: 24, width: 440, height: 820 });
  assert.ok(bounds.height > bounds.width);
  assert.deepEqual(homeWindowState, {
    width: 440,
    height: 820,
    minWidth: 380,
    minHeight: 640,
    maxWidth: 520
  });
  assert.ok(homeWindowState.height > homeWindowState.width);
  assert.ok(homeWindowState.maxWidth < homeWindowState.minHeight);
});

test("desktop shell keeps one window above other apps only during meetings", async () => {
  const main = await readFile(new URL("../desktop/main.mjs", import.meta.url), "utf8");
  const preload = await readFile(new URL("../desktop/preload.mjs", import.meta.url), "utf8");
  const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(main, /let mainWindow = null/);
  assert.match(main, /mainWindow\.setAlwaysOnTop\(true, "floating"\)/);
  assert.match(main, /mainWindow\.setAlwaysOnTop\(false\)/);
  assert.match(main, /meetingWindowBounds\(display\.workArea\)/);
  assert.match(main, /mainWindow\.setMaximumSize\(homeWindowState\.maxWidth, display\.workArea\.height\)/);
  assert.match(main, /maxWidth: homeWindowState\.maxWidth/);
  assert.match(preload, /setMeetingMode\(active\)/);
  assert.match(appSource, /window\.voicePartitionDesktop\.setMeetingMode\(page === "record"\)/);
  assert.match(appSource, /\{desktop \? \([\s\S]*data-desktop-meeting-workspace[\s\S]*\) : \([\s\S]*<LiveTranscriptFeed/);
});

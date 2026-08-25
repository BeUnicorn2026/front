import assert from "node:assert/strict";
import test from "node:test";
import { MEETING_VIEW_OPTIONS, TRANSCRIPTION_LANGUAGE_OPTIONS } from "../src/data/meeting-view-options.js";

test("offers every real meeting visualization through one shared view model", () => {
  assert.deepEqual(MEETING_VIEW_OPTIONS.map(({ value }) => value), [
    "outline", "tree", "mindmap", "transcript", "overview"
  ]);
  assert.equal(new Set(MEETING_VIEW_OPTIONS.map(({ value }) => value)).size, MEETING_VIEW_OPTIONS.length);
});

test("does not advertise unsupported automatic language detection", () => {
  assert.deepEqual(TRANSCRIPTION_LANGUAGE_OPTIONS.map(({ value }) => value), ["ko", "en", "ja"]);
  assert.equal(TRANSCRIPTION_LANGUAGE_OPTIONS.some(({ label }) => label.includes("자동")), false);
});

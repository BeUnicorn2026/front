import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

test("meeting quota blocks new recordings and file imports while preserving billing navigation", () => {
  assert.match(appSource, /billing\?\.usage\?\.meetings\?\.allowed === false/);
  assert.match(appSource, /meetingLimitReached \? onOpenBilling : recording\.start/);
  assert.match(appSource, /recording\.isRecording \|\| !recording\.services\.openai \|\| meetingLimitReached/);
  assert.match(appSource, /title=\{`\$\{billing\.subscription\.planId\} 플랜의 현재 기간 회의 횟수를 모두 사용했습니다\.`\}/);
});

test("speaker quota blocks enrollment and links to the plan screen", () => {
  assert.match(appSource, /billing\?\.usage\?\.speakers && billing\.usage\.speakers\.remaining <= 0/);
  assert.match(appSource, /label="목소리 등록"[^>]*isDisabled=\{speakerLimitReached\}/);
  assert.match(appSource, /<SettingsPage[^>]*billing=\{billing\}[^>]*onOpenBilling=/);
});

test("billing usage refreshes when local meeting or speaker collections change", () => {
  assert.match(appSource, /\[context\.organization\.id, recording\.meetings\.length, recording\.speakers\.length\]/);
});

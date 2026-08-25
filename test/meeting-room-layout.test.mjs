import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("meeting room keeps code centered with structure left and sequential transcript right", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const start = source.indexOf("function MeetingPage");
  const end = source.indexOf("function meetingDate", start);
  const room = source.slice(start, end);

  assert.match(room, /label="실시간 회의 헤더"/);
  assert.match(room, />방 코드</);
  assert.match(room, /CONVERSATION STRUCTURE/);
  assert.match(room, /width=\{compact \? "100%" : "calc\(var\(--spacing-10\) \* 10 - var\(--spacing-2\)\)"\}/);
  assert.match(room, /LIVE TRANSCRIPT/);
  assert.match(room, /<TranscriptList segments=\{displayedSegments\}/);
  assert.match(room, /position: "absolute", insetInlineEnd: "var\(--spacing-4\)", bottom: "var\(--spacing-4\)"/);
  assert.match(room, /label="초대 링크 복사"/);
  assert.doesNotMatch(room, /<(?:div|span)(?:\s|>)/);
});

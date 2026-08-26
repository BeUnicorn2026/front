import assert from "node:assert/strict";
import test from "node:test";
import {
  pendingTranslationSegments,
  segmentTranslationSequence
} from "../src/features/meeting/usePersonalizedTranscript.js";

test("uses persisted room sequence and falls back to display order", () => {
  assert.equal(segmentTranslationSequence({ sequence: 7 }, 2), 7);
  assert.equal(segmentTranslationSequence({ sequence: null }, 2), 2);
});

test("queues only finalized untranslated speech in bounded batches", () => {
  const segments = [
    { sequence: 0, text: "DB에 저장합니다." },
    { sequence: 1, text: "아직 듣는 중", pending: true },
    { sequence: 2, text: "전환율을 확인합니다." },
    { sequence: 3, text: "" }
  ];
  const translations = {
    0: { status: "ready", originalText: "DB에 저장합니다.", personalizedText: "데이터 보관 공간에 저장합니다." }
  };
  assert.deepEqual(pendingTranslationSegments(segments, translations), [
    { sequence: 2, text: "전환율을 확인합니다." }
  ]);
  assert.deepEqual(pendingTranslationSegments(segments, {}, 1), [
    { sequence: 0, text: "DB에 저장합니다." }
  ]);
});

test("requeues a corrected transcript when its source text changed", () => {
  const segments = [{ sequence: 4, text: "수정된 DB 문장" }];
  const translations = {
    4: { status: "ready", originalText: "이전 DB 문장", personalizedText: "이전 번역" }
  };
  assert.deepEqual(pendingTranslationSegments(segments, translations), [
    { sequence: 4, text: "수정된 DB 문장" }
  ]);
});

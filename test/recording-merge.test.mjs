import test from "node:test";
import assert from "node:assert/strict";
import {
  applyManualSpeakerCorrections, correctSpeakerCluster, mergeSegments, servicesAfterLiveEvent
} from "../src/features/recording/useRecording.js";

test("retroactively corrects earlier unknown segments from the same diarization cluster", () => {
  const committed = [
    { speaker: "미등록 화자 A", sourceSpeaker: "0", known: false, start: 0, end: 2, text: "첫 발화" }
  ];
  const incoming = [
    { speaker: "민수", sourceSpeaker: "0", known: true, confidence: 0.86, start: 3, end: 4, text: "다음 발화" }
  ];
  const result = mergeSegments(committed, incoming);
  assert.equal(result[0].speaker, "민수");
  assert.equal(result[0].known, true);
  assert.equal(result.length, 1);
  assert.equal(result[0].text, "첫 발화 다음 발화");
});

test("manual correction updates every segment in the same provider cluster", () => {
  const segments = [
    { id: "a", speaker: "미등록 화자 A", sourceSpeaker: "0", confidence: 0.7, start: 0, end: 1, text: "첫째" },
    { id: "b", speaker: "미등록 화자 B", sourceSpeaker: "1", start: 2, end: 3, text: "둘째" },
    { id: "c", speaker: "미등록 화자 A", sourceSpeaker: "0", start: 4, end: 5, text: "셋째" }
  ];
  const result = correctSpeakerCluster(segments, segments[0], "민수", true);
  assert.deepEqual(result.map(({ speaker }) => speaker), ["민수", "미등록 화자 B", "민수"]);
  assert.equal(result[0].corrected, true);
  assert.equal(result[2].confidence, null);
});

test("manual live corrections survive final provider re-transcription by time evidence", () => {
  const live = [
    { sourceSpeaker: "0", start: 0, end: 2, speaker: "민수", corrected: true },
    { sourceSpeaker: "1", start: 2, end: 4, speaker: "지수" }
  ];
  const final = [
    { start: 0.1, end: 1.9, speaker: "화자 A", confidence: 0.9, text: "첫 발화" },
    { start: 2.1, end: 3.9, speaker: "화자 B", confidence: 0.9, text: "둘째 발화" }
  ];
  const result = applyManualSpeakerCorrections(final, live, new Map([["0", "민수"]]));
  assert.deepEqual(result.map(({ speaker }) => speaker), ["민수", "화자 B"]);
  assert.equal(result[0].corrected, true);
  assert.equal(result[0].confidence, null);
});

test("tracks speaker model preparation and readiness from live events", () => {
  const initial = { deepgram: true, speakerModelState: "idle" };
  const loading = servicesAfterLiveEvent(initial, { type: "preparing", elapsedSeconds: 15 });
  assert.equal(loading.speakerModelState, "loading");
  assert.equal(loading.deepgram, true);

  const ready = servicesAfterLiveEvent(loading, { type: "ready", mode: "speaker" });
  assert.equal(ready.speakerModelState, "ready");
  assert.strictEqual(servicesAfterLiveEvent(ready, { type: "transcript" }), ready);
});

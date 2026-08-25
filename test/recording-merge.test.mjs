import test from "node:test";
import assert from "node:assert/strict";
import {
  applyManualSpeakerCorrections, applyManualTranscriptCorrections, autosaveRetryDelay,
  correctSpeakerCluster, correctTranscriptSegment, createMeetingSaveQueue, mergeSegments,
  meetingsAfterRemoval, microphoneConstraints, microphoneLevelPresentation, recordingCompletionStatus, recordingStartErrorMessage, servicesAfterLiveEvent
} from "../src/features/recording/useRecording.js";

test("combines STT confidence independently from speaker similarity", () => {
  const result = mergeSegments(
    [{ speaker: "민수", sourceSpeaker: "0", start: 0, end: 1, text: "첫 문장", confidence: 0.9, transcriptConfidence: 0.8 }],
    [{ speaker: "민수", sourceSpeaker: "0", start: 1.1, end: 2, text: "둘째", confidence: 0.7, transcriptConfidence: 0.6 }]
  );
  assert.equal(result[0].confidence, 0.9);
  assert.ok(result[0].transcriptConfidence > 0.73 && result[0].transcriptConfidence < 0.74);
});

test("corrects transcript text and preserves it across final transcription", () => {
  const corrected = correctTranscriptSegment(
    [{ id: "one", speaker: "민수", start: 0, end: 2, text: "잘못된 문장", transcriptConfidence: 0.42 }],
    { id: "one" }, "정확한 문장"
  );
  assert.equal(corrected[0].text, "정확한 문장");
  assert.equal(corrected[0].transcriptCorrected, true);
  assert.equal(corrected[0].transcriptConfidence, null);
  const final = applyManualTranscriptCorrections(
    [{ speaker: "민수", start: 0.1, end: 1.9, text: "재전사 문장", transcriptConfidence: 0.9 }],
    [{ start: 0, end: 2, text: "정확한 문장" }]
  );
  assert.equal(final[0].text, "정확한 문장");
  assert.equal(final[0].transcriptCorrected, true);
});

test("assigns each corrected sentence once when final segmentation changes", () => {
  const split = applyManualTranscriptCorrections([
    { start: 0, end: 1, text: "첫 재전사" },
    { start: 1, end: 2, text: "둘째 재전사" }
  ], [{ start: 0, end: 2, text: "한 번만 유지" }]);
  assert.equal(split.filter(({ transcriptCorrected }) => transcriptCorrected).length, 1);
  assert.equal(split.filter(({ text }) => text === "한 번만 유지").length, 1);

  const combined = applyManualTranscriptCorrections(
    [{ start: 0, end: 4, text: "하나의 긴 재전사" }],
    [{ start: 0, end: 2, text: "첫 교정" }, { start: 2, end: 4, text: "둘째 교정" }]
  );
  assert.equal(combined[0].text, "첫 교정 둘째 교정");
});

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

test("revises earlier model labels after sustained speaker evidence without overriding manual corrections", () => {
  const committed = [
    { speaker: "민수", sourceSpeaker: "0", known: true, confidence: 0.82, start: 0, end: 1, text: "초기 판정" },
    { speaker: "민수", sourceSpeaker: "0", known: true, corrected: true, confidence: null, start: 2, end: 3, text: "직접 확인" }
  ];
  const incoming = [
    { speaker: "지수", sourceSpeaker: "0", known: true, confidence: 0.93, start: 4, end: 5, text: "반복 증거" }
  ];

  const result = mergeSegments(committed, incoming);
  assert.equal(result[0].speaker, "지수");
  assert.equal(result[0].confidence, 0.93);
  assert.equal(result[1].speaker, "민수");
  assert.equal(result[1].corrected, true);
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

test("bounds autosave retries and preserves interrupted completion state", () => {
  assert.equal(autosaveRetryDelay(1), 1_000);
  assert.equal(autosaveRetryDelay(3), 4_000);
  assert.equal(autosaveRetryDelay(99), 8_000);
  assert.equal(recordingCompletionStatus(false), "completed");
  assert.equal(recordingCompletionStatus(true), "interrupted");
  assert.match(recordingStartErrorMessage({ name: "NotAllowedError" }), /마이크 권한/);
  assert.match(recordingStartErrorMessage({ name: "NotFoundError" }), /마이크/);
  assert.equal(recordingStartErrorMessage(new Error("서버 연결 실패")), "서버 연결 실패");
});

test("serializes autosave and completion writes even when an earlier request is slow", async () => {
  const queue = createMeetingSaveQueue();
  let releaseAutosave;
  const order = [];
  const autosave = queue.enqueue(async () => {
    order.push("autosave-start");
    await new Promise((resolve) => { releaseAutosave = resolve; });
    order.push("autosave-end");
  });
  const completion = queue.enqueue(async () => { order.push("completion"); });

  while (!releaseAutosave) await Promise.resolve();
  assert.deepEqual(order, ["autosave-start"]);
  releaseAutosave();
  await Promise.all([autosave, completion]);
  assert.deepEqual(order, ["autosave-start", "autosave-end", "completion"]);
});

test("continues the meeting save queue after a failed write", async () => {
  const queue = createMeetingSaveQueue();
  await assert.rejects(queue.enqueue(async () => { throw new Error("offline"); }), /offline/);
  assert.equal(await queue.enqueue(async () => "saved"), "saved");
});

test("uses the selected microphone without dropping voice processing constraints", () => {
  assert.deepEqual(microphoneConstraints("studio-mic"), {
    channelCount: { ideal: 1 },
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    deviceId: { exact: "studio-mic" }
  });
  assert.equal("deviceId" in microphoneConstraints(), false);
});

test("turns live microphone levels into actionable recording feedback", () => {
  assert.deepEqual(microphoneLevelPresentation(0, false), {
    label: "말할 때 입력 레벨을 확인합니다", variant: "neutral"
  });
  assert.equal(microphoneLevelPresentation(1, true).variant, "neutral");
  assert.equal(microphoneLevelPresentation(6, true).variant, "warning");
  assert.equal(microphoneLevelPresentation(30, true).variant, "success");
  assert.equal(microphoneLevelPresentation(90, true).variant, "error");
});

test("removes only the confirmed meeting from local document state", () => {
  const meetings = [{ id: "one", title: "첫 회의" }, { id: "two", title: "둘째 회의" }];
  assert.deepEqual(meetingsAfterRemoval(meetings, "one"), [{ id: "two", title: "둘째 회의" }]);
  assert.equal(meetings.length, 2);
});

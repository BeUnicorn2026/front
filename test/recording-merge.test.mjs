import test from "node:test";
import assert from "node:assert/strict";
import {
  applyManualSpeakerCorrections, applyManualTranscriptCorrections, autosaveRetryDelay, ensureAudioContextRunning,
  liveRecordingStatusAfterEvent, liveSocketCanAcceptAudio, liveSocketCloseCodes, maximumBufferedAudioBytes,
  correctSpeakerCluster, correctTranscriptSegment, createMeetingSaveQueue, mergeSegments,
  meetingsAfterRemoval, microphoneConstraints, microphoneLevelPresentation, orderPersistedRoomSegments, pcmInputLevel, recordingCompletionStatus, recordingStartErrorMessage,
  persistMeetingCorrection, roomMeetingHydration, roomSocketClosure, servicesAfterLiveEvent, speakerProbeCanBecomeSample, watchAudioContext
} from "../src/features/recording/useRecording.js";

test("combines STT confidence independently from speaker similarity", () => {
  const result = mergeSegments(
    [{ speaker: "민수", sourceSpeaker: "0", start: 0, end: 1, text: "첫 문장", confidence: 0.9, transcriptConfidence: 0.8 }],
    [{ speaker: "민수", sourceSpeaker: "0", start: 1.1, end: 2, text: "둘째", confidence: 0.7, transcriptConfidence: 0.6 }]
  );
  assert.equal(result[0].confidence, 0.9);
  assert.ok(result[0].transcriptConfidence > 0.73 && result[0].transcriptConfidence < 0.74);
});

test("sequence-bearing room segments dedupe and order without time-merging across reconnects", () => {
  const persisted = [
    { id: "old", sequence: 0, speaker: "민수", sourceSpeaker: "0", start: 0, end: 1, text: "이전 연결" }
  ];
  const nextSession = [
    { id: "new", sequence: 1, speaker: "민수", sourceSpeaker: "0", start: 0, end: 1, text: "새 연결" },
    { id: "duplicate", sequence: 0, speaker: "민수", sourceSpeaker: "0", start: 0, end: 1, text: "중복" }
  ];

  const result = mergeSegments(persisted, nextSession);
  assert.deepEqual(result.map(({ sequence }) => sequence), [0, 1]);
  assert.deepEqual(result.map(({ text }) => text), ["이전 연결", "새 연결"]);
  assert.equal(result[0].text.includes("새 연결"), false);

  const hydrated = orderPersistedRoomSegments([nextSession[0], persisted[0], nextSession[1]]);
  assert.deepEqual(hydrated.map(({ sequence }) => sequence), [0, 1]);
  assert.deepEqual(hydrated.map(({ text }) => text), ["이전 연결", "새 연결"]);
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

test("turns provider voice activity into clear live recording states", () => {
  assert.equal(liveRecordingStatusAfterEvent({ type: "ready", mode: "speaker" }), "녹음 중 · 화자 식별 연결됨");
  assert.equal(liveRecordingStatusAfterEvent({ type: "speech_started" }, "speaker"), "말하는 중 · 화자와 문장 분석 중");
  assert.equal(liveRecordingStatusAfterEvent({ type: "speech_started" }, "stt"), "말하는 중 · 실시간 문장 분석 중");
  assert.equal(liveRecordingStatusAfterEvent({ type: "utterance_end" }), "듣는 중 · 다음 발화 대기");
  assert.equal(liveRecordingStatusAfterEvent({ type: "transcript" }), null);
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

test("applies completed-document corrections only after persistence succeeds", async () => {
  const order = [];
  const result = await persistMeetingCorrection({
    isRecording: false,
    persist: async () => { order.push("persist"); return "saved"; },
    apply: () => order.push("apply"),
    retry: () => order.push("retry")
  });
  assert.deepEqual(order, ["persist", "apply"]);
  assert.deepEqual(result, { value: "saved", saved: true, retrying: false, error: null });

  await assert.rejects(persistMeetingCorrection({
    isRecording: false,
    persist: async () => { throw new Error("offline"); },
    apply: () => order.push("unexpected-apply")
  }), /offline/);
  assert.equal(order.includes("unexpected-apply"), false);
});

test("retains live corrections and schedules retry when persistence is interrupted", async () => {
  const order = [];
  const result = await persistMeetingCorrection({
    isRecording: true,
    persist: async () => { order.push("persist"); throw new Error("offline"); },
    apply: () => order.push("apply"),
    retry: () => order.push("retry")
  });
  assert.deepEqual(order, ["apply", "persist", "retry"]);
  assert.equal(result.saved, false);
  assert.equal(result.retrying, true);
  assert.match(result.error.message, /offline/);
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
  assert.equal(microphoneLevelPresentation(12, true).variant, "warning");
  assert.equal(microphoneLevelPresentation(30, true).variant, "success");
  assert.equal(microphoneLevelPresentation(95, true).variant, "error");
});

test("measures the same PCM stream sent to live transcription", () => {
  assert.equal(pcmInputLevel(new Int16Array(1_600)), 0);
  const quiet = Int16Array.from({ length: 1_600 }, (_value, index) => Math.round(Math.sin(index / 11) * 90));
  const usable = Int16Array.from({ length: 1_600 }, (_value, index) => Math.round(Math.sin(index / 11) * 600));
  const loud = Int16Array.from({ length: 1_600 }, (_value, index) => Math.round(Math.sin(index / 11) * 30_000));
  assert.ok(pcmInputLevel(quiet) < 20);
  assert.ok(pcmInputLevel(usable) >= 20 && pcmInputLevel(usable) <= 90);
  assert.ok(pcmInputLevel(loud) > 90);
  assert.equal(pcmInputLevel(usable.buffer), pcmInputLevel(usable));
});

test("resumes a suspended audio context before streaming PCM", async () => {
  const context = {
    state: "suspended",
    async resume() { this.state = "running"; }
  };
  assert.equal(await ensureAudioContextRunning(context), context);
  await assert.rejects(
    ensureAudioContextRunning({ state: "closed", resume: async () => undefined }),
    /실시간 음성 처리를 시작하지 못했습니다/
  );
});

test("recovers a suspended live audio context and reports an unrecoverable closure", async () => {
  let listener;
  let failures = 0;
  const context = {
    state: "suspended",
    addEventListener(_name, next) { listener = next; },
    removeEventListener(_name, next) { if (listener === next) listener = null; },
    async resume() { this.state = "running"; }
  };
  const dispose = watchAudioContext(context, () => { failures += 1; });
  await listener();
  assert.equal(context.state, "running");
  assert.equal(failures, 0);
  context.state = "closed";
  await listener();
  assert.equal(failures, 1);
  dispose();
  assert.equal(listener, null);
});

test("recognizes server room closure before or after socket readiness", () => {
  const closure = roomSocketClosure({ code: 1000, reason: "room closed" }, "room-one");
  assert.equal(closure.code, "ROOM_CLOSED");
  assert.match(closure.message, /회의 생성자/);
  assert.equal(roomSocketClosure({ code: 1000, reason: "recording stopped" }, "room-one"), null);
  assert.equal(roomSocketClosure({ code: 1000, reason: "room closed" }, ""), null);
});

test("uses browser-authorized application close codes for fatal live failures", () => {
  assert.ok(Object.values(liveSocketCloseCodes).every((code) => code >= 3_000 && code <= 4_999));
  assert.notEqual(liveSocketCloseCodes.invalidResponse, liveSocketCloseCodes.serverError);
});

test("bounds browser audio buffering to five seconds of 16 kHz mono PCM", () => {
  const openState = globalThis.WebSocket?.OPEN ?? 1;
  assert.equal(maximumBufferedAudioBytes, 160_000);
  assert.equal(liveSocketCanAcceptAudio({ readyState: openState, bufferedAmount: maximumBufferedAudioBytes }), true);
  assert.equal(liveSocketCanAcceptAudio({ readyState: openState, bufferedAmount: maximumBufferedAudioBytes + 1 }), false);
  assert.equal(liveSocketCanAcceptAudio({ readyState: 3, bufferedAmount: 0 }), false);
});

test("offers a verified probe as a profile sample only when it meets enrollment duration", () => {
  assert.equal(speakerProbeCanBecomeSample({ verification: { recorded: true }, quality: { duration: 4.9 } }), false);
  assert.equal(speakerProbeCanBecomeSample({ verification: { recorded: false }, quality: { duration: 8 } }), false);
  assert.equal(speakerProbeCanBecomeSample({ verification: { recorded: true }, quality: { duration: 5 } }), true);
});

test("hydrates a rebound room meeting with its persisted transcript and duration", () => {
  const meeting = {
    id: "meeting-room",
    roomId: "room-one",
    duration: "14.5",
    segments: [{ id: "persisted", sequence: 0, text: "이미 저장된 발화" }]
  };
  const hydrated = roomMeetingHydration(meeting);
  assert.equal(hydrated.meeting.id, "meeting-room");
  assert.deepEqual(hydrated.segments, meeting.segments);
  assert.equal(hydrated.duration, 14.5);
  assert.equal(roomMeetingHydration({ roomId: "room-one" }), null);
});

test("removes only the confirmed meeting from local document state", () => {
  const meetings = [{ id: "one", title: "첫 회의" }, { id: "two", title: "둘째 회의" }];
  assert.deepEqual(meetingsAfterRemoval(meetings, "one"), [{ id: "two", title: "둘째 회의" }]);
  assert.equal(meetings.length, 2);
});

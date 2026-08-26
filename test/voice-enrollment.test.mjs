import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  DEFAULT_ENROLLMENT_SECONDS,
  MAXIMUM_ENROLLMENT_SECONDS,
  MINIMUM_ENROLLMENT_SECONDS,
  VOICE_ENROLLMENT_PASSAGE,
  enrollmentCaptureErrorMessage,
  enrollmentFilename,
  enrollmentPermissionFromError,
  enrollmentTiming,
  normalizedEnrollmentDuration,
  recorderOptions
} from "../src/features/voice-enrollment/voiceEnrollmentState.js";

const hookUrl = new URL("../src/features/voice-enrollment/useVoiceEnrollmentCapture.js", import.meta.url);
const dialogUrl = new URL("../src/features/voice-enrollment/VoiceEnrollmentDialog.jsx", import.meta.url);
const apiUrl = new URL("../src/features/voice-enrollment/voiceEnrollmentApi.js", import.meta.url);
const appUrl = new URL("../src/App.jsx", import.meta.url);

test("keeps enrollment capture inside the server's accepted 10–15 second window", () => {
  assert.equal(MINIMUM_ENROLLMENT_SECONDS, 10);
  assert.equal(DEFAULT_ENROLLMENT_SECONDS, 12);
  assert.equal(MAXIMUM_ENROLLMENT_SECONDS, 15);
  assert.equal(normalizedEnrollmentDuration(3), 10);
  assert.equal(normalizedEnrollmentDuration(20), 15);
  assert.equal(normalizedEnrollmentDuration("invalid"), 12);

  assert.deepEqual(enrollmentTiming(-4, 12), {
    elapsed: 0,
    remaining: 12,
    progress: 0,
    canFinish: false,
    isComplete: false
  });
  assert.deepEqual(enrollmentTiming(10.25, 12), {
    elapsed: 10.25,
    remaining: 1.75,
    progress: 85,
    canFinish: true,
    isComplete: false
  });
  assert.deepEqual(enrollmentTiming(14, 12), {
    elapsed: 12,
    remaining: 0,
    progress: 100,
    canFinish: true,
    isComplete: true
  });
});

test("provides a fixed Korean passage and predictable recording metadata", () => {
  assert.match(VOICE_ENROLLMENT_PASSAGE, /오늘 회의에서는/);
  assert.ok(VOICE_ENROLLMENT_PASSAGE.length > 50);
  const supportedRecorder = { isTypeSupported: (type) => type === "audio/webm;codecs=opus" };
  assert.deepEqual(recorderOptions(supportedRecorder), { mimeType: "audio/webm;codecs=opus" });
  assert.equal(recorderOptions({ isTypeSupported: () => false }), undefined);
  assert.equal(enrollmentFilename("audio/webm", 123), "voice-enrollment-123.webm");
  assert.equal(enrollmentFilename("audio/ogg", 456), "voice-enrollment-456.ogg");
});

test("maps permission and media failures to actionable states", () => {
  assert.equal(enrollmentPermissionFromError({ name: "NotAllowedError" }), "denied");
  assert.equal(enrollmentPermissionFromError({ name: "SecurityError" }), "denied");
  assert.equal(enrollmentPermissionFromError({ name: "NotFoundError" }), "prompt");
  assert.match(enrollmentCaptureErrorMessage({ name: "NotAllowedError" }), /마이크 권한/);
  assert.match(enrollmentCaptureErrorMessage({ name: "NotFoundError" }), /마이크/);
  assert.equal(enrollmentCaptureErrorMessage(new Error("장치 실패")), "장치 실패");
});

test("capture hook stays isolated from transcription and meeting creation", async () => {
  const source = await readFile(hookUrl, "utf8");
  assert.match(source, /microphoneConstraints\(selectedAudioInputId\)/);
  assert.match(source, /ensureAudioContextRunning\(context\)/);
  assert.match(source, /pcmInputLevel\(data\)/);
  assert.match(source, /new MediaRecorder/);
  assert.match(source, /onEnroll\?\.\(file/);
  assert.match(source, /elapsed >= duration\) stop\(\{ upload: true \}\)/);
  assert.match(source, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(source, /mountedRef\.current = true/);
  assert.match(source, /generation !== captureGenerationRef\.current/g);
  assert.match(source, /captureGenerationRef\.current \+= 1;\s+if \(recorderRef\.current\)/);
  assert.match(source, /if \(streamRef\.current === stream\) cleanupMedia\(\)/);
  assert.doesNotMatch(source, /Deepgram|WebSocket|\/api\/meetings|postJson|apiRequest/);
});

test("home integrates self voice enrollment while preserving access invites", async () => {
  const [apiSource, appSource] = await Promise.all([
    readFile(apiUrl, "utf8"),
    readFile(appUrl, "utf8")
  ]);
  assert.match(apiSource, /apiRequest\("\/api\/profile\/voice"\)/);
  assert.match(apiSource, /form\.append\("audio", file/);
  assert.match(apiSource, /apiRequest\("\/api\/profile\/voice\/enroll"/);
  assert.match(apiSource, /postJson\("\/api\/rooms\/join", \{ accessCode: normalized \}\)/);
  assert.match(apiSource, /URLSearchParams\(location\.search\)\.get\("access"\)/);
  assert.doesNotMatch(apiSource, /Deepgram|\/api\/speakers|form\.append\("voice"/);
  assert.match(appSource, /<VoiceEnrollmentDialog/);
  assert.match(appSource, /await enrollVoice\(file\)/);
  assert.match(appSource, /await recording\.reload\(\)/);
  assert.doesNotMatch(appSource, /requireVoiceEnrollment|VOICE_ENROLLMENT_REQUIRED_MESSAGE/);
  assert.match(appSource, /joinRoomByAccessCode\(accessCode\)/);
  assert.match(appSource, /clearAccessCodeFromLocation\(\)/);
  assert.doesNotMatch(appSource, /get\("access"\).*normalizeRoomCode/s);
});

test("dialog is integration-ready and uses Astryx primitives without raw layout elements", async () => {
  const source = await readFile(dialogUrl, "utf8");
  assert.match(source, /export function VoiceEnrollmentDialog/);
  assert.match(source, /onEnroll/);
  assert.match(source, /onOpenChange/);
  assert.match(source, /VOICE_ENROLLMENT_PASSAGE/);
  assert.match(source, /<Selector/);
  assert.match(source, /<ProgressBar/);
  assert.match(source, /<StatusDot/);
  assert.doesNotMatch(source, /<(?:div|span)(?:\s|>)/);
  assert.doesNotMatch(source, /className=|tailwind|#[0-9A-Fa-f]{3,8}/);
});

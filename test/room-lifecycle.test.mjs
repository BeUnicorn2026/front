import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
const recordingSource = await readFile(new URL("../src/features/recording/useRecording.js", import.meta.url), "utf8");

function sourceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `missing source marker: ${start}`);
  assert.notEqual(endIndex, -1, `missing source marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("room finalization stays local and skips whole-meeting PATCH/autosave", () => {
  const autosave = sourceBetween(recordingSource, "const scheduleAutosave", "const handleSocketEvent");
  const finalize = sourceBetween(recordingSource, "const finalizeRecording", "const start =");
  const start = sourceBetween(recordingSource, "const start =", "const stop =");

  assert.match(autosave, /if \(!activeMeetingRef\.current \|\| roomIdRef\.current\) return/);
  assert.match(finalize, /const isRoomMeeting = Boolean\(roomIdRef\.current\)/);
  assert.match(finalize, /if \(!isRoomMeeting\) \{\s*await saveActiveMeeting/);
  assert.match(start, /if \(createdMeeting && !roomId\)/);
  assert.doesNotMatch(start, /if \(createdMeeting\) \{\s*await saveActiveMeeting/);
});

test("leaving awaits stream shutdown without closing the room, while creator end closes it", () => {
  const leave = sourceBetween(appSource, "const leaveMeeting", "const endMeeting");
  const end = sourceBetween(appSource, "const endMeeting", "const openMeeting");

  assert.match(leave, /await recording\.stop\(\)/);
  assert.match(leave, /navigateTo\("home"\)/);
  assert.doesNotMatch(leave, /\/close/);

  assert.match(end, /room\.createdBy !== context\.user\.id/);
  assert.match(end, /await recording\.stop\(\)/);
  assert.match(end, /postJson\(`\/api\/rooms\/\$\{encodeURIComponent\(room\.id\)\}\/close`, \{\}\)/);
  assert.match(end, /if \(result\?\.meeting\) recording\.updateMeeting\(result\.meeting\)/);
  assert.match(end, /else await recording\.reload\(\)/);
  assert.match(end, /navigateTo\("home"\)/);
});

test("startup cancellation and browser history both await local shutdown", () => {
  const start = sourceBetween(recordingSource, "const start =", "const stop =");
  const stop = sourceBetween(recordingSource, "const stop =", "const transcribeFile");
  const popstate = sourceBetween(appSource, "const handleHistoryNavigation", "window.addEventListener(\"popstate\"");

  assert.match(start, /const startAttempt = \{ cancelled: false/);
  assert.match(start, /ensureStartActive\(\)/);
  assert.match(stop, /starting\.cancelled = true/);
  assert.match(stop, /cleanupCapture\(\)/);
  assert.match(stop, /await starting\.settled/);
  assert.match(popstate, /if \(pageRef\.current === "record"\)/);
  assert.match(popstate, /await recordingStopRef\.current\(\)/);
});

test("only the room creator sees explicit end controls", () => {
  const meetingPage = sourceBetween(appSource, "function MeetingPage", "function meetingDate");
  assert.match(meetingPage, /const isRoomCreator = Boolean\(room\?\.createdBy && room\.createdBy === user\?\.id\)/);
  assert.match(meetingPage, /isRoomCreator && !recording\.roomClosed/);
  assert.match(meetingPage, /label="회의 종료"/);
});

test("room bind hydrates persisted segments and carries the same meeting ID into WebSocket", () => {
  const start = sourceBetween(recordingSource, "const start =", "const stop =");
  assert.match(start, /const hydrated = roomMeetingHydration\(created\.meeting\)/);
  assert.match(start, /committedRef\.current = hydrated\.segments/);
  assert.match(start, /setSegments\(hydrated\.segments\)/);
  assert.match(start, /await openLiveSocket\(roomId, hydrated\.meeting\.id\)/);
  assert.match(recordingSource, /parameters\.set\("meetingId", meetingId\)/);
});

test("entering a live room automatically starts microphone capture once", () => {
  const meetingPage = sourceBetween(appSource, "function MeetingPage", "function meetingDate");
  assert.match(meetingPage, /const automaticRecordingAttemptRef = useRef\(false\)/);
  assert.match(meetingPage, /automaticRecordingAttemptRef\.current = true/);
  assert.match(meetingPage, /void recording\.start\(\{ roomId: room\.id \}\)/);
  assert.match(meetingPage, /readOnly \|\| !room\?\.id \|\| recording\.roomClosed/);
});

test("room closure is presented as terminal room state rather than a generic interruption", () => {
  assert.match(recordingSource, /const roomClosure = roomSocketClosure\(event, roomIdRef\.current\)/);
  assert.match(recordingSource, /reject\(roomClosure \|\| new Error/);
  assert.match(recordingSource, /setRoomClosed\(true\)/);
  assert.match(recordingSource, /회의 생성자가 회의를 종료했습니다/);
  assert.match(appSource, /isDisabled=\{recording\.roomClosed\}/);
});

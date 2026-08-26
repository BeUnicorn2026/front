import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home keeps one expanding profile, dense meeting rows, and a compact room-code dock", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const start = source.indexOf("function DashboardPage");
  const end = source.indexOf("function DocumentsPage", start);
  const dashboard = source.slice(start, end);

  assert.match(dashboard, /data-home-account/);
  assert.match(dashboard, />참여한 회의</);
  assert.match(dashboard, /<List\s+[\s\S]*hasDividers[\s\S]*density="spacious"/);
  assert.match(dashboard, /meetingParticipantSummary\(meeting, context\.user\.name\)/);
  assert.match(dashboard, /whiteSpace: "nowrap"/);
  assert.doesNotMatch(dashboard, /<Card key=\{meeting\.id\}/);

  assert.match(dashboard, /data-home-dock/);
  assert.match(dashboard, /const \[code, setCode\] = useState\(\(\) => normalizeRoomCode\(initialRoomCode\)\)/);
  assert.match(dashboard, /aria-label="ROOM 또는 4자리 숫자 방 번호"/);
  assert.match(dashboard, /ROOM으로 생성 · 숫자로 입장/);
  assert.match(dashboard, /Array\.from\(\{ length: 4 \}/);
  assert.match(dashboard, /event\.clientY > bounds\.top \+ bounds\.height \* 0\.82/);
  assert.match(dashboard, /roomCodeKeyAction\(code, event\)/);
  assert.match(dashboard, /document\.activeElement !== codeInputRef\.current/);
  assert.match(dashboard, /isEditableTarget\(event\.target\)/);
  assert.match(dashboard, /transform: dockUp \? "translateY\(0\)" : "translateY\(68%\)"/);

  assert.match(dashboard, /value="bio" label="자기소개"/);
  assert.match(dashboard, /value="settings" label="마이크·이름"/);
  assert.match(dashboard, /value="account" label="계정"/);
  assert.match(dashboard, /label="플랜 및 결제" variant="primary" onClick=\{\(\) => onNavigate\("billing"\)\}/);
  assert.doesNotMatch(dashboard, />⏎</);
  assert.doesNotMatch(dashboard, /<(?:div|span)(?:\s|>)/);
});

test("home and meeting room bypass navigation while supporting a staged room entry", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(source, /const shell = page === "home" \|\| page === "record"[\s\S]*\? <AppShell variant="surface" height="fill" contentPadding=\{0\}/);
  assert.match(source, /function MeetingEntryScreen/);
  assert.match(source, /data-meeting-entry-loading/);
  assert.match(source, /setMeetingEntryPhase\(reducedMotion \? "loading" : "exiting"\)/);
  assert.match(source, /setMeetingEntryPhase\("loading"\), 520/);
  assert.match(source, /const LOADING_SCREEN_MINIMUM_MS = 4_000/);
  assert.match(source, /\}, LOADING_SCREEN_MINIMUM_MS \+ \(reducedMotion \? 0 : 520\)\)\);/);
  assert.match(source, /Math\.max\(0, LOADING_SCREEN_MINIMUM_MS - \(Date\.now\(\) - loadingStartedAt\)\)/);
  assert.match(source, /function AxolotlLoadingScreen/);
  assert.match(source, /src="\/characters\/meeting-entry-wave\.mp4"/);
  assert.match(source, /data-loading-screen/);
  assert.match(source, /translateY\(100%\) scale\(0\.985\)/);
  assert.match(source, /회의실을 준비하고 있어요/);

  const start = source.indexOf("function DashboardPage");
  const end = source.indexOf("function DocumentsPage", start);
  const dashboard = source.slice(start, end);
  assert.match(dashboard, /background: "var\(--color-background-surface\)"/);
  assert.match(dashboard, /data-room-feedback=\{roomFeedbackActive \? "error" : "idle"\}/);
  assert.match(dashboard, /error\.code === "ROOM_NOT_FOUND"/);
  assert.match(dashboard, /roomFeedbackActive \? "var\(--color-error-muted\)"/);
  assert.doesNotMatch(dashboard, /Voice Partition 홈 헤더/);
});

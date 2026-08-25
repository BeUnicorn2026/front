import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("meeting room keeps portrait transcription and reveals a desktop map with centered controls", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const start = source.indexOf("function MeetingPage");
  const end = source.indexOf("function meetingDate", start);
  const room = source.slice(start, end);

  assert.match(room, /label=\{readOnly \? "회의 기록 헤더" : "실시간 받아쓰기 헤더"\}/);
  assert.match(room, /centerContent=\{/);
  assert.match(room, /\{formatTime\(displayedElapsed\)\}/);
  assert.match(room, /data-desktop-meeting-workspace/);
  assert.match(room, /<LiveStructurePanel segments=\{displayedSegments\}/);
  assert.match(room, /<LiveTranscriptFeed segments=\{displayedSegments\}/);
  assert.match(room, /data-desktop-meeting-controls/);
  assert.match(room, /data-meeting-participant-control/);
  assert.match(room, /aria-controls="meeting-participant-status"/);
  assert.match(room, /width: participantOpen \? "calc\(var\(--spacing-10\) \* 9\)" : "calc\(var\(--spacing-10\) \* 7\)"/);
  assert.match(room, /id="meeting-participant-status"/);
  assert.match(room, /<Avatar src=\{userAvatar\} name=\{user\?\.name \|\| "나"\} size="lg" tooltip=\{false\} \/>/);
  assert.match(room, /<Heading level=\{3\} maxLines=\{1\}>\{user\?\.name \|\| "나"\}<\/Heading>/);
  assert.match(room, /position: "fixed"/);
  assert.match(room, /pointerEvents: participantOpen \? "auto" : "none"/);
  assert.match(room, /label=\{recording\.isRecording \? "기록 중지"/);

  assert.match(room, /data-room-invite-drawer/);
  assert.match(room, /as="aside"/);
  assert.match(room, /height=\{desktop \? meetingControlHeight : "auto"\}/);
  assert.match(room, /bottom: desktop \? "var\(--spacing-0\)" : "var\(--spacing-4\)"/);
  assert.match(room, /data-desktop-meeting-controls width="100%" height=\{meetingControlHeight\}/);
  assert.match(room, /transform: inviteOpen \? "translateX\(0\)" : "translateX\(calc\(100% - var\(--spacing-10\) - var\(--spacing-4\)\)\)"/);
  assert.match(room, /icon=\{<Icon icon=\{inviteOpen \? "chevronRight" : "chevronLeft"\} \/>\}/);
  assert.match(room, />방 코드</);
  assert.match(room, /label="초대 링크 복사"/);
  assert.match(room, /aria-expanded=\{inviteOpen\}/);
  assert.match(room, /\{!readOnly && \(/);
  assert.match(room, /readOnly \? "기록 닫기" : "회의 나가기"/);
  assert.match(room, /isReadOnly=\{readOnly\}/);
  assert.match(room, /useMeetMap\(displayedSegments, recording\.activeMeeting\?\.id, readOnly\)/);
  assert.match(room, /meetMap=\{meetMap\}/);
  assert.match(source, /<Heading level=\{2\}>구조도<\/Heading>/);
  assert.match(source, /<Heading level=\{2\}>대화 내용<\/Heading>/);

  assert.doesNotMatch(room, /CONVERSATION STRUCTURE/);
  const livePanels = source.slice(source.indexOf("function LiveTranscriptFeed"), source.indexOf("function MeetingPage"));
  assert.doesNotMatch(livePanels, /CONVERSATION MAP|LIVE TRANSCRIPT/);
  assert.doesNotMatch(room, /StructureDiagram/);
  assert.doesNotMatch(room, /MeetingMindMap/);
  assert.doesNotMatch(room, /IntelligencePanel/);
  assert.doesNotMatch(room, /<(?:div|span)(?:\s|>)/);
});

test("live transcript follows interim updates while respecting manual scroll", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const start = source.indexOf("function LiveTranscriptFeed");
  const end = source.indexOf("function MeetingPage", start);
  const feed = source.slice(start, end);

  assert.match(feed, /latestSegment\?\.text/);
  assert.match(feed, /latestSegment\?\.pending/);
  assert.match(feed, /viewport\.scrollTo/);
  assert.match(feed, /followsLatestRef\.current = viewport\.scrollHeight - viewport\.scrollTop - viewport\.clientHeight < 72/);
  assert.match(feed, /segment\.pending && <StatusDot/);
  assert.match(feed, /wordBreak: "keep-all"/);
  assert.match(feed, /buildDialogueMapTrees\(segments\)/);
  assert.match(feed, /buildDialogueMapTreesFromResult\(meetMap\.result, segments\)/);
  assert.match(feed, /buildDialogueMapLayout\(trees\)/);
  assert.match(feed, /data-dialogue-tree/);
  assert.match(feed, /markerEnd="url\(#dialogue-tree-arrow\)"/);
  assert.match(feed, /\{edge\.relation\}/);
  assert.match(feed, /<EmptyState/);
  assert.doesNotMatch(feed, /<(?:div|span)(?:\s|>)/);
});

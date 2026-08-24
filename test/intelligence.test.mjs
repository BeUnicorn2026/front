import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalyzedStructure, buildMeetingStructure, buildStructureBlocks, deriveActions, deriveTerms, extractKeywords, meetingStatusPresentation } from "../src/data/intelligence.js";

const segments = [
  { speaker: "민수", start: 0, end: 3, text: "인증 오류 원인을 확인하고 로그인 API를 수정하겠습니다" },
  { speaker: "지수", start: 3.2, end: 6, text: "로그인 API 테스트도 오늘 추가하겠습니다" },
  { speaker: "민수", start: 22, end: 26, text: "다음으로 모바일 회의 화면 배치를 검토하겠습니다" }
];

test("derives structure blocks and labels only from actual transcript", () => {
  const blocks = buildStructureBlocks(segments);
  assert.equal(blocks.length, 2);
  assert.ok(blocks[0].label.includes("로그인") || blocks[0].label.includes("API"));
  assert.ok(blocks[1].label.includes("모바일") || blocks[1].label.includes("회의"));
  const tree = buildMeetingStructure(segments);
  assert.equal(tree[0].children.length, 2);
  assert.match(tree[0].children[0].children[0].label, /민수/);
});

test("extracts repeated transcript keywords without seeded topic names", () => {
  assert.ok(extractKeywords(segments, 4).includes("로그인"));
});

test("uses one validated evidence model for analyzed outline, tree and mind map", () => {
  const structure = buildAnalyzedStructure({
    title: "인증 회의",
    topics: [
      { id: "topic-auth", label: "인증 수정", summary: "근거 요약", segmentIndexes: [0, 1, 99, 1], subtopics: ["로그인"] },
      { id: "topic-stale", label: "오래된 구간", segmentIndexes: [99], subtopics: [] }
    ]
  }, segments);
  assert.equal(structure.blocks.length, 1);
  assert.deepEqual(structure.blocks[0].segmentIndexes, [0, 1]);
  assert.deepEqual(structure.blocks[0].speakers, ["민수", "지수"]);
  assert.equal(structure.tree[0].children.length, 1);
  assert.match(structure.tree[0].children[0].children.at(-1).label, /지수.*로그인 API 테스트/);
  assert.equal(structure.tree[0].children.some(({ id }) => id === "topic-stale"), false);
});

test("live action preview assigns only evidence-backed owners and due dates", () => {
  const actions = deriveActions([
    { speaker: "지수", start: 0, text: "민수님이 내일까지 결과를 확인해 주세요." },
    { speaker: "민수", start: 2, text: "문서화합시다." }
  ]);
  assert.deepEqual(actions.map(({ owner, due }) => ({ owner, due })), [
    { owner: "민수", due: "내일까지" },
    { owner: "담당 미정", due: "일정 미정" }
  ]);
});

test("matches only vocabulary extracted from real meeting data", () => {
  const catalog = [{ term: "로그인 API", definition: "실제 분석 설명", isKnown: false }];
  assert.deepEqual(deriveTerms(segments, [], catalog).map(({ term }) => term), ["로그인 API"]);
  assert.deepEqual(deriveTerms(segments, [], []), []);
});

test("preserves server knowledge state while matching live transcript terms", () => {
  const catalog = [{
    term: "임베딩",
    isKnown: false,
    shouldExplain: true,
    knowledge: { pKnown: 0.08, status: "unknown", evidenceCount: 1 }
  }];
  const terms = deriveTerms([{ speaker: "민수", start: 0, end: 2, text: "임베딩을 사용합니다." }], ["임베딩"], catalog);
  assert.equal(terms[0].isKnown, false);
  assert.equal(terms[0].knowledge.pKnown, 0.08);
  assert.equal(terms[0].shouldExplain, true);
});

test("distinguishes safely preserved interruptions from active recordings", () => {
  assert.deepEqual(meetingStatusPresentation("completed"), { label: "완료", color: "green" });
  assert.equal(meetingStatusPresentation("interrupted").label, "중단 · 기록 보존");
  assert.equal(meetingStatusPresentation("recording").label, "기록 중");
});

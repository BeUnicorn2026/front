import test from "node:test";
import assert from "node:assert/strict";
import { buildMeetingStructure, buildStructureBlocks, deriveActions, deriveTerms, extractKeywords } from "../src/data/intelligence.js";

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

import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalyzedStructure, buildDialogueMapLayout, buildDialogueMapTrees, buildDialogueMapTreesFromResult, buildMeetingStructure, buildMindMapLayout, buildStructureBlocks, buildStructureDiagramLayout, deriveActions, deriveTerms, dialogueNodeKind, extractKeywords, meetingStatusPresentation, segmentDialogueTopics, summarizeDialogueNode, wrapMindMapLabel } from "../src/data/intelligence.js";

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

test("lays out long meeting mind maps without overlapping topic nodes", () => {
  const blocks = Array.from({ length: 40 }, (_, index) => ({
    id: `topic-${index}`,
    label: `${index + 1}번째 긴 회의 주제와 결정 사항`,
    start: index * 10,
    segments: [{ text: "근거" }]
  }));
  const layout = buildMindMapLayout(blocks, "topic-31", { maximumVisible: 18 });
  assert.equal(layout.nodes.length, 18);
  assert.ok(layout.nodes.some(({ id }) => id === "topic-31"));
  assert.equal(layout.selectedIndex, 31);
  for (const side of ["left", "right"]) {
    const nodes = layout.nodes.filter((node) => node.side === side);
    for (let index = 1; index < nodes.length; index += 1) {
      assert.ok(nodes[index].y - nodes[index - 1].y >= layout.nodeHeight);
    }
  }
});

test("keeps mind map labels readable in no more than two lines", () => {
  assert.deepEqual(wrapMindMapLabel("짧은 주제"), ["짧은 주제"]);
  const lines = wrapMindMapLabel("모바일에서 확인해야 하는 아주 긴 회의 주제와 결정 사항", 12);
  assert.equal(lines.length, 2);
  assert.ok(lines.every((line) => line.length <= 12));
  assert.ok(lines[1].endsWith("…"));
});

test("lays out the structure diagram as a non-overlapping chronological snake", () => {
  const blocks = Array.from({ length: 8 }, (_, index) => ({
    id: `topic-${index}`, label: `${index + 1}번째 실제 주제`, start: index * 10, segments: [{ text: "근거" }]
  }));
  const layout = buildStructureDiagramLayout(blocks);
  assert.equal(layout.nodes.length, blocks.length);
  assert.equal(layout.edges.length, blocks.length);
  assert.deepEqual(layout.nodes.slice(0, 6).map(({ column }) => column), [0, 1, 2, 2, 1, 0]);
  for (let leftIndex = 0; leftIndex < layout.nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < layout.nodes.length; rightIndex += 1) {
      const left = layout.nodes[leftIndex];
      const right = layout.nodes[rightIndex];
      assert.ok(Math.abs(left.x - right.x) >= layout.nodeWidth || Math.abs(left.y - right.y) >= layout.nodeHeight);
    }
  }
  assert.ok(layout.height > layout.nodes.at(-1).y + layout.nodeHeight / 2);
});

test("turns transcript evidence into incremental dialogue trees", () => {
  assert.equal(dialogueNodeKind("어떻게 시작할까요?"), "question");
  assert.equal(dialogueNodeKind("이 방식은 효율이 좋아서 유지하면 좋겠습니다"), "pro");
  assert.equal(dialogueNodeKind("네트워크 문제가 우려됩니다"), "con");
  assert.equal(dialogueNodeKind("새로운 배포 동선을 제안합니다"), "position");
  assert.equal(summarizeDialogueNode("하나 둘 셋 넷 다섯 여섯 일곱 여덟").split(" ").length, 6);
  assert.equal(segmentDialogueTopics(segments).length, 2);

  const trees = buildDialogueMapTrees(segments);
  assert.equal(trees.length, 2);
  assert.deepEqual(trees.map(({ children }) => children.length), [1, 0]);
  assert.ok(trees.every(({ root }) => root.kind === "position"));
  assert.ok(trees.flatMap(({ root, children }) => [root, ...children]).every(({ label }) => label.split(" ").length <= 6));
  assert.ok(trees.flatMap(({ links }) => links).every(({ from, to }) => from !== to));
  assert.equal(new Set(trees.flatMap(({ links }) => links).map(({ from }) => from)).size, trees.flatMap(({ links }) => links).length);

  const layout = buildDialogueMapLayout(trees);
  assert.equal(layout.edges.length, 1);
  assert.equal(layout.nodes.length, 3);
  assert.ok(layout.nodes.every(({ labelLines }) => labelLines.length <= 2));
  for (let leftIndex = 0; leftIndex < layout.nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < layout.nodes.length; rightIndex += 1) {
      const left = layout.nodes[leftIndex];
      const right = layout.nodes[rightIndex];
      const overlaps = left.x < right.x + right.width && left.x + left.width > right.x
        && left.y < right.y + right.height && left.y + left.height > right.y;
      assert.equal(overlaps, false);
    }
  }
});

test("turns validated Go MeetMap output into the same tree renderer", () => {
  const trees = buildDialogueMapTreesFromResult({ topics: [{
    id: "topic-1", label: "인증 논의", nodes: [
      { id: "node-1", segmentIndex: 0, kind: "question", summary: "인증 오류 원인은 무엇인가요" },
      { id: "node-2", segmentIndex: 1, kind: "position", summary: "로그인 API 테스트를 추가합니다", parentId: "node-1", relation: "답변" }
    ]
  }] }, segments);
  assert.equal(trees.length, 1);
  assert.equal(trees[0].root.kind, "question");
  assert.equal(trees[0].children[0].parentId, "node-1");
  assert.equal(trees[0].links[0].relation, "답변");
});

test("keeps LiveMap evidence attached after room transcript time sorting", () => {
  const timeSorted = [
    { sequence: 1, speaker: "먼저", start: 3, text: "시간상 첫 발화" },
    { sequence: 0, speaker: "나중", start: 8, text: "지연 도착 발화" }
  ];
  const trees = buildDialogueMapTreesFromResult({ topics: [{
    nodes: [{ id: "delayed", segmentIndex: 0, kind: "question", summary: "지연 도착 발화" }]
  }] }, timeSorted);

  assert.match(trees[0].root.meta, /^나중/);
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

import test from "node:test";
import assert from "node:assert/strict";
import { applyLiveMapEvent, createLiveMapState, resetLiveMapState, toRendererResult } from "../src/features/meeting/liveMapState.js";
import { buildDialogueMapLayout, buildDialogueMapTreesFromResult } from "../src/data/intelligence.js";

const delta = (payload) => ({ type: "livemap-delta", delta: payload });

test("createLiveMapState and resetLiveMapState return a fresh empty snapshot", () => {
  assert.deepEqual(createLiveMapState(), { seq: 0, active: false, finalized: false, result: { topics: [] } });
  assert.deepEqual(resetLiveMapState(), createLiveMapState());
});

test("delta sequence topic -> node -> link folds into renderer-shaped result", () => {
  let state = createLiveMapState();
  state = applyLiveMapEvent(state, delta({ seq: 1, type: "topic_started", topic: { id: "t1", label: "로그인", offAgenda: false } }));
  state = applyLiveMapEvent(state, delta({ seq: 2, type: "node_added", node: { id: "n0", topicId: "t1", kind: "question", summary: "원인은?", speaker: "민수", turnId: "u1", segmentIndex: 0 } }));
  state = applyLiveMapEvent(state, delta({ seq: 3, type: "node_added", node: { id: "n1", topicId: "t1", kind: "position", summary: "API 수정", speaker: "지수", turnId: "u2", segmentIndex: 1 } }));
  state = applyLiveMapEvent(state, delta({ seq: 4, type: "link_added", link: { nodeId: "n1", parentId: "n0", relation: "answers", relationLabel: "답변", confidence: 0.9 } }));

  assert.equal(state.seq, 4);
  assert.equal(state.active, true);
  assert.equal(state.finalized, false);
  assert.equal(state.result.topics.length, 1);
  const topic = state.result.topics[0];
  assert.deepEqual({ id: topic.id, label: topic.label }, { id: "t1", label: "로그인" });
  assert.equal(topic.nodes.length, 2);
  assert.deepEqual(
    { id: topic.nodes[0].id, segmentIndex: topic.nodes[0].segmentIndex, kind: topic.nodes[0].kind, parentId: topic.nodes[0].parentId, relation: topic.nodes[0].relation },
    { id: "n0", segmentIndex: 0, kind: "question", parentId: "", relation: "" }
  );
  // link_added set parent + preferred Korean relation label.
  assert.equal(topic.nodes[1].parentId, "n0");
  assert.equal(topic.nodes[1].relation, "답변");
  // extra fields are preserved harmlessly.
  assert.equal(topic.nodes[1].speaker, "지수");
  assert.equal(topic.nodes[1].turnId, "u2");
});

test("link_added falls back to relation when relationLabel is absent", () => {
  let state = createLiveMapState();
  state = applyLiveMapEvent(state, delta({ seq: 1, type: "topic_started", topic: { id: "t1", label: "T" } }));
  state = applyLiveMapEvent(state, delta({ seq: 2, type: "node_added", node: { id: "n0", topicId: "t1", kind: "question", segmentIndex: 0 } }));
  state = applyLiveMapEvent(state, delta({ seq: 3, type: "node_added", node: { id: "n1", topicId: "t1", kind: "pro", segmentIndex: 1 } }));
  state = applyLiveMapEvent(state, delta({ seq: 4, type: "link_added", link: { nodeId: "n1", parentId: "n0", relation: "supports" } }));
  assert.equal(state.result.topics[0].nodes[1].relation, "supports");
});

test("out-of-order and duplicate seq deltas are ignored", () => {
  let state = createLiveMapState();
  state = applyLiveMapEvent(state, delta({ seq: 5, type: "topic_started", topic: { id: "t1", label: "T" } }));
  const afterFirst = state;
  // seq <= current is dropped, state identity unchanged.
  state = applyLiveMapEvent(state, delta({ seq: 5, type: "topic_started", topic: { id: "t2", label: "dup-seq" } }));
  state = applyLiveMapEvent(state, delta({ seq: 3, type: "topic_started", topic: { id: "t3", label: "old" } }));
  assert.equal(state, afterFirst);
  assert.equal(state.result.topics.length, 1);
  assert.equal(state.seq, 5);
});

test("topic_started is idempotent on duplicate topic id", () => {
  let state = createLiveMapState();
  state = applyLiveMapEvent(state, delta({ seq: 1, type: "topic_started", topic: { id: "t1", label: "first" } }));
  state = applyLiveMapEvent(state, delta({ seq: 2, type: "topic_started", topic: { id: "t1", label: "second" } }));
  assert.equal(state.result.topics.length, 1);
  assert.equal(state.result.topics[0].label, "first");
  assert.equal(state.seq, 2); // seq still advances
});

test("node for an unknown topic is dropped without throwing", () => {
  let state = createLiveMapState();
  state = applyLiveMapEvent(state, delta({ seq: 1, type: "topic_started", topic: { id: "t1", label: "T" } }));
  state = applyLiveMapEvent(state, delta({ seq: 2, type: "node_added", node: { id: "n0", topicId: "does-not-exist", kind: "question", segmentIndex: 0 } }));
  assert.equal(state.result.topics[0].nodes.length, 0);
  assert.equal(state.seq, 2);
});

test("duplicate node id within a topic is dropped", () => {
  let state = createLiveMapState();
  state = applyLiveMapEvent(state, delta({ seq: 1, type: "topic_started", topic: { id: "t1", label: "T" } }));
  state = applyLiveMapEvent(state, delta({ seq: 2, type: "node_added", node: { id: "n0", topicId: "t1", kind: "question", segmentIndex: 0 } }));
  state = applyLiveMapEvent(state, delta({ seq: 3, type: "node_added", node: { id: "n0", topicId: "t1", kind: "position", segmentIndex: 1 } }));
  assert.equal(state.result.topics[0].nodes.length, 1);
  assert.equal(state.result.topics[0].nodes[0].kind, "question");
});

test("link for an unknown node is a no-op without throwing", () => {
  let state = createLiveMapState();
  state = applyLiveMapEvent(state, delta({ seq: 1, type: "topic_started", topic: { id: "t1", label: "T" } }));
  const before = state;
  state = applyLiveMapEvent(state, delta({ seq: 2, type: "link_added", link: { nodeId: "ghost", parentId: "n0", relationLabel: "답변" } }));
  assert.deepEqual(state.result, before.result);
});

test("finalized delta sets the finalized flag", () => {
  let state = createLiveMapState();
  state = applyLiveMapEvent(state, delta({ seq: 1, type: "topic_started", topic: { id: "t1", label: "T" } }));
  assert.equal(state.finalized, false);
  state = applyLiveMapEvent(state, delta({ seq: 2, type: "finalized" }));
  assert.equal(state.finalized, true);
  assert.equal(state.active, true);
});

test("livemap-state resync replaces the whole result and sets seq", () => {
  let state = createLiveMapState();
  state = applyLiveMapEvent(state, delta({ seq: 1, type: "topic_started", topic: { id: "t1", label: "stale" } }));
  const snapshot = {
    type: "livemap-state",
    seq: 42,
    result: { topics: [{ id: "s1", label: "resynced", nodes: [{ id: "m0", segmentIndex: 0, kind: "question", summary: "x", parentId: "", relation: "" }] }] }
  };
  state = applyLiveMapEvent(state, snapshot);
  assert.equal(state.seq, 42);
  assert.equal(state.active, true);
  assert.equal(state.result.topics.length, 1);
  assert.equal(state.result.topics[0].id, "s1");
});

test("malformed events never throw and return state unchanged", () => {
  const state = applyLiveMapEvent(createLiveMapState(), delta({ seq: 1, type: "topic_started", topic: { id: "t1", label: "T" } }));
  for (const bad of [null, undefined, 5, "x", {}, { type: "livemap-delta" }, { type: "livemap-delta", delta: null }, { type: "livemap-delta", delta: { seq: "NaN", type: "topic_started" } }, { type: "livemap-state" }, { type: "livemap-state", result: null }, { type: "unknown" }]) {
    let next;
    assert.doesNotThrow(() => { next = applyLiveMapEvent(state, bad); });
    assert.equal(next, state);
  }
});

test("toRendererResult keeps unresolved segment references pending instead of clamping them", () => {
  const state = {
    ...createLiveMapState(),
    result: { topics: [{ id: "t1", label: "T", nodes: [
      { id: "n0", segmentIndex: 0, kind: "question", summary: "a" },
      { id: "n1", segmentIndex: 3, kind: "position", summary: "b" },
      { id: "n2", segmentIndex: 4, kind: "pro", summary: "c" },
      { id: "n3", segmentIndex: -3, kind: "con", summary: "d" },
      { id: "n4", segmentIndex: "unknown", kind: "position", summary: "e" }
    ] }] }
  };

  const pending = toRendererResult(state, 3);
  assert.equal(pending.result, undefined); // returns a bare { topics }, ready for the builder
  assert.deepEqual(pending.topics[0].nodes.map(({ id }) => id), ["n0"]);
  // The adapter is derived-only: exact unresolved references remain available for transcript growth.
  assert.deepEqual(state.result.topics[0].nodes.map(({ segmentIndex }) => segmentIndex), [0, 3, 4, -3, "unknown"]);

  const partiallyResolved = toRendererResult(state, 4);
  assert.deepEqual(partiallyResolved.topics[0].nodes.map(({ id, segmentIndex }) => ({ id, segmentIndex })), [
    { id: "n0", segmentIndex: 0 },
    { id: "n1", segmentIndex: 3 }
  ]);
  const resolved = toRendererResult(state, 5);
  assert.deepEqual(resolved.topics[0].nodes.map(({ id, segmentIndex }) => ({ id, segmentIndex })), [
    { id: "n0", segmentIndex: 0 },
    { id: "n1", segmentIndex: 3 },
    { id: "n2", segmentIndex: 4 }
  ]);
  assert.equal(new Set(resolved.topics[0].nodes.map(({ id }) => id)).size, 3);
  assert.deepEqual(toRendererResult(state, 0).topics[0].nodes, []);
});

test("several delta nodes arriving before transcripts resolve once without changing reducer state", () => {
  let state = createLiveMapState();
  state = applyLiveMapEvent(state, delta({ seq: 1, type: "topic_started", topic: { id: "t1", label: "T" } }));
  state = applyLiveMapEvent(state, delta({ seq: 2, type: "node_added", node: { id: "n0", topicId: "t1", kind: "question", segmentIndex: 0 } }));
  state = applyLiveMapEvent(state, delta({ seq: 3, type: "node_added", node: { id: "n3", topicId: "t1", kind: "position", segmentIndex: 3 } }));
  state = applyLiveMapEvent(state, delta({ seq: 4, type: "node_added", node: { id: "n4", topicId: "t1", kind: "pro", segmentIndex: 4 } }));
  state = applyLiveMapEvent(state, delta({ seq: 5, type: "node_added", node: { id: "n5", topicId: "t1", kind: "con", segmentIndex: 5 } }));

  assert.equal(state.seq, 5);
  assert.deepEqual(toRendererResult(state, 3).topics[0].nodes.map(({ id }) => id), ["n0"]);
  assert.deepEqual(toRendererResult(state, 5).topics[0].nodes.map(({ id }) => id), ["n0", "n3", "n4"]);
  assert.deepEqual(toRendererResult(state, 6).topics[0].nodes.map(({ id }) => id), ["n0", "n3", "n4", "n5"]);

  const segments = Array.from({ length: 6 }, (_, index) => ({
    speaker: `speaker-${index}`,
    start: index,
    end: index + 1,
    text: `segment-${index}`
  }));
  const beforeGrowth = buildDialogueMapTreesFromResult(toRendererResult(state, 3), segments.slice(0, 3));
  const afterGrowth = buildDialogueMapTreesFromResult(toRendererResult(state, 6), segments);
  assert.deepEqual([beforeGrowth[0].root, ...beforeGrowth[0].children].map(({ id }) => id), ["n0"]);
  assert.deepEqual([afterGrowth[0].root, ...afterGrowth[0].children].map(({ id }) => id), ["n0", "n3", "n4", "n5"]);
  assert.equal(new Set([afterGrowth[0].root, ...afterGrowth[0].children].map(({ id }) => id)).size, 4);

  assert.equal(state.seq, 5);
  assert.deepEqual(state.result.topics[0].nodes.map(({ segmentIndex }) => segmentIndex), [0, 3, 4, 5]);
});

test("snapshot nodes with future segments resolve incrementally without duplication", () => {
  const snapshot = {
    type: "livemap-state",
    seq: 20,
    result: { topics: [{ id: "s1", label: "snapshot", nodes: [
      { id: "s0", segmentIndex: 0, kind: "question", summary: "root", parentId: "", relation: "" },
      { id: "s2", segmentIndex: 2, kind: "position", summary: "two", parentId: "s0", relation: "답변" },
      { id: "s3", segmentIndex: 3, kind: "pro", summary: "three", parentId: "s2", relation: "지지" }
    ] }] }
  };
  const state = applyLiveMapEvent(createLiveMapState(), snapshot);

  assert.equal(state.seq, 20);
  assert.deepEqual(toRendererResult(state, 1).topics[0].nodes.map(({ id }) => id), ["s0"]);
  assert.deepEqual(toRendererResult(state, 3).topics[0].nodes.map(({ id }) => id), ["s0", "s2"]);
  const resolvedIds = toRendererResult(state, 4).topics[0].nodes.map(({ id }) => id);
  assert.deepEqual(resolvedIds, ["s0", "s2", "s3"]);
  assert.equal(new Set(resolvedIds).size, resolvedIds.length);
  assert.deepEqual(state.result, snapshot.result);
});

test("end-to-end: reduced live result renders through the real builder + layout, orphan attaches to root", () => {
  const segments = [
    { speaker: "민수", start: 0, end: 3, text: "로그인 API 원인을 확인하겠습니다" },
    { speaker: "지수", start: 3, end: 6, text: "로그인 API 테스트를 추가하겠습니다" },
    { speaker: "현우", start: 6, end: 9, text: "배포 일정이 걱정됩니다" }
  ];

  // Build the live state via the real reducer, then feed the renderer adapter.
  let state = createLiveMapState();
  state = applyLiveMapEvent(state, delta({ seq: 1, type: "topic_started", topic: { id: "t1", label: "로그인" } }));
  state = applyLiveMapEvent(state, delta({ seq: 2, type: "node_added", node: { id: "n0", topicId: "t1", kind: "question", summary: "원인?", segmentIndex: 0 } }));
  state = applyLiveMapEvent(state, delta({ seq: 3, type: "node_added", node: { id: "n1", topicId: "t1", kind: "position", summary: "API 수정", segmentIndex: 1 } }));
  state = applyLiveMapEvent(state, delta({ seq: 4, type: "link_added", link: { nodeId: "n1", parentId: "n0", relation: "answers", relationLabel: "답변" } }));
  // n2 never receives a link -> parentId stays "" -> must reattach to root, not vanish.
  state = applyLiveMapEvent(state, delta({ seq: 5, type: "node_added", node: { id: "n2", topicId: "t1", kind: "con", summary: "일정 우려", segmentIndex: 2 } }));

  const rendered = toRendererResult(state, segments.length);
  const trees = buildDialogueMapTreesFromResult(rendered, segments);
  assert.equal(trees.length, 1);
  const tree = trees[0];
  assert.equal(tree.root.id, "n0");
  assert.equal(tree.children.length, 2);
  // The orphan (n2, parentId "") reattaches to the root.
  const orphan = tree.children.find(({ id }) => id === "n2");
  assert.equal(orphan.parentId, "n0");
  // The linked child keeps the Korean relation label.
  const answered = tree.children.find(({ id }) => id === "n1");
  assert.equal(answered.relation, "답변");

  const layout = buildDialogueMapLayout(trees);
  assert.equal(layout.nodes.length, 3);
  assert.equal(layout.edges.length, 2);
  assert.ok(layout.edges.some((edge) => edge.relation === "답변"));
});

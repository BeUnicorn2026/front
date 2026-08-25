// Pure reducer for the live dialogue-map WebSocket stream.
//
// Consumes the `/api/live` socket's livemap messages and folds them into a
// snapshot shaped exactly like the `result` that
// `buildDialogueMapTreesFromResult` already renders:
//   { topics: [ { id, label, nodes: [ { id, segmentIndex, kind, summary, parentId, relation } ] } ] }
//
// The module is intentionally free of React and side effects so it can be
// unit-tested in isolation. Every reducer path is defensive: a malformed
// message never throws and never mutates the previous state — it is returned
// unchanged so the caller keeps whatever it had.

export function createLiveMapState() {
  return { seq: 0, active: false, finalized: false, result: { topics: [] } };
}

// Alias kept for call-site readability at reset points.
export const resetLiveMapState = createLiveMapState;

function isObject(value) {
  return Boolean(value) && typeof value === "object";
}

function applyDelta(state, delta) {
  if (!isObject(delta)) return state;
  const seq = Number(delta.seq);
  // Drop duplicates and anything that arrived out of order.
  if (!Number.isFinite(seq) || seq <= state.seq) return state;

  const base = { ...state, seq, active: true };

  switch (delta.type) {
    case "topic_started": {
      const topic = delta.topic;
      if (!isObject(topic) || topic.id == null) return base;
      const id = String(topic.id);
      if (base.result.topics.some((existing) => existing.id === id)) return base; // idempotent
      return {
        ...base,
        result: { topics: [...base.result.topics, { id, label: String(topic.label ?? ""), nodes: [] }] }
      };
    }
    case "node_added": {
      const node = delta.node;
      if (!isObject(node) || node.id == null || node.topicId == null) return base;
      const nodeId = String(node.id);
      const topicId = String(node.topicId);
      const topicIndex = base.result.topics.findIndex((topic) => topic.id === topicId);
      if (topicIndex === -1) return base; // unknown topic
      const topic = base.result.topics[topicIndex];
      if (topic.nodes.some((existing) => existing.id === nodeId)) return base; // duplicate node id
      const appended = {
        ...node,
        id: nodeId,
        segmentIndex: Number(node.segmentIndex),
        kind: node.kind,
        summary: node.summary ?? "",
        parentId: "",
        relation: ""
      };
      const topics = base.result.topics.map((current, index) =>
        index === topicIndex ? { ...current, nodes: [...current.nodes, appended] } : current);
      return { ...base, result: { topics } };
    }
    case "link_added": {
      const link = delta.link;
      if (!isObject(link) || link.nodeId == null) return base;
      const nodeId = String(link.nodeId);
      const relation = String(link.relationLabel || link.relation || "");
      const parentId = String(link.parentId ?? "");
      const topics = base.result.topics.map((topic) => {
        if (!topic.nodes.some((node) => node.id === nodeId)) return topic;
        return {
          ...topic,
          nodes: topic.nodes.map((node) => (node.id === nodeId ? { ...node, parentId, relation } : node))
        };
      });
      return { ...base, result: { topics } };
    }
    case "finalized":
      return { ...base, finalized: true };
    default:
      // Unknown delta type: seq/active have advanced, structure is untouched.
      return base;
  }
}

function applyStateSnapshot(state, wsEvent) {
  const result = wsEvent.result;
  if (!isObject(result)) return state;
  const seq = Number(wsEvent.seq);
  return {
    ...state,
    seq: Number.isFinite(seq) ? seq : state.seq,
    active: true,
    result: { topics: Array.isArray(result.topics) ? result.topics : [] }
  };
}

export function applyLiveMapEvent(state, wsEvent) {
  const current = isObject(state) ? state : createLiveMapState();
  try {
    if (!isObject(wsEvent)) return current;
    if (wsEvent.type === "livemap-delta") return applyDelta(current, wsEvent.delta);
    if (wsEvent.type === "livemap-state") return applyStateSnapshot(current, wsEvent);
    return current;
  } catch {
    // Contract: a malformed event must never throw.
    return current;
  }
}

// Adapt the live snapshot into the `result` shape the renderer consumes.
// The server can reference transcript segments that have not reached the client
// yet. Keep those nodes in liveState, but omit them from this derived view until
// their exact segment exists. Clamping would make several pending nodes collide
// on the last visible segment, and the renderer would then discard all but one.
export function toRendererResult(liveState, segmentCount) {
  const topics = Array.isArray(liveState?.result?.topics) ? liveState.result.topics : [];
  const count = Number(segmentCount);
  const visibleCount = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return {
    topics: topics.map((topic) => ({
      ...topic,
      nodes: (Array.isArray(topic?.nodes) ? topic.nodes : []).filter((node) => {
        const segmentIndex = Number(node?.segmentIndex);
        return Number.isInteger(segmentIndex) && segmentIndex >= 0 && segmentIndex < visibleCount;
      })
    }))
  };
}

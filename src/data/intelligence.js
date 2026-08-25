import { actionDueFromEvidence, actionOwnerFromEvidence } from "./action-evidence.js";

export const ROLE_OPTIONS = ["기획", "개발", "디자인", "마케팅", "영업", "운영"];

const STOP_WORDS = new Set([
  "그리고", "하지만", "그래서", "그러면", "오늘", "내일", "이번", "저희", "제가", "우리", "이제",
  "대한", "위한", "있는", "없는", "하는", "해서", "하면", "것을", "것이", "수", "좀", "더", "그", "이", "저"
]);

function wordsIn(text) {
  return String(text || "")
    .replace(/[^0-9A-Za-z가-힣]+/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

export function extractKeywords(segments, limit = 3) {
  const counts = new Map();
  for (const segment of segments) {
    for (const word of wordsIn(segment.text)) counts.set(word, (counts.get(word) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || right[0].length - left[0].length)
    .slice(0, limit)
    .map(([word]) => word);
}

export function buildStructureBlocks(segments) {
  const blocks = [];
  for (const segment of segments) {
    const previous = blocks.at(-1);
    const segmentWords = new Set(wordsIn(segment.text));
    const previousWords = previous ? new Set(previous.keywords) : new Set();
    const overlap = [...segmentWords].some((word) => previousWords.has(word));
    const gap = previous ? Number(segment.start) - Number(previous.end) : 0;
    const startsNewBlock = !previous || gap > 12 || (previous.segments.length >= 3 && !overlap);

    if (startsNewBlock) {
      blocks.push({
        id: `block-${blocks.length}-${segment.start}`,
        start: Number(segment.start) || 0,
        end: Number(segment.end) || Number(segment.start) || 0,
        segments: [segment],
        keywords: wordsIn(segment.text)
      });
    } else {
      previous.segments.push(segment);
      previous.end = Number(segment.end) || previous.end;
      previous.keywords = extractKeywords(previous.segments, 8);
    }
  }

  return blocks.map((block, index) => {
    const keywords = extractKeywords(block.segments, 3);
    return {
      ...block,
      index,
      keywords,
      label: keywords.length ? keywords.join(" · ") : `대화 구간 ${index + 1}`,
      speakers: [...new Set(block.segments.map(({ speaker }) => speaker))]
    };
  });
}

export function matchingTerms(text, catalog = []) {
  const normalized = String(text || "").toLocaleLowerCase();
  return catalog.filter(({ term, aliases = [] }) =>
    [term, ...aliases].some((candidate) => normalized.includes(String(candidate).toLocaleLowerCase()))
  );
}

export function buildMeetingStructure(segments) {
  if (!segments.length) return [{ id: "waiting", label: "첫 발화를 기다리는 중" }];
  const blocks = buildStructureBlocks(segments);
  return [{
    id: "meeting",
    label: `회의 구조 · ${segments.length}개 발화`,
    isExpanded: true,
    children: blocks.map((block) => ({
      id: block.id,
      label: `${formatTime(block.start)} · ${block.label}`,
      isExpanded: true,
      children: block.segments.map((segment, index) => ({
        id: `${block.id}-${index}-${segment.start}`,
        label: `${segment.speaker} · ${segment.text.length > 42 ? `${segment.text.slice(0, 42)}…` : segment.text}`
      }))
    }))
  }];
}

export function buildAnalyzedStructure(intelligence, segments) {
  const sourceSegments = Array.isArray(segments) ? segments : [];
  const blocks = (Array.isArray(intelligence?.topics) ? intelligence.topics : []).map((topic, topicIndex) => {
    const segmentIndexes = [...new Set((Array.isArray(topic?.segmentIndexes) ? topic.segmentIndexes : [])
      .map(Number).filter((index) => Number.isInteger(index) && index >= 0 && index < sourceSegments.length))];
    const evidence = segmentIndexes.map((index) => sourceSegments[index]).filter(Boolean);
    if (!evidence.length) return null;
    const keywords = (Array.isArray(topic?.subtopics) ? topic.subtopics : [])
      .map((value) => String(value || "").trim()).filter(Boolean).slice(0, 8);
    const label = String(topic?.label || "").trim() || extractKeywords(evidence, 3).join(" · ") || `대화 구간 ${topicIndex + 1}`;
    return {
      id: String(topic?.id || `topic-${segmentIndexes[0]}`),
      index: topicIndex,
      label,
      summary: String(topic?.summary || "").trim(),
      start: Math.min(...evidence.map(({ start }) => Math.max(0, Number(start) || 0))),
      end: Math.max(...evidence.map(({ end, start }) => Math.max(0, Number(end) || Number(start) || 0))),
      segmentIndexes,
      segments: evidence,
      keywords,
      speakers: [...new Set(evidence.map(({ speaker }) => String(speaker || "미등록 화자")))]
    };
  }).filter(Boolean);
  if (!blocks.length) return { blocks: [], tree: [] };
  const title = String(intelligence?.title || "").trim() || "회의 구조";
  return {
    blocks,
    tree: [{
      id: "meeting-intelligence",
      label: title,
      isExpanded: true,
      children: blocks.map((block) => ({
        id: block.id,
        label: `${formatTime(block.start)} · ${block.label}`,
        isExpanded: true,
        children: [
          ...block.keywords.map((keyword, index) => ({
            id: `${block.id}-keyword-${index}`,
            label: `핵심 · ${keyword}`
          })),
          ...block.segments.map((segment, index) => ({
            id: `${block.id}-segment-${block.segmentIndexes[index]}`,
            label: `${segment.speaker || "미등록 화자"} · ${segment.text || ""}`
          }))
        ]
      }))
    }]
  };
}

export function wrapMindMapLabel(label, maximumCharacters = 18) {
  const normalized = String(label || "").replace(/\s+/g, " ").trim();
  if (!normalized) return ["이름 없는 주제"];
  if (normalized.length <= maximumCharacters) return [normalized];

  const firstWindow = normalized.slice(0, maximumCharacters + 1);
  const wordBoundary = firstWindow.lastIndexOf(" ");
  const breakAt = wordBoundary >= Math.floor(maximumCharacters / 2) ? wordBoundary : maximumCharacters;
  const firstLine = normalized.slice(0, breakAt).trim();
  const remainder = normalized.slice(breakAt).trim();
  if (remainder.length <= maximumCharacters) return [firstLine, remainder];
  return [firstLine, `${remainder.slice(0, maximumCharacters - 1).trimEnd()}…`];
}

export function buildMindMapLayout(blocks, selectedId, { maximumVisible = 18 } = {}) {
  const source = Array.isArray(blocks) ? blocks : [];
  const visibleLimit = Math.max(4, Math.min(20, Math.floor(Number(maximumVisible) || 18)));
  const selectedIndex = Math.max(0, source.findIndex(({ id }) => id === selectedId));
  const windowStart = Math.max(0, Math.min(
    selectedIndex - Math.floor(visibleLimit / 2),
    Math.max(0, source.length - visibleLimit)
  ));
  const visible = source.slice(windowStart, windowStart + visibleLimit);
  const width = 1000;
  const nodeWidth = 230;
  const nodeHeight = 64;
  const rowPitch = 80;
  const rows = Math.ceil(visible.length / 2);
  const height = Math.max(480, 112 + Math.max(0, rows - 1) * rowPitch);
  const centerX = width / 2;
  const centerY = height / 2;
  const nodes = visible.map((block, localIndex) => ({
    ...block,
    globalIndex: windowStart + localIndex,
    side: localIndex % 2 === 0 ? "left" : "right",
    x: localIndex % 2 === 0 ? 145 : 855,
    y: 56 + Math.floor(localIndex / 2) * rowPitch,
    labelLines: wrapMindMapLabel(block.label)
  }));

  return {
    centerX,
    centerY,
    height,
    nodeHeight,
    nodeWidth,
    nodes,
    selectedIndex,
    width,
    windowStart
  };
}

export function buildStructureDiagramLayout(blocks) {
  const source = Array.isArray(blocks) ? blocks : [];
  const width = 1000;
  const nodeWidth = 260;
  const nodeHeight = 100;
  const columns = 3;
  const columnCenters = [160, 500, 840];
  const firstRowY = 190;
  const rowPitch = 140;
  const nodes = source.map((block, index) => {
    const row = Math.floor(index / columns);
    const offset = index % columns;
    const column = row % 2 === 0 ? offset : columns - 1 - offset;
    return {
      ...block,
      index,
      row,
      column,
      x: columnCenters[column],
      y: firstRowY + row * rowPitch,
      labelLines: wrapMindMapLabel(block.label, 22)
    };
  });
  const edges = nodes.map((node, index) => {
    if (index === 0) {
      return {
        id: `entry-${node.id}`,
        path: `M ${width / 2} 104 C ${width / 2} 140, ${node.x} 140, ${node.x} ${node.y - nodeHeight / 2}`
      };
    }
    const previous = nodes[index - 1];
    if (previous.row === node.row) {
      const direction = Math.sign(node.x - previous.x);
      return {
        id: `${previous.id}-${node.id}`,
        path: `M ${previous.x + direction * nodeWidth / 2} ${previous.y} L ${node.x - direction * nodeWidth / 2} ${node.y}`
      };
    }
    return {
      id: `${previous.id}-${node.id}`,
      path: `M ${previous.x} ${previous.y + nodeHeight / 2} L ${node.x} ${node.y - nodeHeight / 2}`
    };
  });
  const rows = Math.ceil(nodes.length / columns);
  return {
    columns,
    edges,
    height: Math.max(360, firstRowY + Math.max(0, rows - 1) * rowPitch + nodeHeight / 2 + 54),
    nodeHeight,
    nodeWidth,
    nodes,
    width
  };
}

export function dialogueNodeKind(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (/[?？]$/.test(normalized) || /(?:어떻게|왜|무엇|어떤|할까요|인가요|맞나요|필요할까요)/.test(normalized)) return "question";
  if (/(?:우려|문제|위험|반대|어렵|불편|부족|실패|안 됩|없습)/.test(normalized)) return "con";
  if (/(?:장점|좋|찬성|효율|가능|도움|개선|유지|지원)/.test(normalized)) return "pro";
  return "position";
}

export function summarizeDialogueNode(text, maximumWords = 6) {
  const words = String(text || "")
    .replace(/[.!?。！？,，]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  return words.slice(0, Math.max(1, Math.min(6, Number(maximumWords) || 6))).join(" ");
}

function isDialogueMappable(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length < 3) return false;
  return !/^(?:네|예|아니요|맞아요|그렇군요|감사합니다|안녕하세요|음|어|아)$/.test(normalized);
}

export function segmentDialogueTopics(segments) {
  const source = (Array.isArray(segments) ? segments : []).filter(({ text }) => String(text || "").trim());
  const topics = [];
  for (const [sourceIndex, segment] of source.entries()) {
    const previousSegment = source[sourceIndex - 1];
    const currentTopic = topics.at(-1);
    const currentWords = new Set(wordsIn(segment.text));
    const previousWords = new Set(wordsIn(previousSegment?.text));
    const hasOverlap = [...currentWords].some((word) => previousWords.has(word));
    const gap = previousSegment ? Math.max(0, Number(segment.start) - Number(previousSegment.end)) : Infinity;
    const currentKind = dialogueNodeKind(segment.text);
    const previousKind = previousSegment ? dialogueNodeKind(previousSegment.text) : null;
    const continuesPrevious = Boolean(currentTopic && previousSegment && gap <= 12 && (
      hasOverlap
      || currentKind === "pro"
      || currentKind === "con"
      || (previousKind === "question" && currentKind === "position")
      || (currentTopic.segments.length < 3 && gap <= 4)
    ));

    if (!continuesPrevious) {
      topics.push({
        id: `dialogue-topic-${topics.length}-${Number(segment.start) || 0}`,
        index: topics.length,
        start: Number(segment.start) || 0,
        end: Number(segment.end) || Number(segment.start) || 0,
        segments: [segment]
      });
    } else {
      currentTopic.segments.push(segment);
      currentTopic.end = Number(segment.end) || currentTopic.end;
    }
  }
  return topics;
}

function identifyDialogueLinks(nodes) {
  const links = [];
  const root = nodes[0];
  let latestQuestion = root?.kind === "question" ? root : null;
  let latestPosition = root?.kind === "position" ? root : null;

  for (const node of nodes.slice(1)) {
    let parent = root;
    let relation = "연결";
    if (node.kind === "question") {
      parent = latestPosition || root;
      relation = "질문 확장";
      latestQuestion = node;
      latestPosition = null;
    } else if (node.kind === "position") {
      parent = latestQuestion || root;
      relation = "답변";
      latestPosition = node;
    } else if (node.kind === "pro") {
      parent = latestPosition || latestQuestion || root;
      relation = "지지";
    } else if (node.kind === "con") {
      parent = latestPosition || latestQuestion || root;
      relation = "우려";
    }
    links.push({ id: `${node.id}-${parent.id}`, from: node.id, to: parent.id, relation });
  }
  return links;
}

export function buildDialogueMapTrees(segments, { maximumNodes = 7 } = {}) {
  const nodeLimit = Math.max(3, Math.min(10, Math.floor(Number(maximumNodes) || 7)));
  return segmentDialogueTopics(segments).map((topic) => {
    const nodes = topic.segments
      .filter(({ text }) => isDialogueMappable(text))
      .slice(-nodeLimit)
      .map((segment, segmentIndex) => ({
        id: segment.id || `${topic.id}-segment-${segmentIndex}-${segment.start}`,
        kind: dialogueNodeKind(segment.text),
        label: summarizeDialogueNode(segment.text),
        meta: `${segment.speaker || "화자"} · ${formatTime(segment.start)}`,
        pending: Boolean(segment.pending)
      }));
    if (!nodes.length) return null;
    const links = identifyDialogueLinks(nodes);
    const parentByNode = new Map(links.map((link) => [link.from, link]));
    return {
      id: topic.id,
      index: topic.index,
      label: nodes[0].label,
      root: { ...nodes[0], topicIndex: topic.index },
      children: nodes.slice(1).map((node) => ({
        ...node,
        parentId: parentByNode.get(node.id)?.to,
        relation: parentByNode.get(node.id)?.relation
      })),
      links
    };
  }).filter(Boolean);
}

export function buildDialogueMapTreesFromResult(result, segments) {
  const sourceSegments = Array.isArray(segments) ? segments : [];
  return (Array.isArray(result?.topics) ? result.topics : []).map((topic, topicIndex) => {
    const used = new Set();
    const nodes = (Array.isArray(topic?.nodes) ? topic.nodes : []).map((node, nodeIndex) => {
      const segmentIndex = Number(node?.segmentIndex);
      const segment = sourceSegments[segmentIndex];
      const id = String(node?.id || `ai-topic-${topicIndex}-node-${nodeIndex}`);
      if (!segment || used.has(segmentIndex) || !["question", "position", "pro", "con"].includes(node?.kind)) return null;
      used.add(segmentIndex);
      return {
        id,
        kind: node.kind,
        label: summarizeDialogueNode(node.summary || segment.text),
        meta: `${segment.speaker || "화자"} · ${formatTime(segment.start)}`,
        pending: false,
        parentId: nodeIndex ? String(node.parentId || "") : undefined,
        relation: nodeIndex ? String(node.relation || "연결") : undefined
      };
    }).filter(Boolean);
    if (!nodes.length) return null;
    const known = new Set(nodes.map(({ id }) => id));
    const root = nodes[0];
    const children = nodes.slice(1).map((node) => ({ ...node, parentId: known.has(node.parentId) ? node.parentId : root.id }));
    return {
      id: String(topic?.id || `ai-topic-${topicIndex}`),
      index: topicIndex,
      label: String(topic?.label || root.label),
      root: { ...root, topicIndex },
      children,
      links: children.map((node) => ({ id: `${node.id}-${node.parentId}`, from: node.id, to: node.parentId, relation: node.relation }))
    };
  }).filter(Boolean);
}

export function buildDialogueMapLayout(trees) {
  const source = Array.isArray(trees) ? trees : [];
  const width = 560;
  const nodeWidth = 160;
  const nodeHeight = 72;
  const levelX = [16, 200, 384];
  const rowGap = 12;
  const groupGap = 40;
  let cursorY = 24;
  const nodes = [];
  const edges = [];

  for (const tree of source) {
    const treeNodes = [tree.root, ...tree.children];
    const levelById = new Map([[tree.root.id, 0]]);
    for (const node of tree.children) {
      levelById.set(node.id, Math.min(2, (levelById.get(node.parentId) ?? 0) + 1));
    }
    const levels = [0, 1, 2].map((level) => treeNodes.filter((node) => levelById.get(node.id) === level));
    const maximumRows = Math.max(1, ...levels.map((levelNodes) => levelNodes.length));
    const groupHeight = maximumRows * nodeHeight + Math.max(0, maximumRows - 1) * rowGap;
    const positioned = new Map();

    levels.forEach((levelNodes, level) => {
      const levelHeight = levelNodes.length * nodeHeight + Math.max(0, levelNodes.length - 1) * rowGap;
      const levelStartY = cursorY + (groupHeight - levelHeight) / 2;
      levelNodes.forEach((node, nodeIndex) => {
        const positionedNode = {
          ...node,
          topicIndex: tree.index,
          level,
          x: levelX[level],
          y: levelStartY + nodeIndex * (nodeHeight + rowGap),
          width: nodeWidth,
          height: nodeHeight,
          labelLines: wrapMindMapLabel(node.label, 11)
        };
        nodes.push(positionedNode);
        positioned.set(node.id, positionedNode);
      });
    });

    tree.links.forEach((link) => {
      const child = positioned.get(link.from);
      const parent = positioned.get(link.to);
      if (!child || !parent) return;
      const startX = parent.x + parent.width;
      const startY = parent.y + parent.height / 2;
      const endX = child.x;
      const endY = child.y + child.height / 2;
      const middleX = startX + (endX - startX) / 2;
      edges.push({
        ...link,
        path: `M ${startX} ${startY} H ${middleX} V ${endY} H ${endX}`,
        labelX: middleX,
        labelY: Math.min(startY, endY) + Math.abs(endY - startY) / 2
      });
    });

    cursorY += groupHeight + groupGap;
  }

  return {
    edges,
    height: Math.max(280, cursorY - groupGap + 24),
    nodeHeight,
    nodes,
    width
  };
}

export function deriveTerms(segments, knownTerms = [], catalog = []) {
  const known = new Set(knownTerms.map((term) => term.toLocaleLowerCase()));
  const found = new Map();
  for (const segment of segments) {
    for (const term of matchingTerms(segment.text, catalog)) {
      if (!found.has(term.term)) {
        found.set(term.term, {
          ...term,
          isKnown: term.isKnown ?? known.has(term.term.toLocaleLowerCase()),
          firstSeenAt: segment.start,
          speaker: segment.speaker
        });
      }
    }
  }
  return [...found.values()];
}

export function deriveActions(segments) {
  const actionPattern = /(오늘|내일|까지|담당|문서화|확인해|할게요|해주세요|합시다)/;
  return segments.filter(({ text }) => actionPattern.test(text)).map((segment, index) => ({
    id: `action-${index}-${segment.start}`,
    owner: actionOwnerFromEvidence(segment.text, segment.speaker),
    text: segment.text,
    due: actionDueFromEvidence(segment.text)
  }));
}

export function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function meetingStatusPresentation(status) {
  if (status === "completed") return { label: "완료", color: "green" };
  if (status === "interrupted") return { label: "중단 · 기록 보존", color: "yellow" };
  return { label: "기록 중", color: "yellow" };
}

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
  return "idea";
}

export function buildDialogueMapTrees(segments, { maximumChildren = 4 } = {}) {
  const childLimit = Math.max(2, Math.min(6, Math.floor(Number(maximumChildren) || 4)));
  return buildStructureBlocks(segments).map((block, topicIndex) => {
    const firstStatement = String(block.segments[0]?.text || "").replace(/[.!?。！？]+$/g, "").trim();
    const topicLabel = firstStatement.split(/\s+/).slice(0, 6).join(" ") || block.label;
    return {
      id: block.id,
      index: topicIndex,
      root: {
        id: `${block.id}-root`,
        kind: "topic",
        label: topicLabel,
        meta: `${formatTime(block.start)} · 주제 ${topicIndex + 1}`
      },
      children: block.segments.slice(-childLimit).map((segment, segmentIndex) => ({
        id: segment.id || `${block.id}-segment-${segmentIndex}-${segment.start}`,
        kind: dialogueNodeKind(segment.text),
        label: String(segment.text || "발화 내용 없음").trim(),
        meta: `${segment.speaker || "화자"} · ${formatTime(segment.start)}`,
        pending: Boolean(segment.pending)
      }))
    };
  });
}

export function buildDialogueMapLayout(trees) {
  const source = Array.isArray(trees) ? trees : [];
  const width = 560;
  const rootWidth = 190;
  const nodeWidth = 230;
  const nodeHeight = 72;
  const rootX = 20;
  const nodeX = 310;
  const edgeX = 260;
  const rowGap = 12;
  const groupGap = 40;
  let cursorY = 24;
  const nodes = [];
  const edges = [];

  for (const tree of source) {
    const childCount = Math.max(1, tree.children.length);
    const childrenHeight = childCount * nodeHeight + Math.max(0, childCount - 1) * rowGap;
    const groupHeight = Math.max(nodeHeight, childrenHeight);
    const rootY = cursorY + (groupHeight - nodeHeight) / 2;
    nodes.push({
      ...tree.root,
      topicIndex: tree.index,
      level: 1,
      x: rootX,
      y: rootY,
      width: rootWidth,
      height: nodeHeight,
      labelLines: wrapMindMapLabel(tree.root.label, 13)
    });

    tree.children.forEach((child, childIndex) => {
      const childY = cursorY + childIndex * (nodeHeight + rowGap);
      nodes.push({
        ...child,
        topicIndex: tree.index,
        level: 2,
        x: nodeX,
        y: childY,
        width: nodeWidth,
        height: nodeHeight,
        labelLines: wrapMindMapLabel(child.label, 17)
      });
      const rootCenterY = rootY + nodeHeight / 2;
      const childCenterY = childY + nodeHeight / 2;
      edges.push({
        id: `${tree.root.id}-${child.id}`,
        path: `M ${rootX + rootWidth} ${rootCenterY} H ${edgeX} V ${childCenterY} H ${nodeX}`
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

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

export function deriveTerms(segments, knownTerms = [], catalog = []) {
  const known = new Set(knownTerms.map((term) => term.toLocaleLowerCase()));
  const found = new Map();
  for (const segment of segments) {
    for (const term of matchingTerms(segment.text, catalog)) {
      if (!found.has(term.term)) {
        found.set(term.term, {
          ...term,
          isKnown: known.has(term.term.toLocaleLowerCase()),
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

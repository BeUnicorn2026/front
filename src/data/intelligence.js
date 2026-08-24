import { actionDueFromEvidence, actionOwnerFromEvidence } from "./action-evidence.js";

export const ROLE_OPTIONS = ["기획", "개발", "디자인", "마케팅", "영업", "운영"];

export const TERM_CATALOG = [
  {
    term: "다이어리제이션",
    aliases: ["diarization", "화자 분리"],
    definition: "한 오디오 안에서 화자가 바뀌는 지점을 찾고, 발화를 화자별로 묶는 처리입니다.",
    roleHints: {
      기획: "회의록에서 ‘누가 말했는지’를 자동으로 붙여 주는 기능이라고 보면 됩니다.",
      개발: "VAD 구간과 화자 임베딩을 시간축으로 결합해 speaker label을 할당합니다.",
      디자인: "화자 색상만으로 구분하지 말고 이름·아바타·순서를 함께 제공해야 합니다."
    },
    inOrganizationGlossary: true
  },
  {
    term: "VAD",
    aliases: ["음성 활동 감지", "vad"],
    definition: "오디오에서 실제 말소리가 시작되고 끝나는 구간을 찾는 기술입니다.",
    roleHints: {
      기획: "침묵을 잘라 응답 속도와 비용을 줄이는 장치입니다.",
      개발: "Voice Activity Detection의 약자이며 endpointing과 함께 발화 경계를 만듭니다.",
      디자인: "말 시작·대기·처리 중 상태를 UI에 자연스럽게 연결하는 신호로 쓸 수 있습니다."
    },
    inOrganizationGlossary: true
  },
  {
    term: "임베딩",
    aliases: ["embedding", "화자 벡터"],
    definition: "목소리의 특징을 숫자 벡터로 바꿔 다른 음성과 유사도를 비교할 수 있게 한 표현입니다.",
    roleHints: {
      기획: "등록 목소리와 현재 발화가 같은 사람인지 비교하기 위한 ‘목소리 지문’에 가깝습니다.",
      개발: "WavLM 출력 벡터의 cosine similarity와 후보 간 margin으로 등록 화자를 판정합니다.",
      디자인: "정확도는 확률이므로 확정·추정·미등록 상태를 서로 다르게 보여줘야 합니다."
    },
    inOrganizationGlossary: false
  },
  {
    term: "엔드포인팅",
    aliases: ["endpointing", "발화 끝 감지"],
    definition: "침묵 길이를 바탕으로 한 사람의 발화가 끝났다고 판단하는 규칙입니다.",
    roleHints: {
      기획: "값이 짧으면 빠르지만 말을 끊을 수 있고, 길면 자연스럽지만 결과가 늦게 나타납니다.",
      개발: "스트리밍 STT의 endpointing 밀리초와 interim/final 결과 전환을 함께 조정합니다."
    },
    inOrganizationGlossary: false
  },
  {
    term: "롤백",
    aliases: ["rollback"],
    definition: "배포나 변경 사항을 문제가 생기기 전의 안정적인 버전으로 되돌리는 작업입니다.",
    roleHints: {
      기획: "문제 발생 시 서비스를 이전 상태로 되돌리는 비상 계획입니다.",
      개발: "배포 아티팩트와 데이터 마이그레이션의 역방향 경로를 함께 준비해야 합니다.",
      운영: "실행 기준, 담당자, 예상 복구 시간을 미리 합의해야 합니다."
    },
    inOrganizationGlossary: true
  }
];

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

export function matchingTerms(text) {
  const normalized = String(text || "").toLocaleLowerCase();
  return TERM_CATALOG.filter(({ term, aliases }) =>
    [term, ...aliases].some((candidate) => normalized.includes(candidate.toLocaleLowerCase()))
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

export function deriveTerms(segments, knownTerms = []) {
  const known = new Set(knownTerms.map((term) => term.toLocaleLowerCase()));
  const found = new Map();
  for (const segment of segments) {
    for (const term of matchingTerms(segment.text)) {
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

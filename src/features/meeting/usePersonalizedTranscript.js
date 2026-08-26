import { useEffect, useMemo, useRef, useState } from "react";
import { postJson } from "../../api.js";

const BATCH_SIZE = 12;

export function segmentTranslationSequence(segment, index) {
  if (segment?.sequence == null || segment.sequence === "") return index;
  const sequence = Number(segment?.sequence);
  return Number.isSafeInteger(sequence) && sequence >= 0 ? sequence : index;
}

export function pendingTranslationSegments(segments, translations, limit = BATCH_SIZE) {
  const pending = [];
  for (const [index, segment] of (Array.isArray(segments) ? segments : []).entries()) {
    if (segment?.pending || !String(segment?.text || "").trim()) continue;
    const sequence = segmentTranslationSequence(segment, index);
    const current = translations?.[sequence];
    if (current?.originalText === segment.text && ["loading", "ready", "error"].includes(current.status)) continue;
    pending.push({ sequence, text: segment.text });
    if (pending.length >= limit) break;
  }
  return pending;
}

export function usePersonalizedTranscript({ meetingId, segments, introduction, enabled = true }) {
  const [translations, setTranslations] = useState({});
  const translationsRef = useRef({});
  const requestInFlightRef = useRef(false);
  const scopeRef = useRef("");
  const mountedRef = useRef(true);
  const [revision, setRevision] = useState(0);
  const scope = `${meetingId || ""}:${introduction || ""}`;
  const segmentSignature = useMemo(() => (Array.isArray(segments) ? segments : [])
    .map((segment, index) => segment?.pending ? "" : `${segmentTranslationSequence(segment, index)}:${segment?.text || ""}`)
    .join("\u001f"), [segments]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    scopeRef.current = scope;
    requestInFlightRef.current = false;
    translationsRef.current = {};
    setTranslations({});
    setRevision(0);
  }, [scope]);

  useEffect(() => {
    if (!enabled || !meetingId || scopeRef.current !== scope || requestInFlightRef.current) return undefined;
    const batch = pendingTranslationSegments(segments, translationsRef.current);
    if (!batch.length) return undefined;
    const requestedScope = scope;
    requestInFlightRef.current = true;
    const loading = { ...translationsRef.current };
    for (const item of batch) loading[item.sequence] = {
      status: "loading",
      originalText: item.text,
      personalizedText: ""
    };
    translationsRef.current = loading;
    setTranslations(loading);

    window.setTimeout(async () => {
      try {
        const result = await postJson("/api/transcript/translations", {
          meetingId,
          segmentSequences: batch.map(({ sequence }) => sequence)
        });
        if (!mountedRef.current || scopeRef.current !== requestedScope) return;
        const returned = new Map((result?.translations || [])
          .map((translation) => [Number(translation.segmentSequence), translation]));
        const next = { ...translationsRef.current };
        for (const item of batch) {
          const translated = returned.get(item.sequence);
          next[item.sequence] = translated ? {
            ...translated,
            status: "ready"
          } : {
            status: "error",
            originalText: item.text,
            personalizedText: ""
          };
        }
        translationsRef.current = next;
        setTranslations(next);
      } catch {
        if (!mountedRef.current || scopeRef.current !== requestedScope) return;
        const next = { ...translationsRef.current };
        for (const item of batch) next[item.sequence] = {
          status: "error",
          originalText: item.text,
          personalizedText: ""
        };
        translationsRef.current = next;
        setTranslations(next);
      } finally {
        if (mountedRef.current && scopeRef.current === requestedScope) {
          requestInFlightRef.current = false;
          setRevision((current) => current + 1);
        }
      }
    }, 350);
    return undefined;
  }, [enabled, meetingId, revision, scope, segmentSignature, segments]);

  return translations;
}

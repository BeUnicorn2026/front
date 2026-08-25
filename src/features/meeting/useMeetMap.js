import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, postJson } from "../../api";

const POLL_INTERVAL_MS = 1200;
const MAXIMUM_POLLS = 75;

export function useMeetMap(segments, meetingId, preferCached = false) {
  const [state, setState] = useState({ result: null, pending: false });
  const lastSubmittedRef = useRef("");
  const stableSegments = useMemo(() => (Array.isArray(segments) ? segments : [])
    .filter(({ text, pending }) => String(text || "").trim() && !pending)
    .map(({ id, speaker, start, end, text }) => ({ id, speaker, start, end, text })), [segments]);
  const signature = useMemo(() => JSON.stringify(stableSegments), [stableSegments]);

  useEffect(() => {
    if (stableSegments.length < 2 || signature === lastSubmittedRef.current) return undefined;
    let cancelled = false;
    let pollTimer;
    const submitTimer = window.setTimeout(async () => {
      lastSubmittedRef.current = signature;
      setState((current) => ({ ...current, pending: true }));
      try {
        if (meetingId && preferCached) {
          const { meetMap: cached } = await apiRequest(`/api/meetings/${meetingId}/meetmap`);
          if (cached) {
            if (!cancelled) setState({ result: cached, pending: false });
            return;
          }
        }
        const { job } = await postJson("/api/meetmap/jobs", { meetingId: meetingId || "", segments: stableSegments });
        let polls = 0;
        const poll = async () => {
          if (cancelled) return;
          const { job: currentJob } = await apiRequest(`/api/meetmap/jobs/${job.id}`);
          if (currentJob.status === "succeeded") {
            setState({ result: currentJob.result, pending: false });
            return;
          }
          if (currentJob.status === "failed" || polls >= MAXIMUM_POLLS) {
            setState((current) => ({ ...current, pending: false }));
            return;
          }
          polls += 1;
          pollTimer = window.setTimeout(() => poll().catch(() => setState((current) => ({ ...current, pending: false }))), POLL_INTERVAL_MS);
        };
        await poll();
      } catch {
        if (!cancelled) setState((current) => ({ ...current, pending: false }));
      }
    }, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(submitTimer);
      window.clearTimeout(pollTimer);
    };
  }, [meetingId, preferCached, signature, stableSegments]);

  return state;
}

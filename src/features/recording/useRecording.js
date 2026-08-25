import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest, patchJson, postJson, websocketUrl } from "../../api.js";

export function mergeSegments(committed, incoming) {
  const next = committed.map((segment) => ({ ...segment }));
  for (const segment of incoming) {
    if (segment.known && segment.sourceSpeaker != null) {
      for (const previousSegment of next) {
        if (previousSegment.sourceSpeaker === segment.sourceSpeaker && !previousSegment.known) {
          previousSegment.speaker = segment.speaker;
          previousSegment.known = true;
          previousSegment.confidence = segment.confidence;
          previousSegment.corrected = Boolean(segment.corrected);
        }
      }
    }
    const previous = next.at(-1);
    const sameCluster = previous?.sourceSpeaker == null || segment.sourceSpeaker == null
      || previous.sourceSpeaker === segment.sourceSpeaker;
    if (previous && previous.speaker === segment.speaker && sameCluster && Number(segment.start) - Number(previous.end) < 1.25) {
      const previousTextLength = previous.text.length;
      const incomingTextLength = segment.text.length;
      previous.text = `${previous.text} ${segment.text}`;
      previous.end = segment.end;
      if (segment.corrected) {
        previous.corrected = true;
        previous.confidence = null;
      } else if (!previous.corrected) {
        previous.confidence = Math.max(previous.confidence ?? 0, segment.confidence ?? 0) || null;
      }
      if (previous.transcriptCorrected || segment.transcriptCorrected) {
        previous.transcriptCorrected = true;
        previous.transcriptConfidence = null;
      } else if (previous.transcriptConfidence != null || segment.transcriptConfidence != null) {
        const previousWeight = previous.transcriptConfidence == null ? 0 : previousTextLength;
        const incomingWeight = segment.transcriptConfidence == null ? 0 : incomingTextLength;
        previous.transcriptConfidence = (
          (previous.transcriptConfidence || 0) * previousWeight
          + (segment.transcriptConfidence || 0) * incomingWeight
        ) / (previousWeight + incomingWeight);
      }
    } else {
      next.push({ ...segment });
    }
  }
  return next;
}

export function correctTranscriptSegment(segments, target, text) {
  const correctedText = String(text || "").trim();
  if (!correctedText) return segments;
  let changed = false;
  return segments.map((segment) => {
    const matches = !changed && (target?.id
      ? segment.id === target.id
      : segment.start === target?.start && segment.end === target?.end && segment.text === target?.text);
    if (!matches) return segment;
    changed = true;
    return { ...segment, text: correctedText, transcriptCorrected: true, transcriptConfidence: null };
  });
}

export function applyManualTranscriptCorrections(finalSegments, corrections) {
  const entries = Array.isArray(corrections) ? corrections : [];
  if (!entries.length) return finalSegments;
  const assignments = new Map();
  for (const correction of entries) {
    const correctionStart = Number(correction.start) || 0;
    const correctionEnd = Math.max(correctionStart, Number(correction.end) || correctionStart);
    const correctionDuration = Math.max(0.1, correctionEnd - correctionStart);
    const best = finalSegments.map((segment, index) => {
      const segmentStart = Number(segment.start) || 0;
      const segmentEnd = Math.max(segmentStart, Number(segment.end) || segmentStart);
      const segmentDuration = Math.max(0.1, segmentEnd - segmentStart);
      const overlap = Math.max(0, Math.min(segmentEnd, correctionEnd) - Math.max(segmentStart, correctionStart));
      return { index, overlap, coverage: overlap / Math.min(segmentDuration, correctionDuration) };
    }).sort((left, right) => right.overlap - left.overlap)[0];
    if (!best || best.coverage < 0.6) continue;
    const assigned = assignments.get(best.index) || [];
    assigned.push({ ...correction, start: correctionStart });
    assignments.set(best.index, assigned);
  }
  return finalSegments.map((segment, index) => {
    const assigned = assignments.get(index);
    if (!assigned?.length) return segment;
    const text = assigned.sort((left, right) => left.start - right.start)
      .map(({ text: correctionText }) => String(correctionText || "").trim()).filter(Boolean).join(" ");
    return text ? { ...segment, text, transcriptCorrected: true, transcriptConfidence: null } : segment;
  });
}

export function correctSpeakerCluster(segments, target, speakerName, registered = true) {
  const sourceSpeaker = target?.sourceSpeaker == null ? null : String(target.sourceSpeaker);
  return segments.map((segment) => {
    const matches = sourceSpeaker != null
      ? String(segment.sourceSpeaker) === sourceSpeaker
      : target?.id ? segment.id === target.id : segment.start === target?.start && segment.speaker === target?.speaker;
    if (!matches) return segment;
    return {
      ...segment,
      speaker: speakerName,
      known: registered,
      confidence: null,
      corrected: registered
    };
  });
}

export function applyManualSpeakerCorrections(finalSegments, liveSegments, corrections) {
  const correctionMap = corrections instanceof Map ? corrections : new Map(Object.entries(corrections || {}));
  if (!correctionMap.size) return finalSegments;
  return finalSegments.map((segment) => {
    const start = Number(segment.start) || 0;
    const end = Math.max(start, Number(segment.end) || start);
    const duration = Math.max(0.1, end - start);
    const overlaps = new Map();
    for (const live of liveSegments) {
      const name = correctionMap.get(String(live.sourceSpeaker));
      if (!name) continue;
      const overlap = Math.max(0, Math.min(end, Number(live.end) || 0) - Math.max(start, Number(live.start) || 0));
      if (overlap) overlaps.set(name, (overlaps.get(name) || 0) + overlap);
    }
    const [bestName, bestOverlap = 0] = [...overlaps.entries()].sort((left, right) => right[1] - left[1])[0] || [];
    return bestName && bestOverlap / duration >= 0.45
      ? { ...segment, speaker: bestName, known: true, confidence: null, corrected: true }
      : segment;
  });
}

export function servicesAfterLiveEvent(services, event) {
  if (event.type === "preparing") return { ...services, speakerModelState: "loading" };
  if (event.type === "ready" && event.mode === "speaker") return { ...services, speakerModelState: "ready" };
  return services;
}

export function autosaveRetryDelay(failureCount) {
  const failures = Math.max(1, Math.floor(Number(failureCount) || 1));
  return Math.min(8_000, 1_000 * (2 ** (failures - 1)));
}

export function recordingCompletionStatus(interrupted) {
  return interrupted ? "interrupted" : "completed";
}

export function meetingsAfterRemoval(meetings, meetingId) {
  return meetings.filter(({ id }) => id !== meetingId);
}

export function recordingStartErrorMessage(error) {
  const messages = {
    NotAllowedError: "마이크 권한이 거부되었습니다. 브라우저 주소창의 권한 설정에서 마이크를 허용해 주세요.",
    NotFoundError: "사용할 수 있는 마이크를 찾지 못했습니다. 입력 장치 연결을 확인해 주세요.",
    NotReadableError: "다른 앱이 마이크를 사용 중이거나 장치에 접근할 수 없습니다.",
    SecurityError: "마이크는 HTTPS 또는 localhost에서만 사용할 수 있습니다."
  };
  return messages[error?.name] || error?.message || "실시간 녹음을 시작하지 못했습니다.";
}

export function microphoneConstraints(deviceId = "") {
  return {
    channelCount: { ideal: 1 },
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    ...(deviceId ? { deviceId: { exact: deviceId } } : {})
  };
}

export function useRecording() {
  const [language, setLanguage] = useState("ko");
  const [mode, setMode] = useState("stt");
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("녹음 준비");
  const [notice, setNoticeState] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [segments, setSegments] = useState([]);
  const [hasResult, setHasResult] = useState(false);
  const [speakers, setSpeakers] = useState([]);
  const [services, setServices] = useState({});
  const [meetings, setMeetings] = useState([]);
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [audioInputs, setAudioInputs] = useState([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");

  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const pcmContextRef = useRef(null);
  const pcmNodeRef = useRef(null);
  const monitorContextRef = useRef(null);
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const animationRef = useRef(null);
  const chunksRef = useRef([]);
  const committedRef = useRef([]);
  const recordingRef = useRef(false);
  const languageRef = useRef(language);
  const modeRef = useRef(mode);
  const noticeModeRef = useRef(mode);
  const activeMeetingRef = useRef(null);
  const elapsedRef = useRef(0);
  const saveTimerRef = useRef(null);
  const finalizationRef = useRef(null);
  const speakerCorrectionsRef = useRef(new Map());
  const transcriptCorrectionsRef = useRef([]);
  const pendingAutosaveRef = useRef(null);
  const autosaveFailuresRef = useRef(0);
  const interruptedRef = useRef(false);
  const socketDisconnectedRef = useRef(false);
  const finalizationStartedRef = useRef(false);
  const uploadIdsRef = useRef(new Map());

  const setNotice = useCallback((message) => {
    noticeModeRef.current = modeRef.current;
    setNoticeState(message);
  }, []);

  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => {
    modeRef.current = mode;
    setNotice("");
    if (!recordingRef.current) setStatus("녹음 준비");
  }, [mode]);

  const refreshAudioInputs = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = (await navigator.mediaDevices.enumerateDevices())
      .filter(({ kind, deviceId }) => kind === "audioinput" && deviceId);
    setAudioInputs(devices);
    setSelectedAudioInputId((current) => current && !devices.some(({ deviceId }) => deviceId === current) ? "" : current);
    return devices;
  }, []);

  useEffect(() => {
    refreshAudioInputs().catch(() => undefined);
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return undefined;
    const refresh = () => refreshAudioInputs().catch(() => undefined);
    mediaDevices.addEventListener("devicechange", refresh);
    return () => mediaDevices.removeEventListener("devicechange", refresh);
  }, [refreshAudioInputs]);

  const changeMode = useCallback((nextMode) => {
    if (recordingRef.current) return;
    const normalized = nextMode === "speaker" ? "speaker" : "stt";
    modeRef.current = normalized;
    setMode(normalized);
    setNotice("");
    setStatus("녹음 준비");
    window.setTimeout(() => setNotice(""), 0);
  }, []);

  const loadConfiguration = useCallback(async () => {
    const [health, roster, meetingResult] = await Promise.all([
      apiRequest("/api/health"),
      apiRequest("/api/speakers"),
      apiRequest("/api/meetings")
    ]);
    setServices(health.services || {});
    setSpeakers(roster.speakers || []);
    setMeetings(meetingResult.meetings || []);
  }, []);

  useEffect(() => {
    loadConfiguration().catch((error) => setNotice(error.message));
  }, [loadConfiguration]);

  const cleanupCapture = useCallback(({ keepSocket = false } = {}) => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    pcmNodeRef.current?.disconnect();
    pcmNodeRef.current = null;
    pcmContextRef.current?.close().catch(() => undefined);
    pcmContextRef.current = null;
    monitorContextRef.current?.close().catch(() => undefined);
    monitorContextRef.current = null;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    if (!keepSocket) {
      if ([WebSocket.CONNECTING, WebSocket.OPEN].includes(socketRef.current?.readyState)) {
        socketRef.current.close(1000, "recording stopped");
      }
      socketRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  useEffect(() => () => cleanupCapture(), [cleanupCapture]);

  const upsertMeeting = useCallback((meeting) => {
    if (!meeting) return;
    setMeetings((current) => [meeting, ...current.filter(({ id }) => id !== meeting.id)]
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt)));
    if (activeMeetingRef.current?.id === meeting.id) {
      activeMeetingRef.current = meeting;
      setActiveMeeting(meeting);
    }
  }, []);

  const saveActiveMeeting = useCallback(async (changes) => {
    const meeting = activeMeetingRef.current;
    if (!meeting) return null;
    const result = await patchJson(`/api/meetings/${meeting.id}`, changes);
    upsertMeeting(result.meeting);
    return result.meeting;
  }, [upsertMeeting]);

  const scheduleAutosave = useCallback((nextSegments) => {
    if (!activeMeetingRef.current) return;
    pendingAutosaveRef.current = {
      status: "recording",
      segments: nextSegments.map((segment) => ({ ...segment })),
      duration: elapsedRef.current
    };
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const persist = async () => {
      saveTimerRef.current = null;
      const changes = pendingAutosaveRef.current;
      if (!changes || !activeMeetingRef.current) return;
      pendingAutosaveRef.current = null;
      try {
        await saveActiveMeeting(changes);
        autosaveFailuresRef.current = 0;
        if (pendingAutosaveRef.current) saveTimerRef.current = window.setTimeout(persist, 300);
      } catch (error) {
        pendingAutosaveRef.current ||= changes;
        autosaveFailuresRef.current += 1;
        const retryDelay = autosaveRetryDelay(autosaveFailuresRef.current);
        setNotice(`자동 저장 연결이 불안정합니다. ${Math.round(retryDelay / 1_000)}초 후 최신 기록으로 다시 시도합니다. ${error.message}`);
        saveTimerRef.current = window.setTimeout(persist, retryDelay);
      }
    };
    saveTimerRef.current = window.setTimeout(persist, 900);
  }, [saveActiveMeeting]);

  const handleSocketEvent = useCallback((event) => {
    setServices((current) => servicesAfterLiveEvent(current, event));
    if (event.type === "error") {
      setNotice(event.message);
      return;
    }
    if (event.type === "warning") {
      setNotice(event.message);
      return;
    }
    if (event.type === "ready") {
      setStatus(event.mode === "speaker" ? "녹음 중 · 화자 식별 연결됨" : "녹음 중 · 실시간 STT 연결됨");
      return;
    }
    if (event.type === "preparing") {
      setStatus(event.message || "화자 인식 모델 준비 중");
      return;
    }
    if (event.type === "finalized") {
      finalizationRef.current?.();
      return;
    }
    if (event.type !== "transcript") return;
    if (event.isFinal) {
      committedRef.current = mergeSegments(committedRef.current, event.segments || []);
      scheduleAutosave(committedRef.current);
    }
    const pending = event.isFinal ? [] : (event.segments || []).map((segment) => ({ ...segment, pending: true }));
    setSegments([...committedRef.current, ...pending]);
    setHasResult(true);
  }, [scheduleAutosave]);

  const finalizeLiveSocket = useCallback(() => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return resolve();
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      window.clearTimeout(timeout);
      finalizationRef.current = null;
      resolve();
    };
    const timeout = window.setTimeout(finish, 5_000);
    finalizationRef.current = finish;
    socket.send(JSON.stringify({ type: "finalize" }));
  }), []);

  const openLiveSocket = useCallback(() => new Promise((resolve, reject) => {
    const parameters = new URLSearchParams({ language: languageRef.current, mode: modeRef.current });
    const socket = new WebSocket(websocketUrl(`/api/live?${parameters}`));
    socket.binaryType = "arraybuffer";
    socketRef.current = socket;
    socketDisconnectedRef.current = false;
    let ready = false;
    const maximumWait = modeRef.current === "speaker" ? 120_000 : 15_000;
    const timeout = window.setTimeout(() => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close(1000, "connection timeout");
      if (socketRef.current === socket) socketRef.current = null;
      reject(new Error(modeRef.current === "speaker" ? "화자 인식 모델 준비 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요." : "실시간 STT 연결 시간이 초과되었습니다."));
    }, maximumWait);
    socket.addEventListener("message", ({ data }) => {
      let event;
      try {
        event = JSON.parse(data);
      } catch {
        setNotice("실시간 서버 응답을 해석하지 못했습니다. 기록을 안전하게 종료합니다.");
        socket.close(1011, "invalid response");
        return;
      }
      handleSocketEvent(event);
      if (event.type === "ready" && !ready) {
        ready = true;
        window.clearTimeout(timeout);
        resolve(socket);
      } else if (event.type === "error" && !ready) {
        window.clearTimeout(timeout);
        reject(new Error(event.message));
      }
    });
    socket.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("실시간 서버에 연결하지 못했습니다."));
    }, { once: true });
    socket.addEventListener("close", () => {
      window.clearTimeout(timeout);
      socketDisconnectedRef.current = true;
      if (socketRef.current === socket) socketRef.current = null;
      finalizationRef.current?.();
      if (!ready) {
        reject(new Error("실시간 연결이 준비되기 전에 종료되었습니다. 잠시 후 다시 시도해 주세요."));
        return;
      }
      if (recordingRef.current) {
        interruptedRef.current = true;
        recordingRef.current = false;
        setIsRecording(false);
        setIsBusy(true);
        setStatus("연결 종료 · 기록 보존 중");
        setNotice("실시간 연결이 종료되어 현재까지의 기록을 안전하게 저장합니다. 저장 후 다시 시작해 주세요.");
        if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      }
    });
  }), [handleSocketEvent]);

  const startPcmStream = useCallback(async (stream) => {
    const context = new AudioContext({ sampleRate: 16_000 });
    pcmContextRef.current = context;
    await context.audioWorklet.addModule("/pcm-processor.js");
    const source = context.createMediaStreamSource(stream);
    const processor = new AudioWorkletNode(context, "pcm16-processor");
    pcmNodeRef.current = processor;
    const muted = context.createGain();
    muted.gain.value = 0;
    processor.port.onmessage = ({ data }) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(data);
    };
    source.connect(processor).connect(muted).connect(context.destination);
  }, []);

  const startLevelMonitor = useCallback((stream) => {
    const context = new AudioContext();
    monitorContextRef.current = context;
    const analyser = context.createAnalyser();
    analyser.fftSize = 128;
    context.createMediaStreamSource(stream).connect(analyser);
    const values = new Uint8Array(analyser.frequencyBinCount);
    let previousUpdate = 0;
    const render = (time) => {
      analyser.getByteFrequencyData(values);
      if (time - previousUpdate > 90) {
        const average = values.reduce((sum, value) => sum + value, 0) / values.length;
        setAudioLevel(Math.min(100, Math.round(average * 1.4)));
        previousUpdate = time;
      }
      animationRef.current = requestAnimationFrame(render);
    };
    animationRef.current = requestAnimationFrame(render);
  }, []);

  const submitAudio = useCallback(async (blob, filename) => {
    const form = new FormData();
    form.append("audio", blob, filename);
    form.append("language", languageRef.current);
    return apiRequest("/api/transcribe", { method: "POST", body: form });
  }, []);

  const importAudio = useCallback(async (file) => {
    const fileKey = `${file.name}:${file.size}:${file.lastModified}`;
    let importId = uploadIdsRef.current.get(fileKey);
    if (!importId) {
      importId = crypto.randomUUID();
      uploadIdsRef.current.set(fileKey, importId);
      if (uploadIdsRef.current.size > 20) uploadIdsRef.current.delete(uploadIdsRef.current.keys().next().value);
    }
    const form = new FormData();
    form.append("audio", file, file.name);
    form.append("language", languageRef.current);
    form.append("importId", importId);
    const result = await apiRequest("/api/meetings/import", { method: "POST", body: form });
    uploadIdsRef.current.delete(fileKey);
    return result;
  }, []);

  const finishRecording = useCallback(() => {
    recordingRef.current = false;
    setIsRecording(false);
    setIsBusy(false);
    setStatus(interruptedRef.current ? "연결 종료 · 기록 보존" : "기록 완료");
    mediaRecorderRef.current = null;
  }, []);

  const finalizeRecording = useCallback(async () => {
    if (finalizationStartedRef.current) return;
    finalizationStartedRef.current = true;
    const recorder = mediaRecorderRef.current;
    const recording = new Blob(chunksRef.current, { type: recorder?.mimeType || "audio/webm" });
    pendingAutosaveRef.current = null;
    cleanupCapture({ keepSocket: true });
    setStatus("마지막 발화 확정 중");
    await finalizeLiveSocket();
    cleanupCapture();
    const liveSegments = committedRef.current;
    let finalSegments = liveSegments;
    if (recording.size && services.openai && modeRef.current === "speaker") setStatus("최종 화자 재검증 중");
    try {
      if (recording.size && services.openai && modeRef.current === "speaker") {
        const result = await submitAudio(recording, `recording-${Date.now()}.webm`);
        if (result.segments?.length) {
          finalSegments = applyManualSpeakerCorrections(result.segments, liveSegments, speakerCorrectionsRef.current);
          finalSegments = applyManualTranscriptCorrections(finalSegments, transcriptCorrectionsRef.current);
          committedRef.current = finalSegments;
          setSegments(finalSegments);
          setHasResult(true);
        }
      }
      await saveActiveMeeting({
        status: recordingCompletionStatus(interruptedRef.current),
        segments: finalSegments,
        duration: elapsedRef.current
      });
    } catch (error) {
      setNotice(`실시간 기록은 유지했습니다. ${error.message}`);
      await saveActiveMeeting({
        status: recordingCompletionStatus(interruptedRef.current),
        segments: finalSegments,
        duration: elapsedRef.current
      }).catch(() => undefined);
    } finally {
      finishRecording();
    }
  }, [cleanupCapture, finalizeLiveSocket, finishRecording, saveActiveMeeting, services.openai, submitAudio]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !window.AudioWorkletNode) {
      setNotice("이 브라우저는 실시간 음성 처리를 지원하지 않습니다.");
      return;
    }
    if (modeRef.current === "speaker" && !speakers.length) {
      setNotice("설정에서 목소리를 한 명 이상 등록해 주세요.");
      return;
    }
    if (!services.deepgram) {
      setNotice("서버에 Deepgram API 키가 설정되어 있지 않습니다.");
      return;
    }
    setNotice("");
    setIsBusy(true);
    setStatus("마이크와 모델 연결 중");
    setSegments([]);
    setHasResult(true);
    activeMeetingRef.current = null;
    setActiveMeeting(null);
    committedRef.current = [];
    speakerCorrectionsRef.current.clear();
    transcriptCorrectionsRef.current = [];
    pendingAutosaveRef.current = null;
    autosaveFailuresRef.current = 0;
    interruptedRef.current = false;
    socketDisconnectedRef.current = false;
    finalizationStartedRef.current = false;
    chunksRef.current = [];
    elapsedRef.current = 0;
    let createdMeeting = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: microphoneConstraints(selectedAudioInputId)
      });
      mediaStreamRef.current = stream;
      refreshAudioInputs().catch(() => undefined);
      await openLiveSocket();
      if (socketDisconnectedRef.current || socketRef.current?.readyState !== WebSocket.OPEN) {
        throw new Error("실시간 연결이 종료되었습니다. 잠시 후 다시 시작해 주세요.");
      }
      const created = await postJson("/api/meetings", { language: languageRef.current, source: "live", mode: modeRef.current });
      createdMeeting = created.meeting;
      activeMeetingRef.current = created.meeting;
      setActiveMeeting(created.meeting);
      upsertMeeting(created.meeting);
      await startPcmStream(stream);
      if (socketDisconnectedRef.current || socketRef.current?.readyState !== WebSocket.OPEN) {
        throw new Error("실시간 연결이 종료되었습니다. 현재 회의를 중단 기록으로 저장합니다.");
      }
      startLevelMonitor(stream);
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      recorder.addEventListener("dataavailable", (event) => { if (event.data.size) chunksRef.current.push(event.data); });
      recorder.addEventListener("stop", finalizeRecording, { once: true });
      recorder.addEventListener("error", () => {
        interruptedRef.current = true;
        setNotice("브라우저 녹음 장치 오류로 현재까지의 기록을 저장합니다.");
        if (recorder.state === "recording") recorder.stop();
        else finalizeRecording();
      }, { once: true });
      stream.getAudioTracks().forEach((track) => track.addEventListener("ended", () => {
        if (!recordingRef.current) return;
        interruptedRef.current = true;
        recordingRef.current = false;
        setIsRecording(false);
        setIsBusy(true);
        setStatus("마이크 연결 종료 · 기록 보존 중");
        setNotice("선택한 마이크 연결이 종료되어 현재까지의 기록을 저장합니다.");
        if (recorder.state === "recording") recorder.stop();
      }, { once: true }));
      recorder.start(1000);
      if (socketDisconnectedRef.current || socketRef.current?.readyState !== WebSocket.OPEN) {
        interruptedRef.current = true;
        setStatus("연결 종료 · 기록 보존 중");
        recorder.stop();
        return;
      }
      const startedAt = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        elapsedRef.current = (Date.now() - startedAt) / 1000;
        setElapsed(elapsedRef.current);
      }, 250);
      recordingRef.current = true;
      setIsRecording(true);
      setIsBusy(false);
      setStatus("녹음 중 · 첫 발화 대기");
    } catch (error) {
      cleanupCapture();
      if (createdMeeting) {
        await saveActiveMeeting({ status: "interrupted", segments: committedRef.current, duration: elapsedRef.current }).catch(() => undefined);
      }
      setIsBusy(false);
      setStatus("연결하지 못했어요");
      setNotice(recordingStartErrorMessage(error));
    }
  }, [cleanupCapture, finalizeRecording, openLiveSocket, refreshAudioInputs, saveActiveMeeting, selectedAudioInputId, services.deepgram, speakers.length, startLevelMonitor, startPcmStream, upsertMeeting]);

  const stop = useCallback(() => {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    setIsRecording(false);
    setIsBusy(true);
    setStatus("녹음 마무리 중");
    interruptedRef.current = false;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }, []);

  const transcribeFile = useCallback(async (file) => {
    if (!file) return;
    setIsBusy(true);
    setStatus("파일의 등록 화자를 확인하는 중");
    setNotice("");
    try {
      const result = await importAudio(file);
      const meeting = result.meeting;
      if (!meeting?.segments?.length) throw new Error("저장된 대화가 없습니다.");
      activeMeetingRef.current = meeting;
      setActiveMeeting(meeting);
      upsertMeeting(meeting);
      committedRef.current = meeting.segments;
      setSegments(meeting.segments);
      setHasResult(true);
      elapsedRef.current = Number(meeting.duration) || 0;
      setElapsed(elapsedRef.current);
      setStatus("파일 기록 완료");
    } catch (error) {
      setStatus("처리하지 못했어요");
      setNotice(error.message);
    } finally {
      setIsBusy(false);
    }
  }, [importAudio, upsertMeeting]);

  const openMeeting = useCallback((meeting) => {
    if (!meeting) return;
    activeMeetingRef.current = meeting;
    changeMode(meeting.mode === "stt" ? "stt" : "speaker");
    setActiveMeeting(meeting);
    committedRef.current = meeting.segments || [];
    speakerCorrectionsRef.current = new Map((meeting.segments || [])
      .filter(({ corrected, sourceSpeaker }) => corrected && sourceSpeaker != null)
      .map(({ sourceSpeaker, speaker }) => [String(sourceSpeaker), speaker]));
    transcriptCorrectionsRef.current = (meeting.segments || [])
      .filter(({ transcriptCorrected }) => transcriptCorrected)
      .map(({ start, end, text }) => ({ start, end, text }));
    setSegments(meeting.segments || []);
    setHasResult(true);
    elapsedRef.current = Number(meeting.duration) || 0;
    setElapsed(elapsedRef.current);
    setStatus(meeting.status === "recording"
      ? "저장된 미완료 기록"
      : meeting.status === "interrupted" ? "연결이 중단된 기록" : "저장된 회의");
    setNotice("");
  }, [changeMode]);

  const correctSpeaker = useCallback((target, speakerName) => {
    const registered = speakers.some(({ name }) => name === speakerName);
    const next = correctSpeakerCluster(segments, target, speakerName, registered);
    if (registered && target.sourceSpeaker != null) {
      speakerCorrectionsRef.current.set(String(target.sourceSpeaker), speakerName);
      if (recordingRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: "speakerCorrection",
          sourceSpeaker: String(target.sourceSpeaker),
          speakerName
        }));
      }
    }
    committedRef.current = next.filter(({ pending }) => !pending);
    setSegments(next);
    saveActiveMeeting({ segments: committedRef.current, duration: elapsedRef.current })
      .catch((error) => setNotice(`화자 수정을 저장하지 못했습니다. ${error.message}`));
  }, [saveActiveMeeting, segments, speakers]);

  const correctTranscript = useCallback(async (target, text) => {
    const next = correctTranscriptSegment(segments, target, text);
    const corrected = next.find((segment, index) => segment !== segments[index]);
    if (!corrected) return null;
    const previousCorrections = transcriptCorrectionsRef.current;
    transcriptCorrectionsRef.current = [
      ...previousCorrections.filter((entry) => entry.start !== corrected.start || entry.end !== corrected.end),
      { start: corrected.start, end: corrected.end, text: corrected.text }
    ];
    committedRef.current = next.filter(({ pending }) => !pending);
    setSegments(next);
    try {
      return await saveActiveMeeting({ segments: committedRef.current, duration: elapsedRef.current });
    } catch (error) {
      committedRef.current = segments.filter(({ pending }) => !pending);
      setSegments(segments);
      transcriptCorrectionsRef.current = previousCorrections;
      throw error;
    }
  }, [saveActiveMeeting, segments]);

  const resetMeeting = useCallback(() => {
    activeMeetingRef.current = null;
    setActiveMeeting(null);
    committedRef.current = [];
    speakerCorrectionsRef.current.clear();
    transcriptCorrectionsRef.current = [];
    pendingAutosaveRef.current = null;
    autosaveFailuresRef.current = 0;
    interruptedRef.current = false;
    socketDisconnectedRef.current = false;
    finalizationStartedRef.current = false;
    setSegments([]);
    setHasResult(false);
    elapsedRef.current = 0;
    setElapsed(0);
    setStatus("녹음 준비");
    setNotice("");
  }, []);

  const removeMeeting = useCallback(async (id) => {
    if (recordingRef.current && activeMeetingRef.current?.id === id) {
      throw new Error("녹음 중인 회의는 중지와 저장을 마친 뒤 삭제해 주세요.");
    }
    await apiRequest(`/api/meetings/${id}`, { method: "DELETE" });
    setMeetings((current) => meetingsAfterRemoval(current, id));
    if (activeMeetingRef.current?.id === id) resetMeeting();
  }, [resetMeeting]);

  const enrollSpeaker = useCallback(async (name, file) => {
    const form = new FormData();
    form.append("name", name);
    form.append("voice", file, file.name);
    const result = await apiRequest("/api/speakers", { method: "POST", body: form });
    setSpeakers((current) => [...current, result.speaker]);
    setServices((current) => ({ ...current, speakerModelState: "ready" }));
    return result.speaker;
  }, []);

  const removeSpeaker = useCallback(async (id) => {
    await apiRequest(`/api/speakers/${id}`, { method: "DELETE" });
    setSpeakers((current) => current.filter((speaker) => speaker.id !== id));
  }, []);

  const addSpeakerSample = useCallback(async (id, file) => {
    const form = new FormData();
    form.append("voice", file, file.name);
    const result = await apiRequest(`/api/speakers/${id}/samples`, { method: "POST", body: form });
    setSpeakers((current) => current.map((speaker) => speaker.id === id ? result.speaker : speaker));
    setServices((current) => ({ ...current, speakerModelState: "ready" }));
    return result.speaker;
  }, []);

  const updateSpeaker = useCallback((speaker) => {
    if (!speaker?.id) return;
    setSpeakers((current) => current.map((existing) => existing.id === speaker.id ? speaker : existing));
  }, []);

  return {
    language, setLanguage, mode, setMode: changeMode, isRecording, isBusy, status,
    notice: noticeModeRef.current === mode && !(mode === "stt" && notice === "설정에서 목소리를 한 명 이상 등록해 주세요.") ? notice : "", setNotice,
    elapsed, audioLevel, segments, hasResult, speakers, services, meetings, activeMeeting,
    audioInputs, selectedAudioInputId, setSelectedAudioInputId,
    start, stop, transcribeFile, enrollSpeaker, addSpeakerSample, removeSpeaker, updateSpeaker, openMeeting, resetMeeting, removeMeeting, correctSpeaker, correctTranscript,
    reload: loadConfiguration
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensureAudioContextRunning,
  microphoneConstraints,
  pcmInputLevel
} from "../recording/useRecording.js";
import {
  DEFAULT_ENROLLMENT_SECONDS,
  appendVoiceLevel,
  enrollmentCaptureErrorMessage,
  enrollmentFilename,
  enrollmentPermissionFromError,
  enrollmentTiming,
  normalizedEnrollmentDuration,
  recorderOptions
} from "./voiceEnrollmentState.js";

const initialState = Object.freeze({
  phase: "idle",
  permission: "prompt",
  elapsed: 0,
  inputLevel: 0,
  levelHistory: [],
  error: ""
});

export function useVoiceEnrollmentCapture({
  onEnroll,
  targetSeconds = DEFAULT_ENROLLMENT_SECONDS,
  workletUrl = "/pcm-processor.js"
} = {}) {
  const duration = normalizedEnrollmentDuration(targetSeconds);
  const [capture, setCapture] = useState(initialState);
  const [audioInputs, setAudioInputs] = useState([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState("");

  const mountedRef = useRef(true);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioNodeRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const elapsedRef = useRef(0);
  const uploadOnStopRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const captureGenerationRef = useRef(0);

  const refreshAudioInputs = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const inputs = (await navigator.mediaDevices.enumerateDevices())
      .filter(({ kind, deviceId }) => kind === "audioinput" && deviceId)
      .map(({ deviceId, label }, index) => ({
        value: deviceId,
        label: label || `마이크 ${index + 1}`
      }));
    if (!mountedRef.current) return inputs;
    setAudioInputs(inputs);
    setSelectedAudioInputId((current) => (
      current && !inputs.some(({ value }) => value === current) ? "" : current
    ));
    return inputs;
  }, []);

  const cleanupMedia = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    audioNodeRef.current?.disconnect();
    audioNodeRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== "closed") context.close().catch(() => undefined);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (mountedRef.current) setCapture((current) => ({ ...current, inputLevel: 0 }));
  }, []);

  const completeRecording = useCallback(async (recorder, generation = captureGenerationRef.current) => {
    if (recorderRef.current !== recorder || generation !== captureGenerationRef.current) return;
    const shouldUpload = uploadOnStopRef.current;
    uploadOnStopRef.current = false;
    const elapsed = elapsedRef.current;
    const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
    chunksRef.current = [];
    recorderRef.current = null;
    cleanupMedia();
    if (!shouldUpload || !mountedRef.current) return;
    if (!blob.size) {
      setCapture((current) => ({ ...current, phase: "error", error: "녹음된 목소리가 없습니다. 다시 시도해 주세요." }));
      return;
    }
    if (generation !== captureGenerationRef.current) return;
    setCapture((current) => ({ ...current, phase: "uploading", elapsed }));
    try {
      const file = new File([blob], enrollmentFilename(blob.type), { type: blob.type });
      await onEnroll?.(file, {
        blob,
        duration: elapsed,
        deviceId: selectedAudioInputId
      });
      if (mountedRef.current && generation === captureGenerationRef.current) {
        setCapture((current) => ({ ...current, phase: "success", error: "" }));
      }
    } catch (error) {
      if (mountedRef.current && generation === captureGenerationRef.current) {
        setCapture((current) => ({
          ...current,
          phase: "error",
          error: error?.message || "목소리를 등록하지 못했습니다. 다시 시도해 주세요."
        }));
      }
    }
  }, [cleanupMedia, onEnroll, selectedAudioInputId]);

  const stop = useCallback(({ upload = true } = {}) => {
    const recorder = recorderRef.current;
    if (!recorder || stopRequestedRef.current) return;
    stopRequestedRef.current = true;
    uploadOnStopRef.current = upload;
    if (mountedRef.current && upload) setCapture((current) => ({ ...current, phase: "stopping" }));
    if (recorder.state === "recording") recorder.stop();
    else completeRecording(recorder, captureGenerationRef.current);
  }, [completeRecording]);

  const startLevelMeter = useCallback(async (stream) => {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor || !window.AudioWorkletNode) {
      throw new Error("이 브라우저는 목소리 입력 레벨 측정을 지원하지 않습니다.");
    }
    const context = new AudioContextConstructor({ sampleRate: 16_000 });
    audioContextRef.current = context;
    await context.audioWorklet.addModule(workletUrl);
    const source = context.createMediaStreamSource(stream);
    const processor = new AudioWorkletNode(context, "pcm16-processor");
    const muted = context.createGain();
    muted.gain.value = 0;
    audioNodeRef.current = processor;
    let smoothedLevel = 0;
    processor.port.onmessage = ({ data }) => {
      const measured = pcmInputLevel(data);
      smoothedLevel = smoothedLevel * 0.7 + measured * 0.3;
      if (mountedRef.current) {
        const inputLevel = Math.round(smoothedLevel);
        setCapture((current) => ({
          ...current,
          inputLevel,
          levelHistory: appendVoiceLevel(current.levelHistory, inputLevel)
        }));
      }
    };
    source.connect(processor).connect(muted).connect(context.destination);
    await ensureAudioContextRunning(context);
  }, [workletUrl]);

  const start = useCallback(async () => {
    if (["requesting", "recording", "stopping", "uploading"].includes(capture.phase)) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setCapture((current) => ({
        ...current,
        phase: "error",
        error: "이 브라우저는 마이크 녹음을 지원하지 않습니다."
      }));
      return;
    }
    setCapture({ ...initialState, phase: "requesting", permission: capture.permission });
    chunksRef.current = [];
    elapsedRef.current = 0;
    stopRequestedRef.current = false;
    uploadOnStopRef.current = false;
    const generation = captureGenerationRef.current + 1;
    captureGenerationRef.current = generation;
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: microphoneConstraints(selectedAudioInputId)
      });
      if (!mountedRef.current || generation !== captureGenerationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      await startLevelMeter(stream);
      if (!mountedRef.current || generation !== captureGenerationRef.current) {
        if (streamRef.current === stream) cleanupMedia();
        else stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const recorder = new MediaRecorder(stream, recorderOptions(MediaRecorder));
      recorderRef.current = recorder;
      recorder.addEventListener("dataavailable", ({ data }) => {
        if (data?.size) chunksRef.current.push(data);
      });
      recorder.addEventListener("stop", () => completeRecording(recorder, generation), { once: true });
      recorder.addEventListener("error", () => {
        uploadOnStopRef.current = false;
        cleanupMedia();
        if (mountedRef.current) {
          setCapture((current) => ({ ...current, phase: "error", error: "마이크 녹음 중 오류가 발생했습니다." }));
        }
      }, { once: true });
      stream.getAudioTracks().forEach((track) => track.addEventListener("ended", () => {
        if (recorderRef.current === recorder && recorder.state === "recording") stop({ upload: false });
        if (mountedRef.current) {
          setCapture((current) => ({ ...current, phase: "error", error: "선택한 마이크 연결이 종료되었습니다." }));
        }
      }, { once: true }));
      if (!mountedRef.current || generation !== captureGenerationRef.current) {
        recorderRef.current = null;
        cleanupMedia();
        return;
      }
      recorder.start(250);
      startedAtRef.current = Date.now();
      setCapture({ ...initialState, phase: "recording", permission: "granted" });
      refreshAudioInputs().catch(() => undefined);
      timerRef.current = window.setInterval(() => {
        const elapsed = Math.min(duration, (Date.now() - startedAtRef.current) / 1_000);
        elapsedRef.current = elapsed;
        if (mountedRef.current) setCapture((current) => ({ ...current, elapsed }));
        if (elapsed >= duration) stop({ upload: true });
      }, 100);
    } catch (error) {
      if (stream && streamRef.current !== stream) stream.getTracks().forEach((track) => track.stop());
      cleanupMedia();
      if (mountedRef.current && generation === captureGenerationRef.current) {
        setCapture((current) => ({
          ...current,
          phase: "error",
          permission: enrollmentPermissionFromError(error),
          error: enrollmentCaptureErrorMessage(error)
        }));
      }
    }
  }, [capture.permission, capture.phase, cleanupMedia, completeRecording, duration, refreshAudioInputs, selectedAudioInputId, startLevelMeter, stop]);

  const reset = useCallback(() => {
    captureGenerationRef.current += 1;
    if (recorderRef.current) stop({ upload: false });
    recorderRef.current = null;
    cleanupMedia();
    chunksRef.current = [];
    elapsedRef.current = 0;
    if (mountedRef.current) {
      setCapture((current) => ({ ...initialState, permission: current.permission }));
    }
  }, [cleanupMedia, stop]);

  useEffect(() => {
    refreshAudioInputs().catch(() => undefined);
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return undefined;
    const handleDeviceChange = () => refreshAudioInputs().catch(() => undefined);
    mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [refreshAudioInputs]);

  useEffect(() => {
    let active = true;
    navigator.permissions?.query?.({ name: "microphone" }).then((status) => {
      if (!active || !mountedRef.current) return;
      const update = () => setCapture((current) => ({ ...current, permission: status.state }));
      update();
      status.addEventListener?.("change", update);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      captureGenerationRef.current += 1;
      uploadOnStopRef.current = false;
      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (recorder?.state === "recording") recorder.stop();
      cleanupMedia();
    };
  }, [cleanupMedia]);

  return {
    ...capture,
    ...enrollmentTiming(capture.elapsed, duration),
    targetSeconds: duration,
    audioInputs,
    selectedAudioInputId,
    setSelectedAudioInputId,
    start,
    stop,
    reset
  };
}

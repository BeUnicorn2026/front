export const VOICE_ENROLLMENT_PASSAGE = "오늘 회의에서는 서로의 의견을 차분히 듣고, 중요한 결정과 다음 할 일을 분명하게 정리하겠습니다. 제 목소리가 또렷하게 들리도록 평소 속도로 자연스럽게 읽어 주세요.";

export const MINIMUM_ENROLLMENT_SECONDS = 10;
export const MAXIMUM_ENROLLMENT_SECONDS = 15;
export const DEFAULT_ENROLLMENT_SECONDS = 12;

export function normalizedEnrollmentDuration(seconds = DEFAULT_ENROLLMENT_SECONDS) {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric)) return DEFAULT_ENROLLMENT_SECONDS;
  return Math.min(MAXIMUM_ENROLLMENT_SECONDS, Math.max(MINIMUM_ENROLLMENT_SECONDS, numeric));
}

export function enrollmentTiming(elapsedSeconds, targetSeconds = DEFAULT_ENROLLMENT_SECONDS) {
  const target = normalizedEnrollmentDuration(targetSeconds);
  const elapsed = Math.min(target, Math.max(0, Number(elapsedSeconds) || 0));
  return {
    elapsed,
    remaining: Math.max(0, target - elapsed),
    progress: Math.round((elapsed / target) * 100),
    canFinish: elapsed >= MINIMUM_ENROLLMENT_SECONDS,
    isComplete: elapsed >= target
  };
}

export function enrollmentPermissionFromError(error) {
  return error?.name === "NotAllowedError" || error?.name === "SecurityError" ? "denied" : "prompt";
}

export function enrollmentCaptureErrorMessage(error) {
  const messages = {
    NotAllowedError: "마이크 권한이 거부되었습니다. 브라우저의 사이트 설정에서 마이크를 허용해 주세요.",
    NotFoundError: "사용할 수 있는 마이크를 찾지 못했습니다. 입력 장치 연결을 확인해 주세요.",
    NotReadableError: "다른 앱이 마이크를 사용 중이거나 선택한 장치에 접근할 수 없습니다.",
    SecurityError: "마이크는 HTTPS 또는 localhost 환경에서만 사용할 수 있습니다."
  };
  return messages[error?.name] || error?.message || "목소리 녹음을 시작하지 못했습니다.";
}

export function recorderOptions(MediaRecorderConstructor) {
  const opusType = "audio/webm;codecs=opus";
  return MediaRecorderConstructor?.isTypeSupported?.(opusType) ? { mimeType: opusType } : undefined;
}

export function enrollmentFilename(mimeType, timestamp = Date.now()) {
  const extension = String(mimeType || "").includes("ogg") ? "ogg" : "webm";
  return `voice-enrollment-${timestamp}.${extension}`;
}

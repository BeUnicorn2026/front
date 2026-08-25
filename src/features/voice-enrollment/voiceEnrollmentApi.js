import { apiRequest, postJson } from "../../api.js";

export const VOICE_ENROLLMENT_REQUIRED_MESSAGE = "회의에 참여하려면 먼저 내 목소리를 등록해 주세요.";

export function normalizeVoiceEnrollmentStatus(payload) {
  const state = typeof payload?.state === "string" ? payload.state : "invalid";
  return {
    state,
    profile: state === "ready" && payload?.profile && typeof payload.profile === "object"
      ? payload.profile
      : null,
    ready: state === "ready"
  };
}

export async function getVoiceEnrollmentStatus() {
  return normalizeVoiceEnrollmentStatus(await apiRequest("/api/profile/voice"));
}

export async function enrollVoice(file) {
  if (!(file instanceof Blob)) throw new Error("등록할 목소리 녹음 파일이 필요합니다.");
  const form = new FormData();
  form.append("audio", file, file.name || "voice-enrollment.webm");
  const result = normalizeVoiceEnrollmentStatus(await apiRequest("/api/profile/voice/enroll", {
    method: "POST",
    body: form
  }));
  if (!result.ready) throw new Error("목소리 등록 상태를 확인하지 못했습니다. 다시 시도해 주세요.");
  return result;
}

export function accessCodeFromLocation(location = window.location) {
  const value = new URLSearchParams(location.search).get("access");
  return typeof value === "string" ? value.trim() : "";
}

export function clearAccessCodeFromLocation(location = window.location, history = window.history) {
  const url = new URL(location.href);
  if (!url.searchParams.has("access")) return;
  url.searchParams.delete("access");
  history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export async function joinRoomByAccessCode(accessCode) {
  const normalized = String(accessCode || "").trim();
  if (!normalized) throw new Error("초대 링크의 접근 코드가 없습니다.");
  const result = await postJson("/api/rooms/join", { accessCode: normalized });
  if (!result?.room || typeof result.room !== "object") {
    throw new Error("초대 링크의 회의실 정보를 확인하지 못했습니다.");
  }
  return result.room;
}

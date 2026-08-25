let csrfToken = "";
const configuredApiOrigin = String(import.meta.env?.VITE_API_ORIGIN || "").replace(/\/$/, "");

export function apiUrl(path) {
  return configuredApiOrigin ? new URL(path, `${configuredApiOrigin}/`).toString() : path;
}

export function websocketUrl(path) {
  const url = new URL(path, configuredApiOrigin || window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export function apiEndpoint() {
  return new URL(apiUrl("/api/session"), window.location.origin).origin;
}

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const method = String(options.method || "GET").toUpperCase();
  if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("X-CSRF-Token", csrfToken);
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(apiUrl(path), { ...options, headers, body, credentials: "include" });
  } catch (cause) {
    const error = new Error("API 서버에 연결하지 못했습니다. 네트워크와 배포 주소를 확인해 주세요.", { cause });
    error.code = "API_UNREACHABLE";
    throw error;
  }
  if (response.status === 204) return null;
  const responseText = await response.text();
  let payload;
  try {
    payload = responseText ? JSON.parse(responseText) : {};
  } catch (cause) {
    const error = new Error(response.ok
      ? "API 대신 웹 페이지 응답을 받았습니다. 배포된 API 주소를 확인해 주세요."
      : `API가 해석할 수 없는 오류 응답을 보냈습니다. (HTTP ${response.status})`, { cause });
    error.status = response.status;
    error.code = "INVALID_API_RESPONSE";
    throw error;
  }
  if (!response.ok) {
    const error = new Error(payload.error || "요청을 처리하지 못했습니다.");
    error.status = response.status;
    error.code = payload.code;
    throw error;
  }
  if (typeof payload.csrfToken === "string") csrfToken = payload.csrfToken;
  return payload;
}

export function postJson(path, body) {
  return apiRequest(path, { method: "POST", body });
}

export function putJson(path, body) {
  return apiRequest(path, { method: "PUT", body });
}

export function patchJson(path, body) {
  return apiRequest(path, { method: "PATCH", body });
}

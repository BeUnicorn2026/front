let csrfToken = "";

export async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const method = String(options.method || "GET").toUpperCase();
  if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("X-CSRF-Token", csrfToken);
  let body = options.body;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  }
  const response = await fetch(path, { ...options, headers, body, credentials: "same-origin" });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
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

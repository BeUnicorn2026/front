import assert from "node:assert/strict";
import test from "node:test";
import { apiRequest } from "../src/api.js";

test("distinguishes unreachable, non-JSON and ordinary API errors", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new TypeError("network failed"); };
    await assert.rejects(apiRequest("/api/session"), (error) => error.code === "API_UNREACHABLE");

    globalThis.fetch = async () => new Response("<!doctype html><title>Frontend</title>", {
      status: 200,
      headers: { "content-type": "text/html" }
    });
    await assert.rejects(apiRequest("/api/session"), (error) => error.code === "INVALID_API_RESPONSE");

    globalThis.fetch = async () => new Response(JSON.stringify({
      error: "로그인이 필요합니다.", code: "AUTH_REQUIRED"
    }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
    await assert.rejects(apiRequest("/api/session"), (error) =>
      error.status === 401 && error.code === "AUTH_REQUIRED" && error.message === "로그인이 필요합니다.");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

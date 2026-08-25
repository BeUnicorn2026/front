import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Cloudflare build publishes verifiable commit metadata and runs the bundle gate", async () => {
  const [configuration, packageManifest, html, headers, redirects] = await Promise.all([
    readFile(new URL("../vite.config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/_headers", import.meta.url), "utf8"),
    readFile(new URL("../public/_redirects", import.meta.url), "utf8")
  ]);
  assert.match(configuration, /CF_PAGES_COMMIT_SHA/);
  assert.match(configuration, /deployment\.json/);
  assert.match(packageManifest.scripts.build, /verify-production-build\.mjs/);
  const buildVerifier = await readFile(new URL("../scripts/verify-production-build.mjs", import.meta.url), "utf8");
  assert.match(buildVerifier, /react-vendor-/);
  assert.match(buildVerifier, /React 런타임을 명시적으로 import/);
  assert.doesNotMatch(html, /(?:src|href)="https?:\/\//);
  assert.match(headers, /\/index\.html[\s\S]*no-cache/);
  assert.match(headers, /\/assets\/\*[\s\S]*immutable/);
  assert.match(headers, /\/record[\s\S]*no-cache/);
  assert.match(redirects, /^\/\* \/index\.html 200/m);
});

test("production uses the public API while local development proxies port 7070", async () => {
  const [apiSource, configuration] = await Promise.all([
    readFile(new URL("../src/api.js", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.mjs", import.meta.url), "utf8")
  ]);
  assert.match(apiSource, /import\.meta\.env\?\.PROD\s*\?\s*["']https:\/\/api\.ssu-on\.com["']/);
  assert.match(configuration, /http:\/\/127\.0\.0\.1:7070/);
});

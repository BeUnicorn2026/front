import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Cloudflare build publishes verifiable commit metadata and runs the bundle gate", async () => {
  const [configuration, packageManifest, html, headers] = await Promise.all([
    readFile(new URL("../vite.config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/_headers", import.meta.url), "utf8")
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
});

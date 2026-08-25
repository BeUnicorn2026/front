import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Cloudflare build publishes verifiable commit metadata and runs the bundle gate", async () => {
  const [configuration, packageManifest, html, headers, workerConfiguration] = await Promise.all([
    readFile(new URL("../vite.config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/_headers", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8")
  ]);
  assert.match(configuration, /CF_PAGES_COMMIT_SHA/);
  assert.match(configuration, /WORKERS_CI_COMMIT_SHA/);
  assert.match(configuration, /deployment\.json/);
  assert.match(configuration, /warning\.code === "MODULE_LEVEL_DIRECTIVE"/);
  assert.match(configuration, /node_modules\/@astryxdesign\/core/);
  assert.match(packageManifest.scripts.build, /verify-production-build\.mjs/);
  const buildVerifier = await readFile(new URL("../scripts/verify-production-build.mjs", import.meta.url), "utf8");
  assert.match(buildVerifier, /react-vendor-/);
  assert.match(buildVerifier, /React 런타임을 명시적으로 import/);
  assert.doesNotMatch(html, /(?:src|href)="https?:\/\//);
  assert.match(headers, /\/index\.html[\s\S]*no-cache/);
  assert.match(headers, /\/assets\/\*[\s\S]*immutable/);
  assert.match(headers, /\/record[\s\S]*no-cache/);
  assert.match(headers, /\/billing[\s\S]*no-cache/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /Permissions-Policy:.*microphone=\(self\)/);
  assert.match(headers, /Cross-Origin-Opener-Policy: same-origin-allow-popups/);
  assert.match(workerConfiguration, /"name": "beunicorn"/);
  assert.match(workerConfiguration, /"directory": "\.\/dist"/);
  assert.match(workerConfiguration, /"not_found_handling": "single-page-application"/);
  assert.equal(packageManifest.devDependencies.wrangler, "4.125.0");
});

test("production uses the public API while local development proxies port 7070", async () => {
  const [apiSource, configuration] = await Promise.all([
    readFile(new URL("../src/api.js", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.mjs", import.meta.url), "utf8")
  ]);
  assert.match(apiSource, /import\.meta\.env\?\.PROD\s*\?\s*["']https:\/\/api\.ssu-on\.com["']/);
  assert.match(configuration, /http:\/\/127\.0\.0\.1:7070/);
});

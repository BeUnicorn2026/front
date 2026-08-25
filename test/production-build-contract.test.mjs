import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Cloudflare build publishes verifiable commit metadata and runs the bundle gate", async () => {
  const [configuration, packageManifest] = await Promise.all([
    readFile(new URL("../vite.config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  assert.match(configuration, /CF_PAGES_COMMIT_SHA/);
  assert.match(configuration, /deployment\.json/);
  assert.match(packageManifest.scripts.build, /verify-production-build\.mjs/);
});

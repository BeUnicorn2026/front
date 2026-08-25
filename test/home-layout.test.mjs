import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home follows the reference hierarchy with profile, meeting rows, and one recording action", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const start = source.indexOf("function DashboardPage");
  const end = source.indexOf("function DocumentsPage", start);
  const dashboard = source.slice(start, end);

  assert.match(dashboard, /<Collapsible/);
  assert.match(dashboard, />참여한 회의</);
  assert.match(dashboard, /label="실시간 기록 시작"/);
  assert.match(dashboard, /<List hasDividers density="spacious">/);
  assert.doesNotMatch(dashboard, /<(?:div|span)(?:\s|>)/);
  assert.equal((dashboard.match(/label="실시간 기록 시작"/g) || []).length, 1);
});

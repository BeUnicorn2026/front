import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home copies the supplied expanding account, history, and room-code dock hierarchy", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const start = source.indexOf("function DashboardPage");
  const end = source.indexOf("function DocumentsPage", start);
  const dashboard = source.slice(start, end);

  assert.match(dashboard, /data-home-account/);
  assert.match(dashboard, />참여한 회의</);
  assert.match(dashboard, /data-home-dock/);
  assert.match(dashboard, /\["A", "7", "K", "2"\]/);
  assert.match(dashboard, /value="bio" label="자기소개"/);
  assert.match(dashboard, /value="settings" label="세팅"/);
  assert.match(dashboard, /value="account" label="계정"/);
  assert.match(dashboard, /event\.clientY > bounds\.top \+ bounds\.height \* 0\.7/);
  assert.match(dashboard, /if \(event\.key === "Enter" && ready\) onStart\(code\.join\(""\)\)/);
  assert.match(dashboard, />⏎</);
  assert.doesNotMatch(dashboard, /코드를 입력하고 Enter를 누르면/);
  assert.doesNotMatch(dashboard, /<(?:div|span)(?:\s|>)/);
});

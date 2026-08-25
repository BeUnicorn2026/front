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
  assert.match(dashboard, /label="플랜 및 결제" variant="primary" onClick=\{\(\) => onNavigate\("billing"\)\}/);
  assert.match(dashboard, /event\.clientY > bounds\.top \+ bounds\.height \* 0\.7/);
  assert.match(dashboard, /if \(event\.key === "Enter" && ready\) onStart\(code\.join\(""\)\)/);
  assert.match(dashboard, /if \(!focusedCode\) setDockUp\(false\)/);
  assert.doesNotMatch(dashboard, /codeTouched/);
  assert.doesNotMatch(dashboard, />⏎</);
  assert.doesNotMatch(dashboard, /코드를 입력하고 Enter를 누르면/);
  assert.doesNotMatch(dashboard, /<(?:div|span)(?:\s|>)/);
});

test("home removes the green navigation shell and keeps a white centered surface", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(source, /if \(page === "home"\) return <AppShell variant="surface" height="fill" contentPadding=\{0\}>\{content\}<\/AppShell>/);
  const start = source.indexOf("function DashboardPage");
  const end = source.indexOf("function DocumentsPage", start);
  const dashboard = source.slice(start, end);
  assert.match(dashboard, /background: "var\(--color-background-surface\)"/);
  assert.doesNotMatch(dashboard, /Voice Partition 홈 헤더/);
});

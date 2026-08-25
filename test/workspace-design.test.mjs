import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("character artwork has a restrained role across entry states", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");

  assert.match(source, /const MASCOT_ART = Object\.freeze/);
  assert.match(source, /kind="welcome" alt="로그인을 반기는 파란 캐릭터"/);
  assert.match(source, /kind="guide" alt="회의 기록을 안내하는 노란 캐릭터"/);
  assert.match(source, /kind="connecting" alt="회의실 연결을 준비하는 민트 캐릭터"/);
  assert.match(source, /src=\{MASCOT_ART\.empty\} name="첫 회의 안내"/);
  assert.doesNotMatch(source.slice(source.indexOf("function MeetingPage"), source.indexOf("function MeetingEntryScreen")), /<MascotArtwork/);
});

test("secondary workspace pages share the modern top navigation and surface shell", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const workspace = source.slice(source.indexOf("function Workspace"));

  assert.match(workspace, /<TopNav/);
  assert.match(workspace, /<TopNavHeading/);
  assert.match(workspace, /<TopNavItem/);
  assert.match(workspace, /return <AppShell topNav=\{navigation\} variant="surface"/);
  assert.doesNotMatch(workspace, /sideNav=\{navigation\}/);
  assert.doesNotMatch(workspace, /background: "var\(--brand-ink\)"/);
  assert.match(workspace, /\["documents", "회의 문서"/);
  assert.match(workspace, /\["dictionary", "용어 사전"/);
});

test("documents, dictionary, billing, and settings use capped content and row-first grouping", async () => {
  const [app, billing] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/features/billing/BillingPage.jsx", import.meta.url), "utf8")
  ]);

  const documents = app.slice(app.indexOf("function DocumentsPage"), app.indexOf("function DictionaryPage"));
  const dictionary = app.slice(app.indexOf("function DictionaryPage"), app.indexOf("function SettingsPage"));
  const settings = app.slice(app.indexOf("function SettingsPage"), app.indexOf("function Workspace"));

  assert.match(documents, /contentWidth=\{1040\}/);
  assert.match(documents, /<List[\s\S]*hasDividers[\s\S]*density="spacious"/);
  assert.match(dictionary, /contentWidth=\{1040\}/);
  assert.match(dictionary, /<Section variant="muted"/);
  assert.match(settings, /contentWidth=\{1120\}/);
  assert.match(settings, /title="설정"/);
  assert.match(billing, /contentWidth=\{1040\}/);
  assert.match(billing, /플랜과 사용량/);
  assert.match(billing, /<Section variant="muted"/);
});

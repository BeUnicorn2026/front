import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("../src/App.jsx", import.meta.url);

test("signup requires introduction while login sends only credentials", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const auth = source.slice(source.indexOf("function AuthScreen"), source.indexOf("function VocabularyOnboarding"));

  assert.match(auth, /introduction: ""/);
  assert.match(auth, /mode === "signup"[\s\S]*\{ name: form\.name, introduction: form\.introduction, email: form\.email, password: form\.password \}[\s\S]*\{ email: form\.email, password: form\.password \}/);
  assert.match(auth, /<TextArea label="자기소개"[\s\S]*maxLength=\{500\}[\s\S]*isRequired/);
});

test("app uses a strict session guard without mandatory vocabulary onboarding", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const app = source.slice(source.indexOf("export default function App"));

  assert.match(app, /context\?\.authenticated !== true \|\| !context\?\.user/);
  assert.doesNotMatch(app, /<VocabularyOnboarding/);
});

test("dashboard profile uses server context and CSRF-aware profile update", async () => {
  const source = await readFile(sourceUrl, "utf8");
  const dashboard = source.slice(source.indexOf("function DashboardPage"), source.indexOf("function DocumentsPage"));

  assert.match(dashboard, /context\.user\.introduction \|\| ""/);
  assert.match(dashboard, /context\.user\.name \|\| ""/);
  assert.match(dashboard, /putJson\("\/api\/profile", \{ name: profileName, introduction: profileIntroduction \}\)/);
  assert.match(dashboard, /label="표시 이름" value=\{profileName\}/);
  assert.match(dashboard, /onContextChange\(nextContext\)/);
  assert.doesNotMatch(dashboard, /localStorage/);
});

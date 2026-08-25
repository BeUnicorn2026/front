import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("classic JSX runtime has an explicit React binding in every JSX entry", async () => {
  const [configuration, app, main] = await Promise.all([
    readFile(new URL("../vite.config.mjs", import.meta.url), "utf8"),
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/main.jsx", import.meta.url), "utf8")
  ]);

  assert.match(configuration, /jsxRuntime:\s*["']classic["']/);
  assert.match(app, /import React,/);
  assert.match(main, /import React,/);
});

test("interim transcript status is not conditional on vocabulary matches", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const pendingStatus = source.indexOf('{segment.pending && <Token label="인식 중"');
  const termBlock = source.indexOf("{terms.length > 0 && (");
  assert.ok(pendingStatus >= 0);
  assert.ok(termBlock > pendingStatus);
});

test("page headers render the contextual descriptions supplied by each screen", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(source, /function PageHeader\(\{ title, description, endContent \}\)/);
  assert.match(source, /description && <Text[^>]*>\{description\}<\/Text>/);
});

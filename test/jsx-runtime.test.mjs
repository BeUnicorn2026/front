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

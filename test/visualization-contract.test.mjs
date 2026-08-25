import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("outline, tree, and mind map are three distinct real-data renderers", async () => {
  const source = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const outlineStart = source.indexOf("function StructureDiagram");
  const mindMapStart = source.indexOf("function MeetingMindMap");
  const outline = source.slice(outlineStart, mindMapStart);
  assert.ok(outlineStart >= 0 && mindMapStart > outlineStart);
  assert.match(outline, /buildStructureDiagramLayout\(blocks\)/);
  assert.match(outline, /<svg[\s\S]*markerEnd="url\(#structure-arrow\)"/);
  assert.match(outline, /role="button"[\s\S]*aria-pressed=\{selected\}/);
  assert.match(outline, /ArrowRight[\s\S]*ArrowLeft/);
  assert.match(source, /<TreeList items=\{tree\}/);
  assert.match(source, /<MeetingMindMap blocks=\{blocks\}/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { workspacePageFromPath, workspacePathForPage } from "../src/data/navigation.js";

test("maps every workspace destination to a stable browser path", () => {
  assert.equal(workspacePathForPage("record"), "/record");
  assert.equal(workspacePageFromPath("/documents/"), "documents");
  assert.equal(workspacePageFromPath("/dictionary?source=meeting"), "dictionary");
  assert.equal(workspacePageFromPath("/unknown"), "home");
});

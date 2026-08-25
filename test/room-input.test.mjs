import assert from "node:assert/strict";
import test from "node:test";
import {
  isEditableTarget,
  normalizeRoomCode,
  printableRoomCharacter,
  roomCodeKeyAction,
  updateRoomCode
} from "../src/features/meeting/roomInput.js";

test("normalizes NFKC room input to four uppercase ASCII alphanumerics", () => {
  assert.equal(normalizeRoomCode("ａｂ１２-çZ"), "AB12");
  assert.equal(updateRoomCode("AB", "a b-c_d5"), "ABCD");
  assert.equal(normalizeRoomCode(null), "");
});

test("handles Backspace and Enter without submitting repeats or IME input", () => {
  assert.deepEqual(roomCodeKeyAction("AB12", { key: "Backspace" }), {
    code: "AB1", handled: true, submit: false
  });
  assert.equal(roomCodeKeyAction("AB12", { key: "Enter", repeat: false }).submit, true);
  assert.equal(roomCodeKeyAction("AB12", { key: "Enter", repeat: true }).submit, false);
  assert.deepEqual(roomCodeKeyAction("AB12", { key: "Enter", isComposing: true }), {
    code: "AB12", handled: false, submit: false
  });
});

test("recognizes editable targets and filters global printable keys", () => {
  assert.equal(isEditableTarget({ tagName: "TEXTAREA", isContentEditable: false }), true);
  assert.equal(isEditableTarget({ tagName: "SECTION", isContentEditable: false }), false);
  assert.equal(printableRoomCharacter({ key: "ａ" }), "A");
  assert.equal(printableRoomCharacter({ key: "a", metaKey: true }), "");
  assert.equal(printableRoomCharacter({ key: "Process", isComposing: true }), "");
});

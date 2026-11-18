import assert from "node:assert/strict";
import test from "node:test";
import {
  isEditableTarget,
  normalizeRoomCode,
  printableRoomCharacter,
  roomEntryAction,
  roomCodeKeyAction,
  updateRoomCode
} from "../src/features/meeting/roomInput.js";

test("normalizes NFKC room input to four uppercase ASCII alphanumerics", () => {
  assert.equal(normalizeRoomCode("ａｂ１２-çZ"), "AB12");
  assert.equal(updateRoomCode("AB", "a b-c_d5"), "ABCD");
  assert.equal(normalizeRoomCode(null), "");
});

test("accepts only ROOM creation or a four-digit join on Enter", () => {
  assert.deepEqual(roomCodeKeyAction("AB12", { key: "Backspace" }), {
    code: "AB1", handled: true, submit: false
  });
  assert.deepEqual(roomEntryAction("ROOM"), { type: "create", code: "ROOM" });
  assert.deepEqual(roomEntryAction("1234"), { type: "join", code: "1234" });
  assert.equal(roomEntryAction("AB12").type, "invalid");
  assert.equal(roomCodeKeyAction("ROOM", { key: "Enter", repeat: false }).submit, true);
  assert.equal(roomCodeKeyAction("1234", { key: "Enter", repeat: false }).submit, true);
  assert.equal(roomCodeKeyAction("AB12", { key: "Enter", repeat: false }).submit, false);
  assert.equal(roomCodeKeyAction("ROOM", { key: "Enter", repeat: true }).submit, false);
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

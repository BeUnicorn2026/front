export const ROOM_CODE_LENGTH = 4;

export function normalizeRoomCode(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, ROOM_CODE_LENGTH);
}

export function updateRoomCode(_currentCode, nextValue) {
  return normalizeRoomCode(nextValue);
}

export function roomCodeKeyAction(code, event) {
  const currentCode = normalizeRoomCode(code);
  if (event?.isComposing || event?.keyCode === 229) {
    return { code: currentCode, handled: false, submit: false };
  }
  if (event?.key === "Backspace") {
    return { code: currentCode.slice(0, -1), handled: true, submit: false };
  }
  if (event?.key === "Enter") {
    return {
      code: currentCode,
      handled: true,
      submit: currentCode.length === ROOM_CODE_LENGTH && !event.repeat
    };
  }
  return { code: currentCode, handled: false, submit: false };
}

export function isEditableTarget(target) {
  if (!target || typeof target !== "object") return false;
  const tagName = String(target.tagName || "").toUpperCase();
  return target.isContentEditable === true
    || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tagName)
    || typeof target.closest === "function" && Boolean(target.closest("[contenteditable='true'], input, textarea, select, button"));
}

export function printableRoomCharacter(event) {
  if (!event || event.isComposing || event.keyCode === 229 || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return "";
  if (typeof event.key !== "string" || event.key.length !== 1) return "";
  return normalizeRoomCode(event.key);
}

const EDITABLE_TARGET_SELECTOR =
  "input, textarea, select, [contenteditable=''], [contenteditable='true']";

export const REVIEW_CONSOLE_SHORTCUT_HINTS = Object.freeze([
  { key: "/", label: "Focus search" },
  { key: "J", label: "Next visible" },
  { key: "K", label: "Previous visible" },
  { key: "N", label: "Next pending" },
  { key: "A", label: "Approve" },
  { key: "E", label: "Mark edited" },
  { key: "X", label: "Reject" }
]);

export function resolveKeyboardShortcut(event) {
  if (!event || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
    return null;
  }

  if (isEditableTarget(event.target)) {
    return null;
  }

  const normalizedKey = normalizeKey(event.key);
  if (!normalizedKey) {
    return null;
  }

  if (normalizedKey === "/") {
    return { command: "focus_search" };
  }

  if (normalizedKey === "j") {
    return { command: "select_next_visible" };
  }

  if (normalizedKey === "k") {
    return { command: "select_previous_visible" };
  }

  if (normalizedKey === "n") {
    return { command: "select_next_pending" };
  }

  if (normalizedKey === "a") {
    return { command: "review_action", action: "approve" };
  }

  if (normalizedKey === "e") {
    return { command: "review_action", action: "edit" };
  }

  if (normalizedKey === "x") {
    return { command: "review_action", action: "reject" };
  }

  return null;
}

function isEditableTarget(target) {
  if (!target || typeof target !== "object") {
    return false;
  }

  if (typeof target.closest === "function") {
    return Boolean(target.closest(EDITABLE_TARGET_SELECTOR));
  }

  const tagName = typeof target.tagName === "string" ? target.tagName.toLowerCase() : "";
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  return target.contentEditable === "true" || target.contentEditable === "";
}

function normalizeKey(key) {
  if (typeof key !== "string" || !key) {
    return null;
  }

  return key.length === 1 ? key.toLowerCase() : key;
}

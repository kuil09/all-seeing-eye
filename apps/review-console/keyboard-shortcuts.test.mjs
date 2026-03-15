import assert from "node:assert/strict";
import test from "node:test";

import {
  REVIEW_CONSOLE_SHORTCUT_HINTS,
  resolveKeyboardShortcut
} from "./keyboard-shortcuts.mjs";

test("shortcut hints document the analyst queue workflow order", () => {
  assert.deepEqual(
    REVIEW_CONSOLE_SHORTCUT_HINTS,
    [
      { key: "/", label: "Focus search" },
      { key: "[", label: "Previous search match" },
      { key: "]", label: "Next search match" },
      { key: "J", label: "Next visible" },
      { key: "K", label: "Previous visible" },
      { key: "N", label: "Next pending" },
      { key: "A", label: "Approve" },
      { key: "E", label: "Mark edited" },
      { key: "X", label: "Reject" }
    ]
  );
});

test("resolveKeyboardShortcut maps queue navigation keys", () => {
  assert.deepEqual(resolveKeyboardShortcut(createKeyboardEvent("[")), {
    command: "focus_previous_search_match"
  });
  assert.deepEqual(resolveKeyboardShortcut(createKeyboardEvent("]")), {
    command: "focus_next_search_match"
  });
  assert.deepEqual(resolveKeyboardShortcut(createKeyboardEvent("j")), {
    command: "select_next_visible"
  });
  assert.deepEqual(resolveKeyboardShortcut(createKeyboardEvent("k")), {
    command: "select_previous_visible"
  });
  assert.deepEqual(resolveKeyboardShortcut(createKeyboardEvent("n")), {
    command: "select_next_pending"
  });
});

test("resolveKeyboardShortcut maps review action keys and search focus", () => {
  assert.deepEqual(resolveKeyboardShortcut(createKeyboardEvent("/")), {
    command: "focus_search"
  });
  assert.deepEqual(resolveKeyboardShortcut(createKeyboardEvent("a")), {
    command: "review_action",
    action: "approve"
  });
  assert.deepEqual(resolveKeyboardShortcut(createKeyboardEvent("e")), {
    command: "review_action",
    action: "edit"
  });
  assert.deepEqual(resolveKeyboardShortcut(createKeyboardEvent("x")), {
    command: "review_action",
    action: "reject"
  });
});

test("resolveKeyboardShortcut ignores editable targets and modifier keys", () => {
  assert.equal(
    resolveKeyboardShortcut(
      createKeyboardEvent("j", {
        target: {
          closest() {
            return {};
          }
        }
      })
    ),
    null
  );
  assert.equal(resolveKeyboardShortcut(createKeyboardEvent("j", { ctrlKey: true })), null);
  assert.equal(resolveKeyboardShortcut(createKeyboardEvent("j", { altKey: true })), null);
  assert.equal(resolveKeyboardShortcut(createKeyboardEvent("j", { metaKey: true })), null);
  assert.equal(resolveKeyboardShortcut(createKeyboardEvent("j", { defaultPrevented: true })), null);
});

function createKeyboardEvent(key, overrides = {}) {
  return {
    key,
    altKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    metaKey: false,
    target: {
      closest() {
        return null;
      }
    },
    ...overrides
  };
}

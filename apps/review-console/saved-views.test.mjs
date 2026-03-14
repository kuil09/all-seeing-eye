import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSavedViewId,
  createSavedViewFilters,
  deleteSavedView,
  findMatchingSavedView,
  normalizeSavedViewLabel,
  readSavedViews,
  serializeSavedViews,
  upsertSavedView
} from "./saved-views.mjs";

test("normalizeSavedViewLabel trims and collapses whitespace", () => {
  assert.equal(normalizeSavedViewLabel("  Ports   needing edits  "), "Ports needing edits");
});

test("upsertSavedView stores normalized filters and overwrites matching labels", () => {
  const savedViews = upsertSavedView(
    upsertSavedView([], "Pending high", {
      searchQuery: " Harbor ",
      reviewStatusFilter: "pending_review",
      confidenceFilter: "high",
      tagFilter: "ports",
      draftFilter: "saved"
    }),
    " pending   HIGH ",
    {
      searchQuery: "inspections",
      reviewStatusFilter: "approved",
      confidenceFilter: "medium",
      tagFilter: "infrastructure",
      draftFilter: "all"
    }
  );

  assert.deepEqual(savedViews, [
    {
      id: "pending high",
      label: "pending HIGH",
      filters: {
        searchQuery: "inspections",
        reviewStatusFilter: "approved",
        confidenceFilter: "medium",
        tagFilter: "infrastructure",
        draftFilter: "all"
      }
    }
  ]);
});

test("findMatchingSavedView compares the full normalized filter snapshot", () => {
  const savedViews = [
    {
      id: buildSavedViewId("Saved drafts"),
      label: "Saved drafts",
      filters: createSavedViewFilters({
        searchQuery: "",
        reviewStatusFilter: "all",
        confidenceFilter: "all",
        tagFilter: "all",
        draftFilter: "saved"
      })
    }
  ];

  assert.deepEqual(
    findMatchingSavedView(savedViews, {
      searchQuery: "",
      reviewStatusFilter: "all",
      confidenceFilter: "all",
      tagFilter: "all",
      draftFilter: "saved"
    }),
    savedViews[0]
  );
  assert.equal(
    findMatchingSavedView(savedViews, {
      searchQuery: "",
      reviewStatusFilter: "pending_review",
      confidenceFilter: "all",
      tagFilter: "all",
      draftFilter: "saved"
    }),
    null
  );
});

test("deleteSavedView removes the matching preset id", () => {
  assert.deepEqual(
    deleteSavedView(
      [
        { id: "pending high", label: "Pending high", filters: createSavedViewFilters({}) },
        { id: "saved drafts", label: "Saved drafts", filters: createSavedViewFilters({}) }
      ],
      "pending high"
    ),
    [{ id: "saved drafts", label: "Saved drafts", filters: createSavedViewFilters({}) }]
  );
});

test("readSavedViews and serializeSavedViews keep only valid presets", () => {
  const savedViews = readSavedViews(
    JSON.stringify([
      {
        label: "  Pending low  ",
        filters: {
          searchQuery: " docks ",
          reviewStatusFilter: "pending_review",
          confidenceFilter: "low",
          tagFilter: "ports",
          draftFilter: "all"
        }
      },
      {
        label: "   ",
        filters: {}
      },
      "ignored"
    ])
  );

  assert.deepEqual(savedViews, [
    {
      id: "pending low",
      label: "Pending low",
      filters: {
        searchQuery: "docks",
        reviewStatusFilter: "pending_review",
        confidenceFilter: "low",
        tagFilter: "ports",
        draftFilter: "all"
      }
    }
  ]);

  assert.equal(
    serializeSavedViews(savedViews),
    JSON.stringify([
      {
        id: "pending low",
        label: "Pending low",
        filters: {
          searchQuery: "docks",
          reviewStatusFilter: "pending_review",
          confidenceFilter: "low",
          tagFilter: "ports",
          draftFilter: "all"
        }
      }
    ])
  );
});

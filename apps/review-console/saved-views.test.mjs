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
import { SORT_LOWEST_CONFIDENCE } from "./timeline-sort.mjs";

test("normalizeSavedViewLabel trims and collapses whitespace", () => {
  assert.equal(normalizeSavedViewLabel("  Ports   needing edits  "), "Ports needing edits");
});

test("upsertSavedView stores normalized filters and overwrites matching labels", () => {
  const savedViews = upsertSavedView(
    upsertSavedView([], "Pending high", {
      searchQuery: " Harbor ",
      reviewStatusFilter: "pending_review",
      confidenceFilter: "high",
      historyFilter: "reviewed",
      tagFilter: "ports",
      draftFilter: "saved",
      sortOrder: "most_sources"
    }),
    " pending   HIGH ",
    {
      searchQuery: "inspections",
      reviewStatusFilter: "approved",
      confidenceFilter: "medium",
      historyFilter: "unreviewed",
      tagFilter: "infrastructure",
      draftFilter: "all",
      sortOrder: SORT_LOWEST_CONFIDENCE
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
        historyFilter: "unreviewed",
        tagFilter: "infrastructure",
        draftFilter: "all",
        sortOrder: SORT_LOWEST_CONFIDENCE
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
        historyFilter: "reviewed",
        tagFilter: "all",
        draftFilter: "saved",
        sortOrder: "pending_first"
      })
    }
  ];

  assert.deepEqual(
    findMatchingSavedView(savedViews, {
      searchQuery: "",
      reviewStatusFilter: "all",
      confidenceFilter: "all",
      historyFilter: "reviewed",
      tagFilter: "all",
      draftFilter: "saved",
      sortOrder: "pending_first"
    }),
    savedViews[0]
  );
  assert.equal(
    findMatchingSavedView(savedViews, {
      searchQuery: "",
      reviewStatusFilter: "pending_review",
      confidenceFilter: "all",
      historyFilter: "reviewed",
      tagFilter: "all",
      draftFilter: "saved",
      sortOrder: "pending_first"
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
          historyFilter: "reviewed",
          tagFilter: "ports",
          draftFilter: "all",
          sortOrder: SORT_LOWEST_CONFIDENCE
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
        historyFilter: "reviewed",
        tagFilter: "ports",
        draftFilter: "all",
        sortOrder: SORT_LOWEST_CONFIDENCE
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
          historyFilter: "reviewed",
          tagFilter: "ports",
          draftFilter: "all",
          sortOrder: SORT_LOWEST_CONFIDENCE
        }
      }
    ])
  );
});

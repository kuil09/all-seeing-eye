import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTimelineSearchMatches,
  buildTimelineSearchText,
  matchesTimelineSearchQuery,
  resolveAdjacentSearchFocusTarget
} from "./timeline-search.mjs";

test("matchesTimelineSearchQuery treats empty input as a match", () => {
  assert.equal(matchesTimelineSearchQuery("", { headline: "Harbor queue" }, null), true);
});

test("matchesTimelineSearchQuery finds claim, entity, source, and review history detail", () => {
  const timelineItem = {
    headline: "Inspection surge reported at Harbor North cargo terminal",
    summary: "Two curated sources point to increased cargo inspections.",
    primaryLocation: "Harbor North",
    reviewStatus: "edited",
    confidence: { label: "high" },
    tags: ["logistics", "port"]
  };
  const detail = {
    event: {
      headline: timelineItem.headline,
      summary: timelineItem.summary,
      primaryLocation: timelineItem.primaryLocation,
      reviewStatus: timelineItem.reviewStatus,
      confidence: timelineItem.confidence
    },
    claims: [
      {
        claimType: "operational_impact",
        claimText: "Container processing delays reached three to five hours.",
        polarity: "asserted"
      }
    ],
    entities: [
      {
        canonicalName: "Harbor North Port Authority",
        entityType: "organization",
        role: "operator"
      }
    ],
    relationships: [{ relationshipType: "operates", confidence: "high" }],
    sources: [
      {
        title: "Members report cargo delays at Harbor North terminal",
        feedKey: "coastal-shipping-association",
        excerpt: "Association members reported three to five hour outbound delays.",
        sourceUrl: "https://example.org/harbor-delay"
      }
    ],
    reviewActions: [
      {
        actorName: "Analyst Kim",
        action: "edit",
        notes: "Waiting for one more source before approving."
      }
    ]
  };

  assert.equal(matchesTimelineSearchQuery("three to five hours", timelineItem, detail), true);
  assert.equal(matchesTimelineSearchQuery("port authority", timelineItem, detail), true);
  assert.equal(matchesTimelineSearchQuery("coastal-shipping-association", timelineItem, detail), true);
  assert.equal(matchesTimelineSearchQuery("analyst kim", timelineItem, detail), true);
  assert.equal(matchesTimelineSearchQuery("waiting for one more source", timelineItem, detail), true);
});

test("buildTimelineSearchMatches explains which hidden sections matched the query", () => {
  const timelineItem = {
    headline: "Inspection surge reported at Harbor North cargo terminal",
    summary: "Two curated sources point to increased cargo inspections.",
    primaryLocation: "Harbor North",
    reviewStatus: "edited",
    confidence: { label: "high" },
    tags: ["logistics", "port"]
  };
  const detail = {
    event: {
      headline: timelineItem.headline,
      summary: timelineItem.summary,
      primaryLocation: timelineItem.primaryLocation,
      reviewStatus: timelineItem.reviewStatus,
      confidence: timelineItem.confidence
    },
    claims: [
      {
        claimType: "operational_impact",
        claimText: "Container processing delays reached three to five hours.",
        polarity: "asserted"
      }
    ],
    entities: [
      {
        canonicalName: "Harbor North Port Authority",
        entityType: "organization",
        role: "operator"
      }
    ],
    relationships: [{ relationshipType: "operates", confidence: "high" }],
    sources: [
      {
        title: "Members report cargo delays at Harbor North terminal",
        feedKey: "coastal-shipping-association",
        excerpt: "Association members reported three to five hour outbound delays.",
        sourceUrl: "https://example.org/harbor-delay"
      }
    ],
    reviewActions: [
      {
        actorName: "Analyst Kim",
        action: "edit",
        notes: "Waiting for one more source before approving."
      }
    ]
  };

  assert.deepEqual(
    buildTimelineSearchMatches("coastal-shipping-association", timelineItem, detail),
    [
      {
        label: "Source",
        preview: "coastal-shipping-association",
        detailSectionId: "detail-provenance"
      }
    ]
  );
  assert.deepEqual(buildTimelineSearchMatches("port authority", timelineItem, detail), [
    {
      label: "Participant",
      preview: "Harbor North Port Authority",
      detailSectionId: "detail-entities"
    }
  ]);
  assert.deepEqual(buildTimelineSearchMatches("waiting for one more source", timelineItem, detail), [
    {
      label: "Review history",
      preview: "Waiting for one more source before approving.",
      detailSectionId: "detail-review-history"
    }
  ]);
});

test("buildTimelineSearchText normalizes whitespace and casing across fields", () => {
  const searchText = buildTimelineSearchText(
    {
      headline: " Storm Outage ",
      tags: ["Infrastructure"]
    },
    {
      entities: [{ canonicalName: "East Grid", role: "operator" }]
    }
  );

  assert.equal(searchText, "storm outage infrastructure east grid operator");
});

test("resolveAdjacentSearchFocusTarget cycles across matched detail sections", () => {
  const searchMatches = [
    {
      label: "Claim",
      preview: "Container processing delays reached three to five hours.",
      detailSectionId: "detail-claims"
    },
    {
      label: "Participant",
      preview: "Harbor North Port Authority",
      detailSectionId: "detail-entities"
    },
    {
      label: "Source",
      preview: "coastal-shipping-association",
      detailSectionId: "detail-provenance"
    }
  ];

  assert.equal(
    resolveAdjacentSearchFocusTarget(searchMatches, "detail-claims", "next"),
    "detail-entities"
  );
  assert.equal(
    resolveAdjacentSearchFocusTarget(searchMatches, "detail-provenance", "next"),
    "detail-claims"
  );
  assert.equal(
    resolveAdjacentSearchFocusTarget(searchMatches, "detail-claims", "previous"),
    "detail-provenance"
  );
  assert.equal(
    resolveAdjacentSearchFocusTarget(searchMatches, "detail-review-history", "previous"),
    "detail-provenance"
  );
  assert.equal(resolveAdjacentSearchFocusTarget([], null, "next"), null);
});

test("matchesTimelineSearchQuery returns false when the query is absent", () => {
  const timelineItem = {
    headline: "Storm-related outage affects East Grid substation 7",
    summary: "A utility bulletin and weather operations feed both indicate an outage.",
    primaryLocation: "East Grid substation 7",
    confidence: { label: "medium" },
    tags: ["infrastructure"]
  };

  assert.equal(matchesTimelineSearchQuery("harbor north", timelineItem, null), false);
});

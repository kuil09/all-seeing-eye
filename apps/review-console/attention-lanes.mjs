import { hasReviewDraft } from "./review-draft-state.mjs";
import { hasReviewHistory } from "./review-history-summary.mjs";
import {
  DRAFT_FILTER_ALL,
  DRAFT_FILTER_SAVED,
  HISTORY_FILTER_ALL,
  HISTORY_FILTER_REVIEWED
} from "./view-state.mjs";

const ATTENTION_PRESETS = [
  {
    id: "saved_drafts",
    label: "Saved drafts",
    reviewStatusFilter: "all",
    confidenceFilter: "all",
    draftFilter: DRAFT_FILTER_SAVED,
    historyFilter: HISTORY_FILTER_ALL,
    matches(item, reviewDrafts) {
      return hasReviewDraft(reviewDrafts, item.eventId);
    }
  },
  {
    id: "pending_revisits",
    label: "Pending revisits",
    reviewStatusFilter: "pending_review",
    confidenceFilter: "all",
    draftFilter: DRAFT_FILTER_ALL,
    historyFilter: HISTORY_FILTER_REVIEWED,
    matches(item, reviewDrafts, detailsByEventId) {
      return (
        item.reviewStatus === "pending_review" &&
        hasReviewHistory(detailsByEventId[item.eventId]?.reviewActions)
      );
    }
  },
  {
    id: "reviewed_before",
    label: "Reviewed before",
    reviewStatusFilter: "all",
    confidenceFilter: "all",
    draftFilter: DRAFT_FILTER_ALL,
    historyFilter: HISTORY_FILTER_REVIEWED,
    matches(item, reviewDrafts, detailsByEventId) {
      return hasReviewHistory(detailsByEventId[item.eventId]?.reviewActions);
    }
  },
  {
    id: "pending_high",
    label: "Pending + high",
    reviewStatusFilter: "pending_review",
    confidenceFilter: "high",
    draftFilter: DRAFT_FILTER_ALL,
    historyFilter: HISTORY_FILTER_ALL,
    matches(item) {
      return item.reviewStatus === "pending_review" && item.confidence?.label === "high";
    }
  },
  {
    id: "pending_medium",
    label: "Pending + medium",
    reviewStatusFilter: "pending_review",
    confidenceFilter: "medium",
    draftFilter: DRAFT_FILTER_ALL,
    historyFilter: HISTORY_FILTER_ALL,
    matches(item) {
      return item.reviewStatus === "pending_review" && item.confidence?.label === "medium";
    }
  },
  {
    id: "pending_low",
    label: "Pending + low",
    reviewStatusFilter: "pending_review",
    confidenceFilter: "low",
    draftFilter: DRAFT_FILTER_ALL,
    historyFilter: HISTORY_FILTER_ALL,
    matches(item) {
      return item.reviewStatus === "pending_review" && item.confidence?.label === "low";
    }
  }
];

export function buildAttentionLanes(
  timelineItems,
  reviewDrafts,
  {
    detailsByEventId = {},
    reviewStatusFilter = "all",
    confidenceFilter = "all",
    draftFilter = DRAFT_FILTER_ALL,
    historyFilter = HISTORY_FILTER_ALL
  } = {}
) {
  return ATTENTION_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    count: timelineItems.filter((item) => preset.matches(item, reviewDrafts, detailsByEventId)).length,
    reviewStatusFilter: preset.reviewStatusFilter,
    confidenceFilter: preset.confidenceFilter,
    draftFilter: preset.draftFilter,
    historyFilter: preset.historyFilter,
    isActive:
      preset.reviewStatusFilter === reviewStatusFilter &&
      preset.confidenceFilter === confidenceFilter &&
      preset.draftFilter === draftFilter &&
      preset.historyFilter === historyFilter
  }));
}

export function resolveAttentionLane(id) {
  return ATTENTION_PRESETS.find((preset) => preset.id === id) ?? null;
}

import { buildFixtureState } from "../../packages/contracts/bootstrap-fixtures.mjs";
import {
  getReviewActionValidationError,
  sanitizeReviewNotes
} from "../../packages/contracts/review-action-policy.mjs";
import {
  buildAttentionLanes,
  resolveAttentionLane
} from "./attention-lanes.mjs";
import { buildConfidenceSummary } from "./confidence-summary.mjs";
import {
  createEntityLookup,
  formatRelationshipDisplay
} from "./detail-formatters.mjs";
import { buildFilterSummary } from "./filter-summary.mjs";
import {
  REVIEW_CONSOLE_SHORTCUT_HINTS,
  resolveKeyboardShortcut
} from "./keyboard-shortcuts.mjs";
import { buildQueueDistribution } from "./queue-distribution.mjs";
import {
  buildReviewDraftPreview,
  clearReviewDraft,
  getReviewDraft,
  hasReviewDraft,
  pruneReviewDrafts,
  readReviewDrafts,
  serializeReviewDrafts,
  setReviewDraft
} from "./review-draft-state.mjs";
import {
  applyReviewNoteSuggestion,
  buildReviewNoteSuggestions
} from "./review-note-suggestions.mjs";
import {
  appendRecentReviewActivity,
  pruneRecentReviewActivity,
  readRecentReviewActivity,
  serializeRecentReviewActivity
} from "./recent-review-activity.mjs";
import {
  deleteSavedView,
  findMatchingSavedView,
  normalizeSavedViewLabel,
  readSavedViews,
  serializeSavedViews,
  upsertSavedView
} from "./saved-views.mjs";
import {
  buildReviewHistorySummary,
  formatReviewActionCount,
  hasReviewHistory
} from "./review-history-summary.mjs";
import { buildReviewQueueContext } from "./review-queue-context.mjs";
import {
  buildReviewQueueNavigation,
  resolveNextPendingEventId
} from "./review-queue-navigation.mjs";
import {
  buildSourceProvenanceSummary,
  formatSourceRelativeTiming
} from "./source-provenance-summary.mjs";
import { buildSourceProofSnapshotBundle } from "./source-proof-snapshot.mjs";
import {
  DEFAULT_TIMELINE_SORT,
  SORT_PENDING_FIRST,
  sortTimelineItems
} from "./timeline-sort.mjs";
import { buildTimelineEntitySummary } from "./timeline-entity-summary.mjs";
import {
  buildTimelineSearchMatches,
  matchesTimelineSearchQuery,
  resolveAdjacentSearchFocusTarget
} from "./timeline-search.mjs";
import {
  buildViewHandoffNote,
  buildViewHandoffPreviewItems,
  buildViewHandoffSummary
} from "./view-handoff.mjs";
import {
  buildUrlSearch,
  createInitialUiState,
  DEMO_EMPTY,
  DEMO_ERROR,
  DEMO_NORMAL,
  DRAFT_FILTER_ALL,
  DRAFT_FILTER_SAVED,
  HISTORY_FILTER_ALL,
  HISTORY_FILTER_REVIEWED,
  reconcileSelectedEventId,
  SOURCE_API,
  SOURCE_FIXTURES
} from "./view-state.mjs";

const initialUiState = createInitialUiState(window.location.search);
const SAVED_VIEWS_STORAGE_KEY = "all-seeing-eye.review-console.saved-views.v1";
const REVIEW_DRAFT_STORAGE_KEY = "all-seeing-eye.review-console.drafts.v1";
const REVIEW_ACTIVITY_STORAGE_KEY = "all-seeing-eye.review-console.recent-activity.v1";
const DETAIL_FOCUS_HIGHLIGHT_MS = 1800;
const HANDOFF_DRAFT_PREVIEW_MAX_LENGTH = 240;

const state = {
  sourceMode: initialUiState.sourceMode,
  demoMode: initialUiState.demoMode,
  searchQuery: initialUiState.searchQuery,
  reviewStatusFilter: initialUiState.reviewStatusFilter,
  confidenceFilter: initialUiState.confidenceFilter,
  sortOrder: initialUiState.sortOrder,
  historyFilter: initialUiState.historyFilter,
  tagFilter: initialUiState.tagFilter,
  draftFilter: initialUiState.draftFilter,
  data: null,
  selectedEventId: initialUiState.selectedEventId,
  activeSearchFocusEventId: initialUiState.activeSearchFocusTarget
    ? initialUiState.selectedEventId
    : null,
  activeSearchFocusTarget: initialUiState.activeSearchFocusTarget,
  reviewDrafts: loadReviewDrafts(),
  recentReviewActivity: loadRecentReviewActivity(),
  savedViews: loadSavedViews(),
  savedViewName: "",
  shareViewMessage: "",
  shareViewMessageTone: "",
  loadError: "",
  actionError: "",
  lastActionMessage: "",
  isSubmittingReviewAction: false
};

let detailFocusTimeoutId = 0;
let shareViewFeedbackTimeoutId = 0;
let pendingSearchFocusRestore = Boolean(
  initialUiState.selectedEventId && initialUiState.activeSearchFocusTarget
);
let lastRestoredSearchFocusKey = "";

const elements = {
  activeFilterSummary: document.querySelector("#active-filter-summary"),
  bannerMessage: document.querySelector("#banner-message"),
  confidenceFilter: document.querySelector("#confidence-filter"),
  dataSourceLabel: document.querySelector("#data-source-label"),
  deleteActiveView: document.querySelector("#delete-active-view"),
  demoButtons: document.querySelectorAll("[data-demo-mode]"),
  detailPanel: document.querySelector("#detail-panel"),
  emptyState: document.querySelector("#empty-state"),
  errorMessage: document.querySelector("#error-message"),
  errorState: document.querySelector("#error-state"),
  fallbackButton: document.querySelector("#fallback-button"),
  generatedAt: document.querySelector("#generated-at"),
  historyFilter: document.querySelector("#history-filter"),
  pendingCount: document.querySelector("#pending-count"),
  recentReviewActivity: document.querySelector("#recent-review-activity"),
  saveCurrentView: document.querySelector("#save-current-view"),
  savedViewList: document.querySelector("#saved-view-list"),
  savedViewName: document.querySelector("#saved-view-name"),
  searchInput: document.querySelector("#search-input"),
  sortOrder: document.querySelector("#sort-order"),
  sourceButtons: document.querySelectorAll("[data-source-mode]"),
  statusFilter: document.querySelector("#status-filter"),
  tagFilter: document.querySelector("#tag-filter"),
  timelineHeading: document.querySelector("#timeline-heading"),
  timelineList: document.querySelector("#timeline-list"),
  timelineMeta: document.querySelector("#timeline-meta"),
  viewHandoffPanel: document.querySelector("#view-handoff-panel")
};

syncControlsFromState();
bindEvents();
void refreshData();

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value.trim().toLowerCase();
    syncUrl();
    render();
  });

  elements.statusFilter.addEventListener("change", (event) => {
    state.reviewStatusFilter = event.target.value;
    syncUrl();
    render();
  });

  elements.confidenceFilter.addEventListener("change", (event) => {
    state.confidenceFilter = event.target.value;
    syncUrl();
    render();
  });

  elements.sortOrder.addEventListener("change", (event) => {
    state.sortOrder = event.target.value;
    syncUrl();
    render();
  });

  elements.historyFilter.addEventListener("change", (event) => {
    state.historyFilter = event.target.value;
    syncUrl();
    render();
  });

  elements.tagFilter.addEventListener("change", (event) => {
    state.tagFilter = event.target.value;
    syncUrl();
    render();
  });

  elements.savedViewName.addEventListener("input", (event) => {
    state.savedViewName = event.target.value;
    renderSavedViews();
  });

  elements.savedViewName.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    saveCurrentView();
  });

  elements.saveCurrentView.addEventListener("click", () => {
    saveCurrentView();
  });

  elements.deleteActiveView.addEventListener("click", () => {
    deleteActiveSavedView();
  });

  for (const button of elements.sourceButtons) {
    button.addEventListener("click", async () => {
      const nextSourceMode = button.dataset.sourceMode;
      if (!nextSourceMode || nextSourceMode === state.sourceMode) {
        return;
      }

      state.sourceMode = nextSourceMode;
      syncUrl();
      await refreshData();
    });
  }

  for (const button of elements.demoButtons) {
    button.addEventListener("click", () => {
      const nextDemoMode = button.dataset.demoMode;
      if (!nextDemoMode || nextDemoMode === state.demoMode) {
        return;
      }

      state.demoMode = nextDemoMode;
      syncUrl();
      render();
    });
  }

  elements.fallbackButton.addEventListener("click", async () => {
    state.sourceMode = SOURCE_FIXTURES;
    state.demoMode = DEMO_NORMAL;
    syncUrl();
    await refreshData();
  });

  document.addEventListener("click", (event) => {
    const clearFiltersButton = event.target.closest("[data-clear-filters]");
    if (clearFiltersButton) {
      clearActiveFilters();
      return;
    }

    const copyViewLinkButton = event.target.closest("[data-copy-view-link]");
    if (copyViewLinkButton) {
      void copyCurrentViewLink();
      return;
    }

    const copyPortableViewLinkButton = event.target.closest("[data-copy-portable-view-link]");
    if (copyPortableViewLinkButton) {
      void copyCurrentViewLink({ portable: true });
      return;
    }

    const copyNextPendingViewLinkButton = event.target.closest(
      "[data-copy-next-pending-link]"
    );
    if (copyNextPendingViewLinkButton) {
      void copyNextPendingViewLink();
      return;
    }

    const copyHandoffNoteButton = event.target.closest("[data-copy-handoff-note]");
    if (copyHandoffNoteButton) {
      void copyViewHandoffNote();
      return;
    }

    const savedViewButton = event.target.closest("[data-saved-view-id]");
    if (savedViewButton) {
      const savedViewId = savedViewButton.getAttribute("data-saved-view-id");
      const savedView = state.savedViews.find((entry) => entry.id === savedViewId);
      if (savedView) {
        applySavedView(savedView);
      }
      return;
    }

    const reviewActivityButton = event.target.closest("[data-review-activity-event-id]");
    if (reviewActivityButton) {
      const eventId = reviewActivityButton.getAttribute("data-review-activity-event-id");
      const reviewActivityEntry = state.recentReviewActivity.find(
        (entry) => entry.eventId === eventId
      );
      if (reviewActivityEntry) {
        applyRecentReviewActivity(reviewActivityEntry);
      }
      return;
    }

    const reopenLastReviewedButton = event.target.closest("[data-reopen-last-reviewed]");
    if (reopenLastReviewedButton) {
      const reviewActivityEntry = getLastActionRecoveryEntry();
      if (reviewActivityEntry) {
        state.lastActionMessage = "";
        applyRecentReviewActivity(reviewActivityEntry);
      }
      return;
    }

    const quickStatusButton = event.target.closest("[data-quick-status]");
    if (quickStatusButton) {
      const nextStatusFilter = quickStatusButton.getAttribute("data-quick-status");
      if (nextStatusFilter && nextStatusFilter !== state.reviewStatusFilter) {
        state.reviewStatusFilter = nextStatusFilter;
        syncUrl();
        render();
      }
      return;
    }

    const quickConfidenceButton = event.target.closest("[data-quick-confidence]");
    if (quickConfidenceButton) {
      const nextConfidenceFilter = quickConfidenceButton.getAttribute("data-quick-confidence");
      if (nextConfidenceFilter && nextConfidenceFilter !== state.confidenceFilter) {
        state.confidenceFilter = nextConfidenceFilter;
        syncUrl();
        render();
      }
      return;
    }

    const attentionLaneButton = event.target.closest("[data-attention-lane]");
    if (attentionLaneButton) {
      const attentionLane = resolveAttentionLane(
        attentionLaneButton.getAttribute("data-attention-lane")
      );
      if (attentionLane) {
        state.reviewStatusFilter = attentionLane.reviewStatusFilter;
        state.confidenceFilter = attentionLane.confidenceFilter;
        state.draftFilter = attentionLane.draftFilter;
        state.historyFilter = attentionLane.historyFilter;
        syncControlsFromState();
        syncUrl();
        render();
      }
      return;
    }

    const resetDemoButton = event.target.closest("[data-reset-demo]");
    if (resetDemoButton) {
      resetDemoMode();
    }
  });

  document.addEventListener("keydown", (event) => {
    handleKeyboardShortcut(event);
  });
}

async function refreshData(options = {}) {
  const preserveActionMessage = options.preserveActionMessage ?? false;
  const preferredSelectedEventId = options.preferredSelectedEventId ?? state.selectedEventId;

  state.loadError = "";
  state.actionError = "";
  if (!preserveActionMessage) {
    state.lastActionMessage = "";
  }
  render();

  try {
    state.data =
      state.sourceMode === SOURCE_API ? await loadApiData() : await loadFixtureData();
    state.reviewDrafts = pruneReviewDrafts(
      state.reviewDrafts,
      state.data.timeline.map((item) => item.eventId)
    );
    state.recentReviewActivity = pruneRecentReviewActivity(
      state.recentReviewActivity,
      state.data.timeline.map((item) => item.eventId)
    );
    persistReviewDrafts();
    persistRecentReviewActivity();
    state.selectedEventId = resolveSelectedEventId(state.data.timeline, preferredSelectedEventId);
    syncTagFilter(state.data.timeline);
  } catch (error) {
    state.data = null;
    state.selectedEventId = null;
    state.loadError = error instanceof Error ? error.message : "Unknown loading error.";
  }

  syncControlsFromState();
  syncUrl();
  render();
}

async function loadFixtureData() {
  const [timelineResponse, exampleDetailResponse, bootstrapDataset] = await Promise.all([
    fetchJson("/contracts/examples/timeline-response.example.json"),
    fetchJson("/contracts/examples/event-detail.example.json"),
    fetchJson("/fixtures/bootstrap-dataset.json")
  ]);

  return buildFixtureState(timelineResponse, exampleDetailResponse, bootstrapDataset);
}

async function loadApiData() {
  const timelineResponse = await fetchJson("/api/timeline");
  const detailEntries = await Promise.all(
    timelineResponse.items.map(async (item) => [item.eventId, await fetchJson(`/api/events/${item.eventId}`)])
  );

  return {
    generatedAt: timelineResponse.generatedAt ?? new Date().toISOString(),
    nextCursor: timelineResponse.nextCursor ?? null,
    timeline: timelineResponse.items,
    details: Object.fromEntries(detailEntries)
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const isJson = (response.headers.get("content-type") ?? "").includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload.error === "string"
        ? payload.error
        : `Request failed for ${url} with status ${response.status}.`;
    throw new Error(errorMessage);
  }

  return payload;
}

function resolveSelectedEventId(timelineItems, preferredSelectedEventId = state.selectedEventId) {
  const orderedTimeline = sortTimelineItems(timelineItems, state.sortOrder);
  return reconcileSelectedEventId(preferredSelectedEventId, orderedTimeline, {
    preferPendingFallback: state.sortOrder === SORT_PENDING_FIRST
  });
}

function syncTagFilter(timelineItems) {
  const tags = new Set();
  for (const item of timelineItems) {
    for (const tag of item.tags ?? []) {
      tags.add(tag);
    }
  }

  const currentValue = state.tagFilter;
  elements.tagFilter.innerHTML = '<option value="all">All tags</option>';
  [...tags].sort().forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag;
    option.textContent = tag;
    elements.tagFilter.append(option);
  });

  if (currentValue !== "all" && tags.has(currentValue)) {
    elements.tagFilter.value = currentValue;
  } else {
    state.tagFilter = "all";
    elements.tagFilter.value = "all";
  }
}

function getFilteredTimeline() {
  if (!state.data) {
    return [];
  }

  if (state.demoMode === DEMO_EMPTY) {
    return [];
  }

  return getTimelineSlice();
}

function getTimelineSlice({
  includeSearchQuery = true,
  includeReviewStatusFilter = true,
  includeConfidenceFilter = true,
  includeHistoryFilter = true,
  includeTagFilter = true,
  includeDraftFilter = true
} = {}, filters = getCurrentFilterState()) {
  if (!state.data) {
    return [];
  }

  if (state.demoMode === DEMO_EMPTY) {
    return [];
  }

  const filteredTimeline = state.data.timeline.filter((item) => {
    const detail = state.data.details[item.eventId];
    const matchesQuery =
      !includeSearchQuery || matchesTimelineSearchQuery(filters.searchQuery, item, detail);
    const matchesStatus =
      !includeReviewStatusFilter ||
      filters.reviewStatusFilter === "all" ||
      item.reviewStatus === filters.reviewStatusFilter;
    const matchesConfidence =
      !includeConfidenceFilter ||
      filters.confidenceFilter === "all" ||
      item.confidence.label === filters.confidenceFilter;
    const reviewHistoryExists = hasReviewHistory(detail?.reviewActions);
    const matchesHistory =
      !includeHistoryFilter ||
      filters.historyFilter === HISTORY_FILTER_ALL ||
      (filters.historyFilter === HISTORY_FILTER_REVIEWED
        ? reviewHistoryExists
        : !reviewHistoryExists);
    const matchesTag =
      !includeTagFilter ||
      filters.tagFilter === "all" ||
      (item.tags ?? []).includes(filters.tagFilter);
    const matchesDraft =
      !includeDraftFilter ||
      filters.draftFilter === DRAFT_FILTER_ALL ||
      hasReviewDraft(state.reviewDrafts, item.eventId);

    return (
      matchesQuery &&
      matchesStatus &&
      matchesConfidence &&
      matchesHistory &&
      matchesTag &&
      matchesDraft
    );
  });

  return sortTimelineItems(filteredTimeline, filters.sortOrder ?? state.sortOrder);
}

function render() {
  renderToggles();
  renderSummary();
  renderSavedViews();
  renderRecentReviewActivity();
  renderTimeline();
  renderDetail();
  restoreActiveSearchFocusFromUrl();
}

function renderToggles() {
  for (const button of elements.sourceButtons) {
    button.classList.toggle("is-active", button.dataset.sourceMode === state.sourceMode);
  }

  for (const button of elements.demoButtons) {
    button.classList.toggle("is-active", button.dataset.demoMode === state.demoMode);
  }
}

function renderSummary() {
  const dataSourceLabel = state.sourceMode === SOURCE_API ? "Local read API" : "Contract fixtures";
  elements.dataSourceLabel.textContent = dataSourceLabel;

  if (!state.data) {
    elements.pendingCount.textContent = "0";
    elements.generatedAt.textContent = "Unavailable";
    elements.bannerMessage.textContent =
      state.loadError || "Loading the analyst review queue and event detail fixtures.";
    return;
  }

  const pendingCount = state.data.timeline.filter(
    (item) => item.reviewStatus === "pending_review"
  ).length;
  elements.pendingCount.textContent = String(pendingCount);
  elements.generatedAt.textContent = formatDateTime(state.data.generatedAt);

  if (state.demoMode === DEMO_ERROR) {
    elements.bannerMessage.textContent =
      "Error demo mode forces the blocked view so the team can review failure handling.";
  } else if (state.demoMode === DEMO_EMPTY) {
    elements.bannerMessage.textContent =
      "Empty demo mode keeps the queue visible while exercising no-results copy.";
  } else if (state.actionError) {
    elements.bannerMessage.textContent = state.actionError;
  } else if (state.sourceMode === SOURCE_API) {
    elements.bannerMessage.textContent =
      "Local read API mode fetches /api/timeline and /api/events/:eventId directly.";
  } else {
    elements.bannerMessage.textContent =
      "Contract fixture mode keeps the console runnable before the read API is ready.";
  }
}

function renderTimeline() {
  const filteredTimeline = getFilteredTimeline();
  renderFilterSummary(filteredTimeline);

  const nextSelectedEventId = reconcileSelectedEventId(
    state.selectedEventId,
    filteredTimeline,
    {
      preferPendingFallback: state.sortOrder === SORT_PENDING_FIRST
    }
  );
  if (nextSelectedEventId !== state.selectedEventId) {
    state.selectedEventId = nextSelectedEventId;
    syncUrl();
  }

  elements.timelineMeta.textContent = buildTimelineMetaLabel(filteredTimeline.length);
  elements.timelineHeading.textContent =
    getCurrentFilterSummary().hasActiveFilters ? "Filtered review queue" : "Review queue";

  elements.timelineList.innerHTML = "";

  if (!state.data || state.demoMode === DEMO_ERROR || state.loadError) {
    elements.emptyState.hidden = true;
    return;
  }

  elements.emptyState.hidden = filteredTimeline.length !== 0;
  if (filteredTimeline.length === 0) {
    renderEmptyState();
    return;
  }

  for (const item of filteredTimeline) {
    const detail = state.data.details[item.eventId];
    const confidenceSummary = buildConfidenceSummary(
      detail?.event?.confidence ?? item.confidence,
      detail?.claims ?? []
    );
    const entitySummary = buildTimelineEntitySummary(detail?.entities ?? [], {
      primaryLocation: item.primaryLocation
    });
    const reviewHistorySummary = buildReviewHistorySummary(detail?.reviewActions ?? []);
    const provenanceSummary = buildSourceProvenanceSummary(detail?.sources ?? [], item.eventTime);
    const searchMatches = buildTimelineSearchMatches(state.searchQuery, item, detail);
    const reviewDraftPreview = buildReviewDraftPreview(
      getReviewDraft(state.reviewDrafts, item.eventId)
    );
    const card = document.createElement("button");
    card.type = "button";
    card.className = "timeline-card";
    if (item.eventId === state.selectedEventId) {
      card.classList.add("is-selected");
    }

    card.innerHTML = `
      <div class="timeline-card-header">
        <p class="timeline-metadata">${formatDateTime(item.eventTime)}</p>
        <span class="pill" data-status="${escapeHtml(item.reviewStatus)}">${formatReviewStatus(
          item.reviewStatus
        )}</span>
      </div>
      <h3>${escapeHtml(item.headline)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <div class="chip-row">
        <span class="chip">${escapeHtml(item.primaryLocation ?? "Location pending")}</span>
        <span class="chip">${escapeHtml(formatConfidence(item.confidence))}</span>
      </div>
      <div class="metric-row">
        <span class="metric-chip">${item.sourceCount} sources</span>
        <span class="metric-chip">${item.claimCount} claims</span>
        <span class="metric-chip">${item.entityCount} entities</span>
      </div>
      ${entitySummary ? renderTimelineEntitySummary(entitySummary) : ""}
      ${confidenceSummary ? renderTimelineConfidenceSummary(confidenceSummary) : ""}
      ${provenanceSummary ? renderTimelineProvenanceSummary(provenanceSummary) : ""}
      ${searchMatches.length ? renderTimelineSearchSummary(searchMatches) : ""}
      <div class="tag-row">
        ${(item.tags ?? [])
          .map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`)
          .join("")}
      </div>
      ${reviewDraftPreview ? renderTimelineDraftSummary(reviewDraftPreview) : ""}
      ${reviewHistorySummary ? renderTimelineReviewSummary(reviewHistorySummary) : ""}
    `;

    card.addEventListener("click", () => {
      state.selectedEventId = item.eventId;
      syncUrl();
      render();
    });

    elements.timelineList.append(card);
  }
}

function renderTimelineEntitySummary(entitySummary) {
  return `
    <div class="timeline-entity-summary">
      <p class="timeline-entity-title">Key participants</p>
      <div class="chip-row">
        ${entitySummary.visibleParticipants
          .map((participant) => `<span class="chip">${escapeHtml(participant)}</span>`)
          .join("")}
        ${
          entitySummary.remainingCount
            ? `<span class="metric-chip">+${entitySummary.remainingCount} more participant${
                entitySummary.remainingCount === 1 ? "" : "s"
              }</span>`
            : ""
        }
      </div>
    </div>
  `;
}

function renderTimelineConfidenceSummary(confidenceSummary) {
  return `
    <div class="timeline-confidence-summary">
      <p class="timeline-confidence-title">Confidence drivers</p>
      <div class="chip-row">
        ${confidenceSummary.claimSignals
          .map((signal) => `<span class="chip">${escapeHtml(signal)}</span>`)
          .join("")}
      </div>
      <p class="timeline-confidence-note">${escapeHtml(confidenceSummary.rationalePreview)}</p>
    </div>
  `;
}

function renderTimelineProvenanceSummary(provenanceSummary) {
  return `
    <div class="timeline-provenance-summary">
      <div class="timeline-provenance-header">
        <p class="timeline-provenance-title">${escapeHtml(provenanceSummary.postureLabel)}</p>
        ${
          provenanceSummary.timingLabel
            ? `<span class="chip">${escapeHtml(provenanceSummary.timingLabel)}</span>`
            : ""
        }
      </div>
      <div class="chip-row">
        ${renderFeedChips(provenanceSummary)}
      </div>
    </div>
  `;
}

function renderTimelineSearchSummary(searchMatches) {
  const visibleMatches = searchMatches.slice(0, 2);
  const remainingMatchCount = Math.max(0, searchMatches.length - visibleMatches.length);

  return `
    <div class="timeline-review-summary timeline-search-summary">
      <div class="timeline-review-header">
        <span class="chip">Search match</span>
        ${
          remainingMatchCount
            ? `<span class="meta-copy">+${remainingMatchCount} more field${
                remainingMatchCount === 1 ? "" : "s"
              }</span>`
            : ""
        }
      </div>
      <div class="timeline-search-match-list">
        ${visibleMatches
          .map(
            (match) => `
              <p class="timeline-search-match">
                <strong>${escapeHtml(match.label)}:</strong> ${escapeHtml(match.preview)}
              </p>
            `
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderDetailSearchFocus(searchMatches, activeSearchFocusTarget) {
  const showCycleControls = searchMatches.length > 1;

  return `
    <article class="detail-note search-focus-card">
      <div class="list-card-header">
        <div>
          <p class="section-kicker">Search focus</p>
          <h3>Jump to matched detail</h3>
        </div>
        <p class="meta-copy">${searchMatches.length} match${searchMatches.length === 1 ? "" : "es"}</p>
      </div>
      <p class="detail-copy">
        Use the matched field shortcuts to verify why this event stayed in the filtered queue.
      </p>
      ${
        showCycleControls
          ? `
            <div class="search-focus-controls">
              <div class="action-row">
                <button
                  type="button"
                  class="secondary-action"
                  data-search-focus-cycle="previous"
                >
                  Previous match
                </button>
                <button
                  type="button"
                  class="secondary-action"
                  data-search-focus-cycle="next"
                >
                  Next match
                </button>
              </div>
              <p class="meta-copy">Use <kbd>[</kbd> and <kbd>]</kbd> to cycle matched sections.</p>
            </div>
          `
          : ""
      }
      <div class="queue-lane-row">
        ${searchMatches
          .map(
            (match) => `
              <button
                type="button"
                class="secondary-action search-focus-button${
                  activeSearchFocusTarget === match.detailSectionId ? " is-active" : ""
                }"
                data-search-focus-target="${escapeAttribute(match.detailSectionId)}"
                aria-pressed="${activeSearchFocusTarget === match.detailSectionId ? "true" : "false"}"
              >
                <strong>${escapeHtml(match.label)}</strong>
                <span>${escapeHtml(match.preview)}</span>
              </button>
            `
          )
          .join("")}
      </div>
    </article>
  `;
}

function renderTimelineDraftSummary(reviewDraftPreview) {
  return `
    <div class="timeline-review-summary timeline-draft-summary">
      <div class="timeline-review-header">
        <span class="chip">Draft note saved</span>
        <span class="meta-copy">Local only</span>
      </div>
      <p class="timeline-review-note">${escapeHtml(reviewDraftPreview)}</p>
    </div>
  `;
}

function renderTimelineReviewSummary(reviewHistorySummary) {
  return `
    <div class="timeline-review-summary">
      <div class="timeline-review-header">
        <span class="chip">${escapeHtml(
          formatReviewActionCount(reviewHistorySummary.actionCount)
        )}</span>
        <span class="meta-copy">${formatDateTime(reviewHistorySummary.createdAt)}</span>
      </div>
      <p class="timeline-review-title">Latest ${escapeHtml(
        reviewHistorySummary.actionLabel
      )} by ${escapeHtml(reviewHistorySummary.actorLabel)}</p>
      <p class="timeline-review-note">${escapeHtml(reviewHistorySummary.notePreview)}</p>
    </div>
  `;
}

function renderQueueContext(queueContext, queueNavigation) {
  const pendingProgressLabel =
    queueContext.pendingPosition === null
      ? null
      : `Pending ${queueContext.pendingPosition} of ${queueContext.pendingCount}`;
  const remainingPendingLabel =
    queueContext.pendingPosition === null
      ? queueContext.pendingCount === 0
        ? "No pending events remain in this view."
        : `${queueContext.pendingCount} pending event${
            queueContext.pendingCount === 1 ? "" : "s"
          } remain elsewhere in this view.`
      : queueContext.remainingPendingAfterSelection === 0
        ? queueContext.pendingCount === 1
          ? "This is the only pending event in this view."
          : "No later pending events remain in this view."
        : `${queueContext.remainingPendingAfterSelection} pending event${
            queueContext.remainingPendingAfterSelection === 1 ? "" : "s"
          } remain after this selection.`;

  return `
    <article class="detail-note">
      <h3>Queue context</h3>
      <div class="chip-row">
        <span class="chip">Visible ${queueContext.visiblePosition} of ${queueContext.visibleCount}</span>
        ${
          pendingProgressLabel
            ? `<span class="chip">${escapeHtml(pendingProgressLabel)}</span>`
            : ""
        }
      </div>
      <p class="detail-copy">${escapeHtml(remainingPendingLabel)}</p>
      ${
        queueNavigation
          ? `
            <div class="action-row">
              ${renderQueueNavigationButton(
                "Previous visible",
                queueNavigation.previousVisibleEventId
              )}
              ${renderQueueNavigationButton("Next visible", queueNavigation.nextVisibleEventId)}
              ${renderQueueNavigationButton("Next pending", queueNavigation.nextPendingEventId)}
            </div>
            <p class="meta-copy">Next pending skips reviewed rows inside the current filtered view.</p>
          `
          : ""
      }
    </article>
  `;
}

function renderFilterSummary(filteredTimeline) {
  if (!state.data) {
    elements.activeFilterSummary.innerHTML = "";
    elements.viewHandoffPanel.innerHTML = "";
    return;
  }

  const totalCount = state.data.timeline.length;
  const filterSummary = getCurrentFilterSummary();
  const handoffSummary = getViewHandoffSummary(filteredTimeline);
  const laneScopeTimeline = getTimelineSlice({
    includeReviewStatusFilter: false,
    includeConfidenceFilter: false,
    includeHistoryFilter: false,
    includeDraftFilter: false
  });
  const queueDistribution = buildQueueDistribution(
    laneScopeTimeline,
    {
      reviewStatusFilter: state.reviewStatusFilter,
      confidenceFilter: state.confidenceFilter
    }
  );
  const attentionLanes = buildAttentionLanes(laneScopeTimeline, state.reviewDrafts, {
    detailsByEventId: state.data.details,
    reviewStatusFilter: state.reviewStatusFilter,
    confidenceFilter: state.confidenceFilter,
    draftFilter: state.draftFilter,
    historyFilter: state.historyFilter
  });
  const summaryCopy = buildVisibleCountCopy(filteredTimeline.length, totalCount, filterSummary);
  const summaryChips = renderFilterChips(filterSummary);
  const summaryActions = renderFilterActions(filterSummary);

  elements.activeFilterSummary.innerHTML = `
    <div class="filter-summary-header">
      <p class="filter-summary-copy">${escapeHtml(summaryCopy)}</p>
      ${summaryActions}
    </div>
    ${
      summaryChips
        ? `<div class="chip-row filter-summary-chips">${summaryChips}</div>`
        : ""
    }
    ${renderQueueDistribution(queueDistribution)}
    ${renderAttentionLanes(attentionLanes)}
  `;
  elements.viewHandoffPanel.innerHTML = renderViewHandoffPanel(handoffSummary);
}

function getViewHandoffSummary(filteredTimeline = getTimelineSlice()) {
  if (!state.data) {
    return null;
  }

  const activeSavedView = getActiveSavedView();
  const filterSummary = getCurrentFilterSummary();
  const queueContext = buildReviewQueueContext(filteredTimeline, state.selectedEventId);
  const queueNavigation = buildReviewQueueNavigation(filteredTimeline, state.selectedEventId);
  const nextPendingEventId =
    queueNavigation?.nextPendingEventId ??
    resolveNextPendingEventId(filteredTimeline, state.selectedEventId);
  const selectedTimelineItem = state.selectedEventId
    ? filteredTimeline.find((item) => item.eventId === state.selectedEventId) ??
      state.data.timeline.find((item) => item.eventId === state.selectedEventId) ??
      null
    : null;
  const selectedDetail = state.selectedEventId
    ? state.data.details[state.selectedEventId] ?? null
    : null;
  const selectedSearchMatches =
    selectedTimelineItem && selectedDetail
      ? buildTimelineSearchMatches(state.searchQuery, selectedTimelineItem, selectedDetail)
      : [];
  const activeSearchFocusTarget = getActiveSearchFocusTarget(selectedSearchMatches);
  const selectedContext = buildSelectedHandoffContext(selectedDetail, {
    searchQuery: state.searchQuery,
    activeSearchFocusTarget
  });

  return buildViewHandoffSummary({
    selectedHeadline: selectedDetail?.event?.headline ?? "",
    filteredCount: filteredTimeline.length,
    totalCount: state.data.timeline.length,
    sourceLabel: state.sourceMode === SOURCE_API ? "Local read API" : "Contract fixtures",
    filterSummary,
    queueContext,
    nextPendingEventId,
    nextPendingHeadline:
      filteredTimeline.find((item) => item.eventId === nextPendingEventId)?.headline ??
      state.data.details[nextPendingEventId]?.event?.headline ??
      "",
    draftFilter: state.draftFilter,
    demoMode: state.demoMode,
    hasSelectedDraft: hasReviewDraft(state.reviewDrafts, state.selectedEventId),
    activeSavedViewLabel: activeSavedView?.label ?? "",
    selectedContextItems: selectedContext.items,
    selectedConfidenceContext: selectedContext.confidenceContext,
    selectedReviewContext: selectedContext.reviewContext,
    selectedSourceProofItems: selectedContext.sourceProofItems,
    selectedSourceProofOverflowCopy: selectedContext.sourceProofOverflowCopy,
    selectedSearchMatches,
    activeSearchFocusTarget,
    selectedDraftPreview: buildReviewDraftPreview(
      getReviewDraft(state.reviewDrafts, state.selectedEventId),
      { maxLength: HANDOFF_DRAFT_PREVIEW_MAX_LENGTH }
    )
  });
}

function buildSelectedHandoffContext(
  detail,
  { searchQuery = "", activeSearchFocusTarget = "" } = {}
) {
  if (!detail?.event) {
    return {
      items: [],
      confidenceContext: "",
      reviewContext: "",
      sourceProofItems: [],
      sourceProofOverflowCopy: ""
    };
  }

  const confidenceSummary = buildConfidenceSummary(
    detail.event.confidence,
    detail.claims ?? []
  );
  const provenanceSummary = buildSourceProvenanceSummary(
    detail.sources ?? [],
    detail.event.eventTime
  );
  const reviewHistorySummary = buildReviewHistorySummary(detail.reviewActions ?? []);
  const sourceProofSelection = buildSourceProofSnapshotBundle(
    detail.sources ?? [],
    detail.event.eventTime,
    {
      searchQuery,
      activeSearchFocusTarget
    }
  );

  return {
    items: [
      `Status: ${formatReviewStatus(detail.event.reviewStatus)}`,
      detail.event.confidence
        ? `Confidence: ${formatConfidence(detail.event.confidence)}`
        : "",
      provenanceSummary
        ? `Provenance: ${provenanceSummary.postureLabel}`
        : "",
      reviewHistorySummary
        ? `Review history: ${formatReviewActionCount(reviewHistorySummary.actionCount)}`
        : "Review history: No prior review"
    ].filter(Boolean),
    confidenceContext: buildSelectedConfidenceContext(confidenceSummary),
    reviewContext: buildSelectedReviewContext(reviewHistorySummary),
    sourceProofItems: sourceProofSelection.items,
    sourceProofOverflowCopy: buildSourceProofOverflowCopy(
      sourceProofSelection.hiddenCount
    )
  };
}

function buildSelectedConfidenceContext(confidenceSummary) {
  if (!confidenceSummary) {
    return "";
  }

  const signalCopy = Array.isArray(confidenceSummary.claimSignals)
    ? confidenceSummary.claimSignals
        .map((signal) => String(signal ?? "").trim())
        .filter((signal) => signal && signal !== "No claim coverage yet")
        .join(", ")
    : "";
  const rationaleCopy =
    confidenceSummary.rationalePreview === "Confidence rationale is not available yet."
      ? ""
      : String(confidenceSummary.rationalePreview ?? "").trim();
  const segments = [];

  if (signalCopy) {
    segments.push(`Signals: ${signalCopy}`);
  }

  if (rationaleCopy) {
    segments.push(`Rationale: ${rationaleCopy}`);
  }

  return segments.join(". ");
}

function buildSelectedReviewContext(reviewHistorySummary) {
  if (!reviewHistorySummary) {
    return "";
  }

  const actorLabel = reviewHistorySummary.actorLabel
    ? ` by ${reviewHistorySummary.actorLabel}`
    : "";
  const notePreview =
    reviewHistorySummary.notePreview &&
    reviewHistorySummary.notePreview !== "No notes recorded."
      ? ` Note: ${reviewHistorySummary.notePreview}`
      : "";

  return `Latest review was ${reviewHistorySummary.actionLabel}${actorLabel}.${notePreview}`;
}

function buildSourceProofOverflowCopy(hiddenCount) {
  if (!hiddenCount) {
    return "";
  }

  return `${hiddenCount} more supporting source${
    hiddenCount === 1 ? "" : "s"
  } remain${hiddenCount === 1 ? "s" : ""} in provenance detail.`;
}

function renderViewHandoffPanel(handoffSummary) {
  const feedbackToneClass = state.shareViewMessage
    ? ` is-${escapeAttribute(state.shareViewMessageTone || "success")}`
    : handoffSummary.isWarning
      ? " is-warning"
      : "";
  const feedbackCopy = state.shareViewMessage || handoffSummary.portabilityNote;
  const previewItems = buildViewHandoffPreviewItems(handoffSummary);
  const selectedContextChips = Array.isArray(handoffSummary.selectedContextItems)
    ? handoffSummary.selectedContextItems
        .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
        .join("")
    : "";
  const scopeGroups = [
    renderViewHandoffScopeGroup("Included in link", handoffSummary.includedState),
    renderViewHandoffScopeGroup(
      "Needs local browser state",
      handoffSummary.localDependentState,
      "warning"
    ),
    renderViewHandoffScopeGroup("Stays local", handoffSummary.localOnlyState, "local")
  ]
    .filter(Boolean)
    .join("");

  return `
    <section class="view-handoff-card" aria-label="Shareable view">
      <div class="saved-view-header">
        <div>
          <p class="section-kicker">Shareable view</p>
          <p class="saved-view-copy">${escapeHtml(handoffSummary.helperCopy)}</p>
        </div>
        <div class="action-row view-handoff-actions">
          <button type="button" class="secondary-action" data-copy-view-link>
            Copy start link
          </button>
          ${
            handoffSummary.showPortableCopyAction
              ? `
                <button
                  type="button"
                  class="secondary-action"
                  data-copy-portable-view-link
                >
                  Copy start link without saved drafts
                </button>
              `
              : ""
          }
          ${
            handoffSummary.showNextPendingCopyAction
              ? `
                <button
                  type="button"
                  class="secondary-action"
                  data-copy-next-pending-link
                >
                  ${
                    handoffSummary.showPortableCopyAction
                      ? "Copy next pending link without saved drafts"
                      : "Copy next pending link"
                  }
                </button>
              `
              : ""
          }
          <button type="button" class="secondary-action" data-copy-handoff-note>
            Copy review note
          </button>
        </div>
      </div>
      <div class="view-handoff-snapshot">
        <p class="view-handoff-label">${escapeHtml(handoffSummary.selectedLabel)}</p>
        <strong class="view-handoff-title">${escapeHtml(handoffSummary.selectedValue)}</strong>
        <p class="meta-copy">${escapeHtml(handoffSummary.contextLabel)}</p>
        ${
          selectedContextChips
            ? `<div class="chip-row view-handoff-context">${selectedContextChips}</div>`
            : ""
        }
        ${
          handoffSummary.selectedQueueContext
            ? `<p class="meta-copy view-handoff-context-copy">${escapeHtml(
                handoffSummary.selectedQueueContext
              )}</p>`
            : ""
        }
        ${
          handoffSummary.nextPendingCopy
            ? `<p class="meta-copy view-handoff-context-copy">${escapeHtml(
                handoffSummary.nextPendingCopy
              )}</p>`
            : ""
        }
        ${
          handoffSummary.recommendedPathCopy
          && !handoffSummary.showNextPendingCopyAction
            ? `<p class="meta-copy view-handoff-context-copy"><strong>Recommended path:</strong> ${escapeHtml(
                handoffSummary.recommendedPathCopy
              )}</p>`
            : ""
        }
        ${renderViewHandoffPreview(previewItems)}
        ${
          feedbackCopy
            ? `<p class="view-handoff-note${feedbackToneClass}">${escapeHtml(
                feedbackCopy
              )}</p>`
            : ""
        }
        ${scopeGroups ? `<div class="view-handoff-scope">${scopeGroups}</div>` : ""}
      </div>
    </section>
  `;
}

function renderViewHandoffPreview(previewItems) {
  if (!Array.isArray(previewItems) || !previewItems.length) {
    return "";
  }

  const reviewDetailCountLabel = `${previewItems.length} review detail${
    previewItems.length === 1 ? "" : "s"
  }`;

  return `
    <details class="view-handoff-preview">
      <summary class="view-handoff-preview-summary">
        Show reviewer context and evidence
        <span class="view-handoff-preview-count">${escapeHtml(
          reviewDetailCountLabel
        )}</span>
      </summary>
      <div class="view-handoff-preview-list">
        ${previewItems
        .map(
          (item) => `
            <p class="meta-copy view-handoff-context-copy view-handoff-preview-item">
              <strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}
            </p>
          `
        )
        .join("")}
      </div>
    </details>
  `;
}

function renderViewHandoffScopeGroup(label, items, tone = "") {
  if (!Array.isArray(items) || !items.length) {
    return "";
  }

  const toneClass = tone ? ` is-${escapeAttribute(tone)}` : "";

  return `
    <div class="view-handoff-scope-group">
      <p class="view-handoff-label">${escapeHtml(label)}</p>
      <div class="chip-row">
        ${items
          .map(
            (item) =>
              `<span class="chip view-handoff-chip${toneClass}">${escapeHtml(item)}</span>`
          )
          .join("")}
      </div>
    </div>
  `;
}

function renderSavedViews() {
  const activeSavedView = getActiveSavedView();
  const savedViewOptions = state.savedViews.map((savedView) => ({
    ...savedView,
    count: getTimelineSlice({}, savedView.filters).length,
    isActive: activeSavedView?.id === savedView.id
  }));

  if (!savedViewOptions.length) {
    elements.savedViewList.innerHTML =
      '<p class="saved-view-empty">No saved views yet. Save the current filter combination to reopen it later.</p>';
  } else {
    elements.savedViewList.innerHTML = savedViewOptions
      .map((savedView) => renderSavedViewButton(savedView))
      .join("");
  }

  const normalizedSavedViewLabel = normalizeSavedViewLabel(state.savedViewName);
  const canSaveCurrentView =
    Boolean(normalizedSavedViewLabel) &&
    (getCurrentFilterSummary().hasActiveFilters || state.sortOrder !== DEFAULT_TIMELINE_SORT);

  elements.savedViewName.value = state.savedViewName;
  elements.saveCurrentView.disabled = !canSaveCurrentView;
  elements.saveCurrentView.textContent =
    activeSavedView && activeSavedView.id === normalizedSavedViewLabel.toLowerCase()
      ? "Update active view"
      : "Save current view";
  elements.deleteActiveView.hidden = !activeSavedView;
  if (activeSavedView) {
    elements.deleteActiveView.textContent = `Delete ${activeSavedView.label}`;
  }
}

function renderRecentReviewActivity() {
  if (!state.recentReviewActivity.length) {
    elements.recentReviewActivity.innerHTML =
      '<p class="saved-view-empty">No local review actions yet. Record one to pin a quick reopen path here.</p>';
    return;
  }

  elements.recentReviewActivity.innerHTML = state.recentReviewActivity
    .map((entry) =>
      renderRecentReviewActivityButton({
        ...entry,
        isActive: entry.eventId === state.selectedEventId
      })
    )
    .join("");
}

function renderEmptyState() {
  if (!state.data) {
    elements.emptyState.hidden = true;
    return;
  }

  const filterSummary = getCurrentFilterSummary();
  const emptyCopy = buildEmptyStateCopy(filterSummary, state.data.timeline.length);
  const summaryChips = renderFilterChips(filterSummary);
  const summaryActions = renderFilterActions(filterSummary);

  elements.emptyState.innerHTML = `
    <h3>No events match the current view</h3>
    <p>${escapeHtml(emptyCopy)}</p>
    ${
      summaryChips
        ? `<div class="chip-row state-chip-row">${summaryChips}</div>`
        : ""
    }
    ${summaryActions ? `<div class="filter-summary-actions">${summaryActions}</div>` : ""}
  `;
}

function renderDetail() {
  const shouldShowError = state.demoMode === DEMO_ERROR || Boolean(state.loadError);
  elements.errorState.hidden = !shouldShowError;
  const filteredTimeline = getFilteredTimeline();

  if (shouldShowError) {
    elements.errorMessage.textContent =
      state.loadError ||
      "The timeline contract could not be loaded. Switch back to fixtures to keep the review loop available.";
  }

  if (!state.data || shouldShowError) {
    elements.detailPanel.innerHTML = `
      <div class="state-card detail-placeholder">
        <h2>Review surface unavailable</h2>
        <p>Resolve the data source issue or return to fixture mode to inspect the timeline again.</p>
      </div>
    `;
    return;
  }

  const detail = state.data.details[state.selectedEventId];
  if (!detail) {
    const filterSummary = getCurrentFilterSummary();
    const emptySelectionActions = renderFilterActions(filterSummary);
    const emptySelectionChips = renderFilterChips(filterSummary);

    elements.detailPanel.innerHTML = `
      <div class="state-card detail-placeholder">
        <h2>${filteredTimeline.length === 0 ? "No event selected" : "Select an event"}</h2>
        <p>${
          filteredTimeline.length === 0
            ? escapeHtml(buildEmptyStateCopy(filterSummary, state.data.timeline.length))
            : "Choose a timeline row to inspect claims, sources, relationships, and review history."
        }</p>
        ${
          filteredTimeline.length === 0 && emptySelectionChips
            ? `<div class="chip-row state-chip-row">${emptySelectionChips}</div>`
            : ""
        }
        ${
          filteredTimeline.length === 0 && emptySelectionActions
            ? `<div class="filter-summary-actions">${emptySelectionActions}</div>`
            : ""
        }
      </div>
    `;
    return;
  }

  const reviewActionHelpText =
    state.sourceMode === SOURCE_API
      ? "API mode persists review actions through the local read API so refreshed timeline and detail reads stay aligned."
      : "Fixture mode keeps review actions in browser memory only. Switch back to Local read API mode for persisted review state.";
  const reviewActionRequirementText =
    "Edit and reject actions require analyst notes so later reviewers can understand the decision.";
  const reviewDraftStatusText =
    hasReviewDraft(state.reviewDrafts, state.selectedEventId)
      ? "Draft notes stay attached to this event in this browser, even after refresh, until you record the review action."
      : "Draft notes stay attached to each event in this browser until you record the review action.";
  const disabledAttribute = state.isSubmittingReviewAction ? "disabled" : "";
  const entityLookup = createEntityLookup(detail.entities);
  const provenanceSummary = buildSourceProvenanceSummary(
    detail.sources,
    detail.event.eventTime
  );
  const queueContext = buildReviewQueueContext(filteredTimeline, state.selectedEventId);
  const queueNavigation = buildReviewQueueNavigation(filteredTimeline, state.selectedEventId);
  const noteSuggestions = buildReviewNoteSuggestions(detail);
  const selectedTimelineItem =
    filteredTimeline.find((item) => item.eventId === state.selectedEventId) ??
    state.data.timeline.find((item) => item.eventId === state.selectedEventId) ??
    detail.event;
  const searchMatches = buildTimelineSearchMatches(
    state.searchQuery,
    selectedTimelineItem,
    detail
  );
  const activeSearchFocusTarget = getActiveSearchFocusTarget(searchMatches);

  elements.detailPanel.innerHTML = `
    <div class="detail-shell">
      ${renderActionFlashNote()}
      ${
        state.actionError
          ? `<div class="flash-note is-error">${escapeHtml(state.actionError)}</div>`
          : ""
      }
      <section id="detail-overview" class="detail-hero detail-section" tabindex="-1">
        <div class="detail-meta">
          <span>${formatDateTime(detail.event.eventTime)}</span>
          <div class="detail-chip-row">
            <span class="pill" data-status="${escapeHtml(detail.event.reviewStatus)}">${formatReviewStatus(
              detail.event.reviewStatus
            )}</span>
            <span class="chip">${escapeHtml(formatConfidence(detail.event.confidence))}</span>
            <span class="chip">${escapeHtml(detail.event.primaryLocation ?? "Location pending")}</span>
          </div>
        </div>
        <div>
          <h2>${escapeHtml(detail.event.headline)}</h2>
          <p>${escapeHtml(detail.event.summary)}</p>
        </div>
        <div class="detail-grid">
          ${queueContext ? renderQueueContext(queueContext, queueNavigation) : ""}
          ${
            searchMatches.length
              ? renderDetailSearchFocus(searchMatches, activeSearchFocusTarget)
              : ""
          }
          <article class="detail-note">
            <h3>Confidence rationale</h3>
            <p class="detail-copy">${escapeHtml(detail.event.confidence.rationale)}</p>
          </article>
          <article class="detail-note">
            <h3>Review posture</h3>
            <p class="detail-copy">
              Use approve for clean events, edit when the synthesis needs analyst correction,
              and reject when the evidence is too weak or contradicted.
            </p>
          </article>
        </div>
      </section>

      <section class="list-grid">
        ${renderListCard("Claims", detail.claims, renderClaim, { sectionId: "detail-claims" })}
        ${renderListCard("Entities", detail.entities, renderEntity, {
          sectionId: "detail-entities"
        })}
        ${renderListCard(
          "Relationships",
          detail.relationships,
          (relationship) => renderRelationship(relationship, entityLookup),
          { sectionId: "detail-relationships" }
        )}
        ${renderReviewHistory(detail.reviewActions, { sectionId: "detail-review-history" })}
      </section>

      <section id="detail-provenance" class="source-grid detail-section" tabindex="-1">
        <div class="list-card-header">
          <div>
            <p class="section-kicker">Provenance</p>
            <h2>Supporting sources</h2>
          </div>
          <p class="meta-copy">${detail.sources.length} records</p>
        </div>
        ${
          provenanceSummary
            ? `
              <article class="detail-note provenance-summary-card">
                <div class="list-card-header">
                  <h3>Source posture</h3>
                  ${
                    provenanceSummary.timingLabel
                      ? `<span class="chip">${escapeHtml(provenanceSummary.timingLabel)}</span>`
                      : ""
                  }
                </div>
                <p class="detail-copy">${escapeHtml(provenanceSummary.postureLabel)}</p>
                <div class="chip-row">
                  ${renderFeedChips(provenanceSummary)}
                </div>
              </article>
            `
            : ""
        }
        ${detail.sources.map((source) => renderSourceCard(source, detail.event.eventTime)).join("")}
      </section>

      <section id="detail-review-form" class="review-form detail-section" tabindex="-1">
        <h3>Local review action</h3>
        <p class="detail-copy">${escapeHtml(reviewActionHelpText)}</p>
        <p class="meta-copy">${escapeHtml(reviewActionRequirementText)}</p>
        <p class="meta-copy">${escapeHtml(reviewDraftStatusText)}</p>
        ${
          noteSuggestions.length
            ? `
              <div class="review-note-suggestions">
                <p class="section-kicker">Quick note starters</p>
                <div class="queue-lane-row">
                  ${noteSuggestions
                    .map((suggestion) =>
                      renderReviewNoteSuggestionButton(suggestion, disabledAttribute)
                    )
                    .join("")}
                </div>
              </div>
            `
            : ""
        }
        <textarea id="review-notes" placeholder="Document why this event was approved, edited, or rejected." ${disabledAttribute}>${escapeHtml(
          getSelectedReviewDraft()
        )}</textarea>
        <div class="action-row">
          <button type="button" class="primary-action" data-review-action="approve" ${disabledAttribute}>Approve</button>
          <button type="button" class="neutral-action" data-review-action="edit" ${disabledAttribute}>Mark edited</button>
          <button type="button" class="danger-action" data-review-action="reject" ${disabledAttribute}>Reject</button>
        </div>
        ${renderKeyboardShortcutGuide()}
      </section>
    </div>
  `;

  const reviewNotes = document.querySelector("#review-notes");
  reviewNotes.addEventListener("input", (event) => {
    state.reviewDrafts = setReviewDraft(
      state.reviewDrafts,
      state.selectedEventId,
      event.target.value
    );
    persistReviewDrafts();
    renderTimelineDraftState();
  });

  document.querySelectorAll("[data-note-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      const suggestion = button.getAttribute("data-note-suggestion");
      if (!suggestion || !state.selectedEventId) {
        return;
      }

      const nextDraft = applyReviewNoteSuggestion(reviewNotes.value, suggestion);
      reviewNotes.value = nextDraft;
      state.reviewDrafts = setReviewDraft(state.reviewDrafts, state.selectedEventId, nextDraft);
      persistReviewDrafts();
      renderTimelineDraftState();
      reviewNotes.focus();
      reviewNotes.setSelectionRange(nextDraft.length, nextDraft.length);
    });
  });

  document.querySelectorAll("[data-queue-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetEventId = button.getAttribute("data-queue-target");
      if (!targetEventId) {
        return;
      }

      state.selectedEventId = targetEventId;
      syncUrl();
      render();
    });
  });

  document.querySelectorAll("[data-search-focus-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetSectionId = button.getAttribute("data-search-focus-target");
      if (!targetSectionId) {
        return;
      }

      focusSearchMatch(targetSectionId);
    });
  });

  document.querySelectorAll("[data-search-focus-cycle]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.getAttribute("data-search-focus-cycle");
      if (!direction) {
        return;
      }

      cycleSelectedSearchFocus(direction);
    });
  });

  document.querySelectorAll("[data-review-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-review-action");
      if (!action) {
        return;
      }
      void handleReviewAction(action);
    });
  });
}

function renderListCard(title, items, renderer, options = {}) {
  const sectionIdAttribute = options.sectionId
    ? ` id="${escapeAttribute(options.sectionId)}" class="list-card detail-section" tabindex="-1"`
    : ' class="list-card"';

  return `
    <section${sectionIdAttribute}>
      <h3>${escapeHtml(title)}</h3>
      <ul>
        ${
          items.length
            ? items.map(renderer).join("")
            : '<li><p>No items are available in the current fixture set.</p></li>'
        }
      </ul>
    </section>
  `;
}

function renderClaim(claim) {
  return `
    <li>
      <div class="list-card-header">
        <strong>${escapeHtml(claim.claimType)}</strong>
        <span class="pill" data-status="${escapeHtml(claim.polarity)}">${escapeHtml(
          claim.polarity
        )}</span>
      </div>
      <p>${escapeHtml(claim.claimText)}</p>
    </li>
  `;
}

function renderEntity(entity) {
  return `
    <li>
      <div class="list-card-header">
        <strong>${escapeHtml(entity.canonicalName)}</strong>
        <span class="chip">${escapeHtml(entity.entityType)}</span>
      </div>
      <p>${escapeHtml(entity.role)}</p>
    </li>
  `;
}

function renderRelationship(relationship, entityLookup) {
  const display = formatRelationshipDisplay(relationship, entityLookup);

  return `
    <li>
      <div class="list-card-header">
        <strong>${escapeHtml(display.relationshipTypeLabel)}</strong>
        <span class="chip">${escapeHtml(relationship.confidence)}</span>
      </div>
      <p>${escapeHtml(display.participantLabel)}</p>
      ${display.roleLabel ? `<p class="detail-copy">${escapeHtml(display.roleLabel)}</p>` : ""}
    </li>
  `;
}

function renderReviewHistory(reviewActions, options = {}) {
  const sectionIdAttribute = options.sectionId
    ? ` id="${escapeAttribute(options.sectionId)}" class="list-card review-history detail-section" tabindex="-1"`
    : ' class="list-card review-history"';

  return `
    <section${sectionIdAttribute}>
      <h3>Review history</h3>
      <ul>
        ${
          reviewActions.length
            ? reviewActions.map(renderReviewAction).join("")
            : '<li><p>No analyst actions recorded yet.</p></li>'
        }
      </ul>
    </section>
  `;
}

function renderReviewAction(reviewAction) {
  return `
    <li>
      <div class="list-card-header">
        <strong>${escapeHtml(reviewAction.actorName)}</strong>
        <span class="pill" data-action="${escapeHtml(reviewAction.action)}">${escapeHtml(
          reviewAction.action
        )}</span>
      </div>
      <p>${formatDateTime(reviewAction.createdAt)}</p>
      ${
        reviewAction.notes
          ? `<p class="detail-copy">${escapeHtml(reviewAction.notes)}</p>`
          : ""
      }
    </li>
  `;
}

function renderSourceCard(source, eventTime) {
  const relativeTiming = formatSourceRelativeTiming(source.publishedAt, eventTime);

  return `
    <article class="source-card">
      <div class="list-card-header">
        <strong>${escapeHtml(source.title)}</strong>
        <div class="chip-row source-chip-row">
          <span class="chip">${escapeHtml(source.feedKey)}</span>
          ${
            relativeTiming
              ? `<span class="chip">${escapeHtml(relativeTiming)}</span>`
              : ""
          }
        </div>
      </div>
      <p>${escapeHtml(source.excerpt)}</p>
      <div class="list-card-header">
        <a href="${escapeAttribute(source.sourceUrl)}" target="_blank" rel="noreferrer">Open source</a>
        <span class="meta-copy">${formatDateTime(source.publishedAt)}</span>
      </div>
    </article>
  `;
}

function renderReviewNoteSuggestionButton(suggestion, disabledAttribute) {
  return `
    <button
      type="button"
      class="quick-lane note-suggestion"
      data-note-suggestion="${escapeAttribute(suggestion.note)}"
      data-tone="${escapeAttribute(suggestion.tone ?? "neutral")}"
      ${disabledAttribute}
    >
      <strong>${escapeHtml(suggestion.label)}</strong>
    </button>
  `;
}

function renderKeyboardShortcutGuide() {
  return `
    <div class="shortcut-guide">
      <div class="queue-distribution-header">
        <p class="section-kicker">Keyboard shortcuts</p>
        <p class="meta-copy">Paused while typing in search or notes.</p>
      </div>
      <div class="shortcut-row">
        ${REVIEW_CONSOLE_SHORTCUT_HINTS.map(renderKeyboardShortcutHint).join("")}
      </div>
    </div>
  `;
}

function renderKeyboardShortcutHint(shortcut) {
  return `
    <span class="shortcut-chip">
      <kbd>${escapeHtml(shortcut.key)}</kbd>
      <span>${escapeHtml(shortcut.label)}</span>
    </span>
  `;
}

function renderRecentReviewActivityButton(entry) {
  const notePreview = buildReviewDraftPreview(entry.notes);

  return `
    <button
      type="button"
      class="recent-activity-card${entry.isActive ? " is-active" : ""}"
      data-review-activity-event-id="${escapeAttribute(entry.eventId)}"
    >
      <div class="recent-activity-header">
        <span class="pill" data-status="${escapeAttribute(entry.reviewStatus)}">${escapeHtml(
          formatReviewStatus(entry.reviewStatus)
        )}</span>
        <span class="meta-copy">${escapeHtml(formatDateTime(entry.createdAt))}</span>
      </div>
      <strong>${escapeHtml(entry.headline)}</strong>
      ${
        notePreview
          ? `<p class="recent-activity-note-preview">${escapeHtml(notePreview)}</p>`
          : ""
      }
      <p class="recent-activity-copy">
        ${
          notePreview
            ? "Reopen this event with filters relaxed and the last analyst note restored into the draft editor."
            : "Reopen this event with status, history, and draft filters relaxed."
        }
      </p>
    </button>
  `;
}

function handleKeyboardShortcut(event) {
  const shortcut = resolveKeyboardShortcut(event);
  if (!shortcut) {
    return;
  }

  if (shortcut.command === "focus_search") {
    event.preventDefault();
    elements.searchInput.focus();
    elements.searchInput.select();
    return;
  }

  if (
    shortcut.command === "focus_previous_search_match" ||
    shortcut.command === "focus_next_search_match"
  ) {
    const direction =
      shortcut.command === "focus_previous_search_match" ? "previous" : "next";
    if (!cycleSelectedSearchFocus(direction)) {
      return;
    }

    event.preventDefault();
    return;
  }

  if (shortcut.command === "review_action") {
    if (!canRunShortcutReviewAction()) {
      return;
    }

    event.preventDefault();
    void handleReviewAction(shortcut.action);
    return;
  }

  const filteredTimeline = getFilteredTimeline();
  if (!filteredTimeline.length) {
    return;
  }

  const queueNavigation = buildReviewQueueNavigation(filteredTimeline, state.selectedEventId);
  let targetEventId = null;

  if (shortcut.command === "select_previous_visible") {
    targetEventId = queueNavigation?.previousVisibleEventId ?? null;
  } else if (shortcut.command === "select_next_visible") {
    targetEventId = queueNavigation?.nextVisibleEventId ?? null;
  } else if (shortcut.command === "select_next_pending") {
    targetEventId = resolveNextPendingEventId(filteredTimeline, state.selectedEventId);
  }

  if (!targetEventId) {
    return;
  }

  event.preventDefault();
  state.selectedEventId = targetEventId;
  syncUrl();
  render();
}

async function handleReviewAction(action) {
  state.actionError = "";
  if (!validateReviewAction(action)) {
    return;
  }

  if (state.sourceMode === SOURCE_API && state.demoMode === DEMO_NORMAL) {
    await submitPersistedReviewAction(action);
    return;
  }

  applyLocalReviewAction(action);
}

function applyLocalReviewAction(action) {
  if (!state.data || !state.selectedEventId) {
    return;
  }

  const currentEventId = state.selectedEventId;
  const detail = state.data.details[currentEventId];
  const timelineItem = state.data.timeline.find((item) => item.eventId === currentEventId);
  if (!detail || !timelineItem) {
    return;
  }

  const reviewDraft = getReviewDraft(state.reviewDrafts, currentEventId);
  const sanitizedReviewDraft = sanitizeReviewNotes(reviewDraft);
  const shouldAdvanceQueue = detail.event.reviewStatus === "pending_review";
  const nextPendingEventId = shouldAdvanceQueue
    ? resolveNextPendingEventId(state.data.timeline, currentEventId)
    : null;
  const nextStatus = mapActionToStatus(action);
  detail.event.reviewStatus = nextStatus;
  timelineItem.reviewStatus = nextStatus;
  detail.reviewActions = [
    {
      id: `local_${Date.now()}`,
      action,
      actorType: "analyst",
      actorName: "Local analyst",
      createdAt: new Date().toISOString(),
      notes: sanitizedReviewDraft
    },
    ...detail.reviewActions
  ];
  state.reviewDrafts = clearReviewDraft(state.reviewDrafts, currentEventId);
  persistReviewDrafts();
  recordRecentReviewActivity({
    eventId: currentEventId,
    headline: detail.event.headline,
    action,
    reviewStatus: nextStatus,
    createdAt: detail.reviewActions[0].createdAt,
    notes: sanitizedReviewDraft
  });

  if (nextPendingEventId) {
    state.selectedEventId = nextPendingEventId;
  }

  state.lastActionMessage = buildReviewActionMessage(
    nextStatus,
    detail.event.headline,
    nextPendingEventId ? state.data.details[nextPendingEventId]?.event?.headline : null
  );
  render();
}

async function submitPersistedReviewAction(action) {
  if (!state.data || !state.selectedEventId || state.isSubmittingReviewAction) {
    return;
  }

  state.isSubmittingReviewAction = true;
  state.actionError = "";
  state.lastActionMessage = "";
  render();

  try {
    const currentEventId = state.selectedEventId;
    const currentDetail = state.data.details[currentEventId];
    const reviewDraft = getReviewDraft(state.reviewDrafts, currentEventId);
    const sanitizedReviewDraft = sanitizeReviewNotes(reviewDraft);
    const shouldAdvanceQueue = currentDetail?.event?.reviewStatus === "pending_review";
    const nextPendingEventId = shouldAdvanceQueue
      ? resolveNextPendingEventId(state.data.timeline, currentEventId)
      : null;
    const response = await fetchJson(`/api/events/${state.selectedEventId}/review-actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action,
        notes: sanitizedReviewDraft
      })
    });
    const headline = currentDetail?.event?.headline ?? state.selectedEventId;
    state.reviewDrafts = clearReviewDraft(state.reviewDrafts, currentEventId);
    persistReviewDrafts();
    recordRecentReviewActivity({
      eventId: currentEventId,
      headline,
      action,
      reviewStatus: response.reviewStatus ?? mapActionToStatus(action),
      createdAt: response.reviewAction?.createdAt ?? new Date().toISOString(),
      notes: response.reviewAction?.notes ?? sanitizedReviewDraft
    });

    state.lastActionMessage = buildReviewActionMessage(
      response.reviewStatus,
      headline,
      nextPendingEventId ? state.data.details[nextPendingEventId]?.event?.headline : null
    );
    await refreshData({
      preserveActionMessage: true,
      preferredSelectedEventId: nextPendingEventId ?? state.selectedEventId
    });
  } catch (error) {
    state.actionError =
      error instanceof Error ? error.message : "Review action could not be recorded.";
    render();
  } finally {
    state.isSubmittingReviewAction = false;
    render();
  }
}

function mapActionToStatus(action) {
  if (action === "approve") {
    return "approved";
  }
  if (action === "edit") {
    return "edited";
  }
  return "rejected";
}

function buildReviewActionMessage(reviewStatus, headline, nextHeadline) {
  const statusLabel = formatReviewStatus(reviewStatus);
  if (!nextHeadline) {
    return `${statusLabel} recorded for ${headline}.`;
  }

  return `${statusLabel} recorded for ${headline}. Advanced to next pending event: ${nextHeadline}.`;
}

function renderActionFlashNote() {
  if (!state.lastActionMessage) {
    return "";
  }

  const reviewActivityEntry = getLastActionRecoveryEntry();
  return `
    <div class="flash-note${reviewActivityEntry ? " has-action" : ""}">
      <p class="flash-note-copy">${escapeHtml(state.lastActionMessage)}</p>
      ${
        reviewActivityEntry
          ? '<button type="button" class="secondary-action flash-note-action" data-reopen-last-reviewed>Reopen last reviewed event</button>'
          : ""
      }
    </div>
  `;
}

function canRunShortcutReviewAction() {
  if (!state.data || !state.selectedEventId || state.demoMode === DEMO_ERROR || state.loadError) {
    return false;
  }

  return Boolean(state.data.details[state.selectedEventId]);
}

function renderQueueNavigationButton(label, targetEventId) {
  const buttonAttributes = targetEventId
    ? `data-queue-target="${escapeAttribute(targetEventId)}"`
    : "disabled";

  return `<button type="button" class="secondary-action" ${buttonAttributes}>${escapeHtml(label)}</button>`;
}

function renderFeedChips(provenanceSummary) {
  const feedChips = provenanceSummary.visibleFeedLabels
    .map((feedLabel) => `<span class="chip">${escapeHtml(feedLabel)}</span>`)
    .join("");

  if (!provenanceSummary.remainingFeedCount) {
    return feedChips;
  }

  const moreLabel =
    provenanceSummary.remainingFeedCount === 1
      ? "+1 more feed"
      : `+${provenanceSummary.remainingFeedCount} more feeds`;

  return `${feedChips}<span class="chip">${escapeHtml(moreLabel)}</span>`;
}

function getCurrentFilterSummary() {
  const activeSavedView = getActiveSavedView();

  return buildFilterSummary({
    savedViewLabel: activeSavedView?.label ?? "",
    searchQuery: state.searchQuery,
    reviewStatusFilter: state.reviewStatusFilter,
    confidenceFilter: state.confidenceFilter,
    historyFilter: state.historyFilter,
    tagFilter: state.tagFilter,
    draftFilter: state.draftFilter,
    sortOrder: state.sortOrder,
    demoMode: state.demoMode
  });
}

function getCurrentFilterState() {
  return {
    searchQuery: state.searchQuery,
    reviewStatusFilter: state.reviewStatusFilter,
    confidenceFilter: state.confidenceFilter,
    historyFilter: state.historyFilter,
    tagFilter: state.tagFilter,
    draftFilter: state.draftFilter,
    sortOrder: state.sortOrder
  };
}

function buildTimelineMetaLabel(filteredCount) {
  if (!state.data) {
    return "0 events";
  }

  const totalCount = state.data.timeline.length;
  const filterSummary = getCurrentFilterSummary();
  if (
    filteredCount === totalCount &&
    !filterSummary.hasActiveFilters &&
    !filterSummary.demoModeLabel
  ) {
    return `${totalCount} event${totalCount === 1 ? "" : "s"}`;
  }

  return `${filteredCount} of ${totalCount} event${totalCount === 1 ? "" : "s"}`;
}

function buildVisibleCountCopy(filteredCount, totalCount, filterSummary) {
  if (totalCount === 0) {
    return "No events are available from the current data source yet.";
  }

  if (
    filteredCount === totalCount &&
    !filterSummary.hasActiveFilters &&
    !filterSummary.demoModeLabel
  ) {
    return `Showing all ${totalCount} event${totalCount === 1 ? "" : "s"} in the current queue.`;
  }

  return `Showing ${filteredCount} of ${totalCount} event${
    totalCount === 1 ? "" : "s"
  } in the current queue.`;
}

function buildEmptyStateCopy(filterSummary, totalCount) {
  if (totalCount === 0) {
    return "No events are available from the current data source yet.";
  }

  if (filterSummary.demoModeLabel && filterSummary.hasActiveFilters) {
    return `${filterSummary.demoModeLabel} is active and the current filters are still applied. Clear filters or return to the normal demo to repopulate the queue.`;
  }

  if (filterSummary.demoModeLabel) {
    return `${filterSummary.demoModeLabel} is forcing a no-results queue. Return to the normal demo to repopulate the review list.`;
  }

  if (filterSummary.hasActiveFilters) {
    return "The current search and review filters removed every event from this queue.";
  }

  return "Adjust filters or return to the normal demo state to repopulate the review queue.";
}

function renderFilterChips(filterSummary) {
  const labels = [];
  if (filterSummary.savedViewLabel) {
    labels.push(filterSummary.savedViewLabel);
  }
  labels.push(...filterSummary.activeFilters);
  if (filterSummary.sortLabel) {
    labels.push(filterSummary.sortLabel);
  }
  if (filterSummary.demoModeLabel) {
    labels.push(filterSummary.demoModeLabel);
  }

  return labels.map((label) => `<span class="chip">${escapeHtml(label)}</span>`).join("");
}

function renderFilterActions(filterSummary) {
  const actions = [];

  if (filterSummary.hasActiveFilters) {
    actions.push(
      '<button type="button" class="secondary-action" data-clear-filters>Clear filters</button>'
    );
  }

  if (filterSummary.demoModeLabel) {
    actions.push(
      '<button type="button" class="secondary-action" data-reset-demo>Return to normal demo</button>'
    );
  }

  return actions.join("");
}

function renderQueueDistribution(queueDistribution) {
  if (queueDistribution.totalCount === 0) {
    return "";
  }

  const scopeCopy =
    state.searchQuery || state.tagFilter !== "all"
      ? "Counts stay scoped to the current search and tag slice."
      : "Counts stay scoped to the full queue.";

  return `
    <div class="queue-distribution">
      <div class="queue-distribution-header">
        <p class="section-kicker">Quick lanes</p>
        <p class="meta-copy">${escapeHtml(scopeCopy)}</p>
      </div>
      ${renderQueueDistributionGroup(
        "Review status",
        queueDistribution.statusOptions,
        "data-quick-status"
      )}
      ${renderQueueDistributionGroup(
        "Confidence",
        queueDistribution.confidenceOptions,
        "data-quick-confidence"
      )}
    </div>
  `;
}

function renderAttentionLanes(attentionLanes) {
  if (!attentionLanes.length) {
    return "";
  }

  return `
    <div class="queue-distribution-group">
      <div class="queue-distribution-header">
        <p class="queue-distribution-label">Analyst attention</p>
        <p class="meta-copy">One click reapplies common analyst slices.</p>
      </div>
      <div class="queue-lane-row">
        ${attentionLanes.map((lane) => renderAttentionLaneButton(lane)).join("")}
      </div>
    </div>
  `;
}

function renderQueueDistributionGroup(label, options, attributeName) {
  return `
    <div class="queue-distribution-group">
      <p class="queue-distribution-label">${escapeHtml(label)}</p>
      <div class="queue-lane-row">
        ${options
          .map((option) => renderQueueDistributionButton(option, attributeName))
          .join("")}
      </div>
    </div>
  `;
}

function renderQueueDistributionButton(option, attributeName) {
  return `
    <button
      type="button"
      class="quick-lane${option.isActive ? " is-active" : ""}"
      ${attributeName}="${escapeAttribute(option.value)}"
    >
      <span>${escapeHtml(option.label)}</span>
      <strong>${option.count}</strong>
    </button>
  `;
}

function renderAttentionLaneButton(lane) {
  return `
    <button
      type="button"
      class="quick-lane${lane.isActive ? " is-active" : ""}"
      data-attention-lane="${escapeAttribute(lane.id)}"
    >
      <span>${escapeHtml(lane.label)}</span>
      <strong>${lane.count}</strong>
    </button>
  `;
}

function renderSavedViewButton(savedView) {
  return `
    <button
      type="button"
      class="quick-lane${savedView.isActive ? " is-active" : ""}"
      data-saved-view-id="${escapeAttribute(savedView.id)}"
    >
      <span>${escapeHtml(savedView.label)}</span>
      <strong>${savedView.count}</strong>
    </button>
  `;
}

function clearActiveFilters() {
  state.searchQuery = "";
  state.reviewStatusFilter = "all";
  state.confidenceFilter = "all";
  state.historyFilter = HISTORY_FILTER_ALL;
  state.tagFilter = "all";
  state.draftFilter = DRAFT_FILTER_ALL;
  syncControlsFromState();
  syncUrl();
  render();
}

function applyRecentReviewActivity(reviewActivityEntry) {
  if (!reviewActivityEntry) {
    return;
  }

  state.searchQuery = reviewActivityEntry.reopenFilters.searchQuery;
  state.reviewStatusFilter = reviewActivityEntry.reopenFilters.reviewStatusFilter;
  state.confidenceFilter = reviewActivityEntry.reopenFilters.confidenceFilter;
  state.historyFilter = reviewActivityEntry.reopenFilters.historyFilter;
  state.tagFilter = reviewActivityEntry.reopenFilters.tagFilter;
  state.draftFilter = reviewActivityEntry.reopenFilters.draftFilter;
  state.sortOrder = reviewActivityEntry.reopenFilters.sortOrder;
  state.demoMode = DEMO_NORMAL;
  state.selectedEventId = reviewActivityEntry.eventId;
  if (
    reviewActivityEntry.notes &&
    !hasReviewDraft(state.reviewDrafts, reviewActivityEntry.eventId)
  ) {
    state.reviewDrafts = setReviewDraft(
      state.reviewDrafts,
      reviewActivityEntry.eventId,
      reviewActivityEntry.notes
    );
    persistReviewDrafts();
  }
  syncControlsFromState();
  syncUrl();
  render();
}

function saveCurrentView() {
  const savedViewLabel = normalizeSavedViewLabel(state.savedViewName);
  const canSaveCurrentView =
    Boolean(savedViewLabel) &&
    (getCurrentFilterSummary().hasActiveFilters || state.sortOrder !== DEFAULT_TIMELINE_SORT);

  if (!canSaveCurrentView) {
    renderSavedViews();
    return;
  }

  state.savedViews = upsertSavedView(
    state.savedViews,
    savedViewLabel,
    getCurrentFilterState()
  );
  state.savedViewName = savedViewLabel;
  persistSavedViews();
  render();
}

function deleteActiveSavedView() {
  const activeSavedView = getActiveSavedView();
  if (!activeSavedView) {
    return;
  }

  state.savedViews = deleteSavedView(state.savedViews, activeSavedView.id);
  if (normalizeSavedViewLabel(state.savedViewName).toLowerCase() === activeSavedView.id) {
    state.savedViewName = "";
  }
  persistSavedViews();
  render();
}

function applySavedView(savedView) {
  state.searchQuery = savedView.filters.searchQuery;
  state.reviewStatusFilter = savedView.filters.reviewStatusFilter;
  state.confidenceFilter = savedView.filters.confidenceFilter;
  state.historyFilter = savedView.filters.historyFilter;
  state.tagFilter = savedView.filters.tagFilter;
  state.draftFilter = savedView.filters.draftFilter;
  state.sortOrder = savedView.filters.sortOrder;
  state.savedViewName = savedView.label;
  syncControlsFromState();
  syncUrl();
  render();
}

function resetDemoMode() {
  if (state.demoMode === DEMO_NORMAL) {
    return;
  }

  state.demoMode = DEMO_NORMAL;
  syncUrl();
  render();
}

function syncUrl() {
  clearShareViewFeedback();
  const url = new URL(window.location.href);
  const nextSearch = buildUrlSearch(buildShareableViewState());
  if (url.search === nextSearch) {
    return;
  }
  url.search = nextSearch;
  window.history.replaceState({}, "", url);
}

async function copyCurrentViewLink({
  portable = false,
  eventIdOverride,
  activeSearchFocusTargetOverride,
  successMessage,
  errorMessage
} = {}) {
  const shareUrl = buildShareViewUrl({
    portable,
    eventIdOverride,
    activeSearchFocusTargetOverride
  });

  try {
    await copyTextToClipboard(shareUrl.toString());
    setShareViewFeedback(
      successMessage ??
        (portable ? "Copied start link without saved drafts." : "Copied start link."),
      "success"
    );
  } catch (error) {
    setShareViewFeedback(
      errorMessage ?? "Copy failed. Use the browser address bar to share this start link.",
      "error"
    );
  }
}

async function copyNextPendingViewLink() {
  const handoffSummary = getViewHandoffSummary();
  if (!handoffSummary?.showNextPendingCopyAction || !handoffSummary.nextPendingEventId) {
    return;
  }

  const portable = handoffSummary.showPortableCopyAction;
  await copyCurrentViewLink({
    portable,
    eventIdOverride: handoffSummary.nextPendingEventId,
    activeSearchFocusTargetOverride: null,
    successMessage: portable
      ? "Copied next pending link without saved drafts."
      : "Copied next pending link.",
    errorMessage: portable
      ? "Copy failed. Use Copy review note to share the portable next pending handoff."
      : "Copy failed. Use Copy review note to share the next pending handoff."
  });
}

async function copyViewHandoffNote() {
  const handoffSummary = getViewHandoffSummary();
  if (!handoffSummary) {
    return;
  }

  const shareUrl = buildShareViewUrl();
  const portableShareUrl = handoffSummary.showPortableCopyAction
    ? buildShareViewUrl({ portable: true })
    : null;
  const nextPendingShareUrl = handoffSummary.nextPendingEventId
    ? buildShareViewUrl({
        eventIdOverride: handoffSummary.nextPendingEventId,
        activeSearchFocusTargetOverride: null
      })
    : null;
  const portableNextPendingShareUrl =
    handoffSummary.showPortableCopyAction && handoffSummary.nextPendingEventId
      ? buildShareViewUrl({
          portable: true,
          eventIdOverride: handoffSummary.nextPendingEventId,
          activeSearchFocusTargetOverride: null
        })
      : null;
  const handoffNote = buildViewHandoffNote({
    handoffSummary,
    shareUrl: shareUrl.toString(),
    portableShareUrl: portableShareUrl?.toString() ?? "",
    nextPendingShareUrl: nextPendingShareUrl?.toString() ?? "",
    portableNextPendingShareUrl: portableNextPendingShareUrl?.toString() ?? ""
  });

  try {
    await copyTextToClipboard(handoffNote);
    setShareViewFeedback(
      portableShareUrl
        ? "Copied review note with both start links."
        : "Copied review note.",
      "success"
    );
  } catch (error) {
    setShareViewFeedback(
      "Copy failed. Use the start links and scope summary below to share this handoff.",
      "error"
    );
  }
}

function buildShareViewUrl({
  portable = false,
  eventIdOverride,
  activeSearchFocusTargetOverride
} = {}) {
  const shareUrl = new URL(window.location.href);
  shareUrl.hash = "";
  shareUrl.search = buildUrlSearch(
    buildShareableViewState({
      portable,
      eventIdOverride,
      activeSearchFocusTargetOverride
    })
  );
  return shareUrl;
}

function buildShareableViewState({
  portable = false,
  eventIdOverride,
  activeSearchFocusTargetOverride
} = {}) {
  const selectedEventId = eventIdOverride ?? state.selectedEventId;

  return {
    ...state,
    selectedEventId,
    draftFilter:
      portable && state.draftFilter === DRAFT_FILTER_SAVED
        ? DRAFT_FILTER_ALL
        : state.draftFilter,
    activeSearchFocusTarget:
      activeSearchFocusTargetOverride ??
      (selectedEventId === state.selectedEventId
        ? getActiveSearchFocusTarget(getSelectedSearchMatches())
        : null)
  };
}

function setShareViewFeedback(message, tone) {
  if (shareViewFeedbackTimeoutId) {
    window.clearTimeout(shareViewFeedbackTimeoutId);
  }

  state.shareViewMessage = message;
  state.shareViewMessageTone = tone;
  render();

  shareViewFeedbackTimeoutId = window.setTimeout(() => {
    shareViewFeedbackTimeoutId = 0;
    state.shareViewMessage = "";
    state.shareViewMessageTone = "";
    render();
  }, 2200);
}

function clearShareViewFeedback() {
  if (shareViewFeedbackTimeoutId) {
    window.clearTimeout(shareViewFeedbackTimeoutId);
    shareViewFeedbackTimeoutId = 0;
  }

  if (!state.shareViewMessage && !state.shareViewMessageTone) {
    return;
  }

  state.shareViewMessage = "";
  state.shareViewMessageTone = "";
}

function validateReviewAction(action) {
  const validationError = getReviewActionValidationError(action, getSelectedReviewDraft());
  if (!validationError) {
    return true;
  }

  state.actionError = validationError;
  render();
  return false;
}

function syncControlsFromState() {
  elements.searchInput.value = state.searchQuery;
  elements.statusFilter.value = state.reviewStatusFilter;
  elements.confidenceFilter.value = state.confidenceFilter;
  elements.sortOrder.value = state.sortOrder;
  elements.historyFilter.value = state.historyFilter;
  elements.savedViewName.value = state.savedViewName;

  if ([...elements.tagFilter.options].some((option) => option.value === state.tagFilter)) {
    elements.tagFilter.value = state.tagFilter;
  }
}

function getSelectedReviewDraft() {
  return getReviewDraft(state.reviewDrafts, state.selectedEventId);
}

function renderTimelineDraftState() {
  if (!state.data) {
    return;
  }

  const currentScrollTop = elements.timelineList.scrollTop;
  renderTimeline();
  elements.timelineList.scrollTop = currentScrollTop;
}

function formatReviewStatus(reviewStatus) {
  return reviewStatus.replaceAll("_", " ");
}

function formatConfidence(confidence) {
  return `${confidence.label} confidence ${Math.round(confidence.score * 100)}%`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  fallbackCopyTextToClipboard(text);
}

function fallbackCopyTextToClipboard(text) {
  const copyTarget = document.createElement("textarea");
  copyTarget.value = text;
  copyTarget.setAttribute("readonly", "readonly");
  copyTarget.className = "hidden";
  copyTarget.style.position = "fixed";
  copyTarget.style.inset = "0";
  copyTarget.style.opacity = "0";
  document.body.append(copyTarget);
  copyTarget.focus();
  copyTarget.select();

  const copySucceeded =
    typeof document.execCommand === "function" ? document.execCommand("copy") : false;
  copyTarget.remove();

  if (!copySucceeded) {
    throw new Error("Copy failed");
  }
}

function focusDetailSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) {
    return;
  }

  document.querySelectorAll(".detail-section.is-focus-target").forEach((element) => {
    element.classList.remove("is-focus-target");
  });

  if (detailFocusTimeoutId) {
    window.clearTimeout(detailFocusTimeoutId);
    detailFocusTimeoutId = 0;
  }

  section.classList.add("is-focus-target");
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof section.focus === "function") {
    section.focus({ preventScroll: true });
  }

  detailFocusTimeoutId = window.setTimeout(() => {
    section.classList.remove("is-focus-target");
    detailFocusTimeoutId = 0;
  }, DETAIL_FOCUS_HIGHLIGHT_MS);
}

function getSelectedSearchMatches() {
  if (!state.data || !state.selectedEventId || !state.searchQuery) {
    return [];
  }

  const timelineItem = state.data.timeline.find((item) => item.eventId === state.selectedEventId);
  const detail = state.data.details[state.selectedEventId];
  if (!timelineItem || !detail) {
    return [];
  }

  return buildTimelineSearchMatches(state.searchQuery, timelineItem, detail);
}

function getActiveSearchFocusTarget(searchMatches) {
  if (state.activeSearchFocusEventId !== state.selectedEventId) {
    return null;
  }

  return searchMatches.some((match) => match.detailSectionId === state.activeSearchFocusTarget)
    ? state.activeSearchFocusTarget
    : null;
}

function focusSearchMatch(targetSectionId) {
  if (!targetSectionId || !state.selectedEventId) {
    return false;
  }

  state.activeSearchFocusEventId = state.selectedEventId;
  state.activeSearchFocusTarget = targetSectionId;
  pendingSearchFocusRestore = false;
  lastRestoredSearchFocusKey = buildSearchFocusKey(state.selectedEventId, targetSectionId);
  syncUrl();
  render();
  focusDetailSection(targetSectionId);
  return true;
}

function cycleSelectedSearchFocus(direction) {
  const searchMatches = getSelectedSearchMatches();
  const targetSectionId = resolveAdjacentSearchFocusTarget(
    searchMatches,
    getActiveSearchFocusTarget(searchMatches),
    direction
  );
  if (!targetSectionId) {
    return false;
  }

  return focusSearchMatch(targetSectionId);
}

function restoreActiveSearchFocusFromUrl() {
  const activeSearchFocusTarget = getActiveSearchFocusTarget(getSelectedSearchMatches());
  const searchFocusKey = buildSearchFocusKey(
    state.selectedEventId,
    activeSearchFocusTarget
  );
  if (!searchFocusKey) {
    return;
  }

  if (!pendingSearchFocusRestore && lastRestoredSearchFocusKey === searchFocusKey) {
    return;
  }

  pendingSearchFocusRestore = false;
  lastRestoredSearchFocusKey = searchFocusKey;
  window.requestAnimationFrame(() => {
    const currentSearchFocusKey = buildSearchFocusKey(
      state.selectedEventId,
      getActiveSearchFocusTarget(getSelectedSearchMatches())
    );
    if (currentSearchFocusKey !== searchFocusKey) {
      return;
    }

    focusDetailSection(activeSearchFocusTarget);
  });
}

function buildSearchFocusKey(eventId, targetSectionId) {
  return eventId && targetSectionId ? `${eventId}:${targetSectionId}` : "";
}

function getActiveSavedView() {
  return findMatchingSavedView(state.savedViews, getCurrentFilterState());
}

function getLastActionRecoveryEntry() {
  if (!state.lastActionMessage || !state.data || !state.recentReviewActivity.length) {
    return null;
  }

  const reviewActivityEntry = state.recentReviewActivity[0];
  if (!reviewActivityEntry || reviewActivityEntry.eventId === state.selectedEventId) {
    return null;
  }

  return state.data.timeline.some((item) => item.eventId === reviewActivityEntry.eventId)
    ? reviewActivityEntry
    : null;
}

function recordRecentReviewActivity(reviewActivityEntry) {
  state.recentReviewActivity = appendRecentReviewActivity(state.recentReviewActivity, {
    ...reviewActivityEntry,
    reopenFilters: buildRecentReviewFilters()
  });
  persistRecentReviewActivity();
}

function buildRecentReviewFilters() {
  return {
    ...getCurrentFilterState(),
    reviewStatusFilter: "all",
    historyFilter: HISTORY_FILTER_ALL,
    draftFilter: DRAFT_FILTER_ALL
  };
}

function loadSavedViews() {
  try {
    return readSavedViews(window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY));
  } catch {
    return [];
  }
}

function persistSavedViews() {
  try {
    window.localStorage.setItem(
      SAVED_VIEWS_STORAGE_KEY,
      serializeSavedViews(state.savedViews)
    );
  } catch {
    // Ignore storage write failures so the console remains usable.
  }
}

function loadReviewDrafts() {
  try {
    return readReviewDrafts(window.localStorage.getItem(REVIEW_DRAFT_STORAGE_KEY));
  } catch {
    return {};
  }
}

function persistReviewDrafts() {
  try {
    window.localStorage.setItem(
      REVIEW_DRAFT_STORAGE_KEY,
      serializeReviewDrafts(state.reviewDrafts)
    );
  } catch {
    // Ignore storage write failures so the console remains usable.
  }
}

function loadRecentReviewActivity() {
  try {
    return readRecentReviewActivity(window.localStorage.getItem(REVIEW_ACTIVITY_STORAGE_KEY));
  } catch {
    return [];
  }
}

function persistRecentReviewActivity() {
  try {
    window.localStorage.setItem(
      REVIEW_ACTIVITY_STORAGE_KEY,
      serializeRecentReviewActivity(state.recentReviewActivity)
    );
  } catch {
    // Ignore storage write failures so the console remains usable.
  }
}

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
  deleteSavedView,
  findMatchingSavedView,
  normalizeSavedViewLabel,
  readSavedViews,
  serializeSavedViews,
  upsertSavedView
} from "./saved-views.mjs";
import {
  buildReviewHistorySummary,
  formatReviewActionCount
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
import { buildTimelineEntitySummary } from "./timeline-entity-summary.mjs";
import { matchesTimelineSearchQuery } from "./timeline-search.mjs";
import {
  buildUrlSearch,
  createInitialUiState,
  DEMO_EMPTY,
  DEMO_ERROR,
  DEMO_NORMAL,
  DRAFT_FILTER_ALL,
  reconcileSelectedEventId,
  SOURCE_API,
  SOURCE_FIXTURES
} from "./view-state.mjs";

const initialUiState = createInitialUiState(window.location.search);
const SAVED_VIEWS_STORAGE_KEY = "all-seeing-eye.review-console.saved-views.v1";
const REVIEW_DRAFT_STORAGE_KEY = "all-seeing-eye.review-console.drafts.v1";

const state = {
  sourceMode: initialUiState.sourceMode,
  demoMode: initialUiState.demoMode,
  searchQuery: initialUiState.searchQuery,
  reviewStatusFilter: initialUiState.reviewStatusFilter,
  confidenceFilter: initialUiState.confidenceFilter,
  tagFilter: initialUiState.tagFilter,
  draftFilter: initialUiState.draftFilter,
  data: null,
  selectedEventId: initialUiState.selectedEventId,
  reviewDrafts: loadReviewDrafts(),
  savedViews: loadSavedViews(),
  savedViewName: "",
  loadError: "",
  actionError: "",
  lastActionMessage: "",
  isSubmittingReviewAction: false
};

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
  pendingCount: document.querySelector("#pending-count"),
  saveCurrentView: document.querySelector("#save-current-view"),
  savedViewList: document.querySelector("#saved-view-list"),
  savedViewName: document.querySelector("#saved-view-name"),
  searchInput: document.querySelector("#search-input"),
  sourceButtons: document.querySelectorAll("[data-source-mode]"),
  statusFilter: document.querySelector("#status-filter"),
  tagFilter: document.querySelector("#tag-filter"),
  timelineHeading: document.querySelector("#timeline-heading"),
  timelineList: document.querySelector("#timeline-list"),
  timelineMeta: document.querySelector("#timeline-meta")
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

    const savedViewButton = event.target.closest("[data-saved-view-id]");
    if (savedViewButton) {
      const savedViewId = savedViewButton.getAttribute("data-saved-view-id");
      const savedView = state.savedViews.find((entry) => entry.id === savedViewId);
      if (savedView) {
        applySavedView(savedView);
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
    persistReviewDrafts();
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
  return reconcileSelectedEventId(preferredSelectedEventId, timelineItems);
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
  includeTagFilter = true,
  includeDraftFilter = true
} = {}, filters = getCurrentFilterState()) {
  if (!state.data) {
    return [];
  }

  if (state.demoMode === DEMO_EMPTY) {
    return [];
  }

  return state.data.timeline.filter((item) => {
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
    const matchesTag =
      !includeTagFilter ||
      filters.tagFilter === "all" ||
      (item.tags ?? []).includes(filters.tagFilter);
    const matchesDraft =
      !includeDraftFilter ||
      filters.draftFilter === DRAFT_FILTER_ALL ||
      hasReviewDraft(state.reviewDrafts, item.eventId);

    return matchesQuery && matchesStatus && matchesConfidence && matchesTag && matchesDraft;
  });
}

function render() {
  renderToggles();
  renderSummary();
  renderSavedViews();
  renderTimeline();
  renderDetail();
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
    filteredTimeline
  );
  if (nextSelectedEventId !== state.selectedEventId) {
    state.selectedEventId = nextSelectedEventId;
    syncUrl();
  }

  elements.timelineMeta.textContent = buildTimelineMetaLabel(filteredTimeline.length);
  elements.timelineHeading.textContent =
    state.reviewStatusFilter === "all" ? "Review queue" : "Filtered review queue";

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
    return;
  }

  const totalCount = state.data.timeline.length;
  const filterSummary = getCurrentFilterSummary();
  const laneScopeTimeline = getTimelineSlice({
    includeReviewStatusFilter: false,
    includeConfidenceFilter: false,
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
    reviewStatusFilter: state.reviewStatusFilter,
    confidenceFilter: state.confidenceFilter,
    draftFilter: state.draftFilter
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
    getCurrentFilterSummary().hasActiveFilters && Boolean(normalizedSavedViewLabel);

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

  elements.detailPanel.innerHTML = `
    <div class="detail-shell">
      ${
        state.lastActionMessage
          ? `<div class="flash-note">${escapeHtml(state.lastActionMessage)}</div>`
          : ""
      }
      ${
        state.actionError
          ? `<div class="flash-note is-error">${escapeHtml(state.actionError)}</div>`
          : ""
      }
      <section class="detail-hero">
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
        ${renderListCard("Claims", detail.claims, renderClaim)}
        ${renderListCard("Entities", detail.entities, renderEntity)}
        ${renderListCard("Relationships", detail.relationships, (relationship) =>
          renderRelationship(relationship, entityLookup)
        )}
        ${renderReviewHistory(detail.reviewActions)}
      </section>

      <section class="source-grid">
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

      <section class="review-form">
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

function renderListCard(title, items, renderer) {
  return `
    <section class="list-card">
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

function renderReviewHistory(reviewActions) {
  return `
    <section class="list-card review-history">
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
      notes: sanitizeReviewNotes(reviewDraft)
    },
    ...detail.reviewActions
  ];
  state.reviewDrafts = clearReviewDraft(state.reviewDrafts, currentEventId);
  persistReviewDrafts();

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
        notes: sanitizeReviewNotes(reviewDraft)
      })
    });
    const headline = currentDetail?.event?.headline ?? state.selectedEventId;
    state.reviewDrafts = clearReviewDraft(state.reviewDrafts, currentEventId);
    persistReviewDrafts();

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
    tagFilter: state.tagFilter,
    draftFilter: state.draftFilter,
    demoMode: state.demoMode
  });
}

function getCurrentFilterState() {
  return {
    searchQuery: state.searchQuery,
    reviewStatusFilter: state.reviewStatusFilter,
    confidenceFilter: state.confidenceFilter,
    tagFilter: state.tagFilter,
    draftFilter: state.draftFilter
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
  const labels = [...filterSummary.activeFilters];
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
  state.tagFilter = "all";
  state.draftFilter = DRAFT_FILTER_ALL;
  syncControlsFromState();
  syncUrl();
  render();
}

function saveCurrentView() {
  const savedViewLabel = normalizeSavedViewLabel(state.savedViewName);
  if (!savedViewLabel || !getCurrentFilterSummary().hasActiveFilters) {
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
  state.tagFilter = savedView.filters.tagFilter;
  state.draftFilter = savedView.filters.draftFilter;
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
  const url = new URL(window.location.href);
  const nextSearch = buildUrlSearch(state);
  if (url.search === nextSearch) {
    return;
  }
  url.search = nextSearch;
  window.history.replaceState({}, "", url);
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

function getActiveSavedView() {
  return findMatchingSavedView(state.savedViews, getCurrentFilterState());
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

import { buildFixtureState } from "../../packages/contracts/bootstrap-fixtures.mjs";
import {
  getReviewActionValidationError,
  sanitizeReviewNotes
} from "../../packages/contracts/review-action-policy.mjs";
import { buildConfidenceSummary } from "./confidence-summary.mjs";
import {
  createEntityLookup,
  formatRelationshipDisplay
} from "./detail-formatters.mjs";
import {
  buildReviewHistorySummary,
  formatReviewActionCount
} from "./review-history-summary.mjs";
import {
  buildSourceProvenanceSummary,
  formatSourceRelativeTiming
} from "./source-provenance-summary.mjs";
import {
  buildUrlSearch,
  createInitialUiState,
  DEMO_EMPTY,
  DEMO_ERROR,
  DEMO_NORMAL,
  reconcileSelectedEventId,
  SOURCE_API,
  SOURCE_FIXTURES
} from "./view-state.mjs";

const initialUiState = createInitialUiState(window.location.search);

const state = {
  sourceMode: initialUiState.sourceMode,
  demoMode: initialUiState.demoMode,
  searchQuery: initialUiState.searchQuery,
  reviewStatusFilter: initialUiState.reviewStatusFilter,
  confidenceFilter: initialUiState.confidenceFilter,
  tagFilter: initialUiState.tagFilter,
  data: null,
  selectedEventId: initialUiState.selectedEventId,
  reviewDraft: "",
  loadError: "",
  actionError: "",
  lastActionMessage: "",
  isSubmittingReviewAction: false
};

const elements = {
  bannerMessage: document.querySelector("#banner-message"),
  confidenceFilter: document.querySelector("#confidence-filter"),
  dataSourceLabel: document.querySelector("#data-source-label"),
  demoButtons: document.querySelectorAll("[data-demo-mode]"),
  detailPanel: document.querySelector("#detail-panel"),
  emptyState: document.querySelector("#empty-state"),
  errorMessage: document.querySelector("#error-message"),
  errorState: document.querySelector("#error-state"),
  fallbackButton: document.querySelector("#fallback-button"),
  generatedAt: document.querySelector("#generated-at"),
  pendingCount: document.querySelector("#pending-count"),
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
}

async function refreshData(options = {}) {
  const preserveActionMessage = options.preserveActionMessage ?? false;

  state.loadError = "";
  state.actionError = "";
  if (!preserveActionMessage) {
    state.lastActionMessage = "";
  }
  render();

  try {
    state.data =
      state.sourceMode === SOURCE_API ? await loadApiData() : await loadFixtureData();
    state.selectedEventId = resolveSelectedEventId(state.data.timeline);
    state.reviewDraft = "";
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

function resolveSelectedEventId(timelineItems) {
  return reconcileSelectedEventId(state.selectedEventId, timelineItems);
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

  return state.data.timeline.filter((item) => {
    const matchesQuery =
      !state.searchQuery ||
      [item.headline, item.summary, item.primaryLocation, ...(item.tags ?? [])]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(state.searchQuery));

    const matchesStatus =
      state.reviewStatusFilter === "all" || item.reviewStatus === state.reviewStatusFilter;
    const matchesConfidence =
      state.confidenceFilter === "all" || item.confidence.label === state.confidenceFilter;
    const matchesTag = state.tagFilter === "all" || (item.tags ?? []).includes(state.tagFilter);

    return matchesQuery && matchesStatus && matchesConfidence && matchesTag;
  });
}

function render() {
  renderToggles();
  renderSummary();
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
  const nextSelectedEventId = reconcileSelectedEventId(
    state.selectedEventId,
    filteredTimeline
  );
  if (nextSelectedEventId !== state.selectedEventId) {
    state.selectedEventId = nextSelectedEventId;
    syncUrl();
  }

  elements.timelineMeta.textContent = `${filteredTimeline.length} event${
    filteredTimeline.length === 1 ? "" : "s"
  }`;
  elements.timelineHeading.textContent =
    state.reviewStatusFilter === "all" ? "Review queue" : "Filtered review queue";

  elements.timelineList.innerHTML = "";

  if (!state.data || state.demoMode === DEMO_ERROR || state.loadError) {
    elements.emptyState.hidden = true;
    return;
  }

  elements.emptyState.hidden = filteredTimeline.length !== 0;

  for (const item of filteredTimeline) {
    const detail = state.data.details[item.eventId];
    const confidenceSummary = buildConfidenceSummary(
      detail?.event?.confidence ?? item.confidence,
      detail?.claims ?? []
    );
    const reviewHistorySummary = buildReviewHistorySummary(detail?.reviewActions ?? []);
    const provenanceSummary = buildSourceProvenanceSummary(detail?.sources ?? [], item.eventTime);
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
      ${confidenceSummary ? renderTimelineConfidenceSummary(confidenceSummary) : ""}
      ${provenanceSummary ? renderTimelineProvenanceSummary(provenanceSummary) : ""}
      <div class="tag-row">
        ${(item.tags ?? [])
          .map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`)
          .join("")}
      </div>
      ${reviewHistorySummary ? renderTimelineReviewSummary(reviewHistorySummary) : ""}
    `;

    card.addEventListener("click", () => {
      state.selectedEventId = item.eventId;
      state.reviewDraft = "";
      syncUrl();
      render();
    });

    elements.timelineList.append(card);
  }
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
    elements.detailPanel.innerHTML = `
      <div class="state-card detail-placeholder">
        <h2>${filteredTimeline.length === 0 ? "No event selected" : "Select an event"}</h2>
        <p>${
          filteredTimeline.length === 0
            ? "Adjust filters or return to the normal demo state to repopulate the review queue."
            : "Choose a timeline row to inspect claims, sources, relationships, and review history."
        }</p>
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
  const disabledAttribute = state.isSubmittingReviewAction ? "disabled" : "";
  const entityLookup = createEntityLookup(detail.entities);
  const provenanceSummary = buildSourceProvenanceSummary(
    detail.sources,
    detail.event.eventTime
  );

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
        <textarea id="review-notes" placeholder="Document why this event was approved, edited, or rejected." ${disabledAttribute}>${escapeHtml(
          state.reviewDraft
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
    state.reviewDraft = event.target.value;
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

  const detail = state.data.details[state.selectedEventId];
  const timelineItem = state.data.timeline.find((item) => item.eventId === state.selectedEventId);
  if (!detail || !timelineItem) {
    return;
  }

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
      notes: sanitizeReviewNotes(state.reviewDraft)
    },
    ...detail.reviewActions
  ];

  state.lastActionMessage = `${formatReviewStatus(nextStatus)} recorded for ${
    detail.event.headline
  }.`;
  state.reviewDraft = "";
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
    const response = await fetchJson(`/api/events/${state.selectedEventId}/review-actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        action,
        notes: sanitizeReviewNotes(state.reviewDraft)
      })
    });
    const headline = state.data.details[state.selectedEventId]?.event.headline ?? state.selectedEventId;

    state.lastActionMessage = `${formatReviewStatus(response.reviewStatus)} recorded for ${headline}.`;
    await refreshData({ preserveActionMessage: true });
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
  const validationError = getReviewActionValidationError(action, state.reviewDraft);
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

  if ([...elements.tagFilter.options].some((option) => option.value === state.tagFilter)) {
    elements.tagFilter.value = state.tagFilter;
  }
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

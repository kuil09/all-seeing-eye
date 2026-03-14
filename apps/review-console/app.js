import { buildFixtureState } from "../../packages/contracts/bootstrap-fixtures.mjs";

const SOURCE_FIXTURES = "fixtures";
const SOURCE_API = "api";
const DEMO_NORMAL = "normal";
const DEMO_EMPTY = "empty";
const DEMO_ERROR = "error";

const state = {
  sourceMode: SOURCE_API,
  demoMode: DEMO_NORMAL,
  searchQuery: "",
  reviewStatusFilter: "all",
  confidenceFilter: "all",
  tagFilter: "all",
  data: null,
  selectedEventId: null,
  reviewDraft: "",
  lastError: "",
  lastActionMessage: ""
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

bindEvents();
void refreshData();

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value.trim().toLowerCase();
    render();
  });

  elements.statusFilter.addEventListener("change", (event) => {
    state.reviewStatusFilter = event.target.value;
    render();
  });

  elements.confidenceFilter.addEventListener("change", (event) => {
    state.confidenceFilter = event.target.value;
    render();
  });

  elements.tagFilter.addEventListener("change", (event) => {
    state.tagFilter = event.target.value;
    render();
  });

  for (const button of elements.sourceButtons) {
    button.addEventListener("click", async () => {
      const nextSourceMode = button.dataset.sourceMode;
      if (!nextSourceMode || nextSourceMode === state.sourceMode) {
        return;
      }

      state.sourceMode = nextSourceMode;
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
      render();
    });
  }

  elements.fallbackButton.addEventListener("click", async () => {
    state.sourceMode = SOURCE_FIXTURES;
    state.demoMode = DEMO_NORMAL;
    await refreshData();
  });
}

async function refreshData() {
  state.lastError = "";
  state.lastActionMessage = "";
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
    state.lastError = error instanceof Error ? error.message : "Unknown loading error.";
  }

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

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed for ${url} with status ${response.status}.`);
  }

  return response.json();
}

function resolveSelectedEventId(timelineItems) {
  const params = new URLSearchParams(window.location.search);
  const requestedEventId = params.get("eventId");
  if (requestedEventId && timelineItems.some((item) => item.eventId === requestedEventId)) {
    return requestedEventId;
  }

  return timelineItems[0]?.eventId ?? null;
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
      state.lastError || "Loading the analyst review queue and event detail fixtures.";
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
  const selectedEventVisible = filteredTimeline.some((item) => item.eventId === state.selectedEventId);
  if (!selectedEventVisible) {
    state.selectedEventId = filteredTimeline[0]?.eventId ?? state.selectedEventId;
  }

  elements.timelineMeta.textContent = `${filteredTimeline.length} event${
    filteredTimeline.length === 1 ? "" : "s"
  }`;
  elements.timelineHeading.textContent =
    state.reviewStatusFilter === "all" ? "Review queue" : "Filtered review queue";

  elements.timelineList.innerHTML = "";

  if (!state.data || state.demoMode === DEMO_ERROR || state.lastError) {
    elements.emptyState.hidden = true;
    return;
  }

  elements.emptyState.hidden = filteredTimeline.length !== 0;

  for (const item of filteredTimeline) {
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
      <div class="tag-row">
        ${(item.tags ?? [])
          .map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`)
          .join("")}
      </div>
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

function renderDetail() {
  const shouldShowError = state.demoMode === DEMO_ERROR || Boolean(state.lastError);
  elements.errorState.hidden = !shouldShowError;

  if (shouldShowError) {
    elements.errorMessage.textContent =
      state.lastError ||
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
        <h2>Select an event</h2>
        <p>Choose a timeline row to inspect claims, sources, relationships, and review history.</p>
      </div>
    `;
    return;
  }

  elements.detailPanel.innerHTML = `
    <div class="detail-shell">
      ${
        state.lastActionMessage
          ? `<div class="flash-note">${escapeHtml(state.lastActionMessage)}</div>`
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
        ${renderListCard("Relationships", detail.relationships, renderRelationship)}
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
        ${detail.sources.map(renderSourceCard).join("")}
      </section>

      <section class="review-form">
        <h3>Local review action</h3>
        <p class="detail-copy">
          The write path is still local-only, so actions update the in-memory console state and
          review history for demo purposes.
        </p>
        <textarea id="review-notes" placeholder="Document why this event was approved, edited, or rejected.">${escapeHtml(
          state.reviewDraft
        )}</textarea>
        <div class="action-row">
          <button type="button" class="primary-action" data-review-action="approve">Approve</button>
          <button type="button" class="neutral-action" data-review-action="edit">Mark edited</button>
          <button type="button" class="danger-action" data-review-action="reject">Reject</button>
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
      applyReviewAction(action);
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

function renderRelationship(relationship) {
  return `
    <li>
      <div class="list-card-header">
        <strong>${escapeHtml(relationship.relationshipType)}</strong>
        <span class="chip">${escapeHtml(relationship.confidence)}</span>
      </div>
      <p>
        ${escapeHtml(relationship.sourceEntityId)} -> ${escapeHtml(relationship.targetEntityId)}
      </p>
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

function renderSourceCard(source) {
  return `
    <article class="source-card">
      <div class="list-card-header">
        <strong>${escapeHtml(source.title)}</strong>
        <span class="chip">${escapeHtml(source.feedKey)}</span>
      </div>
      <p>${escapeHtml(source.excerpt)}</p>
      <div class="list-card-header">
        <a href="${escapeAttribute(source.sourceUrl)}" target="_blank" rel="noreferrer">Open source</a>
        <span class="meta-copy">${formatDateTime(source.publishedAt)}</span>
      </div>
    </article>
  `;
}

function applyReviewAction(action) {
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
      notes: state.reviewDraft.trim() || null
    },
    ...detail.reviewActions
  ];

  state.lastActionMessage = `${formatReviewStatus(nextStatus)} recorded for ${
    detail.event.headline
  }.`;
  state.reviewDraft = "";
  render();
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

function syncUrl() {
  const url = new URL(window.location.href);
  if (state.selectedEventId) {
    url.searchParams.set("eventId", state.selectedEventId);
  }
  window.history.replaceState({}, "", url);
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

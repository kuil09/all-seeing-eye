import {
  getEventDetail as getFixtureEventDetail,
  getTimelineResponse as getFixtureTimelineResponse
} from "./fixture-store.mjs";
import {
  applyPersistedReviewStateToEventDetail,
  applyPersistedReviewStateToTimelineResponse,
  getPersistedReviewEventState,
  getPersistedReviewEventStates,
  recordReviewAction as recordFixtureReviewAction
} from "./review-action-store.mjs";
import {
  getEventDetail as getSqliteEventDetail,
  recordReviewAction as recordSqliteReviewAction,
  getTimelineResponse as getSqliteTimelineResponse,
  shouldUseSqliteBackend
} from "./sqlite-store.mjs";

export function resolveReadApiBackend() {
  return shouldUseSqliteBackend() ? "sqlite" : "fixtures";
}

export function getReadApiHealthPayload() {
  return {
    status: "ok",
    backend: resolveReadApiBackend()
  };
}

async function getBaseReadApiTimelineResponse(repoRoot) {
  return resolveReadApiBackend() === "sqlite"
    ? getSqliteTimelineResponse(repoRoot)
    : getFixtureTimelineResponse(repoRoot);
}

async function getBaseReadApiEventDetail(repoRoot, eventId) {
  return resolveReadApiBackend() === "sqlite"
    ? getSqliteEventDetail(repoRoot, eventId)
    : getFixtureEventDetail(repoRoot, eventId);
}

export async function getReadApiTimelineResponse(repoRoot) {
  if (resolveReadApiBackend() === "sqlite") {
    return getSqliteTimelineResponse(repoRoot);
  }

  const [timelineResponse, persistedReviewStates] = await Promise.all([
    getBaseReadApiTimelineResponse(repoRoot),
    getPersistedReviewEventStates(repoRoot)
  ]);

  return applyPersistedReviewStateToTimelineResponse(timelineResponse, persistedReviewStates);
}

export async function getReadApiEventDetail(repoRoot, eventId) {
  if (resolveReadApiBackend() === "sqlite") {
    return getSqliteEventDetail(repoRoot, eventId);
  }

  const [eventDetail, persistedReviewState] = await Promise.all([
    getBaseReadApiEventDetail(repoRoot, eventId),
    getPersistedReviewEventState(repoRoot, eventId)
  ]);

  return applyPersistedReviewStateToEventDetail(eventDetail, persistedReviewState);
}

export async function createReadApiReviewAction(repoRoot, eventId, input) {
  const useSqliteBackend = resolveReadApiBackend() === "sqlite";
  const baseEventDetail = useSqliteBackend
    ? await getSqliteEventDetail(repoRoot, eventId)
    : await getBaseReadApiEventDetail(repoRoot, eventId);
  if (!baseEventDetail) {
    return null;
  }

  const persistedReviewState = useSqliteBackend
    ? await recordSqliteReviewAction(repoRoot, eventId, input)
    : await recordFixtureReviewAction(repoRoot, eventId, input);

  return {
    eventId,
    reviewStatus: persistedReviewState.reviewStatus,
    reviewAction: persistedReviewState.reviewActions[0]
  };
}

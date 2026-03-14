import {
  getEventDetail as getFixtureEventDetail,
  getTimelineResponse as getFixtureTimelineResponse
} from "./fixture-store.mjs";
import {
  getEventDetail as getSqliteEventDetail,
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

export async function getReadApiTimelineResponse(repoRoot) {
  return resolveReadApiBackend() === "sqlite"
    ? getSqliteTimelineResponse(repoRoot)
    : getFixtureTimelineResponse(repoRoot);
}

export async function getReadApiEventDetail(repoRoot, eventId) {
  return resolveReadApiBackend() === "sqlite"
    ? getSqliteEventDetail(repoRoot, eventId)
    : getFixtureEventDetail(repoRoot, eventId);
}

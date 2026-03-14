import { readFile } from "node:fs/promises";
import path from "node:path";

import { buildFixtureState } from "../../packages/contracts/bootstrap-fixtures.mjs";

async function readJson(filePath) {
  const fileContents = await readFile(filePath, "utf8");
  return JSON.parse(fileContents);
}

export async function loadReadApiState(repoRoot) {
  const [timelineResponse, exampleDetailResponse, bootstrapDataset] = await Promise.all([
    readJson(path.join(repoRoot, "contracts/examples/timeline-response.example.json")),
    readJson(path.join(repoRoot, "contracts/examples/event-detail.example.json")),
    readJson(path.join(repoRoot, "fixtures/bootstrap-dataset.json"))
  ]);

  return buildFixtureState(timelineResponse, exampleDetailResponse, bootstrapDataset);
}

export async function getTimelineResponse(repoRoot) {
  const state = await loadReadApiState(repoRoot);

  return {
    generatedAt: new Date().toISOString(),
    nextCursor: null,
    items: state.timeline
  };
}

export async function getEventDetail(repoRoot, eventId) {
  const state = await loadReadApiState(repoRoot);
  return state.details[eventId] ?? null;
}

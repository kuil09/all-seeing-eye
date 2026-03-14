import { normalizeCaptures } from "./normalizer.mjs";
import { fetchCuratedFeeds } from "./rss_fetcher.mjs";
import { buildSynthesisBundle } from "./synthesis_worker.mjs";
import { openPipelineStore, resolveDatabasePath } from "./sqlite_store.mjs";

export async function seedDemoPipeline({
  repoRoot,
  dbPath,
  datasetPath,
  ingestRunId = `ingest_${Date.now()}`,
  now = new Date().toISOString(),
  logger = console
}) {
  const fetched = await fetchCuratedFeeds({
    repoRoot,
    datasetPath,
    ingestRunId,
    now,
    logger
  });
  const normalizedSourceRecords = normalizeCaptures({
    captures: fetched.captures,
    ingestRunId
  });
  const synthesisBundle = buildSynthesisBundle({
    dataset: fetched.dataset,
    captures: fetched.captures,
    normalizedSourceRecords,
    now
  });
  const store = openPipelineStore({
    repoRoot,
    dbPath
  });

  try {
    store.initializeSchema();

    store.transaction(() => {
      store.replaceSeededState(synthesisBundle);
    });

    return {
      dbPath: resolveDatabasePath(repoRoot, dbPath),
      datasetPath: fetched.datasetPath,
      ingestRunId,
      fetched: {
        feeds: fetched.feedCount,
        items: fetched.itemCount
      },
      counts: store.getTableCounts(),
      qualityChecks: store.runDataQualityChecks(),
      events: store.listEvents()
    };
  } finally {
    store.close();
  }
}

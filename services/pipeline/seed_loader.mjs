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
  const store = openPipelineStore({
    repoRoot,
    dbPath
  });

  try {
    store.initializeSchema();
    store.recordIngestRunStarted({
      ingestRunId,
      mode: "fixture_seed",
      startedAt: now,
      datasetPath
    });

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

    store.transaction(() => {
      store.replaceSeededState(synthesisBundle);
      store.replaceIngestRunFeeds({
        ingestRunId,
        feeds: fetched.feeds,
        recordedAt: fetched.fetchedAt
      });
      store.recordIngestRunCompleted({
        ingestRunId,
        status: "succeeded",
        completedAt: fetched.fetchedAt,
        datasetPath: fetched.datasetPath,
        feedCount: fetched.feedCount,
        succeededFeedCount: fetched.feedCount,
        failedFeedCount: 0,
        itemCount: fetched.itemCount,
        persistedSourceRecordCount: normalizedSourceRecords.length
      });
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
  } catch (error) {
    store.recordIngestRunCompleted({
      ingestRunId,
      status: "failed",
      completedAt: new Date().toISOString(),
      datasetPath,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    store.close();
  }
}

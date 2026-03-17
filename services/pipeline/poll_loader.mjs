import { normalizeCaptures } from "./normalizer.mjs";
import { openPipelineStore, resolveDatabasePath } from "./sqlite_store.mjs";
import { pollCuratedFeeds } from "./rss_fetcher.mjs";
import { buildLivePollSynthesisBundle } from "./synthesis_worker.mjs";

const LIVE_POLL_NORMALIZATION_VERSION = "live-curated/v1";

export async function pollCuratedPipeline({
  repoRoot,
  dbPath,
  allowlistPath,
  ingestRunId = `poll_${Date.now()}`,
  now = new Date().toISOString(),
  maxAttempts = 3,
  maxItemsPerFeed = 20,
  timeoutMs = 10_000,
  logger = console,
  fetchImpl
}) {
  const store = openPipelineStore({
    repoRoot,
    dbPath
  });

  try {
    store.initializeSchema();
    store.recordIngestRunStarted({
      ingestRunId,
      mode: "live_poll",
      startedAt: now,
      allowlistPath
    });

    const result = await pollCuratedFeeds({
      repoRoot,
      allowlistPath,
      ingestRunId,
      now,
      maxAttempts,
      maxItemsPerFeed,
      timeoutMs,
      logger,
      fetchImpl
    });
    const normalizedSourceRecords = normalizeCaptures({
      captures: result.captures,
      ingestRunId,
      normalizationVersion: LIVE_POLL_NORMALIZATION_VERSION
    });
    const synthesisBundle = buildLivePollSynthesisBundle({
      captures: result.captures,
      normalizedSourceRecords,
      now: result.fetchedAt
    });

    store.transaction(() => {
      if (synthesisBundle.sourceRecords.length > 0) {
        store.replaceSeededState(synthesisBundle);
      }
      store.replaceIngestRunFeeds({
        ingestRunId,
        feeds: result.feeds,
        recordedAt: result.fetchedAt
      });
      store.recordIngestRunCompleted({
        ingestRunId,
        status: result.status,
        completedAt: result.fetchedAt,
        allowlistPath: result.allowlistPath,
        feedCount: result.feedCount,
        succeededFeedCount: result.feedCount - result.failedFeedCount,
        failedFeedCount: result.failedFeedCount,
        itemCount: result.itemCount,
        persistedSourceRecordCount: normalizedSourceRecords.length,
        errorMessage:
          result.failedFeedCount > 0
            ? `${result.failedFeedCount} curated feed(s) failed during polling.`
            : null
      });
    });

    return {
      dbPath: resolveDatabasePath(repoRoot, dbPath),
      allowlistPath: result.allowlistPath,
      ingestRunId,
      status: result.status,
      fetchedAt: result.fetchedAt,
      fetched: {
        feeds: result.feedCount,
        items: result.itemCount,
        failedFeeds: result.failedFeedCount
      },
      persisted: {
        sourceRecords: normalizedSourceRecords.length,
        events: synthesisBundle.events.length,
        claims: synthesisBundle.claims.length,
        confidenceAssessments: synthesisBundle.confidenceAssessments.length
      },
      counts: store.getTableCounts(),
      qualityChecks: store.runDataQualityChecks(),
      events: store.listEvents(),
      feeds: result.feeds
    };
  } catch (error) {
    store.recordIngestRunCompleted({
      ingestRunId,
      status: "failed",
      completedAt: new Date().toISOString(),
      allowlistPath,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  } finally {
    store.close();
  }
}

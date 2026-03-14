import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_DATASET_PATH = "fixtures/bootstrap-dataset.json";

export async function loadBootstrapDataset(repoRoot, datasetPath = DEFAULT_DATASET_PATH) {
  const effectiveDatasetPath = datasetPath ?? DEFAULT_DATASET_PATH;
  const resolvedDatasetPath = path.isAbsolute(effectiveDatasetPath)
    ? effectiveDatasetPath
    : path.join(repoRoot, effectiveDatasetPath);
  const fileContents = await readFile(resolvedDatasetPath, "utf8");

  return {
    dataset: JSON.parse(fileContents),
    datasetPath: resolvedDatasetPath
  };
}

export async function fetchCuratedFeeds({
  repoRoot,
  datasetPath,
  ingestRunId,
  now = new Date().toISOString(),
  maxAttempts = 3,
  logger = console
}) {
  const { dataset, datasetPath: resolvedDatasetPath } = await loadBootstrapDataset(
    repoRoot,
    datasetPath
  );
  const recordsByFeedKey = groupBy(dataset.sourceRecords, "feedKey");
  const captures = [];

  for (const feed of dataset.feeds) {
    const feedCaptures = await withRetries(
      async (attempt) => {
        const sourceRecords = recordsByFeedKey.get(feed.feedKey) ?? [];

        if (sourceRecords.length === 0) {
          throw new Error(`No source records found for curated feed "${feed.feedKey}".`);
        }

        logInfo(
          logger,
          `[pipeline] fetched ${sourceRecords.length} items from ${feed.feedKey} on attempt ${attempt}.`
        );

        return sourceRecords.map((sourceRecord) =>
          buildCapture({
            feed,
            sourceRecord,
            fetchedAt: now,
            ingestRunId
          })
        );
      },
      {
        feedKey: feed.feedKey,
        maxAttempts,
        logger
      }
    );

    captures.push(...feedCaptures);
  }

  return {
    dataset,
    datasetPath: resolvedDatasetPath,
    captures,
    fetchedAt: now,
    feedCount: dataset.feeds.length,
    itemCount: captures.length
  };
}

function buildCapture({ feed, sourceRecord, fetchedAt, ingestRunId }) {
  return {
    ingestRunId,
    sourceRecordId: sourceRecord.id,
    feedKey: feed.feedKey,
    feedCategory: feed.category ?? null,
    feedUrl: feed.url,
    sourceUrl: sourceRecord.sourceUrl,
    externalId: sourceRecord.sourceUrl,
    title: sourceRecord.title,
    bodyText: sourceRecord.normalizedText,
    publishedAt: sourceRecord.publishedAt ?? fetchedAt,
    canonicalHash: sourceRecord.canonicalHash,
    rawPayload: JSON.stringify(
      {
        feed,
        item: sourceRecord
      },
      null,
      2
    ),
    fetchedAt
  };
}

async function withRetries(operation, { feedKey, maxAttempts, logger }) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      logWarn(
        logger,
        `[pipeline] fetch attempt ${attempt}/${maxAttempts} failed for ${feedKey}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  throw new Error(
    `Curated feed fetch failed for ${feedKey}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

function groupBy(items, key) {
  const groups = new Map();

  for (const item of items) {
    const itemKey = item[key];
    const group = groups.get(itemKey) ?? [];
    group.push(item);
    groups.set(itemKey, group);
  }

  return groups;
}

function logInfo(logger, message) {
  if (typeof logger?.info === "function") {
    logger.info(message);
    return;
  }

  if (typeof logger?.log === "function") {
    logger.log(message);
  }
}

function logWarn(logger, message) {
  if (typeof logger?.warn === "function") {
    logger.warn(message);
    return;
  }

  if (typeof logger?.log === "function") {
    logger.log(message);
  }
}

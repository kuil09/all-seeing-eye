import { createHash } from "node:crypto";
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
  const feeds = [];

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
    feeds.push(
      buildFeedResult({
        feed,
        status: "succeeded",
        attemptCount: 1,
        itemCount: feedCaptures.length,
        latestPublishedAt: findLatestPublishedAt(feedCaptures),
        fetchedAt: now
      })
    );
  }

  return {
    dataset,
    datasetPath: resolvedDatasetPath,
    captures,
    feeds,
    fetchedAt: now,
    feedCount: dataset.feeds.length,
    itemCount: captures.length
  };
}

export async function loadCuratedFeedAllowlist(repoRoot, allowlistPath) {
  if (!allowlistPath) {
    throw new Error('Expected --allowlist <path> for "poll-curated".');
  }

  const resolvedAllowlistPath = path.isAbsolute(allowlistPath)
    ? allowlistPath
    : path.join(repoRoot, allowlistPath);
  const fileContents = await readFile(resolvedAllowlistPath, "utf8");
  const parsed = JSON.parse(fileContents);
  const feeds = Array.isArray(parsed) ? parsed : parsed.feeds;

  if (!Array.isArray(feeds) || feeds.length === 0) {
    throw new Error("Curated feed allowlist must contain a non-empty feeds array.");
  }

  for (const feed of feeds) {
    if (!feed || typeof feed !== "object") {
      throw new Error("Each curated feed allowlist entry must be an object.");
    }

    if (!isNonEmptyString(feed.feedKey) || !isNonEmptyString(feed.url)) {
      throw new Error("Each curated feed allowlist entry must include feedKey and url.");
    }
  }

  return {
    allowlistPath: resolvedAllowlistPath,
    feeds
  };
}

export async function pollCuratedFeeds({
  repoRoot,
  allowlistPath,
  ingestRunId,
  now = new Date().toISOString(),
  maxAttempts = 3,
  maxItemsPerFeed = 20,
  timeoutMs = 10_000,
  logger = console,
  fetchImpl = globalThis.fetch
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("Global fetch is unavailable in this Node runtime.");
  }

  const { allowlistPath: resolvedAllowlistPath, feeds: allowlistedFeeds } =
    await loadCuratedFeedAllowlist(repoRoot, allowlistPath);
  const captures = [];
  const feeds = [];

  for (const feed of allowlistedFeeds) {
    const feedResult = await pollSingleFeed({
      feed,
      ingestRunId,
      now,
      maxAttempts,
      maxItemsPerFeed,
      timeoutMs,
      logger,
      fetchImpl
    });

    feeds.push(feedResult.summary);
    captures.push(...feedResult.captures);
  }

  const failedFeedCount = feeds.filter((feed) => feed.status !== "succeeded").length;

  return {
    allowlistPath: resolvedAllowlistPath,
    captures,
    feeds,
    fetchedAt: now,
    feedCount: allowlistedFeeds.length,
    itemCount: captures.length,
    failedFeedCount,
    status: failedFeedCount > 0 ? "partial_failure" : "succeeded"
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

async function pollSingleFeed({
  feed,
  ingestRunId,
  now,
  maxAttempts,
  maxItemsPerFeed,
  timeoutMs,
  logger,
  fetchImpl
}) {
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchFeedResponse(feed.url, {
        timeoutMs,
        fetchImpl
      });
      const xml = await response.text();
      const parsedItems = parseSyndicatedFeed(xml, {
        feed,
        ingestRunId,
        fetchedAt: now
      }).slice(0, maxItemsPerFeed);

      logInfo(
        logger,
        `[pipeline] fetched ${parsedItems.length} items from ${feed.feedKey} on attempt ${attempt}.`
      );

      return {
        captures: parsedItems,
        summary: buildFeedResult({
          feed,
          status: "succeeded",
          attemptCount: attempt,
          itemCount: parsedItems.length,
          latestPublishedAt: findLatestPublishedAt(parsedItems),
          fetchedAt: now,
          lastHttpStatus: response.status,
          responseContentType: response.headers.get("content-type")
        })
      };
    } catch (error) {
      lastError = error;
      logWarn(
        logger,
        `[pipeline] fetch attempt ${attempt}/${maxAttempts} failed for ${feed.feedKey}: ${formatErrorMessage(error)}`
      );
    }
  }

  return {
    captures: [],
    summary: buildFeedResult({
      feed,
      status: "failed",
      attemptCount: maxAttempts,
      itemCount: 0,
      fetchedAt: now,
      errorMessage: formatErrorMessage(lastError),
      lastHttpStatus: lastError?.statusCode ?? null
    })
  };
}

async function fetchFeedResponse(url, { timeoutMs, fetchImpl }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "all-seeing-eye/curated-rss-poller"
      }
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status} ${response.statusText}`.trim());
      error.statusCode = response.status;
      throw error;
    }

    return response;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Timed out after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseSyndicatedFeed(xml, { feed, ingestRunId, fetchedAt }) {
  const trimmedXml = xml.trim();

  if (!trimmedXml) {
    throw new Error("Feed response was empty.");
  }

  const itemPayloads = hasTag(trimmedXml, "feed")
    ? parseAtomEntries(trimmedXml)
    : parseRssItems(trimmedXml);

  return itemPayloads.map((payload, index) =>
    buildCaptureFromLiveItem({
      feed,
      payload,
      ingestRunId,
      fetchedAt,
      fallbackIndex: index
    })
  );
}

function parseRssItems(xml) {
  return matchElementBodies(xml, "item").map((itemXml) => ({
    title: getTagText(itemXml, ["title"]),
    link: getTagText(itemXml, ["link"]),
    bodyText: getTagText(itemXml, ["content:encoded", "description", "content", "summary"]),
    publishedAt: getTagText(itemXml, ["pubDate", "published", "updated"]),
    externalId: getTagText(itemXml, ["guid", "id"])
  }));
}

function parseAtomEntries(xml) {
  return matchElementBodies(xml, "entry").map((entryXml) => ({
    title: getTagText(entryXml, ["title"]),
    link: getAtomLink(entryXml),
    bodyText: getTagText(entryXml, ["content", "summary"]),
    publishedAt: getTagText(entryXml, ["updated", "published"]),
    externalId: getTagText(entryXml, ["id"])
  }));
}

function buildCaptureFromLiveItem({ feed, payload, ingestRunId, fetchedAt, fallbackIndex }) {
  const sourceUrl = payload.link ?? feed.url;
  const externalId = payload.externalId ?? sourceUrl ?? `${feed.feedKey}:${fallbackIndex}`;
  const title = payload.title ?? `${feed.feedKey} item ${fallbackIndex + 1}`;
  const bodyText = normalizeBodyText(payload.bodyText, title);
  const publishedAt = normalizeTimestamp(payload.publishedAt, fetchedAt);
  const contentHash = createStableHash(`${title}\n${bodyText}\n${sourceUrl}`);
  const rawPayload = JSON.stringify(
    {
      feed,
      item: {
        externalId,
        sourceUrl,
        title,
        bodyText,
        publishedAt
      }
    },
    null,
    2
  );

  return {
    ingestRunId,
    sourceRecordId: `live_${feed.feedKey}_${createStableHash(externalId).slice(0, 16)}`,
    feedKey: feed.feedKey,
    feedCategory: feed.category ?? null,
    feedUrl: feed.url,
    sourceUrl,
    externalId,
    title,
    bodyText,
    publishedAt,
    canonicalHash: contentHash,
    rawPayload,
    fetchedAt
  };
}

function buildFeedResult({
  feed,
  status,
  attemptCount,
  itemCount,
  latestPublishedAt = null,
  fetchedAt = null,
  errorMessage = null,
  lastHttpStatus = null,
  responseContentType = null
}) {
  return {
    feedKey: feed.feedKey,
    feedUrl: feed.url,
    feedCategory: feed.category ?? null,
    status,
    attemptCount,
    itemCount,
    latestPublishedAt,
    errorMessage,
    lastHttpStatus,
    responseContentType,
    fetchedAt
  };
}

function matchElementBodies(xml, tagName) {
  const expression = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi");
  return Array.from(xml.matchAll(expression), (match) => match[1]);
}

function getTagText(xml, tagNames) {
  for (const tagName of tagNames) {
    const expression = new RegExp(`<${escapeForRegex(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeForRegex(tagName)}>`, "i");
    const match = xml.match(expression);

    if (match) {
      return cleanupXmlText(match[1]);
    }
  }

  return null;
}

function getAtomLink(xml) {
  const alternateMatch = xml.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (alternateMatch) {
    return decodeXmlEntities(alternateMatch[1]);
  }

  const genericMatch = xml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (genericMatch) {
    return decodeXmlEntities(genericMatch[1]);
  }

  return cleanupXmlText(getTagText(xml, ["link"]));
}

function cleanupXmlText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const withoutCdata = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  const withoutMarkup = withoutCdata.replace(/<[^>]+>/g, " ");
  const decoded = decodeXmlEntities(withoutMarkup);
  const normalized = decoded.replace(/\s+/g, " ").trim();

  return normalized || null;
}

function decodeXmlEntities(value) {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeForRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasTag(xml, tagName) {
  return new RegExp(`<${escapeForRegex(tagName)}\\b`, "i").test(xml);
}

function normalizeBodyText(bodyText, fallbackTitle) {
  return bodyText && bodyText.trim() ? bodyText.trim() : fallbackTitle;
}

function normalizeTimestamp(value, fallback) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function createStableHash(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function findLatestPublishedAt(captures) {
  const timestamps = captures
    .map((capture) => capture.publishedAt)
    .filter((timestamp) => typeof timestamp === "string" && timestamp.length > 0)
    .sort();

  return timestamps.length > 0 ? timestamps.at(-1) : null;
}

function formatErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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

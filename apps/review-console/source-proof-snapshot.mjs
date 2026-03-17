import { formatSourceRelativeTiming } from "./source-provenance-summary.mjs";

const DEFAULT_VISIBLE_SOURCE_COUNT = 2;
const DEFAULT_EXCERPT_MAX_LENGTH = 120;
const PROVENANCE_DETAIL_SECTION_ID = "detail-provenance";

export function buildSourceProofSnapshots(sources, eventTime, options = {}) {
  return buildSourceProofSnapshotBundle(sources, eventTime, options).items;
}

export function buildSourceProofSnapshotBundle(sources, eventTime, options = {}) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return {
      items: [],
      hiddenCount: 0,
      hasQueryMatchPriority: false
    };
  }

  const visibleSourceCount =
    Number.isInteger(options.visibleSourceCount) && options.visibleSourceCount > 0
      ? options.visibleSourceCount
      : DEFAULT_VISIBLE_SOURCE_COUNT;
  const excerptMaxLength =
    Number.isInteger(options.excerptMaxLength) && options.excerptMaxLength > 0
      ? options.excerptMaxLength
      : DEFAULT_EXCERPT_MAX_LENGTH;
  const normalizedQuery = normalizeSearchValue(options.searchQuery);
  const hasQueryPriorityCandidate =
    options.activeSearchFocusTarget === PROVENANCE_DETAIL_SECTION_ID && Boolean(normalizedQuery);
  const sourceEntries = sources
    .map((source, index) => {
      const snapshot = buildSourceProofSnapshot(source, eventTime, excerptMaxLength);
      if (!snapshot) {
        return null;
      }

      return {
        index,
        snapshot,
        queryMatch: matchesSourceProofQuery(source, normalizedQuery),
        proximity: getEventProximity(source?.publishedAt, eventTime)
      };
    })
    .filter(Boolean);
  const hasQueryMatchPriority =
    hasQueryPriorityCandidate && sourceEntries.some((entry) => entry.queryMatch);
  const resolvedVisibleSourceCount = hasQueryMatchPriority ? 1 : visibleSourceCount;
  const rankedEntries = hasQueryMatchPriority
    ? [...sourceEntries].sort(compareSourceProofEntries)
    : sourceEntries;
  const items = rankedEntries
    .slice(0, resolvedVisibleSourceCount)
    .map((entry) => entry.snapshot);

  return {
    items,
    hiddenCount: Math.max(sourceEntries.length - items.length, 0),
    hasQueryMatchPriority
  };
}

function buildSourceProofSnapshot(source, eventTime, excerptMaxLength) {
  const title = normalizeLabel(source?.title);
  const feedLabel = normalizeLabel(source?.feedKey);
  const relativeTiming = normalizeLabel(
    formatSourceRelativeTiming(source?.publishedAt, eventTime)
  );
  const excerpt = truncateCopy(normalizeLabel(source?.excerpt), excerptMaxLength);
  const summaryLabel = title || feedLabel;

  if (!summaryLabel && !excerpt) {
    return "";
  }

  const annotations = [];
  if (title && feedLabel) {
    annotations.push(feedLabel);
  }
  if (relativeTiming) {
    annotations.push(relativeTiming);
  }

  const label = annotations.length
    ? `${summaryLabel} (${annotations.join(", ")})`
    : summaryLabel;

  if (!excerpt) {
    return label;
  }

  return label ? `${label}: ${excerpt}` : excerpt;
}

function normalizeLabel(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSearchValue(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function matchesSourceProofQuery(source, normalizedQuery) {
  if (!normalizedQuery) {
    return false;
  }

  return [source?.title, source?.feedKey, source?.excerpt, source?.sourceUrl].some((value) =>
    normalizeSearchValue(value).includes(normalizedQuery)
  );
}

function getEventProximity(sourcePublishedAt, eventTime) {
  const publishedAtMs = Date.parse(String(sourcePublishedAt ?? ""));
  const eventTimeMs = Date.parse(String(eventTime ?? ""));

  if (!Number.isFinite(publishedAtMs) || !Number.isFinite(eventTimeMs)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(publishedAtMs - eventTimeMs);
}

function compareSourceProofEntries(left, right) {
  if (left.queryMatch !== right.queryMatch) {
    return left.queryMatch ? -1 : 1;
  }

  if (left.proximity !== right.proximity) {
    return left.proximity - right.proximity;
  }

  return left.index - right.index;
}

function truncateCopy(copy, maxLength) {
  if (!copy || copy.length <= maxLength) {
    return copy;
  }

  return `${copy.slice(0, maxLength - 3).trimEnd()}...`;
}

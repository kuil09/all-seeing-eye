import { formatSourceRelativeTiming } from "./source-provenance-summary.mjs";

const DEFAULT_VISIBLE_SOURCE_COUNT = 2;
const DEFAULT_EXCERPT_MAX_LENGTH = 120;

export function buildSourceProofSnapshots(sources, eventTime, options = {}) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return [];
  }

  const visibleSourceCount =
    Number.isInteger(options.visibleSourceCount) && options.visibleSourceCount > 0
      ? options.visibleSourceCount
      : DEFAULT_VISIBLE_SOURCE_COUNT;
  const excerptMaxLength =
    Number.isInteger(options.excerptMaxLength) && options.excerptMaxLength > 0
      ? options.excerptMaxLength
      : DEFAULT_EXCERPT_MAX_LENGTH;

  return sources
    .map((source) => buildSourceProofSnapshot(source, eventTime, excerptMaxLength))
    .filter(Boolean)
    .slice(0, visibleSourceCount);
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

function truncateCopy(copy, maxLength) {
  if (!copy || copy.length <= maxLength) {
    return copy;
  }

  return `${copy.slice(0, maxLength - 3).trimEnd()}...`;
}

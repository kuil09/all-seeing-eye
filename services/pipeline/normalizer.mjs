const DEFAULT_NORMALIZATION_VERSION = "bootstrap-fixture/v1";

export function normalizeCaptures({
  captures,
  ingestRunId,
  normalizationVersion = DEFAULT_NORMALIZATION_VERSION
}) {
  return captures.map((capture) => ({
    id: capture.sourceRecordId,
    source_type: "rss",
    source_key: capture.feedKey,
    external_id: capture.externalId,
    canonical_url: capture.sourceUrl,
    feed_url: capture.feedUrl,
    title: capture.title,
    body_text: capture.bodyText,
    summary_text: summarizeText(capture.bodyText),
    language_code: "en",
    author_name: null,
    published_at: capture.publishedAt,
    fetched_at: capture.fetchedAt,
    first_seen_at: capture.fetchedAt,
    last_seen_at: capture.fetchedAt,
    content_hash: capture.canonicalHash,
    raw_payload: capture.rawPayload,
    ingest_run_id: ingestRunId,
    normalization_version: normalizationVersion,
    synthesis_status: "pending",
    is_deleted: 0
  }));
}

function summarizeText(bodyText) {
  const normalized = bodyText.replace(/\s+/g, " ").trim();

  if (normalized.length <= 160) {
    return normalized;
  }

  return `${normalized.slice(0, 157).trimEnd()}...`;
}

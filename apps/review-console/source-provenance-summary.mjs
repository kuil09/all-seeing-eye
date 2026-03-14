const DEFAULT_VISIBLE_FEEDS = 2;

export function buildSourceProvenanceSummary(sources, eventTime, options = {}) {
  if (!Array.isArray(sources) || sources.length === 0) {
    return null;
  }

  const visibleFeedCount =
    Number.isInteger(options.visibleFeedCount) && options.visibleFeedCount > 0
      ? options.visibleFeedCount
      : DEFAULT_VISIBLE_FEEDS;
  const uniqueFeedLabels = [];
  const seenFeeds = new Set();

  for (const source of sources) {
    const feedLabel = normalizeFeedLabel(source?.feedKey);
    if (!seenFeeds.has(feedLabel)) {
      seenFeeds.add(feedLabel);
      uniqueFeedLabels.push(feedLabel);
    }
  }

  const sourceTimes = sources
    .map((source) => parseTimestamp(source?.publishedAt))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  return {
    sourceCount: sources.length,
    feedCount: uniqueFeedLabels.length,
    postureLabel: formatSourceCoverageLabel(sources.length, uniqueFeedLabels.length),
    timingLabel: buildTimingWindowLabel(sourceTimes, eventTime),
    visibleFeedLabels: uniqueFeedLabels.slice(0, visibleFeedCount),
    remainingFeedCount: Math.max(0, uniqueFeedLabels.length - visibleFeedCount)
  };
}

export function formatSourceRelativeTiming(publishedAt, eventTime) {
  const publishedTimestamp = parseTimestamp(publishedAt);
  const eventTimestamp = parseTimestamp(eventTime);
  if (!Number.isFinite(publishedTimestamp) || !Number.isFinite(eventTimestamp)) {
    return null;
  }

  return formatTimingOffset(publishedTimestamp - eventTimestamp);
}

function buildTimingWindowLabel(sourceTimes, eventTime) {
  const eventTimestamp = parseTimestamp(eventTime);
  if (!Number.isFinite(eventTimestamp) || sourceTimes.length === 0) {
    return null;
  }

  const firstOffsetLabel = formatTimingOffset(sourceTimes[0] - eventTimestamp);
  const lastOffsetLabel = formatTimingOffset(sourceTimes[sourceTimes.length - 1] - eventTimestamp);

  if (sourceTimes[0] === sourceTimes[sourceTimes.length - 1]) {
    return `Published ${firstOffsetLabel}`;
  }

  if (sourceTimes[0] < eventTimestamp && sourceTimes[sourceTimes.length - 1] > eventTimestamp) {
    return `Window spans ${firstOffsetLabel} to ${lastOffsetLabel}`;
  }

  if (sourceTimes[sourceTimes.length - 1] <= eventTimestamp) {
    return `Latest source ${lastOffsetLabel}`;
  }

  return `First source ${firstOffsetLabel}`;
}

function formatSourceCoverageLabel(sourceCount, feedCount) {
  if (feedCount <= 1) {
    return `${sourceCount} source${sourceCount === 1 ? "" : "s"} from 1 feed`;
  }

  return `${sourceCount} sources across ${feedCount} feeds`;
}

function formatTimingOffset(deltaMilliseconds) {
  const absoluteMinutes = Math.round(Math.abs(deltaMilliseconds) / 60000);

  if (absoluteMinutes === 0) {
    return "at event time";
  }

  const durationLabel = formatDurationLabel(absoluteMinutes);
  if (deltaMilliseconds < 0) {
    return `${durationLabel} before event`;
  }

  return `${durationLabel} after event`;
}

function formatDurationLabel(absoluteMinutes) {
  if (absoluteMinutes < 60) {
    return `${absoluteMinutes}m`;
  }

  const absoluteHours = Math.round(absoluteMinutes / 60);
  if (absoluteHours < 48) {
    return `${absoluteHours}h`;
  }

  const absoluteDays = Math.round(absoluteHours / 24);
  return `${absoluteDays}d`;
}

function normalizeFeedLabel(feedKey) {
  const trimmedFeedKey = typeof feedKey === "string" ? feedKey.trim() : "";
  return trimmedFeedKey || "unknown feed";
}

function parseTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) {
    return Number.NaN;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

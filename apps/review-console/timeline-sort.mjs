const PENDING_REVIEW = "pending_review";

export const SORT_PENDING_FIRST = "pending_first";
export const SORT_NEWEST = "newest";
export const SORT_OLDEST = "oldest";
export const SORT_LOWEST_CONFIDENCE = "lowest_confidence";
export const SORT_MOST_SOURCES = "most_sources";
export const DEFAULT_TIMELINE_SORT = SORT_PENDING_FIRST;

export const TIMELINE_SORT_OPTIONS = [
  {
    value: SORT_PENDING_FIRST,
    label: "Pending first"
  },
  {
    value: SORT_NEWEST,
    label: "Newest first"
  },
  {
    value: SORT_OLDEST,
    label: "Oldest first"
  },
  {
    value: SORT_LOWEST_CONFIDENCE,
    label: "Lowest confidence first"
  },
  {
    value: SORT_MOST_SOURCES,
    label: "Most sources first"
  }
];

const TIMELINE_SORTS = new Set(TIMELINE_SORT_OPTIONS.map((option) => option.value));

export function normalizeTimelineSort(sortOrder) {
  return TIMELINE_SORTS.has(sortOrder) ? sortOrder : DEFAULT_TIMELINE_SORT;
}

export function getTimelineSortLabel(sortOrder) {
  return (
    TIMELINE_SORT_OPTIONS.find((option) => option.value === normalizeTimelineSort(sortOrder))
      ?.label ?? TIMELINE_SORT_OPTIONS[0].label
  );
}

export function sortTimelineItems(timelineItems, sortOrder = DEFAULT_TIMELINE_SORT) {
  if (!Array.isArray(timelineItems) || !timelineItems.length) {
    return [];
  }

  const normalizedSort = normalizeTimelineSort(sortOrder);
  return [...timelineItems].sort((left, right) =>
    compareTimelineItems(left, right, normalizedSort)
  );
}

function compareTimelineItems(left, right, sortOrder) {
  if (sortOrder === SORT_NEWEST) {
    return compareByNewest(left, right);
  }

  if (sortOrder === SORT_OLDEST) {
    return compareByOldest(left, right);
  }

  if (sortOrder === SORT_LOWEST_CONFIDENCE) {
    return compareByLowestConfidence(left, right);
  }

  if (sortOrder === SORT_MOST_SOURCES) {
    return compareByMostSources(left, right);
  }

  return compareByPendingFirst(left, right);
}

function compareByPendingFirst(left, right) {
  return (
    compareNumbers(getPendingRank(left), getPendingRank(right)) ||
    compareByNewest(left, right)
  );
}

function compareByNewest(left, right) {
  return (
    compareNumbers(getEventTimestamp(right), getEventTimestamp(left)) ||
    compareTieBreakers(left, right)
  );
}

function compareByOldest(left, right) {
  return (
    compareNumbers(getEventTimestamp(left), getEventTimestamp(right)) ||
    compareTieBreakers(left, right)
  );
}

function compareByLowestConfidence(left, right) {
  return (
    compareNumbers(getConfidenceScore(left), getConfidenceScore(right)) ||
    compareByNewest(left, right)
  );
}

function compareByMostSources(left, right) {
  return (
    compareNumbers(getSourceCount(right), getSourceCount(left)) ||
    compareByNewest(left, right)
  );
}

function compareTieBreakers(left, right) {
  return (
    compareNumbers(getConfidenceScore(right), getConfidenceScore(left)) ||
    compareNumbers(getSourceCount(right), getSourceCount(left)) ||
    compareText(String(left.eventId ?? ""), String(right.eventId ?? ""))
  );
}

function getPendingRank(item) {
  return item?.reviewStatus === PENDING_REVIEW ? 0 : 1;
}

function getEventTimestamp(item) {
  const timestamp = Date.parse(item?.eventTime ?? "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getConfidenceScore(item) {
  return Number(item?.confidence?.score ?? 0);
}

function getSourceCount(item) {
  return Number(item?.sourceCount ?? 0);
}

function compareNumbers(left, right) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function compareText(left, right) {
  return left.localeCompare(right);
}

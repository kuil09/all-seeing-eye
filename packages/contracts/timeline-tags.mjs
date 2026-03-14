const EVENT_TYPE_TAG_ALIASES = Object.freeze({
  inspection_surge: "inspection",
  service_outage: "outage"
});

export function deriveTimelineTags({
  existingTags = [],
  feedCategories = [],
  eventType = null
} = {}) {
  const tags = [];

  addTags(tags, existingTags);
  addTags(tags, feedCategories);

  const eventTypeTag = deriveEventTypeTag(eventType);
  if (eventTypeTag) {
    addTag(tags, eventTypeTag);
  }

  return tags;
}

function deriveEventTypeTag(eventType) {
  const normalizedEventType = typeof eventType === "string" ? eventType.trim() : "";
  if (!normalizedEventType) {
    return null;
  }

  return normalizeTag(
    EVENT_TYPE_TAG_ALIASES[normalizedEventType] ?? normalizedEventType
  );
}

function addTags(tags, values) {
  for (const value of values) {
    addTag(tags, value);
  }
}

function addTag(tags, value) {
  const normalizedTag = normalizeTag(value);
  if (!normalizedTag || tags.includes(normalizedTag)) {
    return;
  }

  tags.push(normalizedTag);
}

function normalizeTag(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

const DEFAULT_VISIBLE_PARTICIPANTS = 2;

function humanizeLabel(value) {
  return String(value).replaceAll("_", " ").trim();
}

function capitalizeLabel(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function buildTimelineEntitySummary(entities, options = {}) {
  if (!Array.isArray(entities) || entities.length === 0) {
    return null;
  }

  const primaryLocation = normalizeText(options.primaryLocation);
  const visibleCount =
    Number.isInteger(options.visibleCount) && options.visibleCount > 0
      ? options.visibleCount
      : DEFAULT_VISIBLE_PARTICIPANTS;
  const participants = [];
  const seenParticipants = new Set();

  for (const entity of entities) {
    const label =
      typeof entity?.canonicalName === "string" && entity.canonicalName.trim()
        ? entity.canonicalName.trim()
        : typeof entity?.id === "string"
          ? entity.id
          : "";

    if (!label) {
      continue;
    }

    const role = typeof entity?.role === "string" ? entity.role.trim() : "";
    if (role === "location" && normalizeText(label) === primaryLocation) {
      continue;
    }

    const dedupeKey = `${normalizeText(label)}::${normalizeText(role)}`;
    if (seenParticipants.has(dedupeKey)) {
      continue;
    }

    seenParticipants.add(dedupeKey);

    const roleLabel =
      role && role !== "related" ? `${capitalizeLabel(humanizeLabel(role))}: ${label}` : label;
    participants.push(roleLabel);
  }

  if (participants.length === 0) {
    return null;
  }

  return {
    visibleParticipants: participants.slice(0, visibleCount),
    remainingCount: Math.max(participants.length - visibleCount, 0)
  };
}

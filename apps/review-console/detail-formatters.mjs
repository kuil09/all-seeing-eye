function humanizeLabel(value) {
  return String(value).replaceAll("_", " ");
}

export function createEntityLookup(entities) {
  return new Map(
    (entities ?? [])
      .filter((entity) => entity && typeof entity.id === "string")
      .map((entity) => [entity.id, entity])
  );
}

function getEntityDisplay(entityId, entityLookup) {
  const entity = entityLookup.get(entityId);

  return {
    label: entity?.canonicalName ?? entityId,
    roleLabel: entity?.role ? humanizeLabel(entity.role) : null
  };
}

export function formatRelationshipDisplay(relationship, entityLookup) {
  const source = getEntityDisplay(relationship.sourceEntityId, entityLookup);
  const target = getEntityDisplay(relationship.targetEntityId, entityLookup);

  return {
    relationshipTypeLabel: humanizeLabel(relationship.relationshipType),
    participantLabel: `${source.label} -> ${target.label}`,
    roleLabel:
      source.roleLabel || target.roleLabel
        ? `${source.roleLabel ?? "unknown"} -> ${target.roleLabel ?? "unknown"}`
        : null
  };
}

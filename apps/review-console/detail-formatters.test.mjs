import test from "node:test";
import assert from "node:assert/strict";

import {
  createEntityLookup,
  formatRelationshipDisplay
} from "./detail-formatters.mjs";

test("formatRelationshipDisplay resolves canonical entity names and roles", () => {
  const entityLookup = createEntityLookup([
    {
      id: "ent_port_authority",
      canonicalName: "Harbor North Port Authority",
      role: "organization"
    },
    {
      id: "ent_harbor_north",
      canonicalName: "Harbor North cargo terminal",
      role: "location"
    }
  ]);

  assert.deepEqual(
    formatRelationshipDisplay(
      {
        sourceEntityId: "ent_port_authority",
        targetEntityId: "ent_harbor_north",
        relationshipType: "operates"
      },
      entityLookup
    ),
    {
      relationshipTypeLabel: "operates",
      participantLabel: "Harbor North Port Authority -> Harbor North cargo terminal",
      roleLabel: "organization -> location"
    }
  );
});

test("formatRelationshipDisplay falls back to entity ids when lookup misses", () => {
  const entityLookup = createEntityLookup([]);

  assert.deepEqual(
    formatRelationshipDisplay(
      {
        sourceEntityId: "ent_missing_source",
        targetEntityId: "ent_missing_target",
        relationshipType: "service_outage_link"
      },
      entityLookup
    ),
    {
      relationshipTypeLabel: "service outage link",
      participantLabel: "ent_missing_source -> ent_missing_target",
      roleLabel: null
    }
  );
});

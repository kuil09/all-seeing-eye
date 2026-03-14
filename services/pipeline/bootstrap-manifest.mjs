export const BOOTSTRAP_EVENT_LINKS = Object.freeze({
  evt_20260314_harbor_north_inspections: {
    eventType: "inspection_surge",
    primaryLocationEntityId: "ent_harbor_north",
    relationshipIds: ["rel_harbor_operator", "rel_shipping_observer"],
    sourceRoles: {
      src_20260314_001: "trigger",
      src_20260314_002: "supporting"
    },
    entityRoles: {
      ent_harbor_north: "location",
      ent_port_authority: "organization",
      ent_shipping_association: "observer"
    }
  },
  evt_20260314_substation_outage: {
    eventType: "service_outage",
    primaryLocationEntityId: "ent_substation_7",
    relationshipIds: ["rel_grid_operator"],
    sourceRoles: {
      src_20260314_003: "trigger",
      src_20260314_004: "supporting"
    },
    entityRoles: {
      ent_substation_7: "location",
      ent_east_grid: "organization"
    }
  }
});

export function getEventLink(eventId) {
  return (
    BOOTSTRAP_EVENT_LINKS[eventId] ?? {
      eventType: "rss_event",
      primaryLocationEntityId: null,
      relationshipIds: [],
      sourceRoles: {},
      entityRoles: {}
    }
  );
}

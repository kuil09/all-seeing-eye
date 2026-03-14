import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const VALID_REVIEW_ACTIONS = new Set(["approve", "edit", "reject"]);

function createStoreError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function createDefaultStore() {
  return {
    version: 1,
    events: {}
  };
}

function normalizeReviewActionStore(store) {
  if (!store || typeof store !== "object" || Array.isArray(store)) {
    return createDefaultStore();
  }

  return {
    version: 1,
    events:
      store.events && typeof store.events === "object" && !Array.isArray(store.events)
        ? store.events
        : {}
  };
}

function sanitizeNotes(notes) {
  return typeof notes === "string" && notes.trim() ? notes.trim() : null;
}

function sanitizeActorName(actorName) {
  return typeof actorName === "string" && actorName.trim() ? actorName.trim() : "Local analyst";
}

function sanitizeActorType(actorType) {
  return typeof actorType === "string" && actorType.trim() ? actorType.trim() : "analyst";
}

function mapActionToReviewStatus(action) {
  if (action === "approve") {
    return "approved";
  }
  if (action === "edit") {
    return "edited";
  }
  return "rejected";
}

async function readReviewActionStore(repoRoot) {
  const filePath = getReviewActionsFilePath(repoRoot);

  try {
    const fileContents = await readFile(filePath, "utf8");
    if (!fileContents.trim()) {
      return createDefaultStore();
    }

    return normalizeReviewActionStore(JSON.parse(fileContents));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return createDefaultStore();
    }

    throw error;
  }
}

async function writeReviewActionStore(repoRoot, store) {
  const filePath = getReviewActionsFilePath(repoRoot);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

export function getReviewActionsFilePath(repoRoot) {
  const configuredPath = process.env.REVIEW_ACTIONS_FILE;
  if (!configuredPath) {
    return path.join(repoRoot, "data", "review-actions.json");
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(repoRoot, configuredPath);
}

export async function getPersistedReviewEventStates(repoRoot) {
  const store = await readReviewActionStore(repoRoot);
  return store.events;
}

export async function getPersistedReviewEventState(repoRoot, eventId) {
  const eventStates = await getPersistedReviewEventStates(repoRoot);
  return eventStates[eventId] ?? null;
}

export function applyPersistedReviewStateToTimelineResponse(timelineResponse, reviewEventStates) {
  return {
    ...timelineResponse,
    items: timelineResponse.items.map((item) => {
      const eventState = reviewEventStates[item.eventId];
      if (!eventState?.reviewStatus) {
        return item;
      }

      return {
        ...item,
        reviewStatus: eventState.reviewStatus
      };
    })
  };
}

export function applyPersistedReviewStateToEventDetail(eventDetail, reviewEventState) {
  if (!eventDetail || !reviewEventState) {
    return eventDetail;
  }

  const persistedActions = Array.isArray(reviewEventState.reviewActions)
    ? reviewEventState.reviewActions
    : [];
  const persistedActionIds = new Set(persistedActions.map((reviewAction) => reviewAction.id));

  return {
    ...eventDetail,
    event: {
      ...eventDetail.event,
      reviewStatus: reviewEventState.reviewStatus ?? eventDetail.event.reviewStatus
    },
    reviewActions: [
      ...persistedActions,
      ...(eventDetail.reviewActions ?? []).filter(
        (reviewAction) => !persistedActionIds.has(reviewAction.id)
      )
    ]
  };
}

export async function recordReviewAction(repoRoot, eventId, input) {
  const action = input?.action;
  if (!VALID_REVIEW_ACTIONS.has(action)) {
    throw createStoreError("Review action must be one of approve, edit, or reject.");
  }

  const store = await readReviewActionStore(repoRoot);
  const nextReviewAction = {
    id: `local_${eventId}_${Date.now()}`,
    action,
    actorType: sanitizeActorType(input?.actorType),
    actorName: sanitizeActorName(input?.actorName),
    createdAt: new Date().toISOString(),
    notes: sanitizeNotes(input?.notes)
  };
  const previousEventState = store.events[eventId] ?? {
    reviewStatus: "pending_review",
    reviewActions: []
  };
  const previousReviewActions = Array.isArray(previousEventState.reviewActions)
    ? previousEventState.reviewActions
    : [];

  store.events[eventId] = {
    reviewStatus: mapActionToReviewStatus(action),
    reviewActions: [nextReviewAction, ...previousReviewActions]
  };

  await writeReviewActionStore(repoRoot, store);

  return store.events[eventId];
}

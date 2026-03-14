export const REVIEW_ACTION_APPROVE = "approve";
export const REVIEW_ACTION_EDIT = "edit";
export const REVIEW_ACTION_REJECT = "reject";

const VALID_REVIEW_ACTIONS = new Set([
  REVIEW_ACTION_APPROVE,
  REVIEW_ACTION_EDIT,
  REVIEW_ACTION_REJECT
]);

const NOTE_REQUIRED_MESSAGES = {
  [REVIEW_ACTION_EDIT]: "Analyst notes are required when marking an event as edited.",
  [REVIEW_ACTION_REJECT]: "Analyst notes are required when marking an event as rejected."
};

export function sanitizeReviewNotes(notes) {
  return typeof notes === "string" && notes.trim() ? notes.trim() : null;
}

export function isValidReviewAction(action) {
  return VALID_REVIEW_ACTIONS.has(action);
}

export function getReviewActionValidationError(action, notes) {
  if (!isValidReviewAction(action)) {
    return "Review action must be one of approve, edit, or reject.";
  }

  const normalizedNotes = sanitizeReviewNotes(notes);
  return NOTE_REQUIRED_MESSAGES[action] && !normalizedNotes
    ? NOTE_REQUIRED_MESSAGES[action]
    : null;
}

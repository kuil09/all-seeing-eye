export function buildViewHandoffSummary({
  selectedHeadline = "",
  filteredCount = 0,
  totalCount = 0,
  sourceLabel = "",
  filterSummary = {},
  draftFilter = "all",
  demoMode = "normal"
}) {
  const cleanedSelectedHeadline = String(selectedHeadline).trim();
  const sortLabel = normalizeSortLabel(filterSummary.sortLabel);

  return {
    selectedLabel: cleanedSelectedHeadline ? "Selected event" : "Queue state",
    selectedValue:
      cleanedSelectedHeadline ||
      (filteredCount === 0 ? "No visible event is selected" : "No event is selected"),
    contextLabel: [buildQueueLabel(filteredCount, totalCount, filterSummary), sourceLabel, sortLabel]
      .filter(Boolean)
      .join(" · "),
    helperCopy: cleanedSelectedHeadline
      ? "Copy a URL that reopens this queue slice and selected event for async review handoff."
      : "Copy a URL that reopens this queue slice for async review handoff.",
    portabilityNote: buildPortabilityNote({ draftFilter, demoMode }),
    showPortableCopyAction: draftFilter === "saved",
    isWarning: draftFilter === "saved" || demoMode !== "normal"
  };
}

function buildQueueLabel(filteredCount, totalCount, filterSummary) {
  if (totalCount === 0) {
    return "No events available";
  }

  const hasGlobalFilters = Boolean(filterSummary.hasActiveFilters || filterSummary.demoModeLabel);
  if (filteredCount === totalCount && !hasGlobalFilters) {
    return `All ${totalCount} event${totalCount === 1 ? "" : "s"} visible`;
  }

  return `${filteredCount} of ${totalCount} event${totalCount === 1 ? "" : "s"} visible`;
}

function normalizeSortLabel(sortLabel) {
  if (typeof sortLabel !== "string" || !sortLabel.trim()) {
    return "";
  }

  return sortLabel.replace(/^Sort:\s*/i, "").trim();
}

function buildPortabilityNote({ draftFilter, demoMode }) {
  if (draftFilter === "saved") {
    return "Saved-draft filtering depends on browser-local storage, so another analyst may reopen an empty queue. Use Copy portable link to remove this local-only filter.";
  }

  if (demoMode !== "normal") {
    return "Demo mode stays in the URL so the next viewer reopens this QA state instead of the normal queue.";
  }

  return "Selected event, filters, queue sort, source mode, and demo mode stay in the URL.";
}

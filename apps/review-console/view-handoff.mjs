export function buildViewHandoffSummary({
  selectedHeadline = "",
  filteredCount = 0,
  totalCount = 0,
  sourceLabel = "",
  filterSummary = {},
  draftFilter = "all",
  demoMode = "normal",
  hasSelectedDraft = false,
  activeSavedViewLabel = ""
}) {
  const cleanedSelectedHeadline = String(selectedHeadline).trim();
  const cleanedSourceLabel = normalizeLabel(sourceLabel);
  const cleanedSavedViewLabel = normalizeLabel(activeSavedViewLabel);
  const sortLabel = normalizeSortLabel(filterSummary.sortLabel);
  const includedState = buildIncludedState({
    cleanedSelectedHeadline,
    cleanedSourceLabel,
    filterSummary,
    sortLabel,
    draftFilter,
    totalCount
  });
  const localDependentState =
    draftFilter === "saved" ? ["Saved-draft filter"] : [];
  const localOnlyState = [];

  if (hasSelectedDraft) {
    localOnlyState.push("Draft note text");
  }

  if (cleanedSavedViewLabel) {
    localOnlyState.push(`Saved view label: ${cleanedSavedViewLabel}`);
  }

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
    includedState,
    localDependentState,
    localOnlyState,
    portabilityNote: buildPortabilityNote({
      draftFilter,
      demoMode,
      hasSelectedDraft,
      activeSavedViewLabel: cleanedSavedViewLabel
    }),
    showPortableCopyAction: draftFilter === "saved",
    isWarning: localDependentState.length > 0 || hasSelectedDraft
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

function buildIncludedState({
  cleanedSelectedHeadline,
  cleanedSourceLabel,
  filterSummary,
  sortLabel,
  draftFilter,
  totalCount
}) {
  const activeFilters = Array.isArray(filterSummary.activeFilters)
    ? filterSummary.activeFilters.filter((label) => {
        if (draftFilter !== "saved") {
          return true;
        }

        return !/^Drafts:\s*/i.test(String(label));
      })
    : [];

  return [
    cleanedSelectedHeadline ? "Selected event" : "Queue state",
    ...activeFilters,
    sortLabel || (totalCount > 0 ? "Pending first sort" : ""),
    cleanedSourceLabel,
    normalizeLabel(filterSummary.demoModeLabel)
  ].filter(Boolean);
}

function buildPortabilityNote({
  draftFilter,
  demoMode,
  hasSelectedDraft,
  activeSavedViewLabel
}) {
  if (draftFilter === "saved") {
    return "Saved-draft filtering stays in the copied current link, but it only reproduces on browsers that already have matching local drafts. Use Copy portable link to remove this dependency.";
  }

  const localOnlyLabels = [];
  if (hasSelectedDraft) {
    localOnlyLabels.push("draft note text");
  }
  if (activeSavedViewLabel) {
    localOnlyLabels.push(`saved view label \"${activeSavedViewLabel}\"`);
  }

  if (localOnlyLabels.length) {
    return `The copied URL reopens this queue, but ${joinLabelList(localOnlyLabels)} ${
      localOnlyLabels.length === 1 ? "stays" : "stay"
    } in this browser only.`;
  }

  if (demoMode !== "normal") {
    return "Demo mode stays in the URL so the next viewer reopens this QA state instead of the normal queue.";
  }

  return "Selected event, filters, queue sort, source mode, and demo mode stay in the URL.";
}

function normalizeLabel(label) {
  if (typeof label !== "string") {
    return "";
  }

  return label.trim();
}

function joinLabelList(labels) {
  if (labels.length <= 1) {
    return labels[0] ?? "";
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

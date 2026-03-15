export function buildViewHandoffSummary({
  selectedHeadline = "",
  filteredCount = 0,
  totalCount = 0,
  sourceLabel = "",
  filterSummary = {},
  draftFilter = "all",
  demoMode = "normal",
  hasSelectedDraft = false,
  activeSavedViewLabel = "",
  selectedDraftPreview = ""
}) {
  const cleanedSelectedHeadline = String(selectedHeadline).trim();
  const cleanedSourceLabel = normalizeLabel(sourceLabel);
  const cleanedSavedViewLabel = normalizeLabel(activeSavedViewLabel);
  const cleanedSelectedDraftPreview = normalizeLabel(selectedDraftPreview);
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
  const noteOnlyState = cleanedSelectedDraftPreview
    ? ["Selected draft note snapshot"]
    : [];

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
    noteOnlyState,
    selectedDraftPreview: cleanedSelectedDraftPreview,
    portabilityNote: buildPortabilityNote({
      draftFilter,
      demoMode,
      hasSelectedDraft,
      activeSavedViewLabel: cleanedSavedViewLabel,
      hasSelectedDraftSnapshot: Boolean(cleanedSelectedDraftPreview)
    }),
    showPortableCopyAction: draftFilter === "saved",
    isWarning: localDependentState.length > 0 || hasSelectedDraft
  };
}

export function buildViewHandoffNote({
  handoffSummary = {},
  shareUrl = "",
  portableShareUrl = ""
}) {
  const lines = ["Review console handoff", ""];
  const selectedLabel = normalizeLabel(handoffSummary.selectedLabel) || "Queue state";
  const selectedValue =
    normalizeLabel(handoffSummary.selectedValue) || "No visible event is selected";
  const contextLabel = normalizeLabel(handoffSummary.contextLabel);
  const currentLink = normalizeLabel(shareUrl);
  const portableLink = normalizeLabel(portableShareUrl);
  const portabilityNote = normalizeLabel(handoffSummary.portabilityNote);

  lines.push(`- ${selectedLabel}: ${selectedValue}`);

  if (contextLabel) {
    lines.push(`- Queue: ${contextLabel}`);
  }

  if (currentLink) {
    lines.push(`- Current link: ${currentLink}`);
  }

  if (portableLink && portableLink !== currentLink) {
    lines.push(`- Portable link: ${portableLink} (saved-draft filter removed)`);
  }

  appendHandoffNoteScope(lines, "Included in link", handoffSummary.includedState);
  appendHandoffNoteScope(
    lines,
    "Included in handoff note only",
    handoffSummary.noteOnlyState
  );
  appendHandoffNoteScope(
    lines,
    "Needs local browser state",
    handoffSummary.localDependentState
  );
  appendHandoffNoteScope(lines, "Stays local", handoffSummary.localOnlyState);

  if (normalizeLabel(handoffSummary.selectedDraftPreview)) {
    lines.push(`- Draft snapshot: ${handoffSummary.selectedDraftPreview}`);
  }

  if (portabilityNote) {
    lines.push(`- Portability note: ${portabilityNote}`);
  }

  return lines.join("\n");
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
  activeSavedViewLabel,
  hasSelectedDraftSnapshot
}) {
  if (draftFilter === "saved") {
    return appendDraftSnapshotNote(
      "Saved-draft filtering stays in the copied current link, but it only reproduces on browsers that already have matching local drafts. Use Copy portable link to remove this dependency.",
      hasSelectedDraftSnapshot
    );
  }

  const localOnlyLabels = [];
  if (hasSelectedDraft) {
    localOnlyLabels.push("draft note text");
  }
  if (activeSavedViewLabel) {
    localOnlyLabels.push(`saved view label \"${activeSavedViewLabel}\"`);
  }

  if (localOnlyLabels.length) {
    return appendDraftSnapshotNote(
      `The copied URL reopens this queue, but ${joinLabelList(localOnlyLabels)} ${
        localOnlyLabels.length === 1 ? "stays" : "stay"
      } in this browser only.`,
      hasSelectedDraftSnapshot
    );
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

function appendDraftSnapshotNote(message, hasSelectedDraftSnapshot) {
  if (!hasSelectedDraftSnapshot) {
    return message;
  }

  return `${message} Copy handoff note includes the current draft snapshot for reviewer context.`;
}

function appendHandoffNoteScope(lines, label, items) {
  const normalizedItems = Array.isArray(items)
    ? items.map((item) => normalizeLabel(String(item))).filter(Boolean)
    : [];

  if (!normalizedItems.length) {
    return;
  }

  lines.push(`- ${label}: ${normalizedItems.join("; ")}`);
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

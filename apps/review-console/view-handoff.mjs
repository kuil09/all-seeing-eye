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
  selectedDraftPreview = "",
  selectedContextItems = [],
  selectedConfidenceContext = "",
  selectedReviewContext = "",
  selectedSourceProofItems = [],
  selectedSourceProofOverflowCopy = "",
  queueContext = null,
  nextPendingEventId = "",
  nextPendingHeadline = "",
  selectedSearchMatches = [],
  activeSearchFocusTarget = ""
}) {
  const cleanedSelectedHeadline = String(selectedHeadline).trim();
  const cleanedSourceLabel = normalizeLabel(sourceLabel);
  const cleanedSavedViewLabel = normalizeLabel(activeSavedViewLabel);
  const cleanedSelectedDraftPreview = normalizeLabel(selectedDraftPreview);
  const cleanedSelectedContextItems = normalizeLabels(selectedContextItems);
  const cleanedSelectedConfidenceContext = normalizeLabel(selectedConfidenceContext);
  const cleanedSelectedReviewContext = normalizeLabel(selectedReviewContext);
  const cleanedSelectedSourceProofItems = normalizeLabels(selectedSourceProofItems);
  const cleanedSelectedSourceProofOverflowCopy = normalizeLabel(
    selectedSourceProofOverflowCopy
  );
  const cleanedNextPendingEventId = normalizeLabel(nextPendingEventId);
  const cleanedNextPendingHeadline = normalizeLabel(nextPendingHeadline);
  const normalizedQueueContext = normalizeQueueContext(queueContext);
  const cleanedSelectedSnapshotItems = buildSelectedSnapshotItems(
    cleanedSelectedContextItems,
    normalizedQueueContext
  );
  const selectedSearchSummary = buildSelectedSearchSummary(
    selectedSearchMatches,
    activeSearchFocusTarget
  );
  const hasReviewerContext =
    Boolean(cleanedSelectedConfidenceContext) ||
    Boolean(cleanedSelectedReviewContext) ||
    Boolean(selectedSearchSummary.context) ||
    Boolean(cleanedSelectedDraftPreview);
  const hasEvidenceAppendix =
    cleanedSelectedSourceProofItems.length > 0 ||
    Boolean(cleanedSelectedSourceProofOverflowCopy);
  const hasFocusedDetailSection =
    Boolean(normalizeLabel(activeSearchFocusTarget)) &&
    Boolean(selectedSearchSummary.context);
  const sortLabel = normalizeSortLabel(filterSummary.sortLabel);
  const includedState = buildIncludedState({
    cleanedSelectedHeadline,
    cleanedSourceLabel,
    filterSummary,
    sortLabel,
    draftFilter,
    totalCount,
    hasFocusedDetailSection
  });
  const localDependentState =
    draftFilter === "saved" ? ["Saved-draft filter"] : [];
  const localOnlyState = [];
  const noteOnlyState = [
    hasReviewerContext ? "Reviewer context below" : "",
    hasEvidenceAppendix ? "Evidence appendix below" : ""
  ].filter(Boolean);

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
    selectedContextItems: cleanedSelectedSnapshotItems,
    selectedConfidenceContext: cleanedSelectedConfidenceContext,
    selectedReviewContext: cleanedSelectedReviewContext,
    selectedSourceProofItems: cleanedSelectedSourceProofItems,
    selectedSourceProofOverflowCopy: cleanedSelectedSourceProofOverflowCopy,
    selectedQueueContext: buildSelectedQueueContext(normalizedQueueContext),
    nextPendingEventId: cleanedNextPendingEventId,
    nextPendingCopy: cleanedNextPendingHeadline
      ? `Next pending in this view: ${cleanedNextPendingHeadline}`
      : "",
    recommendedPathCopy: buildRecommendedPathCopy({
      normalizedQueueContext,
      cleanedSelectedHeadline,
      cleanedNextPendingHeadline
    }),
    selectedSearchLabel: selectedSearchSummary.label,
    selectedSearchContext: selectedSearchSummary.context,
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
  portableShareUrl = "",
  nextPendingShareUrl = "",
  portableNextPendingShareUrl = ""
}) {
  const lines = ["Review console handoff", ""];
  const selectedLabel = normalizeLabel(handoffSummary.selectedLabel) || "Queue state";
  const selectedValue =
    normalizeLabel(handoffSummary.selectedValue) || "No visible event is selected";
  const contextLabel = normalizeLabel(handoffSummary.contextLabel);
  const currentLink = normalizeLabel(shareUrl);
  const portableLink = normalizeLabel(portableShareUrl);
  const nextPendingLink = normalizeLabel(nextPendingShareUrl);
  const portableNextPendingLink = normalizeLabel(portableNextPendingShareUrl);
  const portabilityNote = normalizeLabel(handoffSummary.portabilityNote);

  const openNowLines = [`- ${selectedLabel}: ${selectedValue}`];
  if (normalizeLabel(handoffSummary.recommendedPathCopy)) {
    openNowLines.push(`- Recommended path: ${handoffSummary.recommendedPathCopy}`);
  }
  appendHandoffNoteLink(
    openNowLines,
    "Current view",
    currentLink,
    selectedLabel === "Selected event"
      ? "Open selected event"
      : "Open current queue state"
  );
  if (portableLink && portableLink !== currentLink) {
    appendHandoffNoteLink(
      openNowLines,
      "Portable view",
      portableLink,
      selectedLabel === "Selected event"
        ? "Open selected event without saved-draft filter"
        : "Open current queue state without saved-draft filter"
    );
  }
  if (nextPendingLink && nextPendingLink !== currentLink) {
    appendHandoffNoteLink(
      openNowLines,
      "Next pending view",
      nextPendingLink,
      "Open next pending event"
    );
  }
  if (
    portableNextPendingLink &&
    portableNextPendingLink !== nextPendingLink &&
    portableNextPendingLink !== portableLink
  ) {
    appendHandoffNoteLink(
      openNowLines,
      "Portable next pending view",
      portableNextPendingLink,
      "Open next pending event without saved-draft filter"
    );
  }
  appendHandoffNoteSection(lines, "Open now", openNowLines);

  const queueSnapshotLines = [];
  if (contextLabel) {
    queueSnapshotLines.push(`- Queue: ${contextLabel}`);
  }
  if (
    Array.isArray(handoffSummary.selectedContextItems) &&
    handoffSummary.selectedContextItems.length
  ) {
    queueSnapshotLines.push(
      `- Reviewer snapshot: ${handoffSummary.selectedContextItems.join("; ")}`
    );
  }
  if (normalizeLabel(handoffSummary.selectedQueueContext)) {
    queueSnapshotLines.push(`- Queue context: ${handoffSummary.selectedQueueContext}`);
  }
  if (normalizeLabel(handoffSummary.nextPendingCopy)) {
    queueSnapshotLines.push(`- ${handoffSummary.nextPendingCopy}`);
  }
  appendHandoffNoteSection(lines, "Queue snapshot", queueSnapshotLines);

  const reviewerContextLines = [];
  if (normalizeLabel(handoffSummary.selectedConfidenceContext)) {
    reviewerContextLines.push(
      `- Confidence drivers: ${handoffSummary.selectedConfidenceContext}`
    );
  }
  if (normalizeLabel(handoffSummary.selectedReviewContext)) {
    reviewerContextLines.push(`- Review context: ${handoffSummary.selectedReviewContext}`);
  }
  if (normalizeLabel(handoffSummary.selectedSearchContext)) {
    reviewerContextLines.push(
      `- ${
        normalizeLabel(handoffSummary.selectedSearchLabel) || "Search rationale"
      }: ${handoffSummary.selectedSearchContext}`
    );
  }
  if (normalizeLabel(handoffSummary.selectedDraftPreview)) {
    reviewerContextLines.push(`- Draft snapshot: ${handoffSummary.selectedDraftPreview}`);
  }
  appendHandoffNoteSection(lines, "Reviewer context", reviewerContextLines);

  const evidenceAppendixLines = [];
  if (
    Array.isArray(handoffSummary.selectedSourceProofItems) &&
    handoffSummary.selectedSourceProofItems.length
  ) {
    for (const sourceProofItem of handoffSummary.selectedSourceProofItems) {
      evidenceAppendixLines.push(`- Source proof: ${sourceProofItem}`);
    }
  }
  if (normalizeLabel(handoffSummary.selectedSourceProofOverflowCopy)) {
    evidenceAppendixLines.push(
      `- Source proof summary: ${handoffSummary.selectedSourceProofOverflowCopy}`
    );
  }
  appendHandoffNoteSection(lines, "Evidence appendix", evidenceAppendixLines);

  const scopeLines = [];
  appendHandoffNoteScope(scopeLines, "Included in link", handoffSummary.includedState);
  appendHandoffNoteScope(
    scopeLines,
    "Included in handoff note only",
    handoffSummary.noteOnlyState
  );
  appendHandoffNoteScope(
    scopeLines,
    "Needs local browser state",
    handoffSummary.localDependentState
  );
  appendHandoffNoteScope(scopeLines, "Stays local", handoffSummary.localOnlyState);
  if (portabilityNote) {
    scopeLines.push(`- Portability note: ${portabilityNote}`);
  }
  appendHandoffNoteSection(lines, "Handoff scope", scopeLines);

  while (lines.at(-1) === "") {
    lines.pop();
  }

  return lines.join("\n");
}

export function buildViewHandoffPreviewItems(handoffSummary = {}) {
  const previewItems = [];

  if (normalizeLabel(handoffSummary.selectedConfidenceContext)) {
    previewItems.push({
      label: "Confidence drivers",
      value: handoffSummary.selectedConfidenceContext
    });
  }

  if (normalizeLabel(handoffSummary.selectedReviewContext)) {
    previewItems.push({
      label: "Review context",
      value: handoffSummary.selectedReviewContext
    });
  }

  if (
    Array.isArray(handoffSummary.selectedSourceProofItems) &&
    handoffSummary.selectedSourceProofItems.length
  ) {
    for (const sourceProofItem of handoffSummary.selectedSourceProofItems) {
      previewItems.push({
        label: "Source proof",
        value: sourceProofItem
      });
    }
  }

  if (normalizeLabel(handoffSummary.selectedSourceProofOverflowCopy)) {
    previewItems.push({
      label: "Source proof summary",
      value: handoffSummary.selectedSourceProofOverflowCopy
    });
  }

  if (normalizeLabel(handoffSummary.selectedSearchContext)) {
    previewItems.push({
      label: normalizeLabel(handoffSummary.selectedSearchLabel) || "Search rationale",
      value: handoffSummary.selectedSearchContext
    });
  }

  return previewItems;
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
  totalCount,
  hasFocusedDetailSection
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
    hasFocusedDetailSection ? "Focused detail section" : "",
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

function normalizeLabels(labels) {
  return Array.isArray(labels)
    ? labels.map((label) => normalizeLabel(String(label))).filter(Boolean)
    : [];
}

function buildSelectedQueueContext(queueContext) {
  const normalizedQueueContext = normalizeQueueContext(queueContext);
  if (!normalizedQueueContext) {
    return "";
  }

  const {
    visibleCount,
    visiblePosition,
    pendingCount,
    pendingPosition,
    remainingPendingAfterSelection
  } = normalizedQueueContext;
  const segments = [`Visible ${visiblePosition} of ${visibleCount} in this view`];

  if (pendingPosition === null) {
    segments.push(
      pendingCount === 0
        ? "No pending events remain in this view"
        : `${pendingCount} pending event${
            pendingCount === 1 ? "" : "s"
          } remain elsewhere in this view`
    );
  } else {
    segments.push(`Pending ${pendingPosition} of ${pendingCount}`);
    segments.push(
      remainingPendingAfterSelection === 0
        ? pendingCount === 1
          ? "This is the only pending event in this view"
          : "No later pending events remain in this view"
        : `${remainingPendingAfterSelection} pending event${
            remainingPendingAfterSelection === 1 ? "" : "s"
          } remain after this selection`
    );
  }

  return `${segments.join(". ")}.`;
}

function buildSelectedSnapshotItems(selectedContextItems, normalizedQueueContext) {
  if (!Array.isArray(selectedContextItems) || !selectedContextItems.length) {
    return [];
  }

  return selectedContextItems
    .filter((item) => {
      if (/^Review history:\s*No prior review$/i.test(item)) {
        return false;
      }

      if (!/^Status:\s*pending review$/i.test(item)) {
        return true;
      }

      return !normalizedQueueContext || normalizedQueueContext.pendingPosition === null;
    })
    .sort(
      (left, right) =>
        getSelectedSnapshotPriority(left, normalizedQueueContext) -
        getSelectedSnapshotPriority(right, normalizedQueueContext)
    );
}

function getSelectedSnapshotPriority(item, normalizedQueueContext) {
  const normalizedItem = normalizeLabel(item);

  if (
    /^Status:\s*pending review$/i.test(normalizedItem) &&
    (!normalizedQueueContext || normalizedQueueContext.pendingPosition === null)
  ) {
    return 0;
  }

  if (/^Confidence:\s*/i.test(normalizedItem)) {
    return 10;
  }

  if (/^Provenance:\s*/i.test(normalizedItem)) {
    return 20;
  }

  if (/^Review history:\s*/i.test(normalizedItem)) {
    return 30;
  }

  if (/^Status:\s*/i.test(normalizedItem)) {
    return 40;
  }

  return 50;
}

function buildRecommendedPathCopy({
  normalizedQueueContext,
  cleanedSelectedHeadline,
  cleanedNextPendingHeadline
}) {
  if (normalizedQueueContext?.pendingPosition !== null) {
    if (normalizedQueueContext?.remainingPendingAfterSelection > 0 && cleanedNextPendingHeadline) {
      return "Start with the selected event. Next pending link continues the same queue slice after this review.";
    }

    return cleanedSelectedHeadline
      ? "Start with the selected event. It is still pending in this view."
      : "Continue with the current queue state. The selected event is still pending in this view.";
  }

  if (cleanedNextPendingHeadline) {
    return cleanedSelectedHeadline
      ? "Use the current link for context, then open Next pending link to continue triage on the actionable event."
      : "Open Next pending link first to continue triage in this queue slice.";
  }

  if (cleanedSelectedHeadline) {
    return "Use the current link for context. No pending events remain in this view.";
  }

  return "";
}

function buildSelectedSearchSummary(searchMatches, activeSearchFocusTarget) {
  const normalizedMatches = normalizeSearchMatches(searchMatches);
  if (!normalizedMatches.length) {
    return { label: "", context: "" };
  }

  const activeMatch = normalizedMatches.find(
    (match) => match.detailSectionId === normalizeLabel(activeSearchFocusTarget)
  );
  const prioritizedMatches = activeMatch
    ? [activeMatch, ...normalizedMatches.filter((match) => match !== activeMatch)]
    : normalizedMatches;
  const visibleMatches = prioritizedMatches.slice(0, 2);
  const remainingMatchCount = Math.max(0, prioritizedMatches.length - visibleMatches.length);
  const matchCopy = visibleMatches
    .map((match) => `${match.label}: ${match.preview}`)
    .join("; ");
  const suffix = remainingMatchCount
    ? ` (+${remainingMatchCount} more match${remainingMatchCount === 1 ? "" : "es"})`
    : "";

  return {
    label: activeMatch
      ? "Focused search match"
      : normalizedMatches.length === 1
        ? "Search match"
        : "Search matches",
    context: `${matchCopy}${suffix}`
  };
}

function normalizeSearchMatches(searchMatches) {
  return Array.isArray(searchMatches)
    ? searchMatches
        .map((match) => ({
          label: normalizeLabel(match?.label),
          preview: normalizeLabel(match?.preview),
          detailSectionId: normalizeLabel(match?.detailSectionId)
        }))
        .filter((match) => match.label && match.preview)
    : [];
}

function normalizeQueueContext(queueContext) {
  if (!queueContext || typeof queueContext !== "object") {
    return null;
  }

  const normalized = {
    visibleCount: normalizePositiveInteger(queueContext.visibleCount),
    visiblePosition: normalizePositiveInteger(queueContext.visiblePosition),
    pendingCount: normalizeNonNegativeInteger(queueContext.pendingCount),
    pendingPosition:
      queueContext.pendingPosition === null
        ? null
        : normalizePositiveInteger(queueContext.pendingPosition),
    remainingPendingAfterSelection: normalizeNonNegativeInteger(
      queueContext.remainingPendingAfterSelection
    )
  };

  if (!normalized.visibleCount || !normalized.visiblePosition) {
    return null;
  }

  if (
    normalized.visiblePosition > normalized.visibleCount ||
    normalized.pendingCount === null ||
    normalized.remainingPendingAfterSelection === null
  ) {
    return null;
  }

  if (
    normalized.pendingPosition !== null &&
    (normalized.pendingCount < 1 || normalized.pendingPosition > normalized.pendingCount)
  ) {
    return null;
  }

  return normalized;
}

function normalizePositiveInteger(value) {
  return Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function appendDraftSnapshotNote(message, hasSelectedDraftSnapshot) {
  if (!hasSelectedDraftSnapshot) {
    return message;
  }

  return `${message} Copy handoff note includes the current draft snapshot for reviewer context.`;
}

function appendHandoffNoteSection(lines, label, sectionLines) {
  if (!Array.isArray(sectionLines) || !sectionLines.length) {
    return;
  }

  lines.push(label);
  lines.push(...sectionLines);
  lines.push("");
}

function appendHandoffNoteLink(lines, label, url, linkLabel) {
  const normalizedUrl = normalizeLabel(url);
  const normalizedLinkLabel = normalizeLabel(linkLabel);

  if (!normalizedUrl || !normalizedLinkLabel) {
    return;
  }

  lines.push(`- ${label}: [${normalizedLinkLabel}](${normalizedUrl})`);
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

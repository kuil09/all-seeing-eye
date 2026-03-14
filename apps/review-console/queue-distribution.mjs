const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "edited", label: "Edited" },
  { value: "rejected", label: "Rejected" }
];

const CONFIDENCE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" }
];

export function buildQueueDistribution(
  timelineItems,
  {
    reviewStatusFilter = "all",
    confidenceFilter = "all"
  } = {}
) {
  const statusCounts = new Map();
  const confidenceCounts = new Map();

  for (const item of timelineItems) {
    statusCounts.set(item.reviewStatus, (statusCounts.get(item.reviewStatus) ?? 0) + 1);

    const confidenceLabel = item.confidence?.label;
    if (confidenceLabel) {
      confidenceCounts.set(confidenceLabel, (confidenceCounts.get(confidenceLabel) ?? 0) + 1);
    }
  }

  return {
    totalCount: timelineItems.length,
    statusOptions: STATUS_OPTIONS.map((option) => ({
      ...option,
      count:
        option.value === "all" ? timelineItems.length : (statusCounts.get(option.value) ?? 0),
      isActive: option.value === reviewStatusFilter
    })),
    confidenceOptions: CONFIDENCE_OPTIONS.map((option) => ({
      ...option,
      count:
        option.value === "all"
          ? timelineItems.length
          : (confidenceCounts.get(option.value) ?? 0),
      isActive: option.value === confidenceFilter
    }))
  };
}

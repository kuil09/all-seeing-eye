const MAX_RATIONALE_PREVIEW_LENGTH = 132;
const POLARITY_ORDER = ["asserted", "uncertain", "contradicted", "rejected"];

export function buildConfidenceSummary(confidence, claims) {
  if (!confidence) {
    return null;
  }

  return {
    claimSignals: buildClaimSignals(claims),
    rationalePreview: formatRationalePreview(confidence.rationale)
  };
}

function buildClaimSignals(claims) {
  if (!Array.isArray(claims) || claims.length === 0) {
    return ["No claim coverage yet"];
  }

  const countsByPolarity = new Map();

  for (const claim of claims) {
    const polarity = normalizePolarity(claim?.polarity);
    countsByPolarity.set(polarity, (countsByPolarity.get(polarity) ?? 0) + 1);
  }

  const orderedPolarities = [
    ...new Set([...POLARITY_ORDER, ...countsByPolarity.keys()])
  ].filter((polarity) => countsByPolarity.has(polarity));

  return orderedPolarities.map((polarity) => {
    const count = countsByPolarity.get(polarity) ?? 0;
    return `${count} ${formatPolarityLabel(polarity, count)}`;
  });
}

function formatPolarityLabel(polarity, count) {
  const singular = count === 1 ? "claim" : "claims";

  switch (polarity) {
    case "asserted":
      return `asserted ${singular}`;
    case "uncertain":
      return `uncertain ${singular}`;
    case "contradicted":
      return `contradicted ${singular}`;
    case "rejected":
      return `rejected ${singular}`;
    default:
      return `${polarity.replaceAll("_", " ")} ${singular}`;
  }
}

function formatRationalePreview(rationale) {
  const normalizedRationale = String(rationale ?? "").trim();
  if (!normalizedRationale) {
    return "Confidence rationale is not available yet.";
  }

  if (normalizedRationale.length <= MAX_RATIONALE_PREVIEW_LENGTH) {
    return normalizedRationale;
  }

  return `${normalizedRationale.slice(0, MAX_RATIONALE_PREVIEW_LENGTH - 3).trimEnd()}...`;
}

function normalizePolarity(polarity) {
  const normalizedPolarity = String(polarity ?? "").trim().toLowerCase();
  return normalizedPolarity || "unclassified";
}

// @ts-check
import { expect, test } from "@playwright/test";

const FIXTURES_URL = "/apps/review-console/?source=fixtures";

test.describe("shareable view handoff", () => {
  test("copy current view link preserves queue filters and the selected event", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.__copiedText = "";
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText(text) {
            window.__copiedText = text;
            return Promise.resolve();
          }
        }
      });
    });

    await page.goto(FIXTURES_URL);

    const cards = page.locator("#timeline-list .timeline-card");
    await expect(cards.first()).toBeVisible();
    await expect(page.locator(".view-handoff-note")).toHaveCount(0);

    await page.locator("#search-input").fill("coastal-shipping-association");
    await page.locator("#sort-order").selectOption("lowest_confidence");
    const harborCard = page
      .locator("#timeline-list .timeline-card")
      .filter({ hasText: "Inspection surge reported at Harbor North cargo terminal" })
      .first();
    await harborCard.click();
    await page.locator("[data-search-focus-target='detail-provenance']").click();

    const selectedHeadline = await page.locator(".detail-shell h2").first().textContent();
    const copyButton = page.getByRole("button", { name: "Copy start link" });
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    await expect(page.locator(".view-handoff-note.is-success")).toContainText(
      "Copied start link."
    );

    const copiedText = await page.evaluate(() => window.__copiedText);
    expect(copiedText).toContain("q=coastal-shipping-association");
    expect(copiedText).toContain("focus=detail-provenance");
    expect(copiedText).toContain("sort=lowest_confidence");
    expect(copiedText).toContain("source=fixtures");
    expect(copiedText).toContain("eventId=");

    await page.goto(copiedText);
    await expect(page.locator(".detail-shell h2").first()).toHaveText(selectedHeadline ?? "");
    await expect(page.locator("#search-input")).toHaveValue("coastal-shipping-association");
    await expect(page.locator("#sort-order")).toHaveValue("lowest_confidence");
    await expect(page.locator("[data-search-focus-target='detail-provenance']")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(page.locator("#detail-provenance.is-focus-target")).toBeVisible();

    await page.screenshot({
      path: "test-results/shareable-view-handoff.png",
      fullPage: true
    });
  });

  test("portable link removes saved-draft filtering while keeping the selected event", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.__copiedText = "";
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText(text) {
            window.__copiedText = text;
            return Promise.resolve();
          }
        }
      });
    });

    await page.goto(FIXTURES_URL);

    const harborCard = page
      .locator("#timeline-list .timeline-card")
      .filter({ hasText: "Inspection surge reported at Harbor North cargo terminal" })
      .first();
    await expect(harborCard).toBeVisible();
    await page.locator("#search-input").fill("coastal-shipping-association");
    await harborCard.click();

    const reviewNotes = page.locator("#review-notes");
    await expect(reviewNotes).toBeVisible();
    await reviewNotes.fill("Portable handoff should keep this event selected.");

    await page.waitForFunction(
      (key) => !!window.localStorage.getItem(key),
      "all-seeing-eye.review-console.drafts.v1"
    );

    await page.getByRole("button", { name: /Saved drafts/i }).click();
    await page.locator("[data-search-focus-target='detail-provenance']").click();
    await expect(
      page.getByRole("button", { name: "Copy start link without saved drafts" })
    ).toBeVisible();

    const selectedHeadline = await page.locator(".detail-shell h2").first().textContent();
    await page.getByRole("button", { name: "Copy start link without saved drafts" }).click();

    await expect(page.locator(".view-handoff-note.is-success")).toContainText(
      "Copied start link without saved drafts."
    );

    const copiedText = await page.evaluate(() => window.__copiedText);
    expect(copiedText).toContain("eventId=");
    expect(copiedText).toContain("focus=detail-provenance");
    expect(copiedText).toContain("source=fixtures");
    expect(copiedText).not.toContain("drafts=saved");

    await page.goto(copiedText);
    await expect(page.locator(".detail-shell h2").first()).toHaveText(selectedHeadline ?? "");
    await expect(page.locator("[data-search-focus-target='detail-provenance']")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    await expect(
      page.getByRole("button", { name: "Copy start link without saved drafts" })
    ).toHaveCount(0);

    await page.screenshot({
      path: "test-results/shareable-view-portable-link.png",
      fullPage: true
    });
  });

  test("copy handoff note includes current and portable links plus scope cues", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.__copiedText = "";
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText(text) {
            window.__copiedText = text;
            return Promise.resolve();
          }
        }
      });
    });

    await page.goto(FIXTURES_URL);

    const harborCard = page
      .locator("#timeline-list .timeline-card")
      .filter({ hasText: "Inspection surge reported at Harbor North cargo terminal" })
      .first();
    await expect(harborCard).toBeVisible();
    await page.locator("#search-input").fill("coastal-shipping-association");
    await harborCard.click();
    await page.locator("[data-search-focus-target='detail-provenance']").click();

    const selectedHeadline = await page.locator(".detail-shell h2").first().textContent();
    const reviewNotes = page.locator("#review-notes");
    await reviewNotes.fill("Portable handoff should keep this event selected.");

    await page.waitForFunction(
      (key) => !!window.localStorage.getItem(key),
      "all-seeing-eye.review-console.drafts.v1"
    );

    await page.getByRole("button", { name: /Saved drafts/i }).click();
    const handoffPreview = page.locator(".view-handoff-preview");
    await expect(page.locator(".view-handoff-snapshot")).not.toContainText(
      "Status: pending review"
    );
    await expect(page.locator(".view-handoff-snapshot")).not.toContainText(
      "Review history: 1 review action"
    );
    await expect(page.locator(".view-handoff-snapshot")).toContainText(
      "Confidence: high confidence 88%"
    );
    await expect(page.locator(".view-handoff-snapshot")).toContainText(
      "Visible 1 of 1. Pending 1 of 1. Only pending event in this queue."
    );
    await expect(page.locator(".view-handoff-snapshot")).toContainText(
      "Recommended path: Start here. This event is still pending."
    );
    await expect(handoffPreview).toContainText("Show reviewer context and evidence");
    await expect(handoffPreview).toContainText("5 review details");
    await expect(page.locator(".view-handoff-scope")).not.toContainText(
      "Included in handoff note only"
    );
    await expect(page.locator(".view-handoff-scope")).not.toContainText(
      "Reviewer context below"
    );
    await expect(page.locator(".view-handoff-scope")).not.toContainText(
      "Evidence appendix below"
    );
    await expect(page.locator(".view-handoff-preview-item").first()).not.toBeVisible();
    await handoffPreview.locator("summary").click();
    await expect(page.locator(".view-handoff-preview-item").first()).toBeVisible();
    await expect(handoffPreview).toContainText(
      "Latest review was edit by bootstrap-fixture."
    );
    await expect(handoffPreview).toContainText(
      "Confidence drivers: Signals: 2 asserted claims, 1 uncertain claim."
    );
    await expect(handoffPreview).toContainText(
      "Source proof: Members report cargo delays at Harbor North terminal"
    );
    await expect(handoffPreview).toContainText(
      "Source proof summary: 1 more supporting source remains in provenance detail."
    );
    await expect(handoffPreview).not.toContainText(
      "Source proof: Harbor North security review extends outbound inspections"
    );
    await page.getByRole("button", { name: "Copy review note" }).click();

    await expect(page.locator(".view-handoff-note.is-success")).toContainText(
      "Copied review note with both start links."
    );

    const copiedText = await page.evaluate(() => window.__copiedText);
    expect(copiedText).toContain("Review console handoff");
    expect(copiedText).toContain("Open now");
    expect(copiedText).toContain(`- Selected event: ${selectedHeadline ?? ""}`);
    expect(copiedText).toContain("- Start here: [Reopen selected event](http://127.0.0.1:");
    expect(copiedText).toContain("focus=detail-provenance");
    expect(copiedText).toContain("drafts=saved");
    expect(copiedText).toContain(
      "- Start here without saved-draft filter: [Reopen selected event without saved-draft filter](http://127.0.0.1:"
    );
    expect(copiedText).toContain("Queue snapshot");
    expect(copiedText).toContain(
      "- Reviewer snapshot: Confidence: high confidence 88%; Provenance: 2 sources across 2 feeds"
    );
    expect(copiedText).not.toContain("Review history: 1 review action");
    expect(copiedText).toContain(
      "- Queue context: Visible 1 of 1. Pending 1 of 1. Only pending event in this queue."
    );
    expect(copiedText).toContain(
      "- Recommended path: Start here. This event is still pending."
    );
    expect(copiedText).toContain("Reviewer context");
    expect(copiedText).toContain(
      "- Confidence drivers: Signals: 2 asserted claims, 1 uncertain claim. Rationale: Two independent curated sources report matching inspection activity and delay symptoms."
    );
    expect(copiedText).toContain(
      "- Review context: Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability."
    );
    expect(copiedText).toContain("Evidence appendix");
    expect(copiedText).toContain(
      "- Source proof: Members report cargo delays at Harbor North terminal (coastal-shipping-association, 10m after event): Shippers reported three to five hour processing delays tied to elevated inspection activity."
    );
    expect(copiedText).toContain(
      "- Source proof summary: 1 more supporting source remains in provenance detail."
    );
    expect(copiedText).not.toContain(
      "- Source proof: Harbor North security review extends outbound inspections"
    );
    expect(copiedText).toContain(
      "- Focused search match: Source: coastal-shipping-association"
    );
    expect(copiedText).toContain("Handoff scope");
    expect(copiedText).toContain(
      "- Included in link: Selected event; Focused detail section; Search: coastal-shipping-association; Pending first sort; Contract fixtures"
    );
    expect(copiedText).not.toContain("Included in handoff note only");
    expect(copiedText).not.toContain(
      "Portability note: Selected event, filters, queue sort, source mode, and demo mode stay in the URL."
    );
    expect(copiedText).toContain("- Needs local browser state: Saved-draft filter");
    expect(copiedText).toContain("- Stays local: Draft note text");
    expect(copiedText).toContain(
      "- Draft snapshot: Portable handoff should keep this event selected."
    );
  });

  test("copy handoff note includes a direct next-pending link when the selected event is already reviewed", async ({
    page
  }) => {
    await page.addInitScript(() => {
      window.__copiedText = "";
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText(text) {
            window.__copiedText = text;
            return Promise.resolve();
          }
        }
      });
    });

    await page.goto(FIXTURES_URL);

    const reviewedHeadline = "Inspection surge reported at Harbor North cargo terminal";
    const nextPendingHeadline = "Storm-related outage affects East Grid substation 7";
    const harborCard = page
      .locator("#timeline-list .timeline-card")
      .filter({ hasText: reviewedHeadline })
      .first();

    await expect(harborCard).toBeVisible();
    await harborCard.click();
    await page.locator("[data-review-action='approve']").click();
    await expect(page.locator(".detail-shell h2").first()).toHaveText(nextPendingHeadline);

    await harborCard.click();
    await expect(page.locator(".detail-shell h2").first()).toHaveText(reviewedHeadline);
    await expect(page.locator(".view-handoff-card .saved-view-copy")).toHaveText(
      "Copy this context, or hand off the next pending event below."
    );
    await expect(page.locator(".view-handoff-snapshot")).toContainText(
      `Next pending: ${nextPendingHeadline}`
    );
    await expect(page.locator(".view-handoff-snapshot")).not.toContainText(
      "Recommended path: Start here for context, then continue with next pending."
    );
    await expect(
      page.getByRole("button", { name: "Copy next pending link" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Copy next pending link" }).click();
    await expect(page.locator(".view-handoff-note.is-success")).toContainText(
      "Copied next pending link."
    );

    const copiedNextPendingLink = await page.evaluate(() => window.__copiedText);
    await page.getByRole("button", { name: "Copy review note" }).click();

    const copiedText = await page.evaluate(() => window.__copiedText);
    expect(copiedText).toContain(
      `- Next pending: ${nextPendingHeadline}`
    );
    expect(copiedText).toContain(
      "- Recommended path: Start here for context, then continue with next pending."
    );

    const currentLinkLine = copiedText
      .split("\n")
      .find((line) => line.startsWith("- Start here: "));
    const nextPendingLinkLine = copiedText
      .split("\n")
      .find((line) => line.startsWith("- Continue with next pending: "));

    expect(currentLinkLine).toBeTruthy();
    expect(nextPendingLinkLine).toBeTruthy();
    expect(nextPendingLinkLine).not.toBe(currentLinkLine);

    const nextPendingLink = nextPendingLinkLine.match(/\((http:\/\/127\.0\.0\.1:[^)]+)\)$/)?.[1];
    expect(nextPendingLink).toBeTruthy();
    expect(copiedNextPendingLink).toBe(nextPendingLink);
    await page.goto(nextPendingLink);
    await expect(page.locator(".detail-shell h2").first()).toHaveText(nextPendingHeadline);
  });
});

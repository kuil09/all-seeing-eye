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

    await page.locator("#search-input").fill("coastal-shipping-association");
    await page.locator("#sort-order").selectOption("lowest_confidence");
    const harborCard = page
      .locator("#timeline-list .timeline-card")
      .filter({ hasText: "Inspection surge reported at Harbor North cargo terminal" })
      .first();
    await harborCard.click();
    await page.locator("[data-search-focus-target='detail-provenance']").click();

    const selectedHeadline = await page.locator(".detail-shell h2").first().textContent();
    const copyButton = page.getByRole("button", { name: "Copy current view link" });
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    await expect(page.locator(".view-handoff-note.is-success")).toContainText(
      "Copied current view link."
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
    await expect(page.getByRole("button", { name: "Copy portable link" })).toBeVisible();

    const selectedHeadline = await page.locator(".detail-shell h2").first().textContent();
    await page.getByRole("button", { name: "Copy portable link" }).click();

    await expect(page.locator(".view-handoff-note.is-success")).toContainText(
      "Copied portable link without saved-draft filtering."
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
    await expect(page.getByRole("button", { name: "Copy portable link" })).toHaveCount(0);

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
    await expect(page.locator(".view-handoff-snapshot")).toContainText("Status: pending review");
    await expect(page.locator(".view-handoff-snapshot")).toContainText(
      "Visible 1 of 1 in this view. Pending 1 of 1. This is the only pending event in this view."
    );
    await expect(page.locator(".view-handoff-snapshot")).toContainText(
      "Latest review was edit by bootstrap-fixture."
    );
    await page.getByRole("button", { name: "Copy handoff note" }).click();

    await expect(page.locator(".view-handoff-note.is-success")).toContainText(
      "Copied handoff note with current and portable links."
    );

    const copiedText = await page.evaluate(() => window.__copiedText);
    expect(copiedText).toContain("Review console handoff");
    expect(copiedText).toContain(`- Selected event: ${selectedHeadline ?? ""}`);
    expect(copiedText).toContain(
      "- Reviewer snapshot: Status: pending review; Confidence: high confidence 88%; Provenance: 2 sources across 2 feeds; Review history: 1 review action"
    );
    expect(copiedText).toContain(
      "- Queue context: Visible 1 of 1 in this view. Pending 1 of 1. This is the only pending event in this view."
    );
    expect(copiedText).toContain(
      "- Review context: Latest review was edit by bootstrap-fixture. Note: Initial synthesized headline shortened for timeline readability."
    );
    expect(copiedText).toContain(
      "- Focused search match: Source: coastal-shipping-association"
    );
    expect(copiedText).toContain("- Current link: http://127.0.0.1:");
    expect(copiedText).toContain("focus=detail-provenance");
    expect(copiedText).toContain("drafts=saved");
    expect(copiedText).toContain("- Portable link: http://127.0.0.1:");
    expect(copiedText).toContain(
      "- Included in link: Selected event; Focused detail section; Search: coastal-shipping-association; Pending first sort; Contract fixtures"
    );
    expect(copiedText).toContain(
      "- Included in handoff note only: Selected draft note snapshot"
    );
    expect(copiedText).toContain("- Needs local browser state: Saved-draft filter");
    expect(copiedText).toContain("- Stays local: Draft note text");
    expect(copiedText).toContain(
      "- Draft snapshot: Portable handoff should keep this event selected."
    );
  });
});

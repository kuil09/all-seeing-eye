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

    await page.locator("#search-input").fill("harbor");
    await page.locator("#sort-order").selectOption("lowest_confidence");
    await cards.first().click();

    const selectedHeadline = await page.locator(".detail-shell h2").first().textContent();
    const copyButton = page.getByRole("button", { name: "Copy current view link" });
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    await expect(page.locator(".view-handoff-note.is-success")).toContainText(
      "Copied current view link."
    );

    const copiedText = await page.evaluate(() => window.__copiedText);
    expect(copiedText).toContain("q=harbor");
    expect(copiedText).toContain("sort=lowest_confidence");
    expect(copiedText).toContain("source=fixtures");
    expect(copiedText).toContain("eventId=");

    await page.goto(copiedText);
    await expect(page.locator(".detail-shell h2").first()).toHaveText(selectedHeadline ?? "");
    await expect(page.locator("#search-input")).toHaveValue("harbor");
    await expect(page.locator("#sort-order")).toHaveValue("lowest_confidence");

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

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    const reviewNotes = page.locator("#review-notes");
    await expect(reviewNotes).toBeVisible();
    await reviewNotes.fill("Portable handoff should keep this event selected.");

    await page.waitForFunction(
      (key) => !!window.localStorage.getItem(key),
      "all-seeing-eye.review-console.drafts.v1"
    );

    await page.getByRole("button", { name: /Saved drafts/i }).click();
    await expect(page.getByRole("button", { name: "Copy portable link" })).toBeVisible();

    const selectedHeadline = await page.locator(".detail-shell h2").first().textContent();
    await page.getByRole("button", { name: "Copy portable link" }).click();

    await expect(page.locator(".view-handoff-note.is-success")).toContainText(
      "Copied portable link without saved-draft filtering."
    );

    const copiedText = await page.evaluate(() => window.__copiedText);
    expect(copiedText).toContain("eventId=");
    expect(copiedText).toContain("source=fixtures");
    expect(copiedText).not.toContain("drafts=saved");

    await page.goto(copiedText);
    await expect(page.locator(".detail-shell h2").first()).toHaveText(selectedHeadline ?? "");
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

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    const selectedHeadline = await page.locator(".detail-shell h2").first().textContent();
    const reviewNotes = page.locator("#review-notes");
    await reviewNotes.fill("Portable handoff should keep this event selected.");

    await page.waitForFunction(
      (key) => !!window.localStorage.getItem(key),
      "all-seeing-eye.review-console.drafts.v1"
    );

    await page.getByRole("button", { name: /Saved drafts/i }).click();
    await page.getByRole("button", { name: "Copy handoff note" }).click();

    await expect(page.locator(".view-handoff-note.is-success")).toContainText(
      "Copied handoff note with current and portable links."
    );

    const copiedText = await page.evaluate(() => window.__copiedText);
    expect(copiedText).toContain("Review console handoff");
    expect(copiedText).toContain(`- Selected event: ${selectedHeadline ?? ""}`);
    expect(copiedText).toContain("- Current link: http://127.0.0.1:");
    expect(copiedText).toContain("drafts=saved");
    expect(copiedText).toContain("- Portable link: http://127.0.0.1:");
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

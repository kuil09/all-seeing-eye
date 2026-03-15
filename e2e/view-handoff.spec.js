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
});

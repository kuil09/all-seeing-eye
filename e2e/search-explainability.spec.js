// @ts-check
import { expect, test } from "@playwright/test";

const FIXTURES_URL = "/apps/review-console/?source=fixtures";

test.describe("search explainability", () => {
  test("searching hidden source metadata explains why the row matched", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();
    await page.locator("#search-input").fill("coastal-shipping-association");

    const cards = page.locator("#timeline-list .timeline-card");
    await expect(cards).toHaveCount(1);

    const searchSummary = cards.first().locator(".timeline-search-summary");
    await expect(searchSummary).toBeVisible();
    await expect(searchSummary).toContainText("Search match");
    await expect(searchSummary).toContainText("Source:");
    await expect(searchSummary).toContainText("coastal-shipping-association");

    await page.screenshot({
      path: "test-results/search-explainability-source-match.png",
      fullPage: true
    });
  });
});

// @ts-check
import { expect, test } from "@playwright/test";

const FIXTURES_URL = "/apps/review-console/?source=fixtures";

test.describe("timeline queue rendering and event selection", () => {
  test("timeline loads fixture events and selecting a card renders the detail panel", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    // Wait for timeline cards to appear
    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();

    // Pending count should be positive
    const pendingCount = page.locator("#pending-count");
    await expect(pendingCount).not.toHaveText("0");

    // Data source label should show fixtures
    await expect(page.locator("#data-source-label")).toHaveText("Contract fixtures");

    // Screenshot: initial queue state
    await page.screenshot({ path: "test-results/timeline-initial-queue.png", fullPage: true });

    // Clicking the first card selects the event and shows the detail panel
    await firstCard.click();

    // Detail panel should now contain the detail shell
    await expect(page.locator(".detail-shell")).toBeVisible();
    await expect(page.locator(".review-form")).toBeVisible();
    await expect(page.locator('[data-review-action="approve"]')).toBeVisible();

    // Screenshot: detail panel open
    await page.screenshot({ path: "test-results/timeline-detail-open.png", fullPage: true });
  });

  test("selected timeline card receives is-selected class", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    const cards = page.locator("#timeline-list .timeline-card");
    await expect(cards.first()).toBeVisible();

    await cards.first().click();
    await expect(cards.first()).toHaveClass(/is-selected/);
  });
});

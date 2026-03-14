// @ts-check
import { expect, test } from "@playwright/test";

const FIXTURES_URL = "/apps/review-console/?source=fixtures";
const VIEW_NAME = "Pending only";

test.describe("saved views save / apply / delete flow", () => {
  test("saves a filter combination, reloads, and applies the saved view", async ({ page }) => {
    await page.goto(FIXTURES_URL);
    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();

    // Set a filter: pending_review only
    await page.locator("#status-filter").selectOption("pending_review");

    // Name and save the view
    await page.locator("#saved-view-name").fill(VIEW_NAME);
    await page.locator("#save-current-view").click();

    // View button should appear in the saved view list
    const savedViewBtn = page.locator("#saved-view-list [data-saved-view-id]").first();
    await expect(savedViewBtn).toBeVisible();
    await expect(savedViewBtn.locator("span")).toHaveText(VIEW_NAME);

    // Screenshot: saved view created
    await page.screenshot({ path: "test-results/saved-view-created.png", fullPage: true });

    // Reset the filter manually
    await page.locator("#status-filter").selectOption("all");

    // Reload — saved views should persist in localStorage
    await page.reload();
    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();

    // Saved view should still exist after reload
    const viewAfterReload = page.locator("#saved-view-list [data-saved-view-id]").first();
    await expect(viewAfterReload).toBeVisible();
    await expect(viewAfterReload.locator("span")).toHaveText(VIEW_NAME);

    // Apply the saved view
    await viewAfterReload.click();

    // Status filter should now reflect pending_review
    await expect(page.locator("#status-filter")).toHaveValue("pending_review");

    // Screenshot: saved view applied
    await page.screenshot({ path: "test-results/saved-view-applied.png", fullPage: true });

    // Delete the view
    await page.locator("#delete-active-view").click();

    // View list should be empty or show empty copy
    await expect(page.locator("#saved-view-list [data-saved-view-id]")).toHaveCount(0);

    // Screenshot: saved view deleted
    await page.screenshot({ path: "test-results/saved-view-deleted.png", fullPage: true });
  });
});

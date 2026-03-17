// @ts-check
import { expect, test } from "@playwright/test";

const FIXTURES_URL = "/apps/review-console/?source=fixtures";

test.describe("timeline sort order controls", () => {
  test("default sort is pending_first", async ({ page }) => {
    await page.goto(FIXTURES_URL);
    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();

    await expect(page.locator("#sort-order")).toHaveValue("pending_first");

    // URL should not include ?sort= for the default
    expect(page.url()).not.toContain("sort=");

    await page.screenshot({ path: "test-results/timeline-sort-default.png", fullPage: true });
  });

  test("changing sort updates the URL and the select reflects the new value", async ({ page }) => {
    await page.goto(FIXTURES_URL);
    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();

    await page.locator("#sort-order").selectOption("newest");

    // URL should include ?sort=newest
    await expect(page).toHaveURL(/sort=newest/);
    await expect(page.locator("#sort-order")).toHaveValue("newest");

    await page.screenshot({ path: "test-results/timeline-sort-newest.png", fullPage: true });
  });

  test("sort parameter in URL loads page with matching sort selected", async ({ page }) => {
    await page.goto(`${FIXTURES_URL}&sort=oldest`);
    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();

    await expect(page.locator("#sort-order")).toHaveValue("oldest");

    await page.screenshot({ path: "test-results/timeline-sort-url-oldest.png", fullPage: true });
  });

  test("non-default sort alone enables saving a view", async ({ page }) => {
    await page.goto(FIXTURES_URL);
    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();

    // Save button should be disabled without a name or active filter/sort
    const saveBtn = page.locator("#save-current-view");
    await expect(saveBtn).toBeDisabled();

    // Fill a view name
    await page.locator("#saved-view-name").fill("Sort by lowest confidence");

    // Save still disabled — sort is still default
    await expect(saveBtn).toBeDisabled();

    // Change to a non-default sort
    await page.locator("#sort-order").selectOption("lowest_confidence");

    // Now the save button should be enabled
    await expect(saveBtn).not.toBeDisabled();

    await page.screenshot({
      path: "test-results/timeline-sort-save-enabled.png",
      fullPage: true
    });
  });

  test("sort order is preserved in saved views and restored on apply", async ({ page }) => {
    await page.goto(FIXTURES_URL);
    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();

    // Set sort to most_sources
    await page.locator("#sort-order").selectOption("most_sources");

    // Name and save the view
    await page.locator("#saved-view-name").fill("Most sources view");
    await page.locator("#save-current-view").click();

    const savedViewBtn = page.locator("#saved-view-list [data-saved-view-id]").first();
    await expect(savedViewBtn).toBeVisible();
    await expect(savedViewBtn.locator(".quick-lane-label")).toHaveText("Most sources view");

    // Reset sort to default
    await page.locator("#sort-order").selectOption("pending_first");
    await expect(page.locator("#sort-order")).toHaveValue("pending_first");

    // Apply the saved view
    await savedViewBtn.click();

    // Sort order should be restored
    await expect(page.locator("#sort-order")).toHaveValue("most_sources");

    // URL should reflect the restored sort
    await expect(page).toHaveURL(/sort=most_sources/);

    await page.screenshot({
      path: "test-results/timeline-sort-saved-view-restored.png",
      fullPage: true
    });

    // Cleanup: delete the saved view
    await page.locator("#delete-active-view").click();
    await expect(page.locator("#saved-view-list [data-saved-view-id]")).toHaveCount(0);
  });
});

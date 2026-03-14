// @ts-check
import { expect, test } from "@playwright/test";

const FIXTURES_URL = "/apps/review-console/?source=fixtures";

test.describe("attention lanes (analyst attention quick lanes)", () => {
  test("pending_high lane filters timeline to high-confidence events", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    // All fixture events should be visible initially
    const cards = page.locator("#timeline-list .timeline-card");
    await expect(cards.first()).toBeVisible();
    const initialCount = await cards.count();
    expect(initialCount).toBeGreaterThanOrEqual(1);

    // The pending_high attention lane should appear and show a non-zero count
    const highLane = page.locator('[data-attention-lane="pending_high"]');
    await expect(highLane).toBeVisible();
    const laneCount = await highLane.locator("strong").textContent();
    expect(Number(laneCount)).toBeGreaterThan(0);

    // Screenshot: before filtering
    await page.screenshot({
      path: "test-results/attention-lanes-before-filter.png",
      fullPage: true
    });

    // Click the lane to apply its filter slice
    await highLane.click();
    await expect(highLane).toHaveClass(/is-active/);

    // Timeline should now show only the high-confidence event
    await expect(cards).toHaveCount(Number(laneCount));

    // Screenshot: after filtering
    await page.screenshot({
      path: "test-results/attention-lanes-high-filtered.png",
      fullPage: true
    });
  });

  test("pending_medium lane filters timeline to medium-confidence events", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    const mediumLane = page.locator('[data-attention-lane="pending_medium"]');
    await expect(mediumLane).toBeVisible();
    const laneCount = await mediumLane.locator("strong").textContent();
    expect(Number(laneCount)).toBeGreaterThan(0);

    await mediumLane.click();
    await expect(mediumLane).toHaveClass(/is-active/);

    const cards = page.locator("#timeline-list .timeline-card");
    await expect(cards).toHaveCount(Number(laneCount));

    await page.screenshot({
      path: "test-results/attention-lanes-medium-filtered.png",
      fullPage: true
    });
  });

  test("reviewed_before lane populates after a review action is recorded", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    // Submit a review action so an event gets review history
    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();
    await page.locator('[data-review-action="approve"]').click();
    await expect(page.locator(".flash-note")).toBeVisible();

    // The reviewed_before lane should now show count >= 1
    const reviewedBeforeLane = page.locator('[data-attention-lane="reviewed_before"]');
    await expect(reviewedBeforeLane).toBeVisible();
    const laneCount = await reviewedBeforeLane.locator("strong").textContent();
    expect(Number(laneCount)).toBeGreaterThanOrEqual(1);

    // Click the lane — queue must show that event
    await reviewedBeforeLane.click();
    await expect(reviewedBeforeLane).toHaveClass(/is-active/);

    const cards = page.locator("#timeline-list .timeline-card");
    await expect(cards).toHaveCount(Number(laneCount));

    await page.screenshot({
      path: "test-results/attention-lanes-reviewed-before.png",
      fullPage: true
    });
  });
});

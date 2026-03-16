// @ts-check
import { expect, test } from "@playwright/test";

const FIXTURES_URL = "/apps/review-console/?source=fixtures";
const FILTERED_FIXTURES_URL = `${FIXTURES_URL}&q=harbor&sort=lowest_confidence`;

test.describe("recent review activity recovery", () => {
  test("activity card appears after a review action and shows correct status", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Submit approve action
    await page.locator('[data-review-action="approve"]').click();
    await expect(page.locator(".flash-note")).toBeVisible();
    const nextHeadline = await page.locator(".detail-shell h2").first().textContent();

    // Recent activity panel must show a card for the reviewed event
    const activityCard = page.locator("#recent-review-activity .recent-activity-card").first();
    await expect(activityCard).toBeVisible();

    // The pill must reflect the outcome status
    const statusPill = activityCard.locator(".pill");
    await expect(statusPill).toBeVisible();
    await expect(activityCard).toContainText(
      `Reopen this reviewed event for context. Next pending: ${nextHeadline ?? ""}`
    );

    await page.screenshot({
      path: "test-results/recent-activity-card-appears.png",
      fullPage: true
    });
  });

  test("clicking an activity card navigates back to that event", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    const cards = page.locator("#timeline-list .timeline-card");
    await expect(cards.first()).toBeVisible();
    await cards.first().click();

    const firstHeadline = await page.locator(".detail-shell h2").first().textContent();

    // Submit and advance queue to second event
    await page.locator('[data-review-action="approve"]').click();
    await expect(page.locator(".flash-note")).toBeVisible();

    const secondHeadline = await page.locator(".detail-shell h2").first().textContent();
    expect(secondHeadline).not.toBe(firstHeadline);

    // Click recent activity card to reopen the first event
    const activityCard = page.locator("#recent-review-activity .recent-activity-card").first();
    await expect(activityCard).toBeVisible();
    await activityCard.click();

    // The first event must now be selected in the detail panel
    await expect(page.locator(".detail-shell h2").first()).toHaveText(firstHeadline ?? "");

    await page.screenshot({
      path: "test-results/recent-activity-reopen-event.png",
      fullPage: true
    });
  });

  test("activity card shows is-active state when its event is currently selected", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await page.locator('[data-review-action="approve"]').click();
    await expect(page.locator(".flash-note")).toBeVisible();

    // Reopen the first event via activity card
    const activityCard = page.locator("#recent-review-activity .recent-activity-card").first();
    await activityCard.click();

    // Card for the currently selected event must have is-active class
    await expect(activityCard).toHaveClass(/is-active/);

    await page.screenshot({
      path: "test-results/recent-activity-is-active.png",
      fullPage: true
    });
  });

  test("activity card shows the queue lens it will restore", async ({ page }) => {
    await page.goto(FILTERED_FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await page.locator('[data-review-action="approve"]').click();
    await expect(page.locator(".flash-note")).toBeVisible();

    const activityCard = page.locator("#recent-review-activity .recent-activity-card").first();
    await expect(activityCard.locator(".recent-activity-context")).toHaveText(
      "Reopens: Search: harbor · Sort: Lowest confidence first"
    );
  });
});

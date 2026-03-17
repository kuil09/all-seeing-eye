// @ts-check
import { expect, test } from "@playwright/test";

const FIXTURES_URL = "/apps/review-console/?source=fixtures";
const FILTERED_FIXTURES_URL = `${FIXTURES_URL}&q=harbor&sort=lowest_confidence`;

test.describe("recent review activity recovery", () => {
  test("saved-view and recent-activity helpers explain the saved reopen path before any actions", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    await expect(page.locator(".saved-view-panel .saved-view-copy")).toHaveText(
      "Save recurring search, filter, sort, and source combinations to reopen the same queue slice in one click."
    );
    await expect(page.locator("#saved-view-list")).toContainText(
      "No saved views yet. Save the current search, filters, sort order, and source to reopen this queue slice later."
    );
    await expect(page.locator(".recent-activity-panel .saved-view-copy")).toHaveText(
      "Reopen recent review decisions with their review-safe search/filter/sort/source path and note outcome."
    );
    await expect(page.locator("#recent-review-activity")).toContainText(
      "No local review actions yet. Record one to save a review-safe reopen path with its search, filters, sort, and source."
    );
  });

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
    await expect(activityCard.locator(".recent-activity-action-chip")).toHaveText(
      "Reopen reviewed event for context"
    );
    await expect(activityCard.locator(".recent-activity-copy")).toHaveText(
      `Next pending: ${nextHeadline ?? ""}`
    );
    await expect(activityCard).toHaveAttribute(
      "title",
      `Reopen this reviewed event for context. Next pending: ${nextHeadline ?? ""}.`
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
    await expect(activityCard.locator(".recent-activity-action-chip")).toHaveText(
      "Already open in saved queue slice"
    );
    await expect(activityCard).toHaveAttribute(
      "title",
      "This reviewed event is already open in its saved queue slice."
    );

    await page.screenshot({
      path: "test-results/recent-activity-is-active.png",
      fullPage: true
    });
  });

  test("activity card drops the active state when the saved queue lens no longer matches", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await page.locator('[data-review-action="approve"]').click();
    await expect(page.locator(".flash-note")).toBeVisible();

    const activityCard = page.locator("#recent-review-activity .recent-activity-card").first();
    await activityCard.click();
    await expect(activityCard).toHaveClass(/is-active/);

    await page.locator("#sort-order").selectOption("lowest_confidence");

    await expect(activityCard).not.toHaveClass(/is-active/);
    await expect(activityCard.locator(".recent-activity-action-chip")).toHaveText(
      "Restore queue slice and reopen"
    );
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
      "Search: harbor · Sort: Lowest confidence first"
    );
  });

  test("recent activity calls out review-only filters that were dropped for reopening", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    await page.locator("#status-filter").selectOption("pending_review");

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await page.locator('[data-review-action="approve"]').click();
    await expect(page.locator(".flash-note")).toBeVisible();

    const omissionCopy =
      "Review-safe reopen omits Status: Pending review so this reviewed event stays visible.";
    const activityCard = page.locator("#recent-review-activity .recent-activity-card").first();

    await expect(page.locator(".flash-note-omission")).toHaveText(omissionCopy);
    await expect(activityCard.locator(".recent-activity-omission")).toHaveText(omissionCopy);
  });

  test("activity card keeps the current draft label when reopening will not overwrite it", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    const timelineCards = page.locator("#timeline-list .timeline-card");
    await expect(timelineCards.first()).toBeVisible();
    await timelineCards.first().click();

    const originalReviewNote = "Original review note restored from recent activity.";
    const keptDraftNote = "Working draft should stay attached to this event.";

    await page.locator("#review-notes").fill(originalReviewNote);
    await page.locator('[data-review-action="edit"]').click();
    await expect(page.locator(".flash-note")).toBeVisible();

    const activityCard = page.locator("#recent-review-activity .recent-activity-card").first();
    await expect(activityCard).toBeVisible();
    await activityCard.click();

    await expect(page.locator("#review-notes")).toHaveValue(originalReviewNote);

    await page.locator("#review-notes").fill(keptDraftNote);
    await page.locator("#sort-order").selectOption("lowest_confidence");

    await expect(activityCard.locator(".recent-activity-note-preview")).toHaveText(
      `Keeps current draft: ${keptDraftNote}`
    );
    await expect(activityCard.locator(".recent-activity-action-chip")).toHaveText(
      "Restore queue slice, reopen, and keep current draft"
    );
    await expect(activityCard).toHaveAttribute(
      "title",
      /Restore the saved queue slice and reopen this reviewed event for context\./
    );

    await activityCard.click();
    await expect(page.locator("#review-notes")).toHaveValue(keptDraftNote);
    await expect(page.locator("#review-notes")).not.toHaveValue(originalReviewNote);
  });

  test("activity card restores the saved source mode instead of treating another source as active", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    const firstHeadline = await page.locator(".detail-shell h2").first().textContent();

    await page.locator('[data-review-action="approve"]').click();
    await expect(page.locator(".flash-note")).toBeVisible();

    const activityCard = page.locator("#recent-review-activity .recent-activity-card").first();
    await activityCard.click();
    await expect(activityCard).toHaveClass(/is-active/);

    await page.locator('[data-source-mode="api"]').click();
    await expect(page.locator('[data-source-mode="api"]')).toHaveClass(/is-active/);

    await expect(activityCard).not.toHaveClass(/is-active/);
    await expect(activityCard.locator(".recent-activity-action-chip")).toHaveText(
      "Switch to Contract fixtures and reopen"
    );
    await expect(activityCard.locator(".recent-activity-context")).toHaveCount(0);
    await expect(activityCard).toHaveAttribute(
      "title",
      "Switch to Contract fixtures and reopen this event in its saved queue slice."
    );

    await activityCard.click();

    await expect(page.locator('[data-source-mode="fixtures"]')).toHaveClass(/is-active/);
    await expect(page.locator(".detail-shell h2").first()).toHaveText(firstHeadline ?? "");
  });

  test("source-switch activity card keeps saved filter details without repeating the source", async ({
    page
  }) => {
    await page.goto(FILTERED_FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await page.locator('[data-review-action="approve"]').click();
    await expect(page.locator(".flash-note")).toBeVisible();

    const activityCard = page.locator("#recent-review-activity .recent-activity-card").first();
    await expect(activityCard).toBeVisible();

    await page.locator('[data-source-mode="api"]').click();
    await expect(page.locator('[data-source-mode="api"]')).toHaveClass(/is-active/);

    await expect(activityCard.locator(".recent-activity-action-chip")).toHaveText(
      "Switch to Contract fixtures and reopen"
    );
    await expect(activityCard.locator(".recent-activity-context")).toHaveText(
      "Search: harbor · Sort: Lowest confidence first"
    );
  });
});

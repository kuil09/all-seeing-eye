// @ts-check
import { expect, test } from "@playwright/test";

const FIXTURES_URL = "/apps/review-console/?source=fixtures";
const DRAFT_TEXT = "Verify cargo count before approving — source discrepancy noted.";

test.describe("draft note localStorage persistence", () => {
  test("draft note survives a full page reload", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    // Select the first event
    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Type a draft note
    const reviewNotes = page.locator("#review-notes");
    await expect(reviewNotes).toBeVisible();
    await reviewNotes.fill(DRAFT_TEXT);

    // Wait for localStorage write (triggered by input event)
    await page.waitForFunction(
      (key) => !!window.localStorage.getItem(key),
      "all-seeing-eye.review-console.drafts.v1"
    );

    // Screenshot: draft typed before reload
    await page.screenshot({ path: "test-results/draft-before-reload.png", fullPage: true });

    // Reload the page — URL carries selected event via source param
    await page.reload();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Draft must be restored from localStorage
    await expect(reviewNotes).toHaveValue(DRAFT_TEXT);

    // Timeline card should display the draft summary indicator
    await expect(page.locator("#timeline-list .timeline-draft-summary").first()).toBeVisible();

    // Screenshot: draft restored after reload
    await page.screenshot({ path: "test-results/draft-after-reload.png", fullPage: true });
  });

  test("recording a review action clears the draft from localStorage", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    const reviewNotes = page.locator("#review-notes");
    await expect(reviewNotes).toBeVisible();
    await reviewNotes.fill("Approval note for clearing test.");

    // Submit approve action
    await page.locator('[data-review-action="approve"]').click();

    // Wait for the action to complete (detail panel re-renders)
    await expect(page.locator(".flash-note")).toBeVisible();

    // Reload and re-select — draft should be gone
    await page.reload();
    await firstCard.click();
    await expect(reviewNotes).toHaveValue("");

    // Screenshot: draft cleared after action
    await page.screenshot({ path: "test-results/draft-cleared-after-action.png", fullPage: true });
  });

  test("recent activity restores the last recorded note into the draft editor", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    const firstHeadline = await page.locator(".detail-shell h2").first().textContent();
    const reviewNotes = page.locator("#review-notes");
    await expect(reviewNotes).toBeVisible();
    await reviewNotes.fill(DRAFT_TEXT);

    await page.locator('[data-review-action="edit"]').click();
    await expect(page.locator(".flash-note")).toBeVisible();

    const currentHeadline = await page.locator(".detail-shell h2").first().textContent();
    expect(currentHeadline).not.toBe(firstHeadline);

    const recentActivityCard = page.locator("#recent-review-activity .recent-activity-card").first();
    await expect(recentActivityCard).toContainText("Verify cargo count before approving");
    await expect(recentActivityCard).toContainText("restored into the draft editor");
    await recentActivityCard.click();

    await expect(page.locator(".detail-shell h2").first()).toHaveText(firstHeadline ?? "");
    await expect(page.locator("#review-notes")).toHaveValue(DRAFT_TEXT);

    await page.screenshot({
      path: "test-results/recent-activity-restores-draft.png",
      fullPage: true
    });
  });
});

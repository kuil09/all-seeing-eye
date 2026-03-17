// @ts-check
import { expect, test } from "@playwright/test";

const FIXTURES_URL = "/apps/review-console/?source=fixtures";
const SORTED_FIXTURES_URL = `${FIXTURES_URL}&sort=lowest_confidence`;
const DRAFT_TEXT = "Recheck the earlier source summary before finalizing this event.";

test.describe("review action submission and queue auto-advance", () => {
  test("approving a pending event advances the console to the next pending item", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    const cards = page.locator("#timeline-list .timeline-card");
    await expect(cards.first()).toBeVisible();

    // Select the first pending event and capture its headline
    await cards.first().click();
    await expect(page.locator(".detail-shell")).toBeVisible();
    const firstHeadline = await page.locator(".detail-shell h2").first().textContent();

    // Screenshot: first event selected
    await page.screenshot({ path: "test-results/auto-advance-before-approve.png", fullPage: true });

    // Approve the first event (no notes required for approve)
    await page.locator('[data-review-action="approve"]').click();

    // Flash message should confirm the action and mention auto-advance
    const flashNote = page.locator(".flash-note");
    await expect(flashNote).toBeVisible();

    // The detail panel should now show a different event
    const secondHeadline = await page.locator(".detail-shell h2").first().textContent();
    expect(secondHeadline).not.toBe(firstHeadline);

    // Screenshot: auto-advanced to next event
    await page.screenshot({
      path: "test-results/auto-advance-after-approve.png",
      fullPage: true
    });
  });

  test("edit action without notes is blocked at the UI level", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page.locator(".review-form")).toBeVisible();

    // Attempt edit with no notes — in fixtures mode action is applied locally
    // so verify the action does NOT record (detail stays on same event)
    const headlineBefore = await page.locator(".detail-shell h2").first().textContent();
    await page.locator('[data-review-action="edit"]').click();

    // Detail panel should still show the same event (no advance without notes)
    const headlineAfter = await page.locator(".detail-shell h2").first().textContent();
    expect(headlineAfter).toBe(headlineBefore);

    // Screenshot: edit blocked without notes
    await page.screenshot({
      path: "test-results/edit-blocked-no-notes.png",
      fullPage: true
    });
  });

  test("success flash note can reopen the event that was just reviewed", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    const firstHeadline = await page.locator(".detail-shell h2").first().textContent();
    const reviewNotes = page.locator("#review-notes");
    await expect(reviewNotes).toBeVisible();
    await reviewNotes.fill(DRAFT_TEXT);

    await page.locator('[data-review-action="edit"]').click();

    const reopenButton = page.locator('[data-reopen-last-reviewed]');
    const flashNote = page.locator(".flash-note");
    await expect(flashNote.locator(".flash-note-recovery")).toHaveText(
      `Restores note: ${DRAFT_TEXT}`
    );
    await expect(reopenButton).toBeVisible();
    await expect(reopenButton).toHaveText(
      "Reopen reviewed event for context and restore note"
    );
    await expect(reopenButton).toHaveAttribute(
      "aria-label",
      /Reopen this reviewed event for context\./
    );

    const currentHeadline = await page.locator(".detail-shell h2").first().textContent();
    expect(currentHeadline).not.toBe(firstHeadline);

    await reopenButton.click();

    await expect(page.locator(".detail-shell h2").first()).toHaveText(firstHeadline ?? "");
    await expect(page.locator("#review-notes")).toHaveValue(DRAFT_TEXT);

    await page.screenshot({
      path: "test-results/reopen-last-reviewed-from-flash-note.png",
      fullPage: true
    });
  });

  test("success flash note shows the queue lens and reopen position it will restore", async ({
    page
  }) => {
    await page.goto(SORTED_FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await page.locator('[data-review-action="approve"]').click();

    const flashNote = page.locator(".flash-note");
    await expect(flashNote).toBeVisible();
    await expect(flashNote.locator(".flash-note-context")).toHaveText(
      "Sort: Lowest confidence first"
    );
    await expect(flashNote.locator(".flash-note-queue .chip").first()).toHaveText(
      /Visible \d+ of \d+/
    );
    await expect(flashNote.locator(".flash-note-queue .chip").nth(1)).toHaveText(
      /Pending \d+ of \d+|\d+ pending elsewhere|Queue cleared/
    );
    await expect(flashNote).not.toContainText("Restores note:");
    await expect(page.locator('[data-reopen-last-reviewed]')).toBeVisible();
    await expect(page.locator('[data-reopen-last-reviewed]')).toHaveText(
      "Reopen reviewed event for context"
    );
  });

  test("success flash note foregrounds queue-slice restores after the queue lens changes", async ({
    page
  }) => {
    await page.goto(SORTED_FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await page.locator('[data-review-action="approve"]').click();

    const reopenButton = page.locator('[data-reopen-last-reviewed]');
    await expect(reopenButton).toBeVisible();
    await expect(reopenButton).toHaveText("Reopen reviewed event for context");

    await page.locator("#sort-order").selectOption("oldest");

    await expect(page.locator(".flash-note")).toBeVisible();
    await expect(reopenButton).toHaveText("Restore queue slice and reopen");
    await expect(reopenButton).toHaveAttribute(
      "aria-label",
      /Restore the saved queue slice and reopen this reviewed event for context\./
    );
  });
});

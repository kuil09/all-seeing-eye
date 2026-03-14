// @ts-check
import { expect, test } from "@playwright/test";

const FIXTURES_URL = "/apps/review-console/?source=fixtures";

test.describe("keyboard shortcuts", () => {
  test("queue navigation shortcuts move across visible events and focus search", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    const cards = page.locator("#timeline-list .timeline-card");
    await expect(cards.first()).toBeVisible();
    await cards.first().click();

    const firstHeadline = await page.locator(".detail-shell h2").first().textContent();

    await page.keyboard.press("j");
    const secondHeadline = await page.locator(".detail-shell h2").first().textContent();
    expect(secondHeadline).not.toBe(firstHeadline);

    await page.keyboard.press("k");
    const returnedHeadline = await page.locator(".detail-shell h2").first().textContent();
    expect(returnedHeadline).toBe(firstHeadline);

    await page.keyboard.press("Slash");
    const searchInput = page.locator("#search-input");
    await expect(searchInput).toBeFocused();

    await page.screenshot({
      path: "test-results/keyboard-shortcuts-navigation.png",
      fullPage: true
    });
  });

  test("review action shortcuts use the same queue-throughput flow as the buttons", async ({
    page
  }) => {
    await page.goto(FIXTURES_URL);

    const cards = page.locator("#timeline-list .timeline-card");
    await expect(cards.first()).toBeVisible();
    await cards.first().click();

    const firstHeadline = await page.locator(".detail-shell h2").first().textContent();
    await page.keyboard.press("a");

    const flashNote = page.locator(".flash-note");
    await expect(flashNote).toBeVisible();
    await expect(flashNote).toContainText("recorded");

    const secondHeadline = await page.locator(".detail-shell h2").first().textContent();
    expect(secondHeadline).not.toBe(firstHeadline);

    await page.screenshot({
      path: "test-results/keyboard-shortcuts-approve.png",
      fullPage: true
    });
  });
});

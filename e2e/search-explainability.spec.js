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

  test("selected matches can jump straight to the related detail section", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    await page.locator("#search-input").fill("coastal-shipping-association");

    const searchFocus = page.locator(".search-focus-card");
    await expect(searchFocus).toBeVisible();
    await expect(searchFocus).toContainText("Jump to matched detail");

    await searchFocus.getByRole("button", { name: /Source/i }).click();

    await expect(page.locator("#detail-provenance")).toHaveClass(/is-focus-target/);
  });

  test("cycle controls appear when search matches multiple detail sections", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();
    // "harbor" matches Event + Participant + Source sections (3 matches) in the harbor fixture event
    await page.locator("#search-input").fill("harbor");

    const searchFocus = page.locator(".search-focus-card");
    await expect(searchFocus).toBeVisible();

    await expect(searchFocus.getByRole("button", { name: "Next match" })).toBeVisible();
    await expect(searchFocus.getByRole("button", { name: "Previous match" })).toBeVisible();

    await page.screenshot({
      path: "test-results/search-focus-cycle-controls.png",
      fullPage: true
    });
  });

  test("next and previous buttons cycle the active match highlight", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();
    await page.locator("#search-input").fill("harbor");

    const searchFocus = page.locator(".search-focus-card");
    await expect(searchFocus).toBeVisible();
    // No active match initially
    await expect(searchFocus.locator(".search-focus-button.is-active")).toHaveCount(0);

    // First click of Next activates the first match
    await searchFocus.getByRole("button", { name: "Next match" }).click();
    await expect(searchFocus.locator(".search-focus-button.is-active")).toHaveCount(1);
    const firstActive = await searchFocus.locator(".search-focus-button.is-active").textContent();

    // Second click of Next advances to a different match
    await searchFocus.getByRole("button", { name: "Next match" }).click();
    const secondActive = await searchFocus.locator(".search-focus-button.is-active").textContent();
    expect(secondActive).not.toBe(firstActive);

    // Previous cycles back to the first active match
    await searchFocus.getByRole("button", { name: "Previous match" }).click();
    const backToFirst = await searchFocus.locator(".search-focus-button.is-active").textContent();
    expect(backToFirst).toBe(firstActive);

    await page.screenshot({
      path: "test-results/search-focus-cycle-buttons.png",
      fullPage: true
    });
  });

  test("] and [ keyboard shortcuts cycle search focus matches", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();
    await page.locator("#search-input").fill("harbor");

    const searchFocus = page.locator(".search-focus-card");
    await expect(searchFocus).toBeVisible();

    // Blur search input so keyboard shortcuts are active
    await page.locator("#timeline-list .timeline-card").first().click();

    // ] cycles forward: no active → first match
    await page.keyboard.press("]");
    await expect(searchFocus.locator(".search-focus-button.is-active")).toHaveCount(1);
    const afterNext = await searchFocus.locator(".search-focus-button.is-active").textContent();

    // ] again advances to a different match
    await page.keyboard.press("]");
    const afterNextAgain = await searchFocus.locator(".search-focus-button.is-active").textContent();
    expect(afterNextAgain).not.toBe(afterNext);

    // [ cycles back to the previous match
    await page.keyboard.press("[");
    const afterPrev = await searchFocus.locator(".search-focus-button.is-active").textContent();
    expect(afterPrev).toBe(afterNext);

    await page.screenshot({
      path: "test-results/search-focus-cycle-keyboard.png",
      fullPage: true
    });
  });
});

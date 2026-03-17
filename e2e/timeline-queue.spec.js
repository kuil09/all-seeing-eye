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

  test("mobile selection opens an in-place detail sheet with a direct review jump", async ({
    page
  }) => {
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto(FIXTURES_URL);

    const firstCard = page.locator("#timeline-list .timeline-card").first();
    await expect(firstCard).toBeVisible();
    await expect(page.locator("#detail-panel")).toContainText("Select an event");

    await firstCard.click();

    const detailSheet = page.locator("body.has-mobile-detail-sheet #detail-panel");
    await expect(detailSheet).toBeVisible();
    await expect(page.locator("[data-close-mobile-detail]")).toBeVisible();
    await expect(page.locator('[data-mobile-detail-target="detail-review-form"]')).toBeVisible();

    const beforeJump = await page.locator("#detail-review-form").boundingBox();
    expect(beforeJump?.y ?? Number.POSITIVE_INFINITY).toBeGreaterThan(664);

    await page.locator('[data-mobile-detail-target="detail-review-form"]').click();

    await expect
      .poll(async () => await page.evaluate(() => document.activeElement?.id ?? null))
      .toBe("detail-review-form");
    await expect
      .poll(async () => (await page.locator("#detail-review-form").boundingBox())?.y ?? Infinity)
      .toBeLessThanOrEqual(140);

    await page.locator("[data-close-mobile-detail]").click();
    await expect(page.locator("body")).not.toHaveClass(/has-mobile-detail-sheet/);
    await expect(page.locator("#detail-panel")).toContainText("Select an event");
  });

  test("queue cards stay compact enough for scan-first comparison", async ({ page }) => {
    await page.goto(FIXTURES_URL);

    const cards = page.locator("#timeline-list .timeline-card");
    await expect(cards.first()).toBeVisible();

    await expect(cards.first()).not.toContainText("Key participants");
    await expect(cards.first()).not.toContainText("Confidence drivers");

    const desktopHeights = await cards.evaluateAll((nodes) =>
      nodes.map((node) => Math.round(node.getBoundingClientRect().height))
    );
    expect(Math.max(...desktopHeights)).toBeLessThan(420);

    await page.setViewportSize({ width: 390, height: 664 });
    await page.reload();

    const mobileCards = page.locator("#timeline-list .timeline-card");
    await expect(mobileCards.first()).toBeVisible();

    const mobileHeights = await mobileCards.evaluateAll((nodes) =>
      nodes.map((node) => Math.round(node.getBoundingClientRect().height))
    );
    expect(Math.max(...mobileHeights)).toBeLessThan(520);
  });

  test("queue reaches the fold before secondary tools on desktop and mobile", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1200 });
    await page.goto(FIXTURES_URL);
    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();

    const desktopLayout = await page.evaluate(() => {
      const firstCardTop =
        document.querySelector("#timeline-list .timeline-card")?.getBoundingClientRect().top ?? 0;
      const supportPanelTop =
        document.querySelector(".queue-support-panel")?.getBoundingClientRect().top ?? 0;

      return {
        firstCardTop: Math.round(firstCardTop),
        supportPanelTop: Math.round(supportPanelTop),
        viewportHeight: window.innerHeight
      };
    });

    expect(desktopLayout.firstCardTop).toBeLessThanOrEqual(desktopLayout.viewportHeight);
    expect(desktopLayout.supportPanelTop).toBeGreaterThan(desktopLayout.firstCardTop);

    await page.setViewportSize({ width: 390, height: 664 });
    await page.reload();
    await expect(page.locator("#timeline-list .timeline-card").first()).toBeVisible();

    const mobileLayout = await page.evaluate(() => {
      const firstCardTop =
        document.querySelector("#timeline-list .timeline-card")?.getBoundingClientRect().top ?? 0;
      const supportPanelTop =
        document.querySelector(".queue-support-panel")?.getBoundingClientRect().top ?? 0;

      return {
        firstCardTop: Math.round(firstCardTop),
        supportPanelTop: Math.round(supportPanelTop),
        viewportHeight: window.innerHeight
      };
    });

    expect(mobileLayout.firstCardTop).toBeLessThanOrEqual(mobileLayout.viewportHeight * 2);
    expect(mobileLayout.supportPanelTop).toBeGreaterThan(mobileLayout.firstCardTop);
  });
});

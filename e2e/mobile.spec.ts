import { expect, test } from "@playwright/test";

// The prototype has to hold together at 390px. No video here, so `npm run media` keeps using the
// desktop walkthrough.
test.use({ video: "off", viewport: { width: 390, height: 844 } });

const routes = [
  { path: "/", heading: "New risk intake" },
  { path: "/submissions/cli_002", heading: "Harbourline Logistics Ltd" },
  { path: "/submissions/cli_002/gaps", heading: "Likely gaps" },
  { path: "/submissions/cli_002/quotes", heading: "Panel" },
];

test("every screen fits a 390px viewport without horizontal overflow", async ({ page }) => {
  for (const route of routes) {
    await page.goto(`#${route.path}`);
    await page.reload();
    await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${route.path} overflows horizontally`).toBe(0);
    await page.screenshot({
      path: `test-results/mobile${route.path.replace(/\//g, "-") || "-intake"}.png`,
      fullPage: true,
    });
  }
});

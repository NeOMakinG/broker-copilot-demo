import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { shots } from "./shots";

// Video is recorded for this spec (see playwright.config.ts) and turned into docs/demo.* by `npm run media`.
test.use({ video: "on" });

const footer = "Independent concept by Valentin Szczupak.";
const dir = "docs/screenshots";

function fileFor(index: number, name: string) {
  return `${String(index + 1).padStart(2, "0")}-${name}.png`;
}

// Screenshots from shots that were renamed or removed would otherwise linger in the README.
test.beforeAll(() => {
  mkdirSync(dir, { recursive: true });
  const expected = new Set(shots.map((shot, index) => fileFor(index, shot.name)));
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (entry.endsWith(".png") && !expected.has(entry) && existsSync(path)) rmSync(path);
  }
});

test("walks the main states and captures screenshots", async ({ page }) => {
  for (const [index, shot] of shots.entries()) {
    // One continuous session: the broker's edits carry over from shot to shot, as they do in the
    // app. Hash navigation keeps the document, and a shot that is already on its path (because the
    // previous one navigated there) is left alone.
    if (new URL(page.url()).hash !== `#${shot.path}`) await page.goto(`#${shot.path}`);
    await expect(page.getByText(footer)).toBeVisible();
    await expect(page.locator("[aria-busy='true']")).toHaveCount(0);
    await shot.steps?.(page);
    await page.screenshot({
      path: join(dir, fileFor(index, shot.name)),
      fullPage: false,
      animations: "disabled",
    });
    await shot.after?.(page);
  }
});

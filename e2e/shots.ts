import { expect, type Page } from "@playwright/test";

export interface Shot {
  /** File name suffix: docs/screenshots/NN-<name>.png */
  name: string;
  /** Router path (hash history adds the #). */
  path: string;
  /** Interactions and assertions to run before the screenshot. */
  steps?: (page: Page) => Promise<void>;
}

// The main states of the prototype, in demo order. The e2e spec walks this list.
export const shots: Shot[] = [
  {
    name: "intake",
    path: "/",
    steps: async (page) => {
      await expect(page.getByRole("heading", { name: "New risk intake" })).toBeVisible();
      await page.getByRole("button", { name: "Brightwell Joinery Ltd" }).click();
      await expect(page.getByLabel("Risk description")).toHaveValue(/Brightwell Joinery Ltd/);
      await expect(
        page.getByRole("list", { name: "Attached documents" }).getByRole("listitem"),
      ).toHaveCount(2);
    },
  },
  {
    name: "analysing",
    path: "/",
    steps: async (page) => {
      await page.getByRole("button", { name: "Brightwell Joinery Ltd" }).click();
      await page.getByRole("button", { name: "Analyse risk" }).click();
      const progress = page.getByRole("list", { name: "Analysis progress" });
      await expect(progress).toBeVisible();
      // Counts in the step details come from the same selectors as the screens that follow.
      await expect(progress.getByText("7 fields, each with a source passage")).toBeVisible();
      await expect(progress.getByText("5 covers across 1 schedule")).toBeVisible();
    },
  },
  {
    name: "submission-draft",
    path: "/submissions/cli_001",
    steps: async (page) => {
      await expect(page.getByRole("heading", { name: "Brightwell Joinery Ltd" })).toBeVisible();
      await expect(page.getByText("0 of 7 fields reviewed")).toBeVisible();
      await page.getByRole("button", { name: "Confirm Annual turnover" }).click();
      await expect(page.getByText("1 of 7 fields reviewed")).toBeVisible();
      await page.getByRole("button", { name: "Edit Employees" }).click();
      await page.getByLabel("Employees", { exact: true }).fill("15");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Edited by broker")).toBeVisible();
      await expect(page.getByText("2 of 7 fields reviewed")).toBeVisible();
    },
  },
  {
    name: "gap-flags",
    path: "/submissions/cli_001/gaps",
    steps: async (page) => {
      await expect(page.getByRole("heading", { name: "Likely gaps" })).toBeVisible();
      await expect(page.getByText("0 of 4 added")).toBeVisible();
      await page.getByRole("button", { name: "Add Cyber and data to submission" }).click();
      await expect(page.getByText("1 of 4 added")).toBeVisible();
      await page.getByRole("button", { name: "Add Business interruption to submission" }).click();
      await expect(page.getByText("2 of 4 added")).toBeVisible();
      await expect(
        page.getByRole("list", { name: "Covers requested" }).getByRole("listitem"),
      ).toHaveCount(7);
    },
  },
  {
    name: "quote-comparison",
    // Starts on the gaps step so the comparison includes covers the broker just added.
    path: "/submissions/cli_001/gaps",
    steps: async (page) => {
      await page.getByRole("button", { name: "Add Cyber and data to submission" }).click();
      await page.getByRole("button", { name: "Add Business interruption to submission" }).click();
      await page.getByRole("button", { name: "Add Professional indemnity to submission" }).click();
      await expect(page.getByText("3 of 4 added")).toBeVisible();
      await page.getByRole("link", { name: "Compare quotes" }).click();
      await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Premium" })).toHaveAttribute(
        "aria-sort",
        "ascending",
      );
      await page.getByRole("button", { name: "Compare Meridian Commercial" }).click();
      await page.getByRole("button", { name: "Compare Stonebridge Specialty" }).click();
      await expect(page.getByText("2 shortlisted")).toBeVisible();
      const compare = page.getByRole("table", { name: "Quote comparison" });
      await expect(compare).toBeVisible();
      await expect(compare.getByText("Likely decline")).toHaveCount(0);
      // Meridian lacks cyber and professional indemnity; Stonebridge offers all eight requested covers.
      await expect(compare.getByText("Not offered")).toHaveCount(2);
      await page.getByRole("button", { name: "Export" }).click();
      await expect(page.getByRole("dialog", { name: "Export submission" })).toBeVisible();
      await expect(page.getByRole("dialog")).toContainText("# Submission: Brightwell Joinery Ltd");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
    },
  },
];

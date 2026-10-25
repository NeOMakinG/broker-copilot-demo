import { expect, type Page } from "@playwright/test";

export interface Shot {
  /** File name suffix: docs/screenshots/NN-<name>.png */
  name: string;
  /** Router path (hash history adds the #). */
  path: string;
  /** Interactions and assertions to run before the screenshot. */
  steps?: (page: Page) => Promise<void>;
  /** Runs after the screenshot, for example to let an in-app transition finish. */
  after?: (page: Page) => Promise<void>;
}

// The main states of the prototype, in demo order. The e2e spec walks this list as one continuous
// session: the broker's edits on the Draft screen are still there on the Gaps and Quotes screens,
// so the header, the step rail and the quote table all agree.
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
      // Step details only render once a step completes, and their counts come from the same
      // selectors as the screens that follow. Labels switch to the past tense at the same moment.
      await expect(progress.getByText("94 words, recognised Brightwell Joinery Ltd")).toBeVisible();
      await expect(progress.getByText("7 fields, each with a source passage")).toBeVisible();
      await expect(progress.getByText("5 covers across 1 schedule")).toBeVisible();
      await expect(progress.getByText("Looking for coverage gaps...")).toBeVisible();
      await expect(progress.getByText("Score the insurer panel")).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
    },
    // Let the pipeline hand over to the draft so the video shows the transition.
    after: async (page) => {
      await expect(page.getByRole("heading", { name: "Brightwell Joinery Ltd" })).toBeVisible();
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
      await expect(page.getByRole("definition").filter({ hasText: /^15$/ })).toBeVisible();
    },
  },
  {
    name: "gap-flags",
    path: "/submissions/cli_001/gaps",
    steps: async (page) => {
      await expect(page.getByRole("heading", { name: "Likely gaps" })).toBeVisible();
      // The edits from the draft are still in the header and the step rail.
      await expect(page.getByText("2 of 7 fields reviewed")).toBeVisible();
      await expect(page.getByRole("definition").filter({ hasText: /^15$/ })).toBeVisible();
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
    // Continues from the gaps step so the comparison counts the two covers the broker just added.
    path: "/submissions/cli_001/gaps",
    steps: async (page) => {
      await expect(page.getByText("2 of 4 added")).toBeVisible();
      await page.getByRole("link", { name: "Compare quotes" }).click();
      await expect(page.getByRole("heading", { name: "Panel" })).toBeVisible();
      await expect(
        page.getByText("Covers counted against the 7 the submission requests"),
      ).toBeVisible();
      await expect(page.getByRole("note", { name: "Recommendation" })).toContainText(
        "Meridian Commercial is the cheapest quote within appetite",
      );
      await expect(page.getByRole("columnheader", { name: "Premium" })).toHaveAttribute(
        "aria-sort",
        "ascending",
      );
      await page.getByRole("button", { name: "Compare Meridian Commercial" }).click();
      await page.getByRole("button", { name: "Compare Stonebridge Specialty" }).click();
      await expect(page.getByText("2 shortlisted", { exact: true })).toBeVisible();
      const compare = page.getByRole("table", { name: "Quote comparison" });
      await expect(compare).toBeVisible();
      await expect(compare.getByText("Likely decline")).toHaveCount(0);
      // Meridian lacks cyber; Stonebridge offers all seven requested covers.
      await expect(compare.getByText("Not offered")).toHaveCount(1);
      await page.getByRole("button", { name: "Export" }).click();
      await expect(page.getByRole("dialog", { name: "Export submission" })).toBeVisible();
      await expect(page.getByRole("dialog")).toContainText("# Submission: Brightwell Joinery Ltd");
      await expect(page.getByRole("dialog")).toContainText("Employees: 15");
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
      // Focus returns to the Export button; drop it so the still frame has no stray ring.
      await page.getByRole("button", { name: "Export" }).blur();
      // Scroll the panel section to the top; the client line and the step rail stay pinned above
      // it and the section's scroll margin keeps the recommendation in view.
      await page
        .getByRole("heading", { name: "Panel" })
        .evaluate((el) => el.closest("section")?.scrollIntoView({ block: "start" }));
      await expect(page.getByText("£2,100,000 turnover, 15 employees, £6,840 today")).toBeVisible();
    },
  },
];

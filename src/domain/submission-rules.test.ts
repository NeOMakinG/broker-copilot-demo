import { Effect, Result } from "effect";
import { describe, expect, it } from "vitest";
import { clients } from "@/data/clients";
import { documents } from "@/data/documents";
import { extractions, gapFlags } from "@/data/extractions";
import { quotes } from "@/data/quotes";
import { draftFields, extractionForClient } from "@/data/selectors";
import { GapId, QuoteId } from "@/lib/ids";
import type { Submission } from "@/schemas/submission";
import {
  addGapCover,
  confirmField,
  editField,
  SubmissionRepo,
  toggleQuote,
} from "./submission-rules";

function fail(message: string): never {
  throw new Error(message);
}

const client = clients.find((c) => c.id === "cli_001") ?? fail("fixture missing");
const extraction = extractionForClient(extractions, client.id) ?? fail("fixture missing");

function fresh(): Submission {
  return {
    clientId: client.id,
    documentIds: documents.filter((d) => d.clientId === client.id).map((d) => d.id),
    fields: draftFields(client, extraction),
    addedCovers: [],
    selectedQuoteIds: [],
    analysedAt: "2026-10-25T09:00:00.000Z",
  };
}

function repoWith(submission: Submission | undefined) {
  return Effect.provideService(SubmissionRepo, {
    submission: () => submission,
    documents: (id) => documents.filter((d) => d.clientId === id),
    gap: (id) => gapFlags.find((g) => g.id === id),
    quotes: (id) => quotes.filter((q) => q.clientId === id),
  });
}

function run<A, E>(effect: Effect.Effect<A, E, SubmissionRepo>, submission = fresh()) {
  return Effect.runPromise(effect.pipe(repoWith(submission), Effect.result));
}

describe("editField", () => {
  it("marks a changed value as edited and keeps the extracted value for comparison", async () => {
    const result = await run(
      editField(client.id, "turnover", { type: "money", amount: 2_250_000 }),
    );
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      const field = result.success.fields.find((f) => f.key === "turnover");
      expect(field?.status).toBe("edited");
      expect(field?.value).toEqual({ type: "money", amount: 2_250_000 });
      expect(field?.extracted).toEqual({ type: "money", amount: client.turnover });
    }
  });

  it("treats saving the extracted value unchanged as a confirmation", async () => {
    const result = await run(
      editField(client.id, "headcount", { type: "count", count: client.headcount }),
    );
    expect(
      Result.isSuccess(result) && result.success.fields.find((f) => f.key === "headcount")?.status,
    ).toBe("confirmed");
  });

  it("refuses a value of the wrong type", async () => {
    const result = await run(
      editField(client.id, "turnover", { type: "text", text: "two million" }),
    );
    expect(Result.isFailure(result) && result.failure._tag).toBe("FieldTypeMismatch");
  });

  it("fails when there is no submission", async () => {
    const result = await Effect.runPromise(
      confirmField(client.id, "trade").pipe(repoWith(undefined), Effect.result),
    );
    expect(Result.isFailure(result) && result.failure._tag).toBe("SubmissionNotFound");
  });
});

describe("addGapCover", () => {
  const cyberGap = GapId.parse("gap_001");

  it("adds the gap's cover once", async () => {
    const first = await run(addGapCover(client.id, cyberGap));
    expect(Result.isSuccess(first) && first.success.addedCovers).toEqual(["cyber"]);
    if (!Result.isSuccess(first)) return;
    const twice = await run(addGapCover(client.id, cyberGap), first.success);
    expect(Result.isFailure(twice) && twice.failure._tag).toBe("CoverAlreadyAdded");
  });

  it("rejects a gap that belongs to another client", async () => {
    const result = await run(addGapCover(client.id, GapId.parse("gap_005")));
    expect(Result.isFailure(result) && result.failure._tag).toBe("GapNotFound");
  });
});

describe("toggleQuote", () => {
  const panel = quotes.filter((q) => q.clientId === client.id).map((q) => q.id);

  it("selects, then deselects, a quote", async () => {
    const [first] = panel;
    if (!first) throw new Error("no quotes");
    const on = await run(toggleQuote(client.id, first));
    expect(Result.isSuccess(on) && on.success.selectedQuoteIds).toEqual([first]);
    if (!Result.isSuccess(on)) return;
    const off = await run(toggleQuote(client.id, first), on.success);
    expect(Result.isSuccess(off) && off.success.selectedQuoteIds).toEqual([]);
  });

  it("caps the shortlist at three", async () => {
    const [a, b, c, d] = panel;
    if (!a || !b || !c || !d) throw new Error("need four quotes");
    const result = await run(toggleQuote(client.id, d), {
      ...fresh(),
      selectedQuoteIds: [a, b, c],
    });
    expect(Result.isFailure(result) && result.failure._tag).toBe("ShortlistFull");
  });

  it("rejects a quote from another panel", async () => {
    const result = await run(toggleQuote(client.id, QuoteId.parse("qte_009")));
    expect(Result.isFailure(result) && result.failure._tag).toBe("QuoteNotFound");
  });
});

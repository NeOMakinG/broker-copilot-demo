import { describe, expect, it } from "vitest";
import { clients } from "@/data/clients";
import { documents } from "@/data/documents";
import { exportMarkdown } from "@/data/export";
import { extractions, gapFlags } from "@/data/extractions";
import { insurers } from "@/data/insurers";
import { quotes } from "@/data/quotes";
import {
  cheapestQuote,
  claimsTotal,
  coverageMatch,
  coversHeld,
  coverTypesHeld,
  currentPremium,
  documentsForClient,
  draftFields,
  extractionForClient,
  fieldAmount,
  fieldStats,
  fieldValue,
  formatFieldValue,
  gapStats,
  gapsForClient,
  nextRenewal,
  pipelineSteps,
  premiumDelta,
  premiumRange,
  quotesForClient,
  requestedCovers,
  schedules,
  verdictCounts,
} from "@/data/selectors";
import { appetiteFor } from "@/domain/appetite";
import type { Submission } from "@/schemas/submission";

// Mock data must be internally consistent: every screen reads these numbers, and a contradiction between
// two screens ruins the demo. Extend this file for every new fixture and every computed figure.

function freshSubmission(clientId: Submission["clientId"]): Submission {
  const client = clients.find((c) => c.id === clientId);
  const extraction = extractionForClient(extractions, clientId);
  if (!client || !extraction) throw new Error(`No fixture for ${clientId}`);
  return {
    clientId,
    documentIds: documentsForClient(documents, clientId).map((d) => d.id),
    fields: draftFields(client, extraction),
    addedCovers: [],
    selectedQuoteIds: [],
    analysedAt: "2026-10-25T09:00:00.000Z",
  };
}

describe("fixture shape", () => {
  it("every client has a schedule, a statement of fact, an extraction, gaps and four quotes", () => {
    for (const client of clients) {
      const docs = documentsForClient(documents, client.id);
      expect(schedules(docs).length).toBeGreaterThanOrEqual(1);
      expect(docs.some((d) => d.kind === "statement_of_fact")).toBe(true);
      expect(extractionForClient(extractions, client.id)).toBeDefined();
      expect(gapsForClient(gapFlags, client.id).length).toBeGreaterThanOrEqual(3);
      expect(quotesForClient(quotes, client.id)).toHaveLength(4);
    }
  });

  it("every document, gap and quote belongs to a known client and insurer", () => {
    const clientIds = new Set(clients.map((c) => c.id));
    const insurerIds = new Set(insurers.map((i) => i.id));
    for (const d of documents) {
      expect(clientIds.has(d.clientId)).toBe(true);
      expect(insurerIds.has(d.insurerId)).toBe(true);
    }
    for (const g of gapFlags) expect(clientIds.has(g.clientId)).toBe(true);
    for (const q of quotes) {
      expect(clientIds.has(q.clientId)).toBe(true);
      expect(insurerIds.has(q.insurerId)).toBe(true);
    }
  });

  it("source passages point at documents attached to the same client", () => {
    for (const extraction of extractions) {
      for (const field of extraction.fields) {
        if (field.source.documentId === null) continue;
        const doc = documents.find((d) => d.id === field.source.documentId);
        expect(doc?.clientId).toBe(extraction.clientId);
      }
    }
    for (const gap of gapFlags) {
      if (gap.evidence.documentId === null) continue;
      expect(documents.find((d) => d.id === gap.evidence.documentId)?.clientId).toBe(gap.clientId);
    }
  });

  it("premiums sit in the spec's band and exactly one holding insurer quotes each client", () => {
    const range = premiumRange(quotes);
    expect(range).toEqual({ min: 4_200, max: 18_500 });
    for (const client of clients) {
      expect(quotesForClient(quotes, client.id).filter((q) => q.holdingInsurer)).toHaveLength(1);
    }
  });
});

describe("draft fields agree with the client facts", () => {
  it("turnover, headcount and fleet in the draft equal the client fixture", () => {
    for (const client of clients) {
      const submission = freshSubmission(client.id);
      expect(fieldAmount(submission, "turnover")).toBe(client.turnover);
      expect(fieldAmount(submission, "headcount")).toBe(client.headcount);
      if (client.fleetSize > 0) expect(fieldAmount(submission, "fleet")).toBe(client.fleetSize);
      else expect(submission.fields.some((f) => f.key === "fleet")).toBe(false);
    }
  });

  it("the claims summary counts and totals the claim records", () => {
    for (const client of clients) {
      const text = formatFieldValue(fieldValue(client, "claims"));
      if (client.claims.length === 0) {
        expect(text).toMatch(/No claims/);
        continue;
      }
      expect(text).toContain(`${client.claims.length} claim`);
      expect(text).toContain(claimsTotal(client).toLocaleString("en-GB"));
    }
  });

  it("field stats add up and the rate is a percentage", () => {
    for (const client of clients) {
      const s = fieldStats(freshSubmission(client.id));
      expect(s.confirmed + s.edited).toBe(s.reviewed);
      expect(s.reviewed).toBeLessThanOrEqual(s.total);
      expect(s.rate).toBeGreaterThanOrEqual(0);
      expect(s.rate).toBeLessThanOrEqual(100);
    }
  });
});

describe("covers, gaps and premiums", () => {
  it("current premium is the sum of the schedules and renewal is the earliest date", () => {
    for (const client of clients) {
      const docs = documentsForClient(documents, client.id);
      const parts = schedules(docs).reduce((sum, d) => sum + (d.annualPremium ?? 0), 0);
      expect(currentPremium(docs)).toBe(parts);
      const renewal = nextRenewal(docs);
      for (const d of schedules(docs)) {
        if (d.renewalDate && renewal) expect(renewal <= d.renewalDate).toBe(true);
      }
    }
  });

  it("covers held are unique and every gap names a cover that is not held", () => {
    for (const client of clients) {
      const docs = documentsForClient(documents, client.id);
      const held = coverTypesHeld(docs);
      expect(new Set(held).size).toBe(coversHeld(docs).length);
      for (const gap of gapsForClient(gapFlags, client.id)) {
        expect(held).not.toContain(gap.cover);
      }
    }
  });

  it("adding a gap grows the requested covers by one and the gap stats follow", () => {
    for (const client of clients) {
      const docs = documentsForClient(documents, client.id);
      const gaps = gapsForClient(gapFlags, client.id);
      const before = freshSubmission(client.id);
      const first = gaps[0];
      if (!first) throw new Error("fixture has no gaps");
      const after: Submission = { ...before, addedCovers: [first.cover] };
      expect(requestedCovers(docs, after)).toHaveLength(requestedCovers(docs, before).length + 1);
      const stats = gapStats(gaps, after);
      expect(stats.added + stats.open).toBe(stats.total);
      expect(stats.added).toBe(1);
    }
  });

  it("coverage match splits the requested covers exactly", () => {
    for (const client of clients) {
      const docs = documentsForClient(documents, client.id);
      const requested = requestedCovers(docs, freshSubmission(client.id));
      for (const quote of quotesForClient(quotes, client.id)) {
        const match = coverageMatch(quote, requested);
        expect(match.included.length + match.missing.length).toBe(requested.length);
      }
    }
  });

  it("the cheapest quote is never above any other and deltas are quote minus current", () => {
    for (const client of clients) {
      const panel = quotesForClient(quotes, client.id);
      const current = currentPremium(documentsForClient(documents, client.id));
      const cheapest = cheapestQuote(panel);
      if (!cheapest) throw new Error("no quotes");
      for (const q of panel) {
        expect(cheapest.premium).toBeLessThanOrEqual(q.premium);
        expect(premiumDelta(q, current)).toBe(q.premium - current);
      }
    }
  });

  it("every panel has at least one quote within appetite and one that is not", () => {
    for (const client of clients) {
      const counts = verdictCounts(quotesForClient(quotes, client.id), client);
      expect(counts.fit).toBeGreaterThanOrEqual(1);
      expect(counts.caution + counts.decline).toBeGreaterThanOrEqual(1);
      expect(counts.fit + counts.caution + counts.decline).toBe(4);
    }
  });
});

describe("the same figures on every route", () => {
  it("pipeline step counts equal what the draft, gaps and quotes screens show", () => {
    for (const client of clients) {
      const docs = documentsForClient(documents, client.id);
      const submission = freshSubmission(client.id);
      const gaps = gapsForClient(gapFlags, client.id);
      const panel = quotesForClient(quotes, client.id);
      const steps = pipelineSteps({ client, documents: docs, submission, gaps, quotes: panel });
      expect(steps[1]?.label).toContain(`${docs.length} document`);
      expect(steps[1]?.detail).toContain(`${submission.fields.length} fields`);
      expect(steps[2]?.detail).toContain(`${coverTypesHeld(docs).length} covers`);
      expect(steps[3]?.detail).toContain(`${gaps.length} likely`);
      expect(steps[4]?.detail).toContain(`${verdictCounts(panel, client).fit} within appetite`);
    }
  });

  it("the export repeats the draft values, the premium and the appetite verdicts", () => {
    for (const client of clients) {
      const docs = documentsForClient(documents, client.id);
      const submission = freshSubmission(client.id);
      const panel = quotesForClient(quotes, client.id);
      const md = exportMarkdown({ client, documents: docs, submission, quotes: panel, insurers });
      for (const field of submission.fields) expect(md).toContain(formatFieldValue(field.value));
      expect(md).toContain(`£${currentPremium(docs).toLocaleString("en-GB")}`);
      for (const q of panel) {
        expect(md).toContain(`£${q.premium.toLocaleString("en-GB")}`);
        expect(md).toContain(appetiteFor(q, client).verdict === "fit" ? "Within appetite" : "");
      }
    }
  });
});

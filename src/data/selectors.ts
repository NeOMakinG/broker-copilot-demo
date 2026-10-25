import { appetiteFor, type Verdict } from "@/domain/appetite";
import type { ClientId, DocumentId, InsurerId, QuoteId } from "@/lib/ids";
import { formatMoney } from "@/lib/utils";
import type { Client } from "@/schemas/client";
import { type CoverLine, type CoverType, coverLabel } from "@/schemas/cover";
import type { PolicyDocument } from "@/schemas/document";
import type { Extraction, FieldKey, GapFlag } from "@/schemas/extraction";
import type { Insurer, Quote } from "@/schemas/insurer";
import type { FieldValue, Submission, SubmissionField } from "@/schemas/submission";

// Every number a screen shows is computed here from the fixtures, never hand-typed in a component.
// Screens, tRPC resolvers and the invariants test use the same functions, so a total can't drift.

export const GBP = "GBP";

// Lookups

export function clientById(clients: Client[], id: ClientId): Client | undefined {
  return clients.find((c) => c.id === id);
}

export function insurerName(insurers: Insurer[], id: InsurerId): string {
  return insurers.find((i) => i.id === id)?.name ?? id;
}

export function documentsForClient(documents: PolicyDocument[], clientId: ClientId) {
  return documents.filter((d) => d.clientId === clientId);
}

export function documentById(documents: PolicyDocument[], id: DocumentId) {
  return documents.find((d) => d.id === id);
}

export function quotesForClient(quotes: Quote[], clientId: ClientId): Quote[] {
  return quotes.filter((q) => q.clientId === clientId);
}

export function gapsForClient(gaps: GapFlag[], clientId: ClientId): GapFlag[] {
  return gaps.filter((g) => g.clientId === clientId);
}

export function extractionForClient(extractions: Extraction[], clientId: ClientId) {
  return extractions.find((e) => e.clientId === clientId);
}

// Client facts as typed field values

export function claimsTotal(client: Client): number {
  return client.claims.reduce((sum, c) => sum + c.amount, 0);
}

export function claimsSummary(client: Client): string {
  const n = client.claims.length;
  if (n === 0) return "No claims in the last 5 years";
  const fault = client.claims.filter((c) => c.atFault).length;
  const faultNote = fault > 0 ? `, ${fault} at fault` : "";
  return `${n} ${n === 1 ? "claim" : "claims"} in the last 5 years, ${formatMoney(claimsTotal(client), GBP)} total${faultNote}`;
}

export function fieldValue(client: Client, key: FieldKey): FieldValue {
  switch (key) {
    case "trade":
      return { type: "text", text: client.trade };
    case "turnover":
      return { type: "money", amount: client.turnover };
    case "headcount":
      return { type: "count", count: client.headcount };
    case "years_trading":
      return { type: "count", count: client.yearsTrading };
    case "premises":
      return { type: "text", text: client.premises.description };
    case "fleet":
      return { type: "count", count: client.fleetSize };
    case "claims":
      return { type: "text", text: claimsSummary(client) };
  }
}

export function formatFieldValue(value: FieldValue): string {
  switch (value.type) {
    case "money":
      return formatMoney(value.amount, GBP);
    case "count":
      return value.count.toLocaleString("en-GB");
    case "text":
      return value.text;
  }
}

// The initial draft the pipeline produces: canned sources and confidences, values from the facts.
export function draftFields(client: Client, extraction: Extraction): SubmissionField[] {
  return extraction.fields.map((f) => {
    const value = fieldValue(client, f.key);
    return {
      key: f.key,
      value,
      extracted: value,
      source: f.source,
      confidence: f.confidence,
      status: "extracted",
    };
  });
}

export function submissionField(submission: Submission, key: FieldKey) {
  return submission.fields.find((f) => f.key === key);
}

// What a draft field currently says, as a number, for headers and exports.
export function fieldAmount(submission: Submission, key: FieldKey): number | null {
  const v = submissionField(submission, key)?.value;
  if (!v) return null;
  if (v.type === "money") return v.amount;
  if (v.type === "count") return v.count;
  return null;
}

export function fieldStats(submission: Submission) {
  const total = submission.fields.length;
  const confirmed = submission.fields.filter((f) => f.status === "confirmed").length;
  const edited = submission.fields.filter((f) => f.status === "edited").length;
  const reviewed = confirmed + edited;
  return {
    total,
    confirmed,
    edited,
    reviewed,
    rate: total === 0 ? 0 : round0((reviewed / total) * 100),
  };
}

export const LOW_CONFIDENCE = 0.85;

export function lowConfidenceCount(submission: Submission): number {
  return submission.fields.filter((f) => f.status === "extracted" && f.confidence < LOW_CONFIDENCE)
    .length;
}

// Covers and premiums from the schedules

export function schedules(documents: PolicyDocument[]): PolicyDocument[] {
  return documents.filter((d) => d.kind === "schedule");
}

// Union of cover lines across every schedule, first occurrence wins, in schedule order.
export function coversHeld(documents: PolicyDocument[]): CoverLine[] {
  const seen = new Map<CoverType, CoverLine>();
  for (const doc of schedules(documents)) {
    for (const line of doc.covers) if (!seen.has(line.cover)) seen.set(line.cover, line);
  }
  return [...seen.values()];
}

export function coverTypesHeld(documents: PolicyDocument[]): CoverType[] {
  return coversHeld(documents).map((l) => l.cover);
}

export function currentPremium(documents: PolicyDocument[]): number {
  return schedules(documents).reduce((sum, d) => sum + (d.annualPremium ?? 0), 0);
}

export function nextRenewal(documents: PolicyDocument[]): string | null {
  const dates = schedules(documents)
    .map((d) => d.renewalDate)
    .filter((d): d is string => d !== null)
    .sort();
  return dates[0] ?? null;
}

// Covers the submission asks the market for: everything held plus what the broker added from gaps.
export function requestedCovers(documents: PolicyDocument[], submission: Submission): CoverType[] {
  const held = coverTypesHeld(documents);
  return [...held, ...submission.addedCovers.filter((c) => !held.includes(c))];
}

export function gapStats(gaps: GapFlag[], submission: Submission) {
  const added = gaps.filter((g) => submission.addedCovers.includes(g.cover)).length;
  return {
    total: gaps.length,
    added,
    open: gaps.length - added,
    high: gaps.filter((g) => g.severity === "high").length,
  };
}

// Quotes

export interface CoverageMatch {
  included: CoverType[];
  missing: CoverType[];
}

export function coverageMatch(quote: Quote, requested: CoverType[]): CoverageMatch {
  const offered = new Set(quote.covers.map((c) => c.cover));
  return {
    included: requested.filter((c) => offered.has(c)),
    missing: requested.filter((c) => !offered.has(c)),
  };
}

export function quoteCover(quote: Quote, cover: CoverType): CoverLine | undefined {
  return quote.covers.find((c) => c.cover === cover);
}

export function premiumRange(quotes: Quote[]): { min: number; max: number } | null {
  if (quotes.length === 0) return null;
  const premiums = quotes.map((q) => q.premium);
  return { min: Math.min(...premiums), max: Math.max(...premiums) };
}

export function cheapestQuote(quotes: Quote[]): Quote | undefined {
  return [...quotes].sort((a, b) => a.premium - b.premium)[0];
}

export function premiumDelta(quote: Quote, current: number): number {
  return quote.premium - current;
}

export function verdictCounts(quotes: Quote[], client: Client): Record<Verdict, number> {
  const counts: Record<Verdict, number> = { fit: 0, caution: 0, decline: 0 };
  for (const q of quotes) counts[appetiteFor(q, client).verdict] += 1;
  return counts;
}

export function selectedQuotes(quotes: Quote[], submission: Submission): Quote[] {
  return submission.selectedQuoteIds
    .map((id) => quotes.find((q) => q.id === id))
    .filter((q): q is Quote => q !== undefined);
}

export function isSelected(submission: Submission, quoteId: QuoteId): boolean {
  return submission.selectedQuoteIds.includes(quoteId);
}

// One line the broker can act on, above the panel table. Built from the same match and appetite
// functions as the rows, so it never names a quote the table scores differently.
export function panelRecommendation(input: {
  quotes: Quote[];
  insurers: Insurer[];
  client: Client;
  requested: CoverType[];
  currentPremium: number;
}): string {
  const { quotes, insurers, client, requested, currentPremium: current } = input;
  if (quotes.length === 0) return "No quotes on the panel yet.";
  const scored = [...quotes]
    .sort((a, b) => a.premium - b.premium)
    .map((quote) => ({
      quote,
      name: insurerName(insurers, quote.insurerId),
      verdict: appetiteFor(quote, client).verdict,
      offered: coverageMatch(quote, requested).included.length,
    }));
  const total = requested.length;
  const covers = (n: number) =>
    n === total ? `all ${total} requested covers` : `${n} of ${total} covers`;
  const against = (quote: Quote) => {
    const delta = premiumDelta(quote, current);
    if (delta === 0) return "level with today";
    return `${formatMoney(Math.abs(delta), GBP)} ${delta > 0 ? "more" : "less"} than today`;
  };

  const sentences: string[] = [];
  const fit = scored.find((s) => s.verdict === "fit");
  const fullFit = scored.find((s) => s.verdict === "fit" && s.offered === total);
  const lead = fullFit ?? fit;
  if (lead) {
    sentences.push(
      `${lead.name} is the cheapest quote within appetite at ${formatMoney(lead.quote.premium, GBP)}, ${against(lead.quote)}, with ${covers(lead.offered)}.`,
    );
  } else {
    sentences.push("No quote on the panel is within appetite as the submission stands.");
  }
  if (!fullFit) {
    const full = scored.find((s) => s.offered === total && s.verdict !== "decline");
    if (full) {
      sentences.push(
        `Only ${full.name} offers ${covers(total)}, at ${formatMoney(full.quote.premium, GBP)} and ${
          full.verdict === "caution" ? "subject to an underwriter check" : "within appetite"
        }.`,
      );
    }
  }
  const cheapest = scored[0];
  if (cheapest && cheapest !== lead && cheapest.verdict === "decline") {
    sentences.push(
      `${cheapest.name} is cheapest at ${formatMoney(cheapest.quote.premium, GBP)} but likely to decline.`,
    );
  }
  return sentences.join(" ");
}

// Pipeline summary shown while the intake is analysed. Every count comes from the selectors above.
// Each step carries its label in three tenses so the UI never claims a step is done before it is.
export interface PipelineStep {
  id: string;
  /** Imperative, shown before the step starts: "Score the insurer panel". */
  pending: string;
  /** Progressive, shown while it runs: "Scoring the insurer panel...". */
  running: string;
  /** Past tense, shown once it completes: "Scored the insurer panel". */
  done: string;
  detail: string;
  durationMs: number;
}

// The five stages as the intake screen lists them before anything runs.
export const PIPELINE_STAGES = [
  "Read the risk description",
  "Extract facts from the documents",
  "Match the covers already held",
  "Look for coverage gaps",
  "Score the insurer panel",
] as const;

export function pipelineSteps(input: {
  client: Client;
  documents: PolicyDocument[];
  submission: Submission;
  gaps: GapFlag[];
  quotes: Quote[];
}): PipelineStep[] {
  const { client, documents, submission, gaps, quotes } = input;
  const words = client.riskDescription.trim().split(/\s+/).length;
  const held = coverTypesHeld(documents).length;
  const sched = schedules(documents).length;
  const verdicts = verdictCounts(quotes, client);
  const docs = `${documents.length} ${documents.length === 1 ? "document" : "documents"}`;
  return [
    {
      id: "read",
      pending: PIPELINE_STAGES[0],
      running: "Reading the risk description...",
      done: "Read the risk description",
      detail: `${words} words, recognised ${client.name}`,
      durationMs: 650,
    },
    {
      id: "extract",
      pending: PIPELINE_STAGES[1],
      running: `Extracting facts from ${docs}...`,
      done: `Extracted facts from ${docs}`,
      detail: `${submission.fields.length} fields, each with a source passage`,
      durationMs: 900,
    },
    {
      id: "covers",
      pending: PIPELINE_STAGES[2],
      running: "Matching the covers already held...",
      done: "Matched the covers already held",
      detail: `${held} covers across ${sched} ${sched === 1 ? "schedule" : "schedules"}`,
      durationMs: 600,
    },
    {
      id: "gaps",
      pending: PIPELINE_STAGES[3],
      running: "Looking for coverage gaps...",
      done: "Looked for coverage gaps",
      detail: `${gaps.length} likely exposures with no cover`,
      durationMs: 750,
    },
    {
      id: "quotes",
      pending: PIPELINE_STAGES[4],
      running: "Scoring the insurer panel...",
      done: "Scored the insurer panel",
      detail: `${quotes.length} quotes, ${verdicts.fit} within appetite`,
      durationMs: 700,
    },
  ];
}

export function coverNames(covers: CoverType[]): string {
  return covers.map((c) => coverLabel[c]).join(", ");
}

function round0(n: number): number {
  return Math.round(n);
}

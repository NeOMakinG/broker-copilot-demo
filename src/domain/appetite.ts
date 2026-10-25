import { formatMoney } from "@/lib/utils";
import { type Client, constructionLabel } from "@/schemas/client";
import type { AppetiteRule, Quote } from "@/schemas/insurer";

// Tests an insurer's structured appetite rules against the facts in the submission.
// Pure and total: every rule yields a verdict, so there is nothing to fail here.

export type Verdict = "fit" | "caution" | "decline";

export interface AppetiteResult {
  verdict: Verdict;
  // One sentence per rule that fired, in plain language for the broker.
  reasons: string[];
}

export const CURRENT_YEAR = 2026;

export function claimsWithin(client: Client, years: number): number {
  return client.claims.filter((c) => c.year > CURRENT_YEAR - years).length;
}

function ruleBreached(rule: AppetiteRule, client: Client): string | null {
  switch (rule.kind) {
    case "max_fleet":
      return client.fleetSize > rule.limit
        ? `Fleet of ${client.fleetSize} is over the ${rule.limit} vehicle limit`
        : null;
    case "max_turnover":
      return client.turnover > rule.limit
        ? `Turnover ${formatMoney(client.turnover, "GBP")} is above ${formatMoney(rule.limit, "GBP")}`
        : null;
    case "max_headcount":
      return client.headcount > rule.limit
        ? `${client.headcount} staff is above the ${rule.limit} preferred`
        : null;
    case "max_claims": {
      const n = claimsWithin(client, rule.years);
      return n > rule.count
        ? `${n} ${n === 1 ? "claim" : "claims"} in ${rule.years} years, limit ${rule.count}`
        : null;
    }
    case "declines_construction":
      return client.premises.construction === rule.construction
        ? `Premises are ${constructionLabel[rule.construction]}`
        : null;
  }
}

export function appetiteFor(quote: Quote, client: Client): AppetiteResult {
  let verdict: Verdict = "fit";
  const reasons: string[] = [];
  for (const rule of quote.rules) {
    const breach = ruleBreached(rule, client);
    if (!breach) continue;
    reasons.push(breach);
    if (rule.strength === "declines") verdict = "decline";
    else if (verdict === "fit") verdict = "caution";
  }
  return { verdict, reasons };
}

export const verdictLabel: Record<Verdict, string> = {
  fit: "Within appetite",
  caution: "Check with underwriter",
  decline: "Likely decline",
};

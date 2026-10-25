import {
  coverageMatch,
  currentPremium,
  fieldStats,
  formatFieldValue,
  GBP,
  insurerName,
  premiumDelta,
  requestedCovers,
  selectedQuotes,
} from "@/data/selectors";
import { appetiteFor, verdictLabel } from "@/domain/appetite";
import { formatMoney } from "@/lib/utils";
import type { Client } from "@/schemas/client";
import { coverLabel } from "@/schemas/cover";
import type { PolicyDocument } from "@/schemas/document";
import { fieldLabel } from "@/schemas/extraction";
import type { Insurer, Quote } from "@/schemas/insurer";
import type { Submission } from "@/schemas/submission";

export interface ExportInput {
  client: Client;
  documents: PolicyDocument[];
  submission: Submission;
  quotes: Quote[];
  insurers: Insurer[];
}

// Plain Markdown the broker can paste into an email or the client file. Uses the same selectors as
// the screens, so the export never shows a figure the UI did not.
export function exportMarkdown({ client, documents, submission, quotes, insurers }: ExportInput) {
  const stats = fieldStats(submission);
  const requested = requestedCovers(documents, submission);
  const current = currentPremium(documents);
  const chosen = selectedQuotes(quotes, submission);
  const lines: string[] = [];

  lines.push(`# Submission: ${client.name}`, "");
  lines.push(`Prepared for ${client.contact.name}, ${client.contact.role}.`);
  lines.push(`${stats.reviewed} of ${stats.total} extracted fields reviewed by the broker.`, "");

  lines.push("## Risk summary", "");
  for (const field of submission.fields) {
    lines.push(`- ${fieldLabel[field.key]}: ${formatFieldValue(field.value)}`);
  }
  lines.push("");

  lines.push("## Covers requested", "");
  for (const cover of requested) {
    const added = submission.addedCovers.includes(cover) ? " (new, from gap review)" : "";
    lines.push(`- ${coverLabel[cover]}${added}`);
  }
  lines.push("", `Current annual premium: ${formatMoney(current, GBP)}`, "");

  lines.push("## Quote comparison", "");
  lines.push("| Insurer | Premium | vs current | Excess | Covers | Appetite |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  const rows = chosen.length > 0 ? chosen : quotes;
  for (const quote of rows) {
    const match = coverageMatch(quote, requested);
    const delta = premiumDelta(quote, current);
    const sign = delta > 0 ? "+" : "";
    lines.push(
      `| ${insurerName(insurers, quote.insurerId)} | ${formatMoney(quote.premium, GBP)} | ${sign}${formatMoney(delta, GBP)} | ${formatMoney(quote.excess, GBP)} | ${match.included.length} of ${requested.length} | ${verdictLabel[appetiteFor(quote, client).verdict]} |`,
    );
  }
  lines.push("");
  for (const quote of rows) {
    lines.push(`### ${insurerName(insurers, quote.insurerId)}`, "");
    lines.push(`Appetite note: ${quote.appetiteNote}`);
    lines.push(`Exclusions: ${quote.exclusions.join("; ")}`);
    const missing = coverageMatch(quote, requested).missing;
    if (missing.length > 0) {
      lines.push(`Not offered: ${missing.map((c) => coverLabel[c]).join(", ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

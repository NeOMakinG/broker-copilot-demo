import { z } from "zod";
import { ClientId, DocumentId, GapId } from "@/lib/ids";
import { CoverType } from "@/schemas/cover";

// Canned output of the (simulated) extraction model, keyed to the demo clients.
// Values are never stored here: they come from the client facts via selectors, so the draft, the
// header and the export can't disagree. The model output contributes the source and a confidence.

export const FieldKey = z.enum([
  "trade",
  "turnover",
  "headcount",
  "years_trading",
  "premises",
  "fleet",
  "claims",
]);
export type FieldKey = z.infer<typeof FieldKey>;

export const fieldLabel: Record<FieldKey, string> = {
  trade: "Trade",
  turnover: "Annual turnover",
  headcount: "Employees",
  years_trading: "Years trading",
  premises: "Premises",
  fleet: "Vehicles",
  claims: "Claims history",
};

// Where a fact came from: a passage in an attached document, or the pasted risk description.
export const SourceRef = z.object({
  documentId: DocumentId.nullable(),
  excerpt: z.string().min(10).max(260),
});
export type SourceRef = z.infer<typeof SourceRef>;

export const ExtractedField = z.object({
  key: FieldKey,
  source: SourceRef,
  confidence: z.number().min(0).max(1),
});
export type ExtractedField = z.infer<typeof ExtractedField>;

export const Extraction = z.object({
  clientId: ClientId,
  fields: z.array(ExtractedField).min(1),
});
export type Extraction = z.infer<typeof Extraction>;

export const GapSeverity = z.enum(["high", "medium"]);
export type GapSeverity = z.infer<typeof GapSeverity>;

export const GapFlag = z.object({
  id: GapId,
  clientId: ClientId,
  cover: CoverType,
  severity: GapSeverity,
  rationale: z.string().min(20).max(200),
  suggestedLimit: z.number().positive(),
  evidence: SourceRef,
});
export type GapFlag = z.infer<typeof GapFlag>;

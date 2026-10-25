import { z } from "zod";
import { ClientId, DocumentId, GapId, QuoteId } from "@/lib/ids";
import { CoverType } from "@/schemas/cover";
import { FieldKey, SourceRef } from "@/schemas/extraction";

// A field value is typed so edits stay well formed: money and counts are numbers, not strings.
export const FieldValue = z.discriminatedUnion("type", [
  z.object({ type: z.literal("money"), amount: z.number().positive("Must be above zero") }),
  z.object({ type: z.literal("count"), count: z.number().int().nonnegative("Cannot be negative") }),
  z.object({
    type: z.literal("text"),
    text: z.string().trim().min(2, "Needs at least 2 characters").max(200, "Keep it under 200"),
  }),
]);
export type FieldValue = z.infer<typeof FieldValue>;

export const FieldStatus = z.enum(["extracted", "confirmed", "edited"]);
export type FieldStatus = z.infer<typeof FieldStatus>;

export const SubmissionField = z.object({
  key: FieldKey,
  value: FieldValue,
  extracted: FieldValue,
  source: SourceRef,
  confidence: z.number().min(0).max(1),
  status: FieldStatus,
});
export type SubmissionField = z.infer<typeof SubmissionField>;

// The broker's working copy for one client. Mutable in the in-memory store.
export const Submission = z.object({
  clientId: ClientId,
  documentIds: z.array(DocumentId).min(1),
  fields: z.array(SubmissionField).min(1),
  // Covers the broker added from the gap flags, on top of the covers already held.
  addedCovers: z.array(CoverType),
  selectedQuoteIds: z.array(QuoteId).max(3),
  analysedAt: z.iso.datetime(),
});
export type Submission = z.infer<typeof Submission>;

export const MAX_SELECTED_QUOTES = 3;

// tRPC inputs.
export const AnalyseIntakeInput = z.object({
  riskDescription: z.string(),
  documentIds: z.array(DocumentId),
});
export type AnalyseIntakeInput = z.infer<typeof AnalyseIntakeInput>;

export const EditFieldInput = z.object({
  clientId: ClientId,
  key: FieldKey,
  value: FieldValue,
});
export type EditFieldInput = z.infer<typeof EditFieldInput>;

export const ConfirmFieldInput = z.object({ clientId: ClientId, key: FieldKey });
export const AddGapInput = z.object({ clientId: ClientId, gapId: GapId });
export const ToggleQuoteInput = z.object({ clientId: ClientId, quoteId: QuoteId });
export const ClientInput = z.object({ clientId: ClientId });

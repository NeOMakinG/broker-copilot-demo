import { Context, Data, Effect } from "effect";
import { coverTypesHeld } from "@/data/selectors";
import type { ClientId, GapId, QuoteId } from "@/lib/ids";
import { coverLabel } from "@/schemas/cover";
import type { PolicyDocument } from "@/schemas/document";
import { type FieldKey, fieldLabel, type GapFlag } from "@/schemas/extraction";
import type { Quote } from "@/schemas/insurer";
import {
  type FieldValue,
  MAX_SELECTED_QUOTES,
  type Submission,
  type SubmissionField,
} from "@/schemas/submission";

// Rules for the broker's working copy. Each function returns the next submission or a typed failure
// and writes nothing; the tRPC boundary persists the result.

export class SubmissionNotFound extends Data.TaggedError("SubmissionNotFound")<{
  readonly clientId: ClientId;
}> {}

export class FieldNotFound extends Data.TaggedError("FieldNotFound")<{
  readonly key: FieldKey;
}> {}

export class FieldTypeMismatch extends Data.TaggedError("FieldTypeMismatch")<{
  readonly key: FieldKey;
  readonly expected: FieldValue["type"];
}> {}

export class GapNotFound extends Data.TaggedError("GapNotFound")<{
  readonly gapId: GapId;
}> {}

export class CoverAlreadyHeld extends Data.TaggedError("CoverAlreadyHeld")<{
  readonly cover: GapFlag["cover"];
}> {}

export class CoverAlreadyAdded extends Data.TaggedError("CoverAlreadyAdded")<{
  readonly cover: GapFlag["cover"];
}> {}

export class QuoteNotFound extends Data.TaggedError("QuoteNotFound")<{
  readonly quoteId: QuoteId;
}> {}

export class ShortlistFull extends Data.TaggedError("ShortlistFull")<{
  readonly max: number;
}> {}

export type SubmissionRuleError =
  | SubmissionNotFound
  | FieldNotFound
  | FieldTypeMismatch
  | GapNotFound
  | CoverAlreadyHeld
  | CoverAlreadyAdded
  | QuoteNotFound
  | ShortlistFull;

export class SubmissionRepo extends Context.Service<
  SubmissionRepo,
  {
    readonly submission: (clientId: ClientId) => Submission | undefined;
    readonly documents: (clientId: ClientId) => PolicyDocument[];
    readonly gap: (gapId: GapId) => GapFlag | undefined;
    readonly quotes: (clientId: ClientId) => Quote[];
  }
>()("SubmissionRepo") {}

const load = Effect.fn("loadSubmission")(function* (clientId: ClientId) {
  const repo = yield* SubmissionRepo;
  const current = repo.submission(clientId);
  if (!current) return yield* new SubmissionNotFound({ clientId });
  return current;
});

function replaceField(submission: Submission, next: SubmissionField): Submission {
  return { ...submission, fields: submission.fields.map((f) => (f.key === next.key ? next : f)) };
}

/** The broker overrides an extracted value. The type must match the field (money stays money). */
export const editField = Effect.fn("editField")(function* (
  clientId: ClientId,
  key: FieldKey,
  value: FieldValue,
) {
  const submission = yield* load(clientId);
  const field = submission.fields.find((f) => f.key === key);
  if (!field) return yield* new FieldNotFound({ key });
  if (field.value.type !== value.type) {
    return yield* new FieldTypeMismatch({ key, expected: field.value.type });
  }
  const unchanged = JSON.stringify(value) === JSON.stringify(field.extracted);
  return replaceField(submission, {
    ...field,
    value,
    status: unchanged ? "confirmed" : "edited",
  });
});

/** The broker accepts the extracted value as it stands. */
export const confirmField = Effect.fn("confirmField")(function* (
  clientId: ClientId,
  key: FieldKey,
) {
  const submission = yield* load(clientId);
  const field = submission.fields.find((f) => f.key === key);
  if (!field) return yield* new FieldNotFound({ key });
  return replaceField(submission, { ...field, status: "confirmed" });
});

/** Adds the cover behind a gap flag to the covers the submission requests. */
export const addGapCover = Effect.fn("addGapCover")(function* (clientId: ClientId, gapId: GapId) {
  const repo = yield* SubmissionRepo;
  const submission = yield* load(clientId);
  const gap = repo.gap(gapId);
  if (!gap || gap.clientId !== clientId) return yield* new GapNotFound({ gapId });
  if (coverTypesHeld(repo.documents(clientId)).includes(gap.cover)) {
    return yield* new CoverAlreadyHeld({ cover: gap.cover });
  }
  if (submission.addedCovers.includes(gap.cover)) {
    return yield* new CoverAlreadyAdded({ cover: gap.cover });
  }
  return {
    ...submission,
    addedCovers: [...submission.addedCovers, gap.cover],
  } satisfies Submission;
});

/** Adds a quote to the side-by-side shortlist, or removes it if already there. */
export const toggleQuote = Effect.fn("toggleQuote")(function* (
  clientId: ClientId,
  quoteId: QuoteId,
) {
  const repo = yield* SubmissionRepo;
  const submission = yield* load(clientId);
  if (!repo.quotes(clientId).some((q) => q.id === quoteId)) {
    return yield* new QuoteNotFound({ quoteId });
  }
  if (submission.selectedQuoteIds.includes(quoteId)) {
    return {
      ...submission,
      selectedQuoteIds: submission.selectedQuoteIds.filter((id) => id !== quoteId),
    } satisfies Submission;
  }
  if (submission.selectedQuoteIds.length >= MAX_SELECTED_QUOTES) {
    return yield* new ShortlistFull({ max: MAX_SELECTED_QUOTES });
  }
  return {
    ...submission,
    selectedQuoteIds: [...submission.selectedQuoteIds, quoteId],
  } satisfies Submission;
});

export function submissionRuleMessage(error: SubmissionRuleError): string {
  switch (error._tag) {
    case "SubmissionNotFound":
      return "There is no submission for this client yet. Start from the intake.";
    case "FieldNotFound":
      return `${fieldLabel[error.key]} is not part of this submission.`;
    case "FieldTypeMismatch":
      return `${fieldLabel[error.key]} must stay a ${error.expected} value.`;
    case "GapNotFound":
      return "That gap flag does not belong to this submission.";
    case "CoverAlreadyHeld":
      return `${coverLabel[error.cover]} is already on a schedule.`;
    case "CoverAlreadyAdded":
      return `${coverLabel[error.cover]} is already in the submission.`;
    case "QuoteNotFound":
      return "That quote is not on this client's panel.";
    case "ShortlistFull":
      return `Compare up to ${error.max} quotes at a time. Remove one first.`;
  }
}

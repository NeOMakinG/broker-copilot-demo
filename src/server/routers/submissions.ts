import { TRPCError } from "@trpc/server";
import { Effect, Result } from "effect";
import { exportMarkdown } from "@/data/export";
import { referenceStore, submissionStore } from "@/data/store";
import {
  addGapCover,
  confirmField,
  editField,
  SubmissionRepo,
  type SubmissionRuleError,
  submissionRuleMessage,
  toggleQuote,
} from "@/domain/submission-rules";
import type { ClientId } from "@/lib/ids";
import type { Submission } from "@/schemas/submission";
import {
  AddGapInput,
  ClientInput,
  ConfirmFieldInput,
  EditFieldInput,
  ToggleQuoteInput,
} from "@/schemas/submission";
import { publicProcedure, router } from "@/server/trpc";

const repoLayer = Effect.provideService(SubmissionRepo, {
  submission: (id) => submissionStore.ensure(id),
  documents: (id) => referenceStore.documentsForClient(id),
  gap: (id) => referenceStore.gapById(id),
  quotes: (id) => referenceStore.quotesForClient(id),
});

function toTRPCError(error: SubmissionRuleError): TRPCError {
  const message = submissionRuleMessage(error);
  switch (error._tag) {
    case "SubmissionNotFound":
    case "FieldNotFound":
    case "GapNotFound":
    case "QuoteNotFound":
      return new TRPCError({ code: "NOT_FOUND", message });
    case "FieldTypeMismatch":
      return new TRPCError({ code: "BAD_REQUEST", message });
    case "CoverAlreadyHeld":
    case "CoverAlreadyAdded":
      return new TRPCError({ code: "CONFLICT", message });
    case "ShortlistFull":
      return new TRPCError({ code: "PRECONDITION_FAILED", message });
  }
}

// Runs a rule and persists the resulting submission.
async function commit(
  effect: Effect.Effect<Submission, SubmissionRuleError, SubmissionRepo>,
): Promise<Submission> {
  const result = await Effect.runPromise(effect.pipe(repoLayer, Effect.result));
  if (Result.isFailure(result)) throw toTRPCError(result.failure);
  return submissionStore.write(result.success);
}

// Everything the submission screens need, in one shape, so each route reads the same data.
function bundle(clientId: ClientId) {
  const client = referenceStore.clientById(clientId);
  const submission = submissionStore.ensure(clientId);
  if (!client || !submission) {
    throw new TRPCError({ code: "NOT_FOUND", message: `No client with id ${clientId}.` });
  }
  const documents = referenceStore
    .documentsForClient(clientId)
    .filter((d) => submission.documentIds.includes(d.id));
  return {
    client,
    submission,
    documents,
    gaps: referenceStore.gapsForClient(clientId),
    quotes: referenceStore.quotesForClient(clientId),
    insurers: referenceStore.insurers(),
  };
}
export type SubmissionBundle = ReturnType<typeof bundle>;

export const submissionsRouter = router({
  get: publicProcedure.input(ClientInput).query(({ input }) => bundle(input.clientId)),

  editField: publicProcedure
    .input(EditFieldInput)
    .mutation(({ input }) => commit(editField(input.clientId, input.key, input.value))),

  confirmField: publicProcedure
    .input(ConfirmFieldInput)
    .mutation(({ input }) => commit(confirmField(input.clientId, input.key))),

  addGap: publicProcedure
    .input(AddGapInput)
    .mutation(({ input }) => commit(addGapCover(input.clientId, input.gapId))),

  toggleQuote: publicProcedure
    .input(ToggleQuoteInput)
    .mutation(({ input }) => commit(toggleQuote(input.clientId, input.quoteId))),

  export: publicProcedure.input(ClientInput).query(({ input }) => {
    const b = bundle(input.clientId);
    return {
      fileName: `${b.client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-submission.md`,
      markdown: exportMarkdown(b),
    };
  }),
});

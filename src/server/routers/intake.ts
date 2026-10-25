import { TRPCError } from "@trpc/server";
import { Effect, Result } from "effect";
import { pipelineSteps } from "@/data/selectors";
import { referenceStore, submissionStore } from "@/data/store";
import {
  type IntakeError,
  IntakeRepo,
  intakeErrorMessage,
  recogniseIntake,
} from "@/domain/intake-rules";
import { AnalyseIntakeInput } from "@/schemas/submission";
import { publicProcedure, router } from "@/server/trpc";

const repoLayer = Effect.provideService(IntakeRepo, {
  clients: () => referenceStore.clients(),
  documentById: (id) => referenceStore.documentById(id),
});

function toTRPCError(error: IntakeError): TRPCError {
  const message = intakeErrorMessage(error);
  switch (error._tag) {
    case "EmptyRiskDescription":
    case "NoDocumentsAttached":
    case "DocumentForAnotherClient":
      return new TRPCError({ code: "PRECONDITION_FAILED", message });
    case "ClientNotRecognised":
    case "UnknownDocument":
      return new TRPCError({ code: "NOT_FOUND", message });
  }
}

export const intakeRouter = router({
  // The three sample intakes the broker can load: the text they would paste and the files they'd drop.
  samples: publicProcedure.query(() =>
    referenceStore.clients().map((client) => ({
      clientId: client.id,
      name: client.name,
      trade: client.trade,
      city: client.city,
      riskDescription: client.riskDescription,
      documents: referenceStore.documentsForClient(client.id),
    })),
  ),

  documents: publicProcedure.query(() => referenceStore.documents()),

  // Recognise the client (Effect rules), draft the submission, return the steps the UI will play.
  analyse: publicProcedure.input(AnalyseIntakeInput).mutation(async ({ input }) => {
    const result = await Effect.runPromise(
      recogniseIntake(input.riskDescription, input.documentIds).pipe(repoLayer, Effect.result),
    );
    if (Result.isFailure(result)) throw toTRPCError(result.failure);
    const { clientId, documents } = result.success;
    const client = referenceStore.clientById(clientId);
    const submission = submissionStore.reset(
      clientId,
      documents.map((d) => d.id),
    );
    if (!client || !submission) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No canned draft for client.",
      });
    }
    return {
      clientId,
      steps: pipelineSteps({
        client,
        documents,
        submission,
        gaps: referenceStore.gapsForClient(clientId),
        quotes: referenceStore.quotesForClient(clientId),
      }),
    };
  }),
});

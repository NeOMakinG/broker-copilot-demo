import { Context, Data, Effect } from "effect";
import type { ClientId, DocumentId } from "@/lib/ids";
import type { Client } from "@/schemas/client";
import type { PolicyDocument } from "@/schemas/document";

// The intake step of the pipeline. In production this is where the model call would sit; here the
// "model" recognises one of the demo clients and the rules around it are real and typed.

export class EmptyRiskDescription extends Data.TaggedError("EmptyRiskDescription")<{
  readonly minWords: number;
}> {}

export class ClientNotRecognised extends Data.TaggedError("ClientNotRecognised")<{
  readonly knownClients: readonly string[];
}> {}

export class NoDocumentsAttached extends Data.TaggedError("NoDocumentsAttached")<{
  readonly clientName: string;
}> {}

export class DocumentForAnotherClient extends Data.TaggedError("DocumentForAnotherClient")<{
  readonly fileName: string;
  readonly clientName: string;
}> {}

export class UnknownDocument extends Data.TaggedError("UnknownDocument")<{
  readonly documentId: DocumentId;
}> {}

export type IntakeError =
  | EmptyRiskDescription
  | ClientNotRecognised
  | NoDocumentsAttached
  | DocumentForAnotherClient
  | UnknownDocument;

export class IntakeRepo extends Context.Service<
  IntakeRepo,
  {
    readonly clients: () => readonly Client[];
    readonly documentById: (id: DocumentId) => PolicyDocument | undefined;
  }
>()("IntakeRepo") {}

export const MIN_WORDS = 12;

export interface RecognisedIntake {
  clientId: ClientId;
  documents: PolicyDocument[];
}

// Matches the pasted text to a known client by company name, then checks the attached documents
// belong to that client. A schedule for the wrong client is the most common real-world slip.
export const recogniseIntake = Effect.fn("recogniseIntake")(function* (
  riskDescription: string,
  documentIds: readonly DocumentId[],
) {
  const repo = yield* IntakeRepo;
  const words = riskDescription.trim().split(/\s+/).filter(Boolean);
  if (words.length < MIN_WORDS) return yield* new EmptyRiskDescription({ minWords: MIN_WORDS });

  const haystack = riskDescription.toLowerCase();
  const client = repo.clients().find((c) => haystack.includes(c.name.toLowerCase()));
  if (!client) {
    return yield* new ClientNotRecognised({ knownClients: repo.clients().map((c) => c.name) });
  }

  if (documentIds.length === 0) return yield* new NoDocumentsAttached({ clientName: client.name });

  const documents: PolicyDocument[] = [];
  for (const id of documentIds) {
    const doc = repo.documentById(id);
    if (!doc) return yield* new UnknownDocument({ documentId: id });
    if (doc.clientId !== client.id) {
      return yield* new DocumentForAnotherClient({
        fileName: doc.fileName,
        clientName: client.name,
      });
    }
    documents.push(doc);
  }

  return { clientId: client.id, documents } satisfies RecognisedIntake;
});

export function intakeErrorMessage(error: IntakeError): string {
  switch (error._tag) {
    case "EmptyRiskDescription":
      return `Describe the risk in at least ${error.minWords} words before analysing.`;
    case "ClientNotRecognised":
      return `This demo recognises three sample clients: ${error.knownClients.join(", ")}. Load a sample or name one of them in the text.`;
    case "NoDocumentsAttached":
      return `Attach at least one schedule or statement of fact for ${error.clientName}. Gaps are measured against the covers already held.`;
    case "DocumentForAnotherClient":
      return `${error.fileName} belongs to a different client than ${error.clientName}. Remove it before analysing.`;
    case "UnknownDocument":
      return `Document ${error.documentId} is not in the file.`;
  }
}

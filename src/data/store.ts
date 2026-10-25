import { clients } from "@/data/clients";
import { documents } from "@/data/documents";
import { extractions, gapFlags } from "@/data/extractions";
import { insurers } from "@/data/insurers";
import { quotes } from "@/data/quotes";
import {
  clientById,
  documentById,
  documentsForClient,
  draftFields,
  extractionForClient,
  gapsForClient,
  quotesForClient,
} from "@/data/selectors";
import type { ClientId, DocumentId, GapId } from "@/lib/ids";
import type { Submission } from "@/schemas/submission";

// In-memory "database" for the static prototype. Reference data is read only; submissions are the
// broker's working copies and change as they review, add covers and shortlist quotes.

export const referenceStore = {
  clients: () => clients,
  clientById: (id: ClientId) => clientById(clients, id),
  insurers: () => insurers,
  documents: () => documents,
  documentById: (id: DocumentId) => documentById(documents, id),
  documentsForClient: (id: ClientId) => documentsForClient(documents, id),
  quotesForClient: (id: ClientId) => quotesForClient(quotes, id),
  gapsForClient: (id: ClientId) => gapsForClient(gapFlags, id),
  gapById: (id: GapId) => gapFlags.find((g) => g.id === id),
  extractionForClient: (id: ClientId) => extractionForClient(extractions, id),
};

const submissions = new Map<ClientId, Submission>();

// Builds a fresh draft from the canned extraction, as the pipeline would at the end of an analysis.
function freshSubmission(clientId: ClientId, documentIds: DocumentId[]): Submission | undefined {
  const client = referenceStore.clientById(clientId);
  const extraction = referenceStore.extractionForClient(clientId);
  if (!client || !extraction) return undefined;
  return {
    clientId,
    documentIds,
    fields: draftFields(client, extraction),
    addedCovers: [],
    selectedQuoteIds: [],
    analysedAt: new Date().toISOString(),
  };
}

export const submissionStore = {
  // Deep links open a submission that was never analysed in this session: draft it on first read.
  ensure(clientId: ClientId): Submission | undefined {
    const existing = submissions.get(clientId);
    if (existing) return existing;
    const ids = referenceStore.documentsForClient(clientId).map((d) => d.id);
    const fresh = freshSubmission(clientId, ids);
    if (fresh) submissions.set(clientId, fresh);
    return fresh;
  },
  reset(clientId: ClientId, documentIds: DocumentId[]): Submission | undefined {
    const fresh = freshSubmission(clientId, documentIds);
    if (fresh) submissions.set(clientId, fresh);
    return fresh;
  },
  write(next: Submission): Submission {
    submissions.set(next.clientId, next);
    return next;
  },
};

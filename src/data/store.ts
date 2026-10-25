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
import { Submission } from "@/schemas/submission";

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

// The working copies survive a reload within the tab, so the header, the Draft tab and the Gaps
// tab keep showing the broker's edits. Anything that fails to parse is dropped.
const STORAGE_KEY = "broker-copilot:submissions";

function storage(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function loadSubmissions(): Map<ClientId, Submission> {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return new Map();
  try {
    const parsed = Submission.array().safeParse(JSON.parse(raw));
    return new Map(parsed.success ? parsed.data.map((s) => [s.clientId, s]) : []);
  } catch {
    return new Map();
  }
}

function persist(next: Map<ClientId, Submission>) {
  storage()?.setItem(STORAGE_KEY, JSON.stringify([...next.values()]));
}

const submissions = loadSubmissions();

function set(submission: Submission) {
  submissions.set(submission.clientId, submission);
  persist(submissions);
}

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
    if (fresh) set(fresh);
    return fresh;
  },
  reset(clientId: ClientId, documentIds: DocumentId[]): Submission | undefined {
    const fresh = freshSubmission(clientId, documentIds);
    if (fresh) set(fresh);
    return fresh;
  },
  write(next: Submission): Submission {
    set(next);
    return next;
  },
};

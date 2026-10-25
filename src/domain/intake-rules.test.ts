import { Effect, Result } from "effect";
import { describe, expect, it } from "vitest";
import { clients } from "@/data/clients";
import { documents } from "@/data/documents";
import { DocumentId } from "@/lib/ids";
import { IntakeRepo, recogniseIntake } from "./intake-rules";

const brightwell = clients[0];
if (!brightwell) throw new Error("fixture missing");
const brightwellDocs = documents.filter((d) => d.clientId === brightwell.id).map((d) => d.id);
const harbourlineDoc = DocumentId.parse("doc_003");

const withFakeRepo = Effect.provideService(IntakeRepo, {
  clients: () => clients,
  documentById: (id) => documents.find((d) => d.id === id),
});

function run<A, E>(effect: Effect.Effect<A, E, IntakeRepo>) {
  return Effect.runPromise(effect.pipe(withFakeRepo, Effect.result));
}

describe("recogniseIntake", () => {
  it("recognises a sample client from its name and keeps its documents", async () => {
    const result = await run(recogniseIntake(brightwell.riskDescription, brightwellDocs));
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.success.clientId).toBe(brightwell.id);
      expect(result.success.documents.map((d) => d.id)).toEqual(brightwellDocs);
    }
  });

  it("matches the name case-insensitively inside free text", async () => {
    const text =
      "Renewal for BRIGHTWELL JOINERY LTD, a Leeds workshop with fourteen staff and three vans, " +
      "please review covers held and gaps.";
    const result = await run(recogniseIntake(text, brightwellDocs));
    expect(Result.isSuccess(result) && result.success.clientId).toBe(brightwell.id);
  });

  it("refuses a description that is too short to work with", async () => {
    const result = await run(recogniseIntake("Joinery firm in Leeds", brightwellDocs));
    expect(Result.isFailure(result) && result.failure._tag).toBe("EmptyRiskDescription");
  });

  it("fails when no sample client is named", async () => {
    const text =
      "A plumbing and heating contractor in Sheffield with eight engineers, turnover around " +
      "£900k, two vans and no claims in the last five years.";
    const result = await run(recogniseIntake(text, brightwellDocs));
    expect(Result.isFailure(result) && result.failure._tag).toBe("ClientNotRecognised");
  });

  it("needs at least one document to measure gaps against", async () => {
    const result = await run(recogniseIntake(brightwell.riskDescription, []));
    expect(Result.isFailure(result) && result.failure._tag).toBe("NoDocumentsAttached");
  });

  it("rejects a schedule that belongs to another client", async () => {
    const result = await run(
      recogniseIntake(brightwell.riskDescription, [...brightwellDocs, harbourlineDoc]),
    );
    expect(Result.isFailure(result) && result.failure._tag).toBe("DocumentForAnotherClient");
  });

  it("rejects an id that is not in the file", async () => {
    const result = await run(
      recogniseIntake(brightwell.riskDescription, [DocumentId.parse("doc_999")]),
    );
    expect(Result.isFailure(result) && result.failure._tag).toBe("UnknownDocument");
  });
});

import { z } from "zod";
import { ClientId, DocumentId, InsurerId } from "@/lib/ids";
import { CoverLine } from "@/schemas/cover";

export const DocumentKind = z.enum(["schedule", "statement_of_fact"]);
export type DocumentKind = z.infer<typeof DocumentKind>;

export const documentKindLabel: Record<DocumentKind, string> = {
  schedule: "Policy schedule",
  statement_of_fact: "Statement of fact",
};

// A document the broker attaches at intake. Schedules carry covers and a premium; statements of fact
// carry the declared facts and no covers.
export const PolicyDocument = z
  .object({
    id: DocumentId,
    clientId: ClientId,
    kind: DocumentKind,
    fileName: z.string().regex(/\.pdf$/),
    insurerId: InsurerId,
    policyRef: z.string().min(4).max(30),
    issuedOn: z.iso.date(),
    renewalDate: z.iso.date().nullable(),
    annualPremium: z.number().positive().nullable(),
    covers: z.array(CoverLine),
    pages: z.number().int().positive(),
  })
  .refine((d) => (d.kind === "schedule" ? d.covers.length > 0 && d.annualPremium !== null : true), {
    message: "A schedule needs covers and a premium",
  })
  .refine((d) => (d.kind === "statement_of_fact" ? d.covers.length === 0 : true), {
    message: "A statement of fact carries no covers",
  });
export type PolicyDocument = z.infer<typeof PolicyDocument>;

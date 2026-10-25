import { z } from "zod";

// Branded ids: a QuoteId can never be passed where a ClientId is expected.
export const ClientId = z
  .string()
  .regex(/^cli_\d{3}$/)
  .brand<"ClientId">();
export type ClientId = z.infer<typeof ClientId>;

export const DocumentId = z
  .string()
  .regex(/^doc_\d{3}$/)
  .brand<"DocumentId">();
export type DocumentId = z.infer<typeof DocumentId>;

export const InsurerId = z
  .string()
  .regex(/^ins_\d{3}$/)
  .brand<"InsurerId">();
export type InsurerId = z.infer<typeof InsurerId>;

export const QuoteId = z
  .string()
  .regex(/^qte_\d{3}$/)
  .brand<"QuoteId">();
export type QuoteId = z.infer<typeof QuoteId>;

export const GapId = z
  .string()
  .regex(/^gap_\d{3}$/)
  .brand<"GapId">();
export type GapId = z.infer<typeof GapId>;

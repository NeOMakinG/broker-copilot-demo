import { z } from "zod";
import { ClientId, InsurerId, QuoteId } from "@/lib/ids";
import { Construction } from "@/schemas/client";
import { CoverLine } from "@/schemas/cover";

export const Insurer = z.object({
  id: InsurerId,
  name: z.string().min(2).max(60),
});
export type Insurer = z.infer<typeof Insurer>;

// Appetite rules are structured so the copilot can test them against the submission facts.
// "declines" makes a quote unlikely to bind; "prefers" only lowers confidence.
const Strength = z.enum(["declines", "prefers"]);

export const AppetiteRule = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("max_fleet"),
    strength: Strength,
    limit: z.number().int().positive(),
  }),
  z.object({ kind: z.literal("max_turnover"), strength: Strength, limit: z.number().positive() }),
  z.object({
    kind: z.literal("max_headcount"),
    strength: Strength,
    limit: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("max_claims"),
    strength: Strength,
    count: z.number().int().nonnegative(),
    years: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("declines_construction"),
    strength: z.literal("declines"),
    construction: Construction,
  }),
]);
export type AppetiteRule = z.infer<typeof AppetiteRule>;

export const Quote = z.object({
  id: QuoteId,
  clientId: ClientId,
  insurerId: InsurerId,
  premium: z.number().positive(),
  // Standard excess applying to property and liability sections.
  excess: z.number().nonnegative(),
  covers: z.array(CoverLine).min(1),
  exclusions: z.array(z.string().min(3).max(120)).min(1),
  appetiteNote: z.string().min(3).max(160),
  rules: z.array(AppetiteRule),
  validUntil: z.iso.date(),
  holdingInsurer: z.boolean(),
});
export type Quote = z.infer<typeof Quote>;

import { z } from "zod";
import { ClientId } from "@/lib/ids";
import { CoverType } from "@/schemas/cover";

export const Construction = z.enum(["brick_and_block", "steel_frame", "timber_frame"]);
export type Construction = z.infer<typeof Construction>;

export const constructionLabel: Record<Construction, string> = {
  brick_and_block: "brick and block",
  steel_frame: "steel portal frame",
  timber_frame: "timber frame",
};

export const Sector = z.enum(["construction", "logistics", "healthcare"]);
export type Sector = z.infer<typeof Sector>;

export const ClaimRecord = z.object({
  year: z.number().int().min(2015).max(2026),
  cover: CoverType,
  description: z.string().min(3).max(120),
  amount: z.number().positive(),
  atFault: z.boolean(),
});
export type ClaimRecord = z.infer<typeof ClaimRecord>;

export const Contact = z.object({
  name: z.string().min(2).max(60),
  role: z.string().min(2).max(60),
});
export type Contact = z.infer<typeof Contact>;

// A prospect or existing client. Raw facts only; every derived figure lives in selectors.ts.
export const Client = z.object({
  id: ClientId,
  name: z.string().min(2).max(80),
  trade: z.string().min(2).max(80),
  sector: Sector,
  city: z.string().min(2).max(40),
  headcount: z.number().int().positive(),
  turnover: z.number().positive(),
  yearsTrading: z.number().int().positive(),
  fleetSize: z.number().int().nonnegative(),
  premises: z.object({
    description: z.string().min(10).max(200),
    construction: Construction,
    tenure: z.enum(["owned", "leased"]),
  }),
  contact: Contact,
  claims: z.array(ClaimRecord),
  // The free text a broker would paste into the intake box.
  riskDescription: z.string().min(50),
});
export type Client = z.infer<typeof Client>;

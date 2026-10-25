import { z } from "zod";

// Lines of commercial cover a UK SME policy schedule can carry.
export const CoverType = z.enum([
  "employers_liability",
  "public_liability",
  "products_liability",
  "property_contents",
  "business_interruption",
  "cyber",
  "professional_indemnity",
  "goods_in_transit",
  "motor_fleet",
  "tools_and_plant",
  "directors_officers",
  "medical_malpractice",
  "legal_expenses",
]);
export type CoverType = z.infer<typeof CoverType>;

export const coverLabel: Record<CoverType, string> = {
  employers_liability: "Employers' liability",
  public_liability: "Public liability",
  products_liability: "Products liability",
  property_contents: "Contents and stock",
  business_interruption: "Business interruption",
  cyber: "Cyber and data",
  professional_indemnity: "Professional indemnity",
  goods_in_transit: "Goods in transit",
  motor_fleet: "Motor fleet",
  tools_and_plant: "Tools and plant",
  directors_officers: "Directors and officers",
  medical_malpractice: "Medical malpractice",
  legal_expenses: "Legal expenses",
};

// One line on a schedule or a quote: what is covered, up to how much, with what excess.
export const CoverLine = z.object({
  cover: CoverType,
  limit: z.number().positive(),
  excess: z.number().nonnegative(),
  // Free text qualifier such as "12 months indemnity" or "any one claim".
  basis: z.string().min(1).max(80),
});
export type CoverLine = z.infer<typeof CoverLine>;

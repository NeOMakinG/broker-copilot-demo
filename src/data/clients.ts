import { z } from "zod";
import { Client } from "@/schemas/client";

// Fictional UK businesses. Figures in GBP. Raw facts only; derived values come from selectors.ts.
export const clients = z.array(Client).parse([
  {
    id: "cli_001",
    name: "Brightwell Joinery Ltd",
    trade: "Bespoke joinery and shopfitting",
    sector: "construction",
    city: "Leeds",
    headcount: 14,
    turnover: 2_100_000,
    yearsTrading: 11,
    fleetSize: 3,
    premises: {
      description:
        "Leased 850 sq m workshop and showroom, Holbeck, Leeds, timber frame, sprinklered",
      construction: "timber_frame",
      tenure: "leased",
    },
    contact: { name: "Dana Whitlock", role: "Managing director" },
    claims: [
      {
        year: 2024,
        cover: "tools_and_plant",
        description: "Tools stolen from a van overnight",
        amount: 3_200,
        atFault: false,
      },
    ],
    riskDescription:
      "Brightwell Joinery Ltd, Leeds. Bespoke joinery and shopfitting for retail and hospitality clients, trading 11 years, turnover about £2.1m. 14 staff including 9 bench joiners and 3 site fitters. Workshop and showroom on a leased 850 sq m timber framed unit in Holbeck with spray booth and dust extraction, sprinklers throughout. Design and fit work for a few national retail chains, orders and CAD drawings handled by email. Three vans deliver finished pieces to site. One claim in 2024, tools stolen from a van, £3,200. Renewal due 1 March 2027, current insurer Meridian Commercial.",
  },
  {
    id: "cli_002",
    name: "Harbourline Logistics Ltd",
    trade: "Same-day and next-day courier",
    sector: "logistics",
    city: "Birmingham",
    headcount: 28,
    turnover: 3_800_000,
    yearsTrading: 7,
    fleetSize: 26,
    premises: {
      description:
        "Leased depot and office, Nechells, Birmingham, steel portal frame with secure yard",
      construction: "steel_frame",
      tenure: "leased",
    },
    contact: { name: "Imran Chowdhury", role: "Operations director" },
    claims: [
      {
        year: 2025,
        cover: "motor_fleet",
        description: "Rear-end collision, fault",
        amount: 8_900,
        atFault: true,
      },
      {
        year: 2025,
        cover: "motor_fleet",
        description: "Reversing damage at a customer site, fault",
        amount: 2_100,
        atFault: true,
      },
      {
        year: 2024,
        cover: "motor_fleet",
        description: "Windscreen and wing mirror, non fault",
        amount: 3_600,
        atFault: false,
      },
    ],
    riskDescription:
      "Harbourline Logistics Ltd in Birmingham, same-day and next-day courier for pharma distributors and online retailers across the West Midlands. 7 years trading, turnover around £3.8m. 22 employed drivers plus 6 office and depot staff. Fleet of 26 vans up to 3.5t running out of a leased steel framed depot in Nechells with a fenced yard and CCTV. Routing and proof of delivery run on a cloud platform. Three motor claims in the last two years totalling £14,600, two of them at fault. Fleet renews 15 December 2026 with Aldgate Underwriting, liability package with Calder Insurance renews 10 January 2027.",
  },
  {
    id: "cli_003",
    name: "Fernhill Dental Practice Ltd",
    trade: "Private and NHS dental practice",
    sector: "healthcare",
    city: "Bristol",
    headcount: 19,
    turnover: 1_400_000,
    yearsTrading: 15,
    fleetSize: 0,
    premises: {
      description:
        "Owned two-storey converted house, Redland, Bristol, brick and block, six surgeries",
      construction: "brick_and_block",
      tenure: "owned",
    },
    contact: { name: "Leila Marsh", role: "Principal dentist" },
    claims: [
      {
        year: 2023,
        cover: "property_contents",
        description: "Escape of water into surgery 3",
        amount: 8_400,
        atFault: false,
      },
    ],
    riskDescription:
      "Fernhill Dental Practice Ltd, Redland, Bristol. Mixed private and NHS practice with six surgeries in an owned, converted two-storey brick house. 15 years trading, turnover about £1.4m. 19 staff: 6 dentists, 2 hygienists, 7 nurses and 4 reception and admin. Patient records and imaging held on cloud practice management software. Two directors. One claim in 2023, escape of water into surgery 3, £8,400. Clinicians hold their own indemnity but the company has nothing at entity level. Renewal 30 November 2026 with Calder Insurance.",
  },
]);

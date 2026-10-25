import { z } from "zod";
import { Extraction, GapFlag } from "@/schemas/extraction";

// Canned model output for the three demo clients. The excerpts are what the model "quoted" from the
// risk description (documentId null) or an attached document. Values come from the client facts.
export const extractions = z.array(Extraction).parse([
  {
    clientId: "cli_001",
    fields: [
      {
        key: "trade",
        confidence: 0.96,
        source: {
          documentId: null,
          excerpt: "Bespoke joinery and shopfitting for retail and hospitality clients",
        },
      },
      {
        key: "turnover",
        confidence: 0.9,
        source: {
          documentId: "doc_002",
          excerpt: "Estimated turnover for the coming period: £2,100,000 (excluding VAT)",
        },
      },
      {
        key: "headcount",
        confidence: 0.93,
        source: {
          documentId: null,
          excerpt: "14 staff including 9 bench joiners and 3 site fitters",
        },
      },
      {
        key: "years_trading",
        confidence: 0.88,
        source: { documentId: null, excerpt: "trading 11 years, turnover about £2.1m" },
      },
      {
        key: "premises",
        confidence: 0.84,
        source: {
          documentId: "doc_002",
          excerpt:
            "Premises: Unit 4, Holbeck, Leeds. Construction: timber frame with metal cladding, 850 sq m, leased. Sprinklers: yes, whole building",
        },
      },
      {
        key: "fleet",
        confidence: 0.79,
        source: { documentId: null, excerpt: "Three vans deliver finished pieces to site" },
      },
      {
        key: "claims",
        confidence: 0.91,
        source: {
          documentId: "doc_002",
          excerpt: "Claims in the last 5 years: 1. Theft of tools from vehicle, March 2024, £3,200",
        },
      },
    ],
  },
  {
    clientId: "cli_002",
    fields: [
      {
        key: "trade",
        confidence: 0.95,
        source: {
          documentId: null,
          excerpt: "same-day and next-day courier for pharma distributors and online retailers",
        },
      },
      {
        key: "turnover",
        confidence: 0.86,
        source: { documentId: null, excerpt: "7 years trading, turnover around £3.8m" },
      },
      {
        key: "headcount",
        confidence: 0.9,
        source: {
          documentId: null,
          excerpt: "22 employed drivers plus 6 office and depot staff",
        },
      },
      {
        key: "years_trading",
        confidence: 0.88,
        source: { documentId: "doc_005", excerpt: "Date business established: 2019" },
      },
      {
        key: "premises",
        confidence: 0.82,
        source: {
          documentId: "doc_005",
          excerpt:
            "Operating base: leased depot, Nechells, Birmingham. Steel portal frame, fenced yard, CCTV",
        },
      },
      {
        key: "fleet",
        confidence: 0.97,
        source: {
          documentId: "doc_003",
          excerpt: "Vehicles insured: 26 goods carrying vehicles not exceeding 3,500 kg",
        },
      },
      {
        key: "claims",
        confidence: 0.85,
        source: {
          documentId: "doc_005",
          excerpt: "Motor claims, 36 months: 3 incidents, 2 fault, total paid and reserved £14,600",
        },
      },
    ],
  },
  {
    clientId: "cli_003",
    fields: [
      {
        key: "trade",
        confidence: 0.97,
        source: {
          documentId: null,
          excerpt: "Mixed private and NHS practice with six surgeries",
        },
      },
      {
        key: "turnover",
        confidence: 0.89,
        source: {
          documentId: "doc_007",
          excerpt: "Annual fee income: £1,400,000, of which NHS contract 42%",
        },
      },
      {
        key: "headcount",
        confidence: 0.94,
        source: {
          documentId: null,
          excerpt: "19 staff: 6 dentists, 2 hygienists, 7 nurses and 4 reception and admin",
        },
      },
      {
        key: "years_trading",
        confidence: 0.9,
        source: { documentId: null, excerpt: "15 years trading, turnover about £1.4m" },
      },
      {
        key: "premises",
        confidence: 0.87,
        source: {
          documentId: "doc_007",
          excerpt:
            "Premises owned by the proposer. Two-storey converted dwelling, brick and block, slate roof, six treatment rooms",
        },
      },
      {
        key: "claims",
        confidence: 0.92,
        source: {
          documentId: "doc_007",
          excerpt: "Claims, 5 years: escape of water, surgery 3, July 2023, settled £8,400",
        },
      },
    ],
  },
]);

export const gapFlags = z.array(GapFlag).parse([
  // Brightwell Joinery
  {
    id: "gap_001",
    clientId: "cli_001",
    cover: "cyber",
    severity: "high",
    rationale:
      "Orders and CAD drawings arrive by email and nothing on the Meridian schedule responds to a breach or ransomware.",
    suggestedLimit: 250_000,
    evidence: {
      documentId: null,
      excerpt: "orders and CAD drawings handled by email",
    },
  },
  {
    id: "gap_002",
    clientId: "cli_001",
    cover: "business_interruption",
    severity: "high",
    rationale:
      "One workshop with a spray booth. A fire stops all production and the schedule carries no interruption cover.",
    suggestedLimit: 500_000,
    evidence: {
      documentId: null,
      excerpt: "timber framed unit in Holbeck with spray booth and dust extraction",
    },
  },
  {
    id: "gap_003",
    clientId: "cli_001",
    cover: "professional_indemnity",
    severity: "medium",
    rationale:
      "Design and fit contracts for national retailers create design liability that public liability excludes.",
    suggestedLimit: 250_000,
    evidence: {
      documentId: null,
      excerpt: "Design and fit work for a few national retail chains",
    },
  },
  {
    id: "gap_004",
    clientId: "cli_001",
    cover: "goods_in_transit",
    severity: "medium",
    rationale:
      "Finished pieces travel to site in the firm's own vans, and the 2024 loss already happened from a vehicle.",
    suggestedLimit: 15_000,
    evidence: {
      documentId: "doc_002",
      excerpt: "Theft of tools from vehicle, March 2024, £3,200",
    },
  },
  // Harbourline Logistics
  {
    id: "gap_005",
    clientId: "cli_002",
    cover: "cyber",
    severity: "high",
    rationale:
      "Routing and proof of delivery run on a cloud platform. An outage or breach stops every van and touches pharma consignment data.",
    suggestedLimit: 250_000,
    evidence: {
      documentId: null,
      excerpt: "Routing and proof of delivery run on a cloud platform",
    },
  },
  {
    id: "gap_006",
    clientId: "cli_002",
    cover: "business_interruption",
    severity: "medium",
    rationale:
      "A single depot runs 26 vans. Neither schedule carries interruption cover for a loss of the yard or office.",
    suggestedLimit: 400_000,
    evidence: {
      documentId: "doc_005",
      excerpt: "Operating base: leased depot, Nechells, Birmingham",
    },
  },
  {
    id: "gap_007",
    clientId: "cli_002",
    cover: "legal_expenses",
    severity: "medium",
    rationale:
      "22 employed drivers and no legal expenses cover leaves employment disputes and licence defence uninsured.",
    suggestedLimit: 100_000,
    evidence: {
      documentId: null,
      excerpt: "22 employed drivers plus 6 office and depot staff",
    },
  },
  // Fernhill Dental
  {
    id: "gap_008",
    clientId: "cli_003",
    cover: "cyber",
    severity: "high",
    rationale:
      "Patient records and imaging sit on cloud software. A breach of special category data has no cover on the schedule.",
    suggestedLimit: 500_000,
    evidence: {
      documentId: null,
      excerpt: "Patient records and imaging held on cloud practice management software",
    },
  },
  {
    id: "gap_009",
    clientId: "cli_003",
    cover: "medical_malpractice",
    severity: "high",
    rationale:
      "Clinicians carry individual indemnity, but a claim against the company itself has nothing to respond.",
    suggestedLimit: 2_000_000,
    evidence: {
      documentId: null,
      excerpt: "Clinicians hold their own indemnity but the company has nothing at entity level",
    },
  },
  {
    id: "gap_010",
    clientId: "cli_003",
    cover: "directors_officers",
    severity: "medium",
    rationale:
      "A limited company with two directors and 19 staff has no cover for regulatory or employment action against the directors.",
    suggestedLimit: 500_000,
    evidence: { documentId: null, excerpt: "Two directors. One claim in 2023" },
  },
]);

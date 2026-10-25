import { describe, expect, it } from "vitest";
import { clients } from "@/data/clients";
import { quotes } from "@/data/quotes";
import { appetiteFor, claimsWithin } from "./appetite";

function fixture(clientId: string, quoteId: string) {
  const client = clients.find((c) => c.id === clientId);
  const quote = quotes.find((q) => q.id === quoteId);
  if (!client || !quote) throw new Error("fixture missing");
  return { client, quote };
}

describe("appetiteFor", () => {
  it("declines a timber framed risk when the insurer excludes that construction", () => {
    const { client, quote } = fixture("cli_001", "qte_002");
    const result = appetiteFor(quote, client);
    expect(result.verdict).toBe("decline");
    expect(result.reasons[0]).toMatch(/timber frame/);
  });

  it("flags caution when turnover is above a soft preference", () => {
    const { client, quote } = fixture("cli_001", "qte_003");
    expect(appetiteFor(quote, client).verdict).toBe("caution");
  });

  it("is a fit when the fleet sits under the preferred size", () => {
    const { client, quote } = fixture("cli_002", "qte_005");
    expect(appetiteFor(quote, client)).toEqual({ verdict: "fit", reasons: [] });
  });

  it("declines a hard fleet limit that the client exceeds", () => {
    const { client, quote } = fixture("cli_002", "qte_006");
    expect(appetiteFor(quote, client).verdict).toBe("decline");
  });

  it("counts claims inside the look-back window only", () => {
    const harbourline = clients.find((c) => c.id === "cli_002");
    if (!harbourline) throw new Error("fixture missing");
    // 2026 minus three years covers 2024, 2025 and 2026; a two year window drops the 2024 claim.
    expect(claimsWithin(harbourline, 3)).toBe(3);
    expect(claimsWithin(harbourline, 2)).toBe(2);
    expect(claimsWithin(harbourline, 1)).toBe(0);
  });

  it("a single claim in five years triggers a strict claims-free rule", () => {
    const { client, quote } = fixture("cli_003", "qte_012");
    const result = appetiteFor(quote, client);
    expect(result.verdict).toBe("decline");
    expect(result.reasons).toHaveLength(1);
  });
});

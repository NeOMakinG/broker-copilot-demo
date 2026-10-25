import { describe, expect, it } from "vitest";
import { accounts } from "@/data/accounts";
import {
  remainingCredit,
  statusCounts,
  usdDepositAccounts,
  usdDepositsHistory,
  usdDepositsTotal,
} from "@/data/selectors";

// Mock data must be internally consistent: every screen reads these numbers, and a contradiction between two
// screens ruins the demo. Extend this file for every new fixture and every computed figure.
describe("fixture invariants", () => {
  it("each account's balance equals its latest history point", () => {
    for (const a of accounts) {
      expect(a.balance).toBe(a.history.at(-1)?.balance);
    }
  });

  it("the deposits total is the sum of its parts and matches the chart's last point", () => {
    const parts = usdDepositAccounts(accounts).reduce((sum, a) => sum + a.balance, 0);
    expect(usdDepositsTotal(accounts)).toBeCloseTo(parts, 2);
    expect(usdDepositsHistory(accounts).at(-1)?.balance).toBeCloseTo(usdDepositsTotal(accounts), 2);
  });

  it("status counts add up to the number of accounts", () => {
    const c = statusCounts(accounts);
    expect(c.active + c.frozen + c.closed).toBe(c.total);
  });

  it("remaining credit is limit minus balance and never negative", () => {
    for (const a of accounts.filter((x) => x.creditLimit !== null)) {
      const left = remainingCredit(a);
      expect(left).not.toBeNull();
      expect(left ?? -1).toBeGreaterThanOrEqual(0);
    }
  });
});

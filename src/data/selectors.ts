import type { Account, BalancePoint } from "@/schemas/account";

// Every number a screen shows is computed here from the fixtures, never hand-typed in a component.
// Screens and the invariants test use the same functions, so a total can't drift between two pages.

export function usdDepositAccounts(accounts: Account[]): Account[] {
  return accounts.filter(
    (a) => a.currency === "USD" && a.type !== "credit" && a.status !== "closed",
  );
}

export function usdDepositsTotal(accounts: Account[]): number {
  return round2(usdDepositAccounts(accounts).reduce((sum, a) => sum + a.balance, 0));
}

export function usdDepositsHistory(accounts: Account[]): BalancePoint[] {
  const totals = new Map<string, number>();
  for (const account of usdDepositAccounts(accounts)) {
    for (const point of account.history) {
      totals.set(point.month, (totals.get(point.month) ?? 0) + point.balance);
    }
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, balance]) => ({ month, balance: round2(balance) }));
}

export function statusCounts(accounts: Account[]) {
  return {
    total: accounts.length,
    active: accounts.filter((a) => a.status === "active").length,
    frozen: accounts.filter((a) => a.status === "frozen").length,
    closed: accounts.filter((a) => a.status === "closed").length,
  };
}

export function remainingCredit(account: Account): number | null {
  return account.creditLimit === null ? null : round2(account.creditLimit - account.balance);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, LandmarkIcon, SnowflakeIcon, WalletIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AccountsTable } from "@/components/accounts/accounts-table";
import { BalanceChart } from "@/components/accounts/balance-chart";
import { FadeIn } from "@/components/fade-in";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { statusCounts, usdDepositsHistory, usdDepositsTotal } from "@/data/selectors";
import { useTRPC } from "@/lib/trpc";
import { formatMoney } from "@/lib/utils";
import type { Account } from "@/schemas/account";

export function OverviewPage() {
  const trpc = useTRPC();
  const accountsQuery = useQuery(trpc.accounts.list.queryOptions());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Balances across every account the team operates. Data is fictional.
        </p>
      </div>

      {accountsQuery.isPending ? (
        <OverviewSkeleton />
      ) : accountsQuery.isError ? (
        <Card className="items-center py-10 text-center">
          <CircleAlertIcon className="size-8 text-destructive" aria-hidden="true" />
          <CardTitle>Could not load accounts</CardTitle>
          <CardDescription>{accountsQuery.error.message}</CardDescription>
          <Button variant="outline" onClick={() => void accountsQuery.refetch()}>
            Try again
          </Button>
        </Card>
      ) : (
        <OverviewContent accounts={accountsQuery.data} />
      )}
    </div>
  );
}

function OverviewContent({ accounts }: { accounts: Account[] }) {
  // Same selectors as the invariants test: the card and the chart can't disagree.
  const usdDeposits = usdDepositsTotal(accounts);
  const { active, frozen } = statusCounts(accounts);
  const history = usdDepositsHistory(accounts);

  return (
    <>
      <FadeIn className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          title="USD deposits"
          value={formatMoney(usdDeposits, "USD")}
          hint="Checking and savings"
          icon={<WalletIcon className="size-4" aria-hidden="true" />}
        />
        <StatCard
          title="Active accounts"
          value={String(active)}
          hint={`of ${accounts.length} total`}
          icon={<LandmarkIcon className="size-4" aria-hidden="true" />}
        />
        <StatCard
          title="Frozen"
          value={String(frozen)}
          hint={frozen === 0 ? "Nothing needs attention" : "Needs review"}
          icon={<SnowflakeIcon className="size-4" aria-hidden="true" />}
        />
      </FadeIn>

      <FadeIn delay={0.05}>
        <Card>
          <CardHeader>
            <CardTitle>USD deposits, trailing 12 months</CardTitle>
            <CardDescription>
              Combined month-end balance of active USD checking and savings accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BalanceChart data={history} currency="USD" />
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.1} className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Accounts</h2>
        <AccountsTable accounts={accounts} />
      </FadeIn>
    </>
  );
}

function StatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="flex flex-row items-center justify-between px-5">
        <CardDescription className="font-medium">{title}</CardDescription>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent className="px-5">
        <p className="tabular text-2xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label="Loading accounts"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {["deposits", "active", "frozen"].map((key) => (
          <Skeleton key={key} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-80" />
      <Skeleton className="h-64" />
    </div>
  );
}

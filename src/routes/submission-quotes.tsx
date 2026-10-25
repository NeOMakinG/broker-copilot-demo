import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FadeIn } from "@/components/fade-in";
import { ExportDialog } from "@/components/submission/export-dialog";
import { PremiumChart } from "@/components/submission/premium-chart";
import { QuoteCompare } from "@/components/submission/quote-compare";
import { buildQuoteRows, QuotesTable } from "@/components/submission/quotes-table";
import { useSubmission } from "@/components/submission/submission-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  currentPremium,
  GBP,
  premiumRange,
  requestedCovers,
  verdictCounts,
} from "@/data/selectors";
import { useTRPC } from "@/lib/trpc";
import { formatMoney } from "@/lib/utils";
import { MAX_SELECTED_QUOTES } from "@/schemas/submission";

export function SubmissionQuotesPage() {
  const { client, submission, documents, quotes, insurers } = useSubmission();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const toggle = useMutation(
    trpc.submissions.toggleQuote.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.submissions.pathKey() }),
    }),
  );

  const current = currentPremium(documents);
  const requested = requestedCovers(documents, submission);
  const range = premiumRange(quotes);
  const verdicts = verdictCounts(quotes, client);
  const rows = buildQuoteRows({
    quotes,
    insurers,
    client,
    requested,
    currentPremium: current,
    selectedIds: submission.selectedQuoteIds,
  });
  const shortlist = rows.filter((r) => r.selected);

  return (
    <FadeIn delay={0.05} className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <Stat
            label="Current premium"
            value={formatMoney(current, GBP)}
            hint="From the schedules"
          />
          <Stat
            label="Quoted range"
            value={
              range
                ? `${formatMoney(range.min, GBP)} to ${formatMoney(range.max, GBP)}`
                : "No quotes"
            }
            hint={`${quotes.length} quotes on the panel`}
          />
          <Stat
            label="Within appetite"
            value={`${verdicts.fit} of ${quotes.length}`}
            hint={`${verdicts.caution} to check, ${verdicts.decline} likely declined`}
          />
        </div>
        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Annual premium by insurer</CardTitle>
            <CardDescription>Dashed line marks what the client pays today.</CardDescription>
          </CardHeader>
          <CardContent className="px-3">
            <PremiumChart rows={rows} current={current} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Panel</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Covers counted against the {requested.length} the submission requests. Pick up to{" "}
              {MAX_SELECTED_QUOTES} to compare side by side.
            </p>
          </div>
          <ExportDialog clientId={client.id} />
        </div>
        <QuotesTable
          rows={rows}
          onToggle={(quoteId) => toggle.mutate({ clientId: client.id, quoteId })}
          toggling={toggle.isPending}
          shortlistFull={shortlist.length >= MAX_SELECTED_QUOTES}
        />
        {toggle.error ? (
          <p role="alert" className="text-sm text-destructive">
            {toggle.error.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Side by side</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {shortlist.length === 0
              ? "Add quotes from the panel to compare them cover by cover."
              : `${shortlist.length} of ${MAX_SELECTED_QUOTES} shortlisted. Every requested cover, offered or not.`}
          </p>
        </div>
        {shortlist.length === 0 ? (
          <Card className="items-center py-10 text-center">
            <CardTitle className="text-base">Nothing shortlisted yet</CardTitle>
            <CardDescription>
              Use Compare on a panel row. Quotes marked likely decline can still be shortlisted to
              show the client why they were ruled out.
            </CardDescription>
          </Card>
        ) : (
          <QuoteCompare
            rows={shortlist}
            requested={requested}
            addedCovers={submission.addedCovers}
          />
        )}
      </div>
    </FadeIn>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="gap-1.5 py-4">
      <CardHeader className="px-4">
        <CardDescription className="text-xs">{label}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <p className="tabular text-lg font-semibold tracking-tight sm:text-xl">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

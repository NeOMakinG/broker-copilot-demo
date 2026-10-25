import { useQuery } from "@tanstack/react-query";
import { Link, Outlet } from "@tanstack/react-router";
import { ArrowLeftIcon, CircleAlertIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FadeIn } from "@/components/fade-in";
import { SubmissionContext } from "@/components/submission/submission-context";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  coverTypesHeld,
  currentPremium,
  fieldAmount,
  fieldStats,
  GBP,
  gapStats,
  nextRenewal,
} from "@/data/selectors";
import { ClientId } from "@/lib/ids";
import { useTRPC } from "@/lib/trpc";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { submissionRoute } from "@/router";
import type { SubmissionBundle } from "@/server/routers/submissions";

export function SubmissionLayout() {
  const { clientId } = submissionRoute.useParams();
  const parsed = ClientId.safeParse(clientId);
  if (!parsed.success) return <SubmissionMissing id={clientId} />;
  return <SubmissionLoader clientId={parsed.data} />;
}

function SubmissionLoader({ clientId }: { clientId: ClientId }) {
  const trpc = useTRPC();
  const query = useQuery(trpc.submissions.get.queryOptions({ clientId }));

  if (query.isPending) return <SubmissionSkeleton />;
  if (query.isError) return <SubmissionMissing id={clientId} message={query.error.message} />;
  return (
    <SubmissionContext.Provider value={query.data}>
      <SubmissionHeader bundle={query.data} />
      <Outlet />
    </SubmissionContext.Provider>
  );
}

// Height of the app bar the strip sits under (h-14).
const APP_BAR_PX = 56;

function SubmissionHeader({ bundle }: { bundle: SubmissionBundle }) {
  const { client, submission, documents, gaps } = bundle;
  // Same selectors as the pages below: the header can't disagree with the draft.
  const turnover = fieldAmount(submission, "turnover") ?? client.turnover;
  const headcount = fieldAmount(submission, "headcount") ?? client.headcount;
  const held = coverTypesHeld(documents).length;
  const premium = currentPremium(documents);
  const renewal = nextRenewal(documents);
  const fields = fieldStats(submission);
  const gapCounts = gapStats(gaps, submission);
  const shortlisted = submission.selectedQuoteIds.length;

  // The step strip stays pinned under the app bar. Once the title block scrolls away the strip
  // shows a compact client line so the Quotes table never loses its context.
  const title = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);
  useEffect(() => {
    const el = title.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(entry ? !entry.isIntersecting : false),
      { rootMargin: `-${APP_BAR_PX}px 0px 0px 0px`, threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <FadeIn className="flex flex-col gap-5">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/">
              <ArrowLeftIcon />
              New intake
            </Link>
          </Button>
        </div>

        <div
          ref={title}
          className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <p className="text-sm text-muted-foreground">
              {client.trade}, {client.city}. Contact {client.contact.name}, {client.contact.role}.
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-5 lg:shrink-0 lg:gap-x-8">
            <Fact label="Turnover" value={formatMoney(turnover, GBP)} />
            <Fact label="Employees" value={String(headcount)} />
            <Fact label="Covers held" value={String(held)} />
            <Fact label="Premium today" value={formatMoney(premium, GBP)} />
            <Fact label="Next renewal" value={renewal ? formatDate(renewal) : "None on file"} />
          </dl>
        </div>
      </FadeIn>

      <div
        className={cn(
          "sticky z-30 mt-5 mb-6 border-b border-transparent bg-background/95 py-2 backdrop-blur transition-colors",
          condensed && "border-border",
        )}
        style={{ top: APP_BAR_PX }}
      >
        <div className="flex items-center gap-4 lg:gap-6">
          {condensed ? (
            <p className="hidden min-w-0 shrink-0 flex-col lg:flex">
              <span className="truncate text-sm font-semibold">{client.name}</span>
              <span className="tabular truncate text-xs text-muted-foreground">
                {formatMoney(turnover, GBP)} turnover, {headcount} employees,{" "}
                {formatMoney(premium, GBP)} today
              </span>
            </p>
          ) : null}
          <nav
            aria-label="Submission steps"
            className="-mx-4 min-w-0 flex-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
          >
            <ol className="grid min-w-[36rem] grid-cols-3 gap-2 sm:min-w-0">
              <Step
                index={1}
                to="/submissions/$clientId"
                clientId={client.id}
                exact
                title="Draft"
                detail={`${fields.reviewed} of ${fields.total} fields reviewed`}
              />
              <Step
                index={2}
                to="/submissions/$clientId/gaps"
                clientId={client.id}
                title="Gaps"
                detail={`${gapCounts.added} of ${gapCounts.total} added`}
              />
              <Step
                index={3}
                to="/submissions/$clientId/quotes"
                clientId={client.id}
                title="Quotes"
                detail={
                  shortlisted === 0
                    ? `${bundle.quotes.length} on the panel`
                    : `${shortlisted} shortlisted`
                }
              />
            </ol>
          </nav>
        </div>
      </div>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs whitespace-nowrap text-muted-foreground">{label}</dt>
      <dd className="tabular font-medium">{value}</dd>
    </div>
  );
}

function Step({
  index,
  to,
  clientId,
  exact,
  title,
  detail,
}: {
  index: number;
  to: "/submissions/$clientId" | "/submissions/$clientId/gaps" | "/submissions/$clientId/quotes";
  clientId: ClientId;
  exact?: boolean;
  title: string;
  detail: string;
}) {
  return (
    <li>
      <Link
        to={to}
        params={{ clientId }}
        activeOptions={{ exact: exact ?? false }}
        className={cn(
          "group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 outline-none transition-colors hover:border-primary/40 focus-visible:ring-[3px] focus-visible:ring-ring/40",
          "data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground",
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-medium">
          {index}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">{title}</span>
          <span className="truncate text-xs opacity-80">{detail}</span>
        </span>
      </Link>
    </li>
  );
}

function SubmissionMissing({ id, message }: { id: string; message?: string }) {
  return (
    <Card className="items-center py-12 text-center">
      <CircleAlertIcon className="size-8 text-muted-foreground" aria-hidden="true" />
      <CardTitle>Submission not found</CardTitle>
      <CardDescription>{message ?? `There is no client with id "${id}".`}</CardDescription>
      <Button asChild variant="outline">
        <Link to="/">
          <ArrowLeftIcon />
          Back to intake
        </Link>
      </Button>
    </Card>
  );
}

function SubmissionSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label="Loading submission"
    >
      <Skeleton className="h-8 w-28" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

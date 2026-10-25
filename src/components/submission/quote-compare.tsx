import { CheckIcon, MinusIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { QuoteRow } from "@/components/submission/quotes-table";
import { VerdictBadge } from "@/components/submission/verdict-badge";
import { GBP, quoteCover } from "@/data/selectors";
import { cn, formatCompact, formatMoney } from "@/lib/utils";
import { type CoverType, coverLabel } from "@/schemas/cover";

// Side by side view of the shortlisted quotes. Rows are the covers the submission requests, so a
// gap the broker just added shows up immediately as offered or not.
export function QuoteCompare({
  rows,
  requested,
  addedCovers,
}: {
  rows: QuoteRow[];
  requested: CoverType[];
  addedCovers: CoverType[];
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[36rem] table-fixed text-sm" aria-label="Quote comparison">
        <colgroup>
          <col className="w-[11rem]" />
          {rows.map((r) => (
            <col key={r.quote.id} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b">
            <th scope="col" className="px-4 py-3 text-left font-normal text-muted-foreground">
              Shortlist
            </th>
            {rows.map((r) => (
              <th key={r.quote.id} scope="col" className="px-4 py-3 text-left align-top">
                <span className="flex flex-col items-start gap-1.5">
                  <span className="font-semibold">{r.insurer}</span>
                  <VerdictBadge result={r.appetite} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          <Row label="Annual premium">
            {rows.map((r) => (
              <Cell key={r.quote.id} className="tabular text-base font-semibold">
                {formatMoney(r.quote.premium, GBP)}
              </Cell>
            ))}
          </Row>
          <Row label="Against current">
            {rows.map((r) => (
              <Cell
                key={r.quote.id}
                className={cn(
                  "tabular",
                  r.delta < 0 ? "text-emerald-700" : "text-muted-foreground",
                )}
              >
                {r.delta > 0 ? "+" : ""}
                {formatMoney(r.delta, GBP)}
              </Cell>
            ))}
          </Row>
          <Row label="Standard excess">
            {rows.map((r) => (
              <Cell key={r.quote.id} className="tabular">
                {formatMoney(r.quote.excess, GBP)}
              </Cell>
            ))}
          </Row>
          {requested.map((cover) => (
            <Row
              key={cover}
              label={coverLabel[cover]}
              hint={addedCovers.includes(cover) ? "added from gaps" : undefined}
            >
              {rows.map((r) => {
                const line = quoteCover(r.quote, cover);
                return (
                  <Cell key={r.quote.id}>
                    {line ? (
                      <span className="flex items-start gap-1.5">
                        <CheckIcon
                          className="mt-0.5 size-4 shrink-0 text-emerald-700"
                          aria-hidden="true"
                        />
                        <span>
                          <span className="tabular">{formatCompact(line.limit, GBP)}</span>
                          <span className="block text-xs text-muted-foreground">{line.basis}</span>
                          <span className="sr-only">offered</span>
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <MinusIcon className="size-4 shrink-0" aria-hidden="true" />
                        Not offered
                      </span>
                    )}
                  </Cell>
                );
              })}
            </Row>
          ))}
          <Row label="Key exclusions">
            {rows.map((r) => (
              <Cell key={r.quote.id}>
                <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                  {r.quote.exclusions.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </Cell>
            ))}
          </Row>
          <Row label="Appetite note">
            {rows.map((r) => (
              <Cell key={r.quote.id} className="text-muted-foreground">
                {r.quote.appetiteNote}
                {r.appetite.reasons.length > 0 ? (
                  <span className="mt-1 block text-foreground">
                    {r.appetite.reasons.join(". ")}.
                  </span>
                ) : null}
              </Cell>
            ))}
          </Row>
        </tbody>
      </table>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 text-left align-top font-normal text-muted-foreground">
        {label}
        {hint ? (
          <span className="mt-0.5 block text-xs text-highlight-foreground">{hint}</span>
        ) : null}
      </th>
      {children}
    </tr>
  );
}

function Cell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}

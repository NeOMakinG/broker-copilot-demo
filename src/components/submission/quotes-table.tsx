import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  type SortingState,
  sortFn_alphanumeric,
  sortFn_basic,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, CheckIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { VerdictBadge } from "@/components/submission/verdict-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type CoverageMatch, coverageMatch, GBP, premiumDelta } from "@/data/selectors";
import { type AppetiteResult, appetiteFor } from "@/domain/appetite";
import type { QuoteId } from "@/lib/ids";
import { cn, formatMoney } from "@/lib/utils";
import type { Client } from "@/schemas/client";
import { type CoverType, coverLabel } from "@/schemas/cover";
import type { Insurer, Quote } from "@/schemas/insurer";

// One row per quote, with the derived figures computed once per render through the selectors.
export interface QuoteRow {
  quote: Quote;
  insurer: string;
  delta: number;
  match: CoverageMatch;
  appetite: AppetiteResult;
  selected: boolean;
}

export function buildQuoteRows(input: {
  quotes: Quote[];
  insurers: Insurer[];
  client: Client;
  requested: CoverType[];
  currentPremium: number;
  selectedIds: readonly QuoteId[];
}): QuoteRow[] {
  return input.quotes.map((quote) => ({
    quote,
    insurer: input.insurers.find((i) => i.id === quote.insurerId)?.name ?? quote.insurerId,
    delta: premiumDelta(quote, input.currentPremium),
    match: coverageMatch(quote, input.requested),
    appetite: appetiteFor(quote, input.client),
    selected: input.selectedIds.includes(quote.id),
  }));
}

// v9: register only the features this table uses. Keep features and columns at module scope.
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic },
});

const helper = createColumnHelper<typeof features, QuoteRow>();
const numericColumns = new Set(["premium", "delta", "excess"]);

const verdictRank = { fit: 0, caution: 1, decline: 2 } as const;

const columns = helper.columns([
  helper.accessor("insurer", {
    header: "Insurer",
    sortFn: "alphanumeric",
    cell: ({ row, getValue }) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{getValue()}</span>
        {row.original.quote.holdingInsurer ? (
          <span className="text-xs text-muted-foreground">Holding insurer</span>
        ) : null}
      </div>
    ),
  }),
  helper.accessor((row) => row.quote.premium, {
    id: "premium",
    header: "Premium",
    sortFn: "basic",
    cell: ({ getValue }) => (
      <span className="tabular font-medium">{formatMoney(getValue(), GBP)}</span>
    ),
  }),
  helper.accessor("delta", {
    header: "vs current",
    sortFn: "basic",
    cell: ({ getValue }) => {
      const delta = getValue();
      return (
        <span className={cn("tabular", delta < 0 ? "text-emerald-700" : "text-muted-foreground")}>
          {delta > 0 ? "+" : ""}
          {formatMoney(delta, GBP)}
        </span>
      );
    },
  }),
  helper.accessor((row) => row.quote.excess, {
    id: "excess",
    header: "Excess",
    sortFn: "basic",
    cell: ({ getValue }) => <span className="tabular">{formatMoney(getValue(), GBP)}</span>,
  }),
  helper.accessor((row) => row.match.included.length, {
    id: "covers",
    header: "Covers",
    sortFn: "basic",
    cell: ({ row }) => <CoverageCell match={row.original.match} />,
  }),
  helper.accessor((row) => verdictRank[row.appetite.verdict], {
    id: "appetite",
    header: "Appetite",
    sortFn: "basic",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <VerdictBadge result={row.original.appetite} />
        <span className="max-w-56 whitespace-normal text-xs text-muted-foreground">
          {row.original.quote.appetiteNote}
        </span>
      </div>
    ),
  }),
]);

function CoverageCell({ match }: { match: CoverageMatch }) {
  const total = match.included.length + match.missing.length;
  const text = (
    <span className="tabular">
      {match.included.length} of {total}
    </span>
  );
  if (match.missing.length === 0) return <Badge variant="success">All {total}</Badge>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded-md underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          aria-label={`${match.included.length} of ${total} covers. Not offered: ${match.missing.map((c) => coverLabel[c]).join(", ")}`}
        >
          {text}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        Not offered: {match.missing.map((c) => coverLabel[c]).join(", ")}
      </TooltipContent>
    </Tooltip>
  );
}

export function QuotesTable({
  rows,
  onToggle,
  toggling,
  shortlistFull,
}: {
  rows: QuoteRow[];
  onToggle: (quoteId: QuoteId) => void;
  toggling: boolean;
  shortlistFull: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "premium", desc: false }]);
  const data = useMemo(() => rows, [rows]);

  const table = useTable({
    features,
    columns,
    data,
    getRowId: (row) => row.quote.id,
    state: { sorting },
    onSortingChange: setSorting,
    // Cheapest first by default; clicking flips the order rather than removing the sort.
    enableSortingRemoval: false,
  });

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const alignRight = numericColumns.has(header.column.id);
                return (
                  <TableHead
                    key={header.id}
                    className={cn(alignRight && "text-right")}
                    aria-sort={
                      sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none"
                    }
                  >
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        "-mx-2 inline-flex h-8 items-center gap-1 rounded-md px-2 outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40",
                        sorted && "text-foreground",
                      )}
                    >
                      <table.FlexRender header={header} />
                      {sorted === "asc" ? (
                        <ArrowUpIcon className="size-3.5" />
                      ) : sorted === "desc" ? (
                        <ArrowDownIcon className="size-3.5" />
                      ) : (
                        <ArrowUpDownIcon className="size-3.5 opacity-50" />
                      )}
                    </button>
                  </TableHead>
                );
              })}
              <TableHead className="text-right">Compare</TableHead>
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.original.selected ? "selected" : undefined}
              className="align-top"
            >
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn("py-3", numericColumns.has(cell.column.id) && "text-right")}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
              <TableCell className="py-3 text-right">
                <Button
                  variant={row.original.selected ? "default" : "outline"}
                  size="sm"
                  disabled={toggling || (!row.original.selected && shortlistFull)}
                  aria-pressed={row.original.selected}
                  aria-label={`${row.original.selected ? "Remove" : "Compare"} ${row.original.insurer}`}
                  onClick={() => onToggle(row.original.quote.id)}
                >
                  {row.original.selected ? <CheckIcon /> : <PlusIcon />}
                  {row.original.selected ? "Added" : "Compare"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

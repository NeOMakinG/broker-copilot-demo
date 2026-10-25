import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { clients } from "@/data/clients";
import { documents } from "@/data/documents";
import { insurers } from "@/data/insurers";
import { quotes } from "@/data/quotes";
import { coverTypesHeld, currentPremium, quotesForClient } from "@/data/selectors";
import { QuoteId } from "@/lib/ids";
import { buildQuoteRows, QuotesTable } from "./quotes-table";

const client = clients.find((c) => c.id === "cli_001") ?? fail("fixture missing");
const docs = documents.filter((d) => d.clientId === client.id);
const panel = quotesForClient(quotes, client.id);

function fail(message: string): never {
  throw new Error(message);
}

function rowsWith(selected: string[] = []) {
  return buildQuoteRows({
    quotes: panel,
    insurers,
    client,
    requested: coverTypesHeld(docs),
    currentPremium: currentPremium(docs),
    selectedIds: selected.map((id) => QuoteId.parse(id)),
  });
}

function bodyRows() {
  const table = screen.getByRole("table");
  const [, body] = within(table).getAllByRole("rowgroup");
  if (!body) throw new Error("Table body missing");
  return within(body).getAllByRole("row");
}

function renderTable(props: Partial<Parameters<typeof QuotesTable>[0]> = {}) {
  const onToggle = vi.fn();
  render(
    <TooltipProvider>
      <QuotesTable
        rows={props.rows ?? rowsWith()}
        onToggle={props.onToggle ?? onToggle}
        toggling={props.toggling ?? false}
        shortlistFull={props.shortlistFull ?? false}
      />
    </TooltipProvider>,
  );
  return { onToggle };
}

describe("QuotesTable", () => {
  it("lists every quote, cheapest first, with its appetite verdict", () => {
    renderTable();
    const rows = bodyRows();
    expect(rows).toHaveLength(panel.length);
    expect(rows[0]).toHaveTextContent("Northgate Mutual");
    expect(rows[0]).toHaveTextContent("Likely decline");
    expect(rows[rows.length - 1]).toHaveTextContent("Stonebridge Specialty");
  });

  it("sorts by premium descending on the first click of a sorted-ascending column", async () => {
    const user = userEvent.setup();
    renderTable();
    const header = screen.getByRole("button", { name: "Premium" });
    expect(header.closest("th")).toHaveAttribute("aria-sort", "ascending");
    await user.click(header);
    expect(header.closest("th")).toHaveAttribute("aria-sort", "descending");
    expect(bodyRows()[0]).toHaveTextContent("Stonebridge Specialty");
  });

  it("asks to toggle a quote and blocks new picks when the shortlist is full", async () => {
    const user = userEvent.setup();
    const { onToggle } = renderTable({ rows: rowsWith(["qte_001"]), shortlistFull: true });
    await user.click(screen.getByRole("button", { name: "Remove Meridian Commercial" }));
    expect(onToggle).toHaveBeenCalledWith("qte_001");
    expect(screen.getByRole("button", { name: "Compare Northgate Mutual" })).toBeDisabled();
  });
});

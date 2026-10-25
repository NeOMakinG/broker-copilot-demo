import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, XAxis, YAxis } from "recharts";
import type { QuoteRow } from "@/components/submission/quotes-table";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { GBP } from "@/data/selectors";
import { formatCompact, formatMoney } from "@/lib/utils";

const config = {
  premium: { label: "Annual premium", color: "var(--chart-1)" },
} satisfies ChartConfig;

// One series, so the title names it and no legend is needed. The current premium is a reference
// line, which is the only comparison that matters here.
export function PremiumChart({ rows, current }: { rows: QuoteRow[]; current: number }) {
  const data = [...rows]
    .sort((a, b) => a.quote.premium - b.quote.premium)
    .map((r) => ({ insurer: r.insurer, premium: r.quote.premium }));
  const max = Math.max(current, ...data.map((d) => d.premium));

  return (
    <ChartContainer config={config} className="aspect-auto h-48 w-full">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 18, right: 56, left: 0, bottom: 0 }}
        barCategoryGap={6}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis
          type="number"
          domain={[0, Math.ceil((max * 1.1) / 1000) * 1000]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatCompact(v, GBP)}
          fontSize={11}
        />
        <YAxis
          type="category"
          dataKey="insurer"
          width={150}
          tickLine={false}
          axisLine={false}
          fontSize={12}
        />
        <ChartTooltip
          cursor={{ fill: "var(--accent)" }}
          content={<ChartTooltipContent formatter={(v) => formatMoney(v, GBP)} />}
        />
        <ReferenceLine
          x={current}
          stroke="var(--foreground)"
          strokeDasharray="4 3"
          label={{
            value: `Current ${formatCompact(current, GBP)}`,
            position: "top",
            fontSize: 11,
            fill: "var(--muted-foreground)",
          }}
        />
        <Bar
          dataKey="premium"
          fill="var(--color-premium)"
          radius={[0, 4, 4, 0]}
          barSize={18}
          isAnimationActive={false}
        >
          <LabelList
            dataKey="premium"
            position="right"
            fontSize={11}
            className="fill-foreground"
            formatter={(v: unknown) => formatMoney(Number(v), GBP)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

import { CircleCheckIcon, CircleXIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type AppetiteResult, verdictLabel } from "@/domain/appetite";

const variants = {
  fit: "success",
  caution: "warning",
  decline: "destructive",
} as const;

const icons = {
  fit: CircleCheckIcon,
  caution: TriangleAlertIcon,
  decline: CircleXIcon,
} as const;

// Status is never colour alone: icon plus label, and the rule that fired on hover or focus.
export function VerdictBadge({ result }: { result: AppetiteResult }) {
  const Icon = icons[result.verdict];
  const badge = (
    <Badge variant={variants[result.verdict]} className="gap-1.5 py-1">
      <Icon aria-hidden="true" />
      {verdictLabel[result.verdict]}
    </Badge>
  );
  if (result.reasons.length === 0) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
          aria-label={`${verdictLabel[result.verdict]}: ${result.reasons.join(". ")}`}
        >
          {badge}
        </button>
      </TooltipTrigger>
      <TooltipContent>{result.reasons.join(". ")}</TooltipContent>
    </Tooltip>
  );
}

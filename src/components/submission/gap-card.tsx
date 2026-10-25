import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, PlusIcon, ShieldAlertIcon, ShieldIcon } from "lucide-react";
import { SourceExcerpt } from "@/components/submission/source-excerpt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GBP } from "@/data/selectors";
import type { ClientId } from "@/lib/ids";
import { useTRPC } from "@/lib/trpc";
import { formatMoney } from "@/lib/utils";
import { coverLabel } from "@/schemas/cover";
import type { PolicyDocument } from "@/schemas/document";
import type { GapFlag } from "@/schemas/extraction";

export function GapCard({
  clientId,
  gap,
  added,
  documents,
}: {
  clientId: ClientId;
  gap: GapFlag;
  added: boolean;
  documents: PolicyDocument[];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const add = useMutation(
    trpc.submissions.addGap.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.submissions.pathKey() }),
    }),
  );
  const label = coverLabel[gap.cover];

  return (
    <Card className="gap-4 py-5">
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-5">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="text-base">{label}</CardTitle>
          {gap.severity === "high" ? (
            <Badge className="gap-1.5 border-signal/60 bg-highlight text-highlight-foreground">
              <ShieldAlertIcon aria-hidden="true" />
              High exposure
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5">
              <ShieldIcon aria-hidden="true" />
              Medium exposure
            </Badge>
          )}
        </div>
        <p className="shrink-0 text-right text-sm">
          <span className="block text-xs text-muted-foreground">Suggested limit</span>
          <span className="tabular font-medium">{formatMoney(gap.suggestedLimit, GBP)}</span>
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-5">
        <p className="text-sm leading-relaxed">{gap.rationale}</p>
        <SourceExcerpt source={gap.evidence} documents={documents} />
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 px-5">
        {added ? (
          <Button variant="secondary" disabled aria-label={`${label} is in the submission`}>
            <CheckIcon />
            In submission
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={add.isPending}
            onClick={() => add.mutate({ clientId, gapId: gap.id })}
            aria-label={`Add ${label} to submission`}
          >
            <PlusIcon />
            {add.isPending ? "Adding..." : "Add to submission"}
          </Button>
        )}
        {add.error ? (
          <p role="alert" className="text-xs text-destructive">
            {add.error.message}
          </p>
        ) : null}
      </CardFooter>
    </Card>
  );
}

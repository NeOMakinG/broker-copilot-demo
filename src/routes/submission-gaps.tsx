import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";
import { FadeIn } from "@/components/fade-in";
import { GapCard } from "@/components/submission/gap-card";
import { useSubmission } from "@/components/submission/submission-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { coverTypesHeld, gapStats, requestedCovers } from "@/data/selectors";
import { coverLabel } from "@/schemas/cover";

export function SubmissionGapsPage() {
  const { client, submission, documents, gaps } = useSubmission();
  const stats = gapStats(gaps, submission);
  const held = coverTypesHeld(documents);
  const requested = requestedCovers(documents, submission);

  return (
    <FadeIn delay={0.05} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Likely gaps</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Exposures described in the intake with no matching cover on the schedules. {stats.high}{" "}
            of {stats.total} are high. Add the ones the client should see quoted.
          </p>
        </div>
        {gaps.length === 0 ? (
          <Card className="items-center py-10 text-center">
            <CardTitle>No gaps found</CardTitle>
            <CardDescription>Every exposure in the intake has a matching cover.</CardDescription>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {gaps.map((gap) => (
              <GapCard
                key={gap.id}
                clientId={client.id}
                gap={gap}
                added={submission.addedCovers.includes(gap.cover)}
                documents={documents}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:self-start">
        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardDescription>Covers requested</CardDescription>
            <CardTitle className="tabular text-2xl tracking-tight">
              {requested.length} {requested.length === 1 ? "cover" : "covers"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-5">
            <ul className="flex flex-wrap gap-1.5" aria-label="Covers requested">
              {requested.map((cover) => (
                <li key={cover}>
                  <Badge
                    variant={held.includes(cover) ? "secondary" : "outline"}
                    className={
                      held.includes(cover)
                        ? undefined
                        : "border-signal/60 bg-highlight text-highlight-foreground"
                    }
                  >
                    {coverLabel[cover]}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {held.length} already held, {stats.added} added from the gap review, {stats.open}{" "}
              still open.
            </p>
            <Button asChild className="mt-1 w-full">
              <Link to="/submissions/$clientId/quotes" params={{ clientId: client.id }}>
                Compare quotes
                <ArrowRightIcon />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}

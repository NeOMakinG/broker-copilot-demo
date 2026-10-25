import { Link } from "@tanstack/react-router";
import { ArrowRightIcon, FileTextIcon } from "lucide-react";
import { FadeIn } from "@/components/fade-in";
import { FieldRow } from "@/components/submission/field-row";
import { useSubmission } from "@/components/submission/submission-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { coversHeld, fieldStats, GBP, insurerName, lowConfidenceCount } from "@/data/selectors";
import { formatCompact, formatDate, formatMoney } from "@/lib/utils";
import { coverLabel } from "@/schemas/cover";
import { documentKindLabel } from "@/schemas/document";

export function SubmissionDraftPage() {
  const { client, submission, documents, insurers } = useSubmission();
  const stats = fieldStats(submission);
  const lowConfidence = lowConfidenceCount(submission);
  const held = coversHeld(documents);

  return (
    <FadeIn delay={0.05} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-5">
          <CardTitle>Extracted facts</CardTitle>
          <CardDescription>
            Each value shows the passage it came from. Confirm what is right, edit what is not.
            {lowConfidence > 0
              ? ` ${lowConfidence} ${lowConfidence === 1 ? "field is" : "fields are"} below ${Math.round(0.85 * 100)}% confidence and worth a second look.`
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y px-0">
          {submission.fields.map((field) => (
            <FieldRow key={field.key} clientId={client.id} field={field} documents={documents} />
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 lg:self-start">
        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardDescription>Review progress</CardDescription>
            <CardTitle className="tabular text-2xl tracking-tight">
              {stats.reviewed} of {stats.total} fields
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-5">
            <Progress value={stats.rate} aria-label="Fields reviewed" />
            <p className="text-xs text-muted-foreground">
              {stats.confirmed} confirmed, {stats.edited} edited. Unreviewed fields go to market as
              extracted.
            </p>
            <Button asChild className="mt-1 w-full">
              <Link to="/submissions/$clientId/gaps" params={{ clientId: client.id }}>
                Review gaps
                <ArrowRightIcon />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Covers held</CardTitle>
            <CardDescription>Read from the attached schedules.</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <ul className="flex flex-col divide-y text-sm">
              {held.map((line) => (
                <li key={line.cover} className="flex items-baseline justify-between gap-3 py-2">
                  <span>{coverLabel[line.cover]}</span>
                  <span className="tabular shrink-0 text-muted-foreground">
                    {formatCompact(line.limit, GBP)}
                    {line.excess > 0 ? `, ${formatMoney(line.excess, GBP)} xs` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="gap-3 py-5">
          <CardHeader className="px-5">
            <CardTitle className="text-base">Documents read</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            <ul className="flex flex-col gap-2.5 text-sm">
              {documents.map((doc) => (
                <li key={doc.id} className="flex gap-2">
                  <FileTextIcon
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {documentKindLabel[doc.kind]}, {insurerName(insurers, doc.insurerId)}, ref{" "}
                      {doc.policyRef}
                      {doc.renewalDate ? `, renews ${formatDate(doc.renewalDate)}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}

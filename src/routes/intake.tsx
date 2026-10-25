import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CircleAlertIcon, SparklesIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { DocumentDropzone } from "@/components/intake/document-dropzone";
import { PipelineSteps } from "@/components/intake/pipeline-steps";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { insurers } from "@/data/insurers";
import type { PipelineStep } from "@/data/selectors";
import type { ClientId, DocumentId } from "@/lib/ids";
import { useTRPC } from "@/lib/trpc";
import type { PolicyDocument } from "@/schemas/document";

const STAGES = [
  "Read the risk description",
  "Extract facts from the documents",
  "Match the covers already held",
  "Look for coverage gaps",
  "Score the insurer panel",
];

export function IntakePage() {
  const trpc = useTRPC();
  const samples = useQuery(trpc.intake.samples.queryOptions());

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">New risk intake</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste the client's description of their business and attach what they already hold. The
          copilot drafts the submission, flags gaps and scores the panel. You review every field.
        </p>
      </div>

      {samples.isPending ? (
        <IntakeSkeleton />
      ) : samples.isError ? (
        <Card className="items-center py-10 text-center">
          <CircleAlertIcon className="size-8 text-destructive" aria-hidden="true" />
          <CardTitle>Could not load the sample risks</CardTitle>
          <CardDescription>{samples.error.message}</CardDescription>
          <Button variant="outline" onClick={() => void samples.refetch()}>
            Try again
          </Button>
        </Card>
      ) : (
        <IntakeForm samples={samples.data} />
      )}
    </div>
  );
}

type Sample = {
  clientId: ClientId;
  name: string;
  trade: string;
  city: string;
  riskDescription: string;
  documents: PolicyDocument[];
};

function IntakeForm({ samples }: { samples: Sample[] }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [attached, setAttached] = useState<PolicyDocument[]>([]);
  const [run, setRun] = useState<{ clientId: ClientId; steps: PipelineStep[] } | null>(null);

  const analyse = useMutation(
    trpc.intake.analyse.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries({ queryKey: trpc.submissions.pathKey() });
        setRun(data);
      },
    }),
  );

  const finish = useCallback(() => {
    if (!run) return;
    void navigate({ to: "/submissions/$clientId", params: { clientId: run.clientId } });
  }, [run, navigate]);

  function loadSample(sample: Sample) {
    setText(sample.riskDescription);
    setAttached(sample.documents);
    analyse.reset();
  }

  function removeDocument(id: DocumentId) {
    setAttached((docs) => docs.filter((d) => d.id !== id));
  }

  const busy = analyse.isPending || run !== null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-6">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Risk description</CardTitle>
            <CardDescription>
              In the client's own words: what they do, where, how many people, what has gone wrong
              before.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Load a sample risk:</span>
              {samples.map((sample) => (
                <Button
                  key={sample.clientId}
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => loadSample(sample)}
                >
                  {sample.name}
                </Button>
              ))}
            </div>
            <Label htmlFor="risk-description" className="sr-only">
              Risk description
            </Label>
            <Textarea
              id="risk-description"
              value={text}
              disabled={busy}
              onChange={(e) => {
                setText(e.target.value);
                if (analyse.isError) analyse.reset();
              }}
              rows={9}
              placeholder="Brightwell Joinery Ltd, Leeds. Bespoke joinery and shopfitting, 14 staff, turnover about £2.1m..."
              className="min-h-44 resize-y"
            />
            <p className="text-xs text-muted-foreground">
              {text.trim() === "" ? "Nothing pasted yet." : `${wordCount(text)} words.`} Names,
              turnover, headcount and claims are what the extraction looks for first.
            </p>
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Policy documents</CardTitle>
            <CardDescription>
              Current schedules and the statement of fact. Covers held are read from the schedules,
              so gaps are measured against what the client actually has.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentDropzone attached={attached} insurers={insurers} onRemove={removeDocument} />
          </CardContent>
        </Card>

        {analyse.isError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {analyse.error.message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            disabled={busy}
            onClick={() =>
              analyse.mutate({ riskDescription: text, documentIds: attached.map((d) => d.id) })
            }
          >
            <SparklesIcon />
            {analyse.isPending ? "Analysing..." : run ? "Drafting..." : "Analyse risk"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Model output is simulated. Nothing leaves the browser.
          </p>
        </div>
      </div>

      <Card className="gap-4 lg:self-start">
        <CardHeader>
          <CardTitle>What the copilot does</CardTitle>
          <CardDescription>
            {run
              ? "Working through the intake."
              : "Five steps, each one visible so you can see what was read and what was inferred."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {run ? (
            <PipelineSteps steps={run.steps} onDone={finish} />
          ) : (
            <ol className="flex flex-col gap-3">
              {STAGES.map((stage, index) => (
                <li key={stage} className="flex items-center gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{stage}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function IntakeSkeleton() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
      role="status"
      aria-busy="true"
      aria-label="Loading intake"
    >
      <div className="flex flex-col gap-6">
        <Skeleton className="h-80" />
        <Skeleton className="h-56" />
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

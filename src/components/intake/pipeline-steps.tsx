import { CheckIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { PipelineStep } from "@/data/selectors";
import { cn } from "@/lib/utils";

interface Props {
  steps: PipelineStep[];
  onDone: () => void;
}

// Plays the pipeline steps the server returned, one after another, then hands over. The durations
// are part of the canned response so the demo paces like a real call would.
export function PipelineSteps({ steps, onDone }: Props) {
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= steps.length) {
      const handle = setTimeout(onDone, 500);
      return () => clearTimeout(handle);
    }
    const step = steps[done];
    const handle = setTimeout(() => setDone((n) => n + 1), step?.durationMs ?? 500);
    return () => clearTimeout(handle);
  }, [done, steps, onDone]);

  return (
    <ol className="flex flex-col" aria-label="Analysis progress" aria-live="polite">
      {steps.map((step, index) => {
        const state = index < done ? "done" : index === done ? "running" : "waiting";
        return (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                  state === "done" && "border-primary bg-primary text-primary-foreground",
                  state === "running" && "border-primary text-primary",
                  state === "waiting" && "border-border text-muted-foreground",
                )}
              >
                {state === "done" ? (
                  <CheckIcon className="size-3.5" aria-hidden="true" />
                ) : state === "running" ? (
                  <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  index + 1
                )}
              </span>
              {index < steps.length - 1 ? (
                <span
                  className={cn("my-1 w-px flex-1", state === "done" ? "bg-primary" : "bg-border")}
                  aria-hidden="true"
                />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col pb-4">
              <p
                className={cn(
                  "text-sm font-medium",
                  state === "waiting" && "text-muted-foreground",
                )}
              >
                {step.label}
                <span className="sr-only">
                  {state === "done" ? ", done" : state === "running" ? ", running" : ", waiting"}
                </span>
              </p>
              <p
                className={cn(
                  "text-sm text-muted-foreground transition-opacity",
                  state === "done" ? "opacity-100" : "opacity-0",
                )}
                aria-hidden={state !== "done"}
              >
                {step.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

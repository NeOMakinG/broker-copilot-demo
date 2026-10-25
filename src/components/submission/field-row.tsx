import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, PencilIcon, RotateCcwIcon } from "lucide-react";
import { useId, useState } from "react";
import { z } from "zod";
import { SourceExcerpt } from "@/components/submission/source-excerpt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatFieldValue, LOW_CONFIDENCE } from "@/data/selectors";
import type { ClientId } from "@/lib/ids";
import { useTRPC } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import type { PolicyDocument } from "@/schemas/document";
import { fieldLabel } from "@/schemas/extraction";
import type { FieldValue, SubmissionField } from "@/schemas/submission";

// One extracted field: the value, how sure the model was, where it came from, and the broker's
// controls. The broker confirms or edits; nothing goes to market unreviewed.

const editors = {
  money: z.object({
    value: z
      .string()
      .trim()
      .regex(/^£?\s?[\d,]+(\.\d+)?$/, "Enter an amount in pounds")
      .refine((s) => parseMoney(s) > 0, "Must be above zero"),
  }),
  count: z.object({
    value: z.string().trim().regex(/^\d+$/, "Enter a whole number"),
  }),
  text: z.object({
    value: z.string().trim().min(2, "Needs at least 2 characters").max(200, "Keep it under 200"),
  }),
} as const;

function parseMoney(s: string): number {
  return Number(s.replace(/[£,\s]/g, ""));
}

function toFieldValue(type: FieldValue["type"], raw: string): FieldValue {
  switch (type) {
    case "money":
      return { type, amount: parseMoney(raw) };
    case "count":
      return { type, count: Number(raw.trim()) };
    case "text":
      return { type, text: raw.trim() };
  }
}

function rawValue(value: FieldValue): string {
  switch (value.type) {
    case "money":
      return String(value.amount);
    case "count":
      return String(value.count);
    case "text":
      return value.text;
  }
}

export function FieldRow({
  clientId,
  field,
  documents,
}: {
  clientId: ClientId;
  field: SubmissionField;
  documents: PolicyDocument[];
}) {
  const [editing, setEditing] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: trpc.submissions.pathKey() });

  const confirm = useMutation(
    trpc.submissions.confirmField.mutationOptions({ onSuccess: invalidate }),
  );
  const edit = useMutation(
    trpc.submissions.editField.mutationOptions({
      onSuccess: async () => {
        await invalidate();
        setEditing(false);
      },
    }),
  );

  const lowConfidence = field.confidence < LOW_CONFIDENCE;
  const label = fieldLabel[field.key];

  return (
    <div
      className={cn(
        "grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] sm:gap-6",
        field.status === "extracted" && lowConfidence && "bg-highlight/35",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
          <StatusBadge field={field} />
        </div>
        {editing ? (
          <FieldEditor
            field={field}
            pending={edit.isPending}
            error={edit.error?.message}
            onCancel={() => {
              edit.reset();
              setEditing(false);
            }}
            onSave={(value) => edit.mutate({ clientId, key: field.key, value })}
          />
        ) : (
          <p className="tabular text-base leading-snug">{formatFieldValue(field.value)}</p>
        )}
        {field.status === "edited" ? (
          <p className="text-xs text-muted-foreground">
            Extracted as {formatFieldValue(field.extracted)}
          </p>
        ) : null}
      </div>

      <SourceExcerpt source={field.source} documents={documents} />

      <div className="flex items-start gap-1 sm:justify-end">
        {field.status === "extracted" ? (
          <Button
            variant="outline"
            size="sm"
            disabled={confirm.isPending || editing}
            onClick={() => confirm.mutate({ clientId, key: field.key })}
            aria-label={`Confirm ${label}`}
          >
            <CheckIcon />
            Confirm
          </Button>
        ) : null}
        {editing ? null : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${label}`}
          >
            <PencilIcon />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ field }: { field: SubmissionField }) {
  const pct = Math.round(field.confidence * 100);
  if (field.status === "confirmed") return <Badge variant="success">Confirmed</Badge>;
  if (field.status === "edited") return <Badge variant="secondary">Edited by broker</Badge>;
  return (
    <Badge variant={field.confidence < LOW_CONFIDENCE ? "warning" : "outline"} className="tabular">
      {pct}% confidence
    </Badge>
  );
}

function FieldEditor({
  field,
  pending,
  error,
  onCancel,
  onSave,
}: {
  field: SubmissionField;
  pending: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (value: FieldValue) => void;
}) {
  const id = useId();
  const type = field.value.type;
  const form = useForm({
    defaultValues: { value: rawValue(field.value) },
    validators: { onChange: editors[type] },
    onSubmit: ({ value }) => onSave(toFieldValue(type, value.value)),
  });

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="value">
        {(f) => {
          const fieldError = f.state.meta.isTouched ? f.state.meta.errors[0]?.message : undefined;
          return (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id} className="sr-only">
                {fieldLabel[field.key]}
              </Label>
              <Input
                id={id}
                autoFocus
                inputMode={type === "text" ? "text" : "numeric"}
                value={f.state.value}
                onBlur={f.handleBlur}
                onChange={(e) => f.handleChange(e.target.value)}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? `${id}-error` : undefined}
                className="max-w-sm"
              />
              {fieldError ? (
                <p id={`${id}-error`} className="text-xs text-destructive">
                  {fieldError}
                </p>
              ) : null}
            </div>
          );
        }}
      </form.Field>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <form.Subscribe selector={(s) => s.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" size="sm" disabled={!canSubmit || pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <RotateCcwIcon />
          Cancel
        </Button>
      </div>
    </form>
  );
}

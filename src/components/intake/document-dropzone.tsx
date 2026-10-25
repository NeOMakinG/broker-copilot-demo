import { FileTextIcon, UploadIcon, XIcon } from "lucide-react";
import { type DragEvent, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { insurerName } from "@/data/selectors";
import { cn, formatDate } from "@/lib/utils";
import { documentKindLabel, type PolicyDocument } from "@/schemas/document";
import type { Insurer } from "@/schemas/insurer";

interface Props {
  attached: PolicyDocument[];
  insurers: Insurer[];
  onRemove: (id: PolicyDocument["id"]) => void;
}

// Drag-and-drop target for schedules and statements of fact. The demo cannot parse a real PDF, so a
// dropped file is acknowledged and the broker is pointed at the sample documents instead.
export function DocumentDropzone({ attached, insurers, onRemove }: Props) {
  const [active, setActive] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const noticeId = useId();

  function acceptFiles(files: FileList | null) {
    const names = files ? Array.from(files).map((f) => f.name) : [];
    if (names.length === 0) return;
    setNotice(
      `${names.join(", ")} ${names.length === 1 ? "was" : "were"} not read. This demo only parses the sample documents that come with each sample risk.`,
    );
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setActive(false);
    acceptFiles(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: drop target; the button inside is the keyboard path */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          active ? "border-primary bg-accent" : "border-input bg-card",
        )}
      >
        <UploadIcon className="size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm">
          Drop policy schedules or statements of fact here, or{" "}
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:underline"
            onClick={() => inputRef.current?.click()}
          >
            browse files
          </button>
        </p>
        <p className="text-xs text-muted-foreground">PDF, up to 20 pages each</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="sr-only"
          aria-label="Browse policy documents"
          aria-describedby={notice ? noticeId : undefined}
          onChange={(e) => {
            acceptFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {notice ? (
        <p
          id={noticeId}
          role="status"
          className="rounded-md border border-signal/50 bg-highlight px-3 py-2 text-xs text-highlight-foreground"
        >
          {notice}
        </p>
      ) : null}

      {attached.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No documents attached. Load a sample risk to attach its schedule and statement of fact.
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Attached documents">
          {attached.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm"
            >
              <FileTextIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{doc.fileName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {documentKindLabel[doc.kind]}, {insurerName(insurers, doc.insurerId)}, {doc.pages}{" "}
                  pages
                  {doc.renewalDate ? `, renews ${formatDate(doc.renewalDate)}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground"
                aria-label={`Remove ${doc.fileName}`}
                onClick={() => onRemove(doc.id)}
              >
                <XIcon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { FileTextIcon, MessageSquareTextIcon } from "lucide-react";
import type { PolicyDocument } from "@/schemas/document";
import type { SourceRef } from "@/schemas/extraction";

// The passage the model quoted, set like the printed document it came from. This is how the broker
// checks the extraction without opening the PDF.
export function SourceExcerpt({
  source,
  documents,
}: {
  source: SourceRef;
  documents: PolicyDocument[];
}) {
  const doc = source.documentId ? documents.find((d) => d.id === source.documentId) : undefined;
  return (
    <figure className="flex min-w-0 flex-col gap-1">
      <blockquote className="font-serif text-[0.9375rem] leading-snug text-foreground/90">
        <mark className="rounded-xs bg-highlight px-0.5 text-highlight-foreground decoration-clone">
          {source.excerpt}
        </mark>
      </blockquote>
      <figcaption className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
        {doc ? (
          <>
            <FileTextIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{doc.fileName}</span>
          </>
        ) : (
          <>
            <MessageSquareTextIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span>Risk description</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}

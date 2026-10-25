import { useQuery } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientId } from "@/lib/ids";
import { useTRPC } from "@/lib/trpc";

// The submission and comparison as Markdown, ready for the client file or an email to the insurer.
export function ExportDialog({ clientId }: { clientId: ClientId }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const trpc = useTRPC();
  const query = useQuery({ ...trpc.submissions.export.queryOptions({ clientId }), enabled: open });

  async function copy() {
    if (!query.data) return;
    await navigator.clipboard.writeText(query.data.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    if (!query.data) return;
    const blob = new Blob([query.data.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = query.data.fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <DownloadIcon />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export submission</DialogTitle>
          <DialogDescription>
            Markdown with the reviewed facts, covers requested and the shortlisted quotes. The same
            figures as on screen.
          </DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <Skeleton className="h-72" role="status" aria-busy="true" aria-label="Preparing export" />
        ) : query.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {query.error.message}
          </p>
        ) : (
          <pre className="max-h-72 overflow-auto rounded-md border bg-muted/50 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
            {query.data.markdown}
          </pre>
        )}
        <DialogFooter>
          <Button variant="ghost" disabled={!query.data} onClick={() => void copy()}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button disabled={!query.data} onClick={download}>
            <DownloadIcon />
            Download {query.data?.fileName ?? ".md"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

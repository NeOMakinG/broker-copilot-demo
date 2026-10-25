import { createContext, useContext } from "react";
import type { SubmissionBundle } from "@/server/routers/submissions";

// The layout loads the bundle once; the Draft, Gaps and Quotes pages read it from here so all three
// show the same client, documents, gaps and quotes.
export const SubmissionContext = createContext<SubmissionBundle | null>(null);

export function useSubmission(): SubmissionBundle {
  const bundle = useContext(SubmissionContext);
  if (!bundle) throw new Error("useSubmission must be used inside the submission layout");
  return bundle;
}

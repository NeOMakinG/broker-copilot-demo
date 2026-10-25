import {
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { IntakePage } from "@/routes/intake";
import { NotFoundPage } from "@/routes/not-found";
import { SubmissionDraftPage } from "@/routes/submission-draft";
import { SubmissionGapsPage } from "@/routes/submission-gaps";
import { SubmissionLayout } from "@/routes/submission-layout";
import { SubmissionQuotesPage } from "@/routes/submission-quotes";

// Code-based routes (no codegen). Hash history keeps deep links working on GitHub Pages.
export const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: NotFoundPage,
});

export const intakeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IntakePage,
});

// One submission per client: the layout carries the client header and the Draft / Gaps / Quotes rail.
export const submissionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/submissions/$clientId",
  component: SubmissionLayout,
});

export const submissionDraftRoute = createRoute({
  getParentRoute: () => submissionRoute,
  path: "/",
  component: SubmissionDraftPage,
});

export const submissionGapsRoute = createRoute({
  getParentRoute: () => submissionRoute,
  path: "gaps",
  component: SubmissionGapsPage,
});

export const submissionQuotesRoute = createRoute({
  getParentRoute: () => submissionRoute,
  path: "quotes",
  component: SubmissionQuotesPage,
});

const routeTree = rootRoute.addChildren([
  intakeRoute,
  submissionRoute.addChildren([submissionDraftRoute, submissionGapsRoute, submissionQuotesRoute]),
]);

export const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultPreload: "intent",
  scrollRestoration: true,
});

// Makes Link, useParams and navigate fully typed everywhere.
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

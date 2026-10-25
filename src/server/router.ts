import { intakeRouter } from "@/server/routers/intake";
import { submissionsRouter } from "@/server/routers/submissions";
import { router } from "@/server/trpc";

export const appRouter = router({
  intake: intakeRouter,
  submissions: submissionsRouter,
});

export type AppRouter = typeof appRouter;

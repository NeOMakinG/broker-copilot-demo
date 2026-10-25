import { Link, Outlet } from "@tanstack/react-router";
import { FilePenLineIcon } from "lucide-react";
import { COMPANY } from "@/lib/brand";
import { BROKER } from "@/server/context";

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full min-w-0 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <nav aria-label="Main" className="flex min-w-0 items-center gap-1">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-md px-2 py-1 font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <FilePenLineIcon className="size-4" aria-hidden="true" />
              </span>
              Broker Copilot
            </Link>
            <Link
              to="/"
              className="hidden rounded-md px-3 py-1.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 data-[status=active]:text-foreground sm:inline-flex"
              activeOptions={{ exact: true }}
            >
              New intake
            </Link>
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-muted-foreground sm:inline">Working as</span>
            <span className="font-medium">{BROKER.name}</span>
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
            >
              {BROKER.initials}
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <footer className="border-t">
        <p className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-muted-foreground sm:px-6">
          Independent concept by Valentin Szczupak. Not affiliated with or endorsed by {COMPANY}.
          All clients, insurers and people are fictional.
        </p>
      </footer>
    </div>
  );
}

import { delay } from "@/lib/utils";

export interface Context {
  broker: { name: string; initials: string };
}

// The "network": a small delay so loading states are visible in the browser.
export const SIMULATED_LATENCY_MS = 350;

// Single fictional broker, no auth (see the spec).
export const BROKER = { name: "Alex Reyes", initials: "AR" };

export async function createContext(): Promise<Context> {
  await delay(SIMULATED_LATENCY_MS);
  return { broker: BROKER };
}

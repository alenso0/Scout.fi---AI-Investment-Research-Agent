import type { ScoutState } from "./state";

export function extractDomain(weburl: string | null | undefined): string | null {
  if (!weburl) return null;
  try {
    return new URL(weburl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Wraps a node so a failed data source degrades gracefully (recorded in
 * state.errors) instead of crashing the whole graph run — see PRD §11.
 */
export function safeNode<T extends Partial<ScoutState>>(
  label: string,
  fn: (state: ScoutState) => Promise<T>
) {
  return async (state: ScoutState): Promise<Partial<ScoutState>> => {
    try {
      return await fn(state);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { errors: [`${label}: ${message}`] };
    }
  };
}

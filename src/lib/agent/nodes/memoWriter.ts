import { safeNode } from "../util";
import type { ResearchSection, ScoutState } from "../state";

const EMPTY_SECTION: ResearchSection = {
  summary: "Unavailable for this run.",
  citations: [],
};

/**
 * Pure assembly — no LLM call. The one-line thesis is produced by the
 * scoring node (same call as the rubric) to save a Gemini round-trip;
 * see PRD note on the free tier's 5 RPM ceiling vs. our per-run call count.
 */
export const memoWriterNode = safeNode(
  "memoWriter",
  async (state: ScoutState): Promise<Partial<ScoutState>> => {
    return {
      memo: {
        oneLineThesis: state.oneLineThesis ?? "Unable to form a thesis for this run.",
        verdict: state.verdict ?? "watch",
        compositeScore: state.compositeScore ?? 3,
        rubric: state.rubric,
        bullCase: state.bullCase ?? "Unavailable for this run.",
        bearCase: state.bearCase ?? "Unavailable for this run.",
        sections: {
          financials: state.financials ?? EMPTY_SECTION,
          news: state.news ?? EMPTY_SECTION,
          competitive: state.competitive ?? EMPTY_SECTION,
          risk: state.risk ?? EMPTY_SECTION,
        },
      },
    };
  }
);

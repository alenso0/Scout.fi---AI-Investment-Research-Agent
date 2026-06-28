import { z } from "zod";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { invokeFlashStructured } from "../../clients/llm";
import { safeNode } from "../util";
import { RubricDimensionSchema, type RubricDimension, type Verdict, type ScoutState } from "../state";

const RubricOutputSchema = z.object({
  rubric: z.array(RubricDimensionSchema).length(5),
  oneLineThesis: z
    .string()
    .describe(
      "Max 25 words. The single biggest reason behind the rubric scores above — no hedging, no verdict label (a badge shows that separately)."
    ),
});

/**
 * Weights per PRD §8. riskFactors is scored on an inverted scale (5 =
 * highly risky) so it's inverted back to a 1-5 "good" scale before
 * weighting, keeping the composite comparable across all five dimensions.
 */
const WEIGHTS: Record<RubricDimension["dimension"], number> = {
  financialHealth: 0.25,
  marketPosition: 0.2,
  momentum: 0.15,
  growthTrajectory: 0.2,
  riskFactors: 0.2,
};

function computeComposite(rubric: RubricDimension[]): number {
  const total = rubric.reduce((sum, { dimension, score }) => {
    const normalized = dimension === "riskFactors" ? 6 - score : score;
    return sum + normalized * WEIGHTS[dimension];
  }, 0);
  return Math.round(total * 100) / 100;
}

function deriveVerdict(compositeScore: number): Verdict {
  if (compositeScore >= 3.8) return "invest";
  if (compositeScore >= 2.8) return "watch";
  return "pass";
}

export const scoringNode = safeNode(
  "scoring",
  async (state: ScoutState): Promise<Partial<ScoutState>> => {
    const entity = state.resolvedEntity;

    const result = await invokeFlashStructured(RubricOutputSchema, [
      new SystemMessage(
        [
          "You are scoring a company across 5 investment-rubric dimensions, 1-5 each, with a one-sentence rationale citing specifics from the research, plus a one-line thesis.",
          "financialHealth, marketPosition, momentum, growthTrajectory: 5 = strongest, 1 = weakest.",
          "riskFactors is inverted: 5 = severe/material risk, 1 = no material risk found.",
          "Base scores ONLY on the research provided. If a section is unavailable, score conservatively (3) and say so in the rationale.",
        ].join(" ")
      ),
      new HumanMessage(
        [
          `Company: ${entity?.name ?? state.companyName}`,
          `Financial health research: ${state.financials?.summary ?? "unavailable"}`,
          `Market position / competitive research: ${state.competitive?.summary ?? "unavailable"}`,
          `Recent news / momentum research: ${state.news?.summary ?? "unavailable"}`,
          `Risk factors research: ${state.risk?.summary ?? "unavailable"}`,
          `Bull case: ${state.bullCase ?? "unavailable"}`,
          `Bear case: ${state.bearCase ?? "unavailable"}`,
        ].join("\n\n")
      ),
    ]);

    const compositeScore = computeComposite(result.rubric);
    const verdict = deriveVerdict(compositeScore);

    return {
      rubric: result.rubric,
      compositeScore,
      verdict,
      oneLineThesis: result.oneLineThesis,
    };
  }
);

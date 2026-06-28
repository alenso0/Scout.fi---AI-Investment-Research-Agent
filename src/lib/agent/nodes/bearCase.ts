import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { invokeFlash } from "../../clients/llm";
import { safeNode } from "../util";
import type { ScoutState } from "../state";

export const bearCaseNode = safeNode(
  "bearCase",
  async (state: ScoutState): Promise<Partial<ScoutState>> => {
    const entity = state.resolvedEntity;

    const bearCase = await invokeFlash(
      [
        new SystemMessage(
          "You are a skeptical short-side analyst. Red-team the bull case below — find the strongest reasons to pass or be cautious, grounded in the risk research and any weak spots in the financials/competitive picture. Write 3-5 punchy sentences. Don't invent risks that aren't supported by the research; if the research is genuinely thin, say the case rests on limited information rather than inventing a risk."
        ),
        new HumanMessage(
          [
            `Company: ${entity?.name ?? state.companyName}`,
            `Bull case: ${state.bullCase ?? "unavailable"}`,
            `Risk factors research: ${state.risk?.summary ?? "unavailable"}`,
            `Financial health: ${state.financials?.summary ?? "unavailable"}`,
            `Competitive landscape: ${state.competitive?.summary ?? "unavailable"}`,
          ].join("\n\n")
        ),
      ],
      0.4
    );

    return { bearCase };
  }
);

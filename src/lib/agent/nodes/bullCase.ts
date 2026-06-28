import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { invokeFlash } from "../../clients/gemini";
import { safeNode } from "../util";
import type { ScoutState } from "../state";

export const bullCaseNode = safeNode(
  "bullCase",
  async (state: ScoutState): Promise<Partial<ScoutState>> => {
    const entity = state.resolvedEntity;

    const bullCase = await invokeFlash(
      [
        new SystemMessage(
          "You are a buy-side analyst building the strongest possible case FOR investing in this company. Use only the research provided. Write 3-5 punchy sentences — confident, specific, no hedging filler."
        ),
        new HumanMessage(
          [
            `Company: ${entity?.name ?? state.companyName}`,
            `Financial health: ${state.financials?.summary ?? "unavailable"}`,
            `Recent news/sentiment: ${state.news?.summary ?? "unavailable"}`,
            `Competitive landscape: ${state.competitive?.summary ?? "unavailable"}`,
          ].join("\n\n")
        ),
      ],
      0.4
    );

    return { bullCase };
  }
);

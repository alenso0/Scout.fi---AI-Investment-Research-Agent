import { tavilySearch } from "../../clients/tavily";
import { safeNode } from "../util";
import { synthesizeSection, toCitations } from "./shared";
import type { ScoutState } from "../state";

export const riskNode = safeNode(
  "risk",
  async (state: ScoutState): Promise<Partial<ScoutState>> => {
    const name = state.resolvedEntity?.name ?? state.companyName;
    const results = await tavilySearch(
      `${name} lawsuit OR regulatory investigation OR debt downgrade OR executive departure`,
      { maxResults: 6, topic: "news" }
    );

    const section = await synthesizeSection({
      systemPrompt:
        "You are a financial analyst writing the 'Risk Factors' section of an investment memo. Surface litigation, regulatory, leadership, or balance-sheet risks. If nothing material turns up, say so plainly rather than inventing risk.",
      context: results
        .map((r) => `Title: ${r.title}\n${r.content}`)
        .join("\n\n"),
      citations: toCitations(results),
    });

    return { risk: section };
  }
);

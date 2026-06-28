import { tavilySearch } from "../../clients/tavily";
import { safeNode } from "../util";
import { synthesizeSection, toCitations } from "./shared";
import type { ScoutState } from "../state";

export const newsNode = safeNode(
  "news",
  async (state: ScoutState): Promise<Partial<ScoutState>> => {
    const name = state.resolvedEntity?.name ?? state.companyName;
    const results = await tavilySearch(`${name} news`, {
      maxResults: 6,
      topic: "news",
    });

    const section = await synthesizeSection({
      companyName: name,
      systemPrompt:
        "You are a financial analyst writing the 'Recent News & Sentiment' section of an investment memo. Note the overall tone (positive/negative/mixed) and call out anything material.",
      context: results
        .map((r) => `Title: ${r.title}\n${r.content}`)
        .join("\n\n"),
      citations: toCitations(results),
    });

    return { news: section };
  }
);

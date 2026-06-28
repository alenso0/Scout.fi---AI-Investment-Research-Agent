import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { invokeFlash } from "../../clients/llm";
import type { TavilySearchResult } from "../../clients/tavily";
import type { Citation, ResearchSection } from "../state";

export function toCitations(results: TavilySearchResult[]): Citation[] {
  return results.map((r) => ({ label: r.title, url: r.url }));
}

export async function synthesizeSection(opts: {
  companyName: string;
  systemPrompt: string;
  context: string;
  citations: Citation[];
}): Promise<ResearchSection> {
  if (opts.citations.length === 0) {
    return {
      summary: "No grounded data available for this section.",
      citations: [],
    };
  }

  const summary = await invokeFlash([
    new SystemMessage(
      [
        opts.systemPrompt,
        `Every source below was pulled from a search query about "${opts.companyName}", but search results are noisy — some may be about unrelated companies or topics that just matched on keywords.`,
        `Only use sources that are actually about ${opts.companyName}. Silently ignore anything else — don't mention or summarize it.`,
        `If none of the sources are actually relevant, say plainly that no relevant information was found rather than summarizing unrelated results.`,
        "Ground every sentence in the sources you do use. Keep it to 3-5 sentences.",
      ].join(" ")
    ),
    new HumanMessage(opts.context),
  ]);

  return { summary, citations: opts.citations };
}

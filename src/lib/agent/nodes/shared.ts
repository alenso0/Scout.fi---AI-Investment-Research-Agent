import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { invokeFlash } from "../../clients/llm";
import type { TavilySearchResult } from "../../clients/tavily";
import type { Citation, ResearchSection } from "../state";

export function toCitations(results: TavilySearchResult[]): Citation[] {
  return results.map((r) => ({ label: r.title, url: r.url }));
}

export async function synthesizeSection(opts: {
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
      `${opts.systemPrompt}\n\nGround every sentence in the provided context. If the context doesn't support a claim, don't make it. Keep it to 3-5 sentences.`
    ),
    new HumanMessage(opts.context),
  ]);

  return { summary, citations: opts.citations };
}

import { getPeers } from "../../clients/finnhub";
import { tavilySearch } from "../../clients/tavily";
import { safeNode } from "../util";
import { synthesizeSection, toCitations } from "./shared";
import type { Citation, ScoutState } from "../state";

export const competitiveNode = safeNode(
  "competitive",
  async (state: ScoutState): Promise<Partial<ScoutState>> => {
    const entity = state.resolvedEntity;
    const name = entity?.name ?? state.companyName;

    const [peers, results] = await Promise.all([
      entity?.ticker ? getPeers(entity.ticker).catch(() => []) : Promise.resolve([]),
      tavilySearch(`${name} competitors market position moat`, { maxResults: 5 }),
    ]);

    const peerCitation: Citation[] =
      peers.length > 0 && entity?.ticker
        ? [
            {
              label: `Finnhub — peer companies for ${entity.ticker}`,
              url: `https://finnhub.io/quote/${entity.ticker}/peers`,
            },
          ]
        : [];

    const context = [
      peers.length > 0 ? `Peer companies (per Finnhub): ${peers.join(", ")}` : "",
      ...results.map((r) => `Title: ${r.title}\n${r.content}`),
    ]
      .filter(Boolean)
      .join("\n\n");

    const section = await synthesizeSection({
      companyName: name,
      systemPrompt:
        "You are a financial analyst writing the 'Competitive Landscape' section of an investment memo. Identify the company's main competitors and assess its market position/moat.",
      context,
      citations: [...peerCitation, ...toCitations(results)],
    });

    return { competitive: section };
  }
);

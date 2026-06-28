import { getBasicFinancials } from "../../clients/finnhub";
import { safeNode } from "../util";
import { synthesizeSection } from "./shared";
import type { ScoutState } from "../state";

const RELEVANT_METRICS = [
  "peTTM",
  "pbAnnual",
  "epsGrowth5Y",
  "revenueGrowth5Y",
  "roeTTM",
  "roaTTM",
  "netProfitMarginTTM",
  "grossMarginTTM",
  "totalDebt/totalEquityAnnual",
  "currentRatioAnnual",
  "52WeekHigh",
  "52WeekLow",
];

export const financialsNode = safeNode(
  "financials",
  async (state: ScoutState): Promise<Partial<ScoutState>> => {
    const entity = state.resolvedEntity;

    if (!entity?.ticker) {
      return {
        financials: {
          summary: "No ticker resolved — financial data unavailable.",
          citations: [],
        },
      };
    }

    const data = await getBasicFinancials(entity.ticker);
    const relevant = Object.fromEntries(
      RELEVANT_METRICS.filter((key) => data.metric[key] !== undefined).map(
        (key) => [key, data.metric[key]]
      )
    );

    const section = await synthesizeSection({
      systemPrompt:
        "You are a financial analyst writing the 'Financial Health' section of an investment memo. Summarize the key metrics for a reader deciding whether to invest.",
      context: `Company: ${entity.name} (${entity.ticker})\nMetrics:\n${JSON.stringify(relevant, null, 2)}`,
      citations:
        Object.keys(relevant).length > 0
          ? [
              {
                label: `Finnhub — basic financials for ${entity.ticker}`,
                url: `https://finnhub.io/quote/${entity.ticker}`,
              },
            ]
          : [],
    });

    return { financials: section };
  }
);

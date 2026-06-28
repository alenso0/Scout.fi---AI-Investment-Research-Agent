import { getCompanyProfile, searchSymbol } from "../../clients/finnhub";
import { extractDomain, safeNode } from "../util";
import type { ResolvedEntity, ScoutState } from "../state";

export const resolveEntityNode = safeNode(
  "resolveEntity",
  async (state: ScoutState): Promise<Partial<ScoutState>> => {
    const matches = await searchSymbol(state.companyName);
    const best =
      matches.find((m) => m.type === "Common Stock") ?? matches[0] ?? null;

    if (!best) {
      const fallback: ResolvedEntity = {
        name: state.companyName,
        ticker: null,
        domain: null,
        exchange: null,
        description: `No public-market match found for "${state.companyName}" on Finnhub.`,
      };
      return {
        resolvedEntity: fallback,
        errors: [
          `resolveEntity: no ticker match for "${state.companyName}" — falling back to name-only research.`,
        ],
      };
    }

    const profile = await getCompanyProfile(best.symbol);

    const resolvedEntity: ResolvedEntity = {
      name: profile.name || best.description,
      ticker: profile.ticker || best.symbol,
      domain: extractDomain(profile.weburl),
      exchange: profile.exchange ?? null,
      description: profile.finnhubIndustry
        ? `${profile.name} — ${profile.finnhubIndustry}`
        : profile.name,
    };

    return { resolvedEntity };
  }
);

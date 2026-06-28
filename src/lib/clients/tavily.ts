export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
}

export async function tavilySearch(
  query: string,
  options: { maxResults?: number; topic?: "general" | "news" } = {}
): Promise<TavilySearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.TAVILY_API_KEY ?? ""}`,
    },
    body: JSON.stringify({
      query,
      max_results: options.maxResults ?? 5,
      topic: options.topic ?? "general",
      search_depth: "basic",
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily search failed (${res.status}) for query: ${query}`);
  }

  const data = (await res.json()) as { results: TavilySearchResult[] };
  return data.results;
}

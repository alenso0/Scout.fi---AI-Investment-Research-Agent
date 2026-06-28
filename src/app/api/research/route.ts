import { NextRequest } from "next/server";
import { buildScoutGraph } from "@/lib/agent/graph";
import type { ScoutState } from "@/lib/agent/state";
import {
  beginRun,
  checkIpRateLimit,
  getCachedResult,
  isResearchInFlight,
  setCachedResult,
} from "@/lib/server/guard";

// Gemini's free tier on this account caps at 20 requests/day; src/lib/clients/llm.ts
// falls back to Groq automatically when that's hit, so runs no longer wait out
// a backoff window — this just leaves headroom for normal API latency.
// Requires Fluid Compute on Vercel Hobby to get past the default 60s cap.
export const maxDuration = 90;

const NODE_LABELS: Record<string, string> = {
  resolveEntityStep: "Resolving company…",
  financialsResearch: "Researching financials…",
  newsResearch: "Reading recent news…",
  competitiveResearch: "Checking competitors…",
  riskResearch: "Surfacing risk factors…",
  bullCaseStep: "Building the bull case…",
  bearCaseStep: "Red-teaming the case…",
  scoringStep: "Scoring the rubric…",
  memoWriterStep: "Writing the memo…",
};

function sseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";

  if (!companyName) {
    return new Response(JSON.stringify({ error: "companyName is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const cached = getCachedResult(companyName);
  if (cached) {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sseEvent("progress", { label: "Loading cached result…" }));
        controller.enqueue(sseEvent("done", { ...cached, cached: true }));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  if (!checkIpRateLimit(getClientIp(req))) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Try again in a bit." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  if (isResearchInFlight()) {
    return new Response(
      JSON.stringify({
        error: "Scout.fi is already researching another company — try again in a few seconds.",
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const endRun = beginRun();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const graph = buildScoutGraph();
        let finalState: ScoutState | null = null;

        const events = await graph.stream(
          { companyName },
          { streamMode: ["updates", "values"] }
        );

        for await (const [mode, data] of events) {
          if (mode === "updates") {
            for (const nodeName of Object.keys(data as Record<string, unknown>)) {
              const label = NODE_LABELS[nodeName] ?? `Running ${nodeName}…`;
              controller.enqueue(sseEvent("progress", { node: nodeName, label }));
            }
          } else if (mode === "values") {
            finalState = data as ScoutState;
          }
        }

        if (!finalState) {
          throw new Error("Graph produced no final state.");
        }

        if (!finalState.memo) {
          controller.enqueue(
            sseEvent("error", {
              message: "Research failed to produce a memo.",
              errors: finalState.errors,
            })
          );
        } else {
          const payload = {
            memo: finalState.memo,
            resolvedEntity: finalState.resolvedEntity,
            errors: finalState.errors,
          };
          setCachedResult(companyName, payload);
          controller.enqueue(sseEvent("done", payload));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(sseEvent("error", { message }));
      } finally {
        endRun();
        controller.close();
      }
    },
    cancel() {
      endRun();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

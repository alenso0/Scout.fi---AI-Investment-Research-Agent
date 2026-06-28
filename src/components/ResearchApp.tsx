"use client";

import { useState } from "react";
import type { Memo as MemoType, ResolvedEntity } from "@/lib/agent/state";
import { parseSSEStream } from "@/lib/sse";
import { CompanyForm } from "./CompanyForm";
import { ProgressTimeline } from "./ProgressTimeline";
import { Memo } from "./Memo";

type DonePayload = { memo: MemoType; resolvedEntity: ResolvedEntity | null; errors: string[] };

type AppState =
  | { status: "idle" }
  | { status: "loading"; steps: string[] }
  | { status: "success"; result: DonePayload }
  | { status: "error"; message: string };

export function ResearchApp() {
  const [state, setState] = useState<AppState>({ status: "idle" });

  async function runResearch(companyName: string) {
    setState({ status: "loading", steps: [`Looking into ${companyName}…`] });

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: "Request failed." }));
        setState({ status: "error", message: body.error ?? "Request failed." });
        return;
      }

      for await (const message of parseSSEStream(response)) {
        if (message.event === "progress") {
          const label = (message.data as { label: string }).label;
          setState((prev) =>
            prev.status === "loading"
              ? { status: "loading", steps: [...prev.steps, label] }
              : prev
          );
        } else if (message.event === "done") {
          setState({ status: "success", result: message.data as DonePayload });
        } else if (message.event === "error") {
          const msg = (message.data as { message: string }).message;
          setState({ status: "error", message: msg });
        }
      }
    } catch {
      setState({ status: "error", message: "Lost connection while researching. Try again." });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <CompanyForm onSubmit={runResearch} disabled={state.status === "loading"} />

      {state.status === "loading" && <ProgressTimeline steps={state.steps} />}

      {state.status === "error" && (
        <div className="border border-verdict-pass bg-verdict-pass-bg p-4 text-sm text-verdict-pass">
          {state.message}
        </div>
      )}

      {state.status === "success" && (
        <Memo
          memo={state.result.memo}
          resolvedEntity={state.result.resolvedEntity}
          errors={state.result.errors}
        />
      )}
    </div>
  );
}

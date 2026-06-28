import type { Memo as MemoType, ResolvedEntity } from "@/lib/agent/state";
import { VerdictBadge } from "./VerdictBadge";
import { CompanyLogo } from "./CompanyLogo";
import { RubricChart } from "./RubricChart";
import { ResearchSectionCard } from "./ResearchSectionCard";

/** Errors arrive as "<node>: <raw SDK error>" — show just the affected step. */
function summarizeErrors(errors: string[]): string[] {
  return Array.from(new Set(errors.map((e) => e.split(":")[0].trim())));
}

export function Memo({
  memo,
  resolvedEntity,
  errors,
}: {
  memo: MemoType;
  resolvedEntity: ResolvedEntity | null;
  errors: string[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <CompanyLogo domain={resolvedEntity?.domain ?? null} name={resolvedEntity?.name ?? "?"} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{resolvedEntity?.name}</h2>
            {resolvedEntity?.ticker && (
              <span className="font-mono text-xs text-muted">{resolvedEntity.ticker}</span>
            )}
          </div>
          <p className="text-sm text-muted">{resolvedEntity?.description}</p>
        </div>
        <VerdictBadge verdict={memo.verdict} />
      </div>

      <div className="border border-border p-4">
        <p className="text-base font-medium">{memo.oneLineThesis}</p>
        <p className="mt-1 font-mono text-xs text-muted">
          Composite score: {memo.compositeScore.toFixed(2)} / 5
        </p>
      </div>

      {errors.length > 0 && (
        <div className="border border-verdict-watch bg-verdict-watch-bg p-3 text-xs text-verdict-watch">
          Some steps hit a temporary data-source or rate-limit issue and were skipped:{" "}
          {summarizeErrors(errors).join(", ")}. The verdict below reflects the research that
          did complete.
        </div>
      )}

      <div>
        <h3 className="mb-3 font-mono text-xs tracking-wide text-muted uppercase">
          Scoring rubric
        </h3>
        <RubricChart rubric={memo.rubric} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 font-mono text-xs tracking-wide text-muted uppercase">
            Bull case
          </h3>
          <p className="text-sm leading-relaxed">{memo.bullCase}</p>
        </div>
        <div>
          <h3 className="mb-2 font-mono text-xs tracking-wide text-muted uppercase">
            Bear case
          </h3>
          <p className="text-sm leading-relaxed">{memo.bearCase}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <ResearchSectionCard title="Financial health" section={memo.sections.financials} />
        <ResearchSectionCard title="Recent news & sentiment" section={memo.sections.news} />
        <ResearchSectionCard title="Competitive landscape" section={memo.sections.competitive} />
        <ResearchSectionCard title="Risk factors" section={memo.sections.risk} />
      </div>
    </div>
  );
}

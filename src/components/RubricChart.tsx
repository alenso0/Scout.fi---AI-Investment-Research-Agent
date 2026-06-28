import type { RubricDimension } from "@/lib/agent/state";

const DIMENSION_LABELS: Record<RubricDimension["dimension"], string> = {
  financialHealth: "Financial health",
  marketPosition: "Market position",
  momentum: "Momentum",
  growthTrajectory: "Growth trajectory",
  riskFactors: "Risk factors",
};

export function RubricChart({ rubric }: { rubric: RubricDimension[] }) {
  return (
    <div className="flex flex-col gap-3">
      {rubric.map((dim) => {
        const isRisk = dim.dimension === "riskFactors";
        const displayScore = isRisk ? 6 - dim.score : dim.score;
        return (
          <div key={dim.dimension}>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm">{DIMENSION_LABELS[dim.dimension]}</span>
              <span className="font-mono text-xs text-muted">
                {dim.score.toFixed(1)}/5{isRisk ? " (raw risk, lower is better)" : ""}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-border">
              <div
                className="h-1.5 rounded-full bg-foreground"
                style={{ width: `${(displayScore / 5) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">{dim.rationale}</p>
          </div>
        );
      })}
    </div>
  );
}

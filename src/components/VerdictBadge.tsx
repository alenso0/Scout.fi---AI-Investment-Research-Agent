import type { Verdict } from "@/lib/agent/state";

const VERDICT_STYLES: Record<Verdict, { label: string; classes: string }> = {
  invest: { label: "Invest", classes: "bg-verdict-invest-bg text-verdict-invest" },
  watch: { label: "Watch", classes: "bg-verdict-watch-bg text-verdict-watch" },
  pass: { label: "Pass", classes: "bg-verdict-pass-bg text-verdict-pass" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const { label, classes } = VERDICT_STYLES[verdict];
  return (
    <span
      className={`inline-flex items-center rounded-sm px-3 py-1 text-sm font-semibold tracking-wide uppercase ${classes}`}
    >
      {label}
    </span>
  );
}

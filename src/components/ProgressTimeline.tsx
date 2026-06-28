export function ProgressTimeline({ steps }: { steps: string[] }) {
  return (
    <ul className="flex flex-col gap-2 font-mono text-sm">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={`${step}-${i}`} className="flex items-center gap-2">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                isLast ? "animate-pulse bg-foreground" : "bg-muted"
              }`}
            />
            <span className={isLast ? "text-foreground" : "text-muted"}>{step}</span>
          </li>
        );
      })}
    </ul>
  );
}

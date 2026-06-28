import type { ResearchSection } from "@/lib/agent/state";

export function ResearchSectionCard({
  title,
  section,
}: {
  title: string;
  section: ResearchSection;
}) {
  return (
    <div className="border-t border-border pt-4">
      <h3 className="mb-2 font-mono text-xs tracking-wide text-muted uppercase">{title}</h3>
      <p className="text-sm leading-relaxed">{section.summary}</p>
      {section.citations.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {section.citations.map((citation) => (
            <li key={citation.url} className="text-xs">
              <a
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted underline-offset-2 hover:underline"
              >
                {citation.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

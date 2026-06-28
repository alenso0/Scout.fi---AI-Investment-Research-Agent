import { ResearchApp } from "@/components/ResearchApp";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
      <header className="mb-10">
        <h1 className="font-mono text-lg font-semibold tracking-tight">SCOUT.FI</h1>
        <p className="mt-1 text-sm text-muted">
          Give it a company name. It researches it and returns an evidence-backed
          Invest / Watch / Pass verdict, with every claim cited.
        </p>
      </header>

      <main className="flex-1">
        <ResearchApp />
      </main>

      <footer className="mt-16 border-t border-border pt-4 font-mono text-xs text-muted">
        Not financial advice. Scout.fi is a research-assistant demo, not a trading or
        compliance-grade product.
      </footer>
    </div>
  );
}

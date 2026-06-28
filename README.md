# Scout.fi — AI Investment Research Agent

Give it a company name. It researches it across financials, news, competitive
position, and risk, then runs a bull/bear critic pass and returns an
evidence-backed **Invest / Watch / Pass** verdict with every claim cited.

Built for the InsideIIM × Altuni AI Labs AI Product Development Engineer
take-home assignment.

## Overview

Scout.fi is a single Next.js app (frontend + backend in one) wrapping a
LangGraph.js multi-agent pipeline. You type a company name; it streams live
progress as a graph of agents resolves the company, researches four
dimensions in parallel, builds and red-teams an investment case, scores a
weighted rubric, and assembles a memo — all grounded in cited sources, not
vibes.

It only covers **public, ticker-bearing companies** by design (see
[Key decisions](#key-decisions--trade-offs)).

## How to run it

**Requirements:** Node 18+, and three free API keys.

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Get three free API keys** and put them in a `.env` (or `.env.local`)
   file in the project root:

   ```
   GOOGLE_API_KEY=
   FINNHUB_API_KEY=
   TAVILY_API_KEY=
   ```

   - **Gemini** — https://aistudio.google.com/apikey (Google AI Studio, free tier)
   - **Finnhub** — https://finnhub.io/register (free tier, ~60 calls/min)
   - **Tavily** — https://app.tavily.com/sign-up (free tier, 1,000 searches/month)

3. **Run it**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, type a company name (e.g. `Tesla`), hit
   Research.

   **A run can take 15 seconds to ~2 minutes.** Gemini's free tier is
   rate-limited (measured live: `gemini-2.5-flash` is much more workable than
   the `-latest` alias — see below); the app retries through rate limits
   automatically rather than failing, but that means waiting, not erroring,
   is the expected slow-path behavior. The live progress steps tell you
   what's happening throughout.

4. **Deploy (optional, bonus points):**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```
   Then add the same three env vars in the Vercel dashboard
   (Project → Settings → Environment Variables) and run `vercel --prod`.

## How it works

### Architecture

A LangGraph.js graph, not a single prompt chain:

```
                    Resolve Entity (Finnhub: name → ticker/profile)
                              │
        ┌──────────┬──────────┼──────────┐
        ▼          ▼          ▼          ▼
   Financials    News    Competitive    Risk        (parallel — own
   (Finnhub)   (Tavily)   (Finnhub +   (Tavily)       data source each,
                            Tavily)                   own Gemini summary)
        └──────────┴──────────┴──────────┘
                              │
                         Bull Case          (strongest case FOR investing)
                              │
                         Bear Case          (red-teams the bull case,
                              │              grounded in the risk research)
                              │
                      Scoring + Verdict     (LLM scores 5 rubric dimensions
                              │              + writes a one-line thesis in
                              │              the same call; composite score
                              │              and Invest/Watch/Pass verdict
                              │              are computed deterministically
                              │              in code from those scores)
                              │
                         Memo Writer        (pure assembly, no LLM call)
```

Each node is wrapped in a `safeNode` helper: if a node throws (a dead API
key, a 503, a timeout), the error is recorded into `state.errors` and the
graph keeps going with that section marked unavailable, rather than the
whole run crashing. This was tested for real, not just in theory — see
[Example runs](#example-runs).

### Scoring rubric

Five dimensions, each scored 1–5 by the LLM with a cited rationale, then
combined with a **deterministic, auditable weighted formula** (not another
LLM call):

| Dimension | Weight |
|---|---|
| Financial health | 25% |
| Market position / moat | 20% |
| Momentum / sentiment | 15% |
| Growth trajectory | 20% |
| Risk factors (inverted: 5 = severe risk) | 20% |

Composite score ≥3.8 → Invest, ≥2.8 → Watch, else Pass. The UI shows the
per-dimension bars and rationale, not just the final label.

### Stack

- **Frontend + backend:** Next.js 16 (App Router), one app, Route Handlers
  with Server-Sent Events for live progress streaming.
- **AI orchestration:** LangGraph.js (`@langchain/langgraph`) + LangChain.js
  tool/message plumbing.
- **LLM:** Google Gemini, via `@langchain/google-genai`, **pinned to
  `gemini-2.5-flash`** (see trade-offs below).
- **Data sources:** Finnhub (financials, peers, company profile), Tavily
  (web search/grounding for news, competitive context, risk signals),
  Clearbit's free logo API (company logos).
- **Styling:** Tailwind v4, Geist Sans + Geist Mono (`next/font/google`),
  a near-monochrome design system with color reserved only for the
  Invest/Watch/Pass verdict signal — deliberately not the purple-gradient/
  glassmorphism "AI app" template.

## Key decisions & trade-offs

- **Public companies only.** Free, structured, abundant data (SEC/Finnhub)
  beats trying to also cover private startups on Crunchbase-tier data this
  project doesn't have free access to. Explicitly out of scope, not an
  oversight.

- **Gemini Flash for every node — no Pro.** Gemini Pro was paywalled off the
  free tier in April 2026; staying on the free tier means Flash handles
  everything, including the critic/scoring/synthesis steps that would
  ideally use a stronger model.

- **`gemini-2.5-flash`, not `gemini-flash-latest`.** This was a real bug I
  caught by actually running the pipeline, not by reading docs: the
  `-latest` alias resolved to `gemini-3.5-flash`, a preview model capped at
  **20 requests/day** on the free tier — exhausted after a couple of test
  runs. Pinning to the established `gemini-2.5-flash` model uses a separate,
  far more workable quota. Lesson: alias model IDs are a latent footgun for
  anything that needs predictable quota behavior.

- **Retry-with-backoff around every Gemini call** (`src/lib/clients/gemini.ts`),
  parsing the `retryDelay` hint Google's 429 response actually returns,
  rather than guessing. LangChain's own internal retries are disabled
  (`maxRetries: 0`) so they don't compound with this explicit retry —
  nested retry logic was producing multi-minute hangs before that fix.

- **One-line thesis is generated inside the scoring call**, not a separate
  Gemini call in the memo writer. Originally the memo writer made its own
  LLM call; once live testing showed the real rate-limit pressure (a run
  needs ~6 Gemini calls against a 5–10 RPM ceiling), cutting one redundant
  call mattered. The memo writer is now pure assembly with zero LLM calls.

- **Bull/bear critic pattern, not a single "decide" prompt.** A dedicated
  node argues the strongest case *for* investing; a second node explicitly
  red-teams it grounded in the risk research. This is the main defense
  against the generic-positivity-bias failure mode of single-prompt agents.

- **Auditable rubric over a bare verdict.** The LLM scores five dimensions
  with cited rationale; the weighting math that turns those scores into a
  composite and a verdict band is plain deterministic code, shown in the UI.
  An LLM picking "Invest" with no visible reasoning was the bar every weak
  submission would clear — this doesn't.

- **In-memory cache + rate-limit guardrails on the deployed app**
  (`src/lib/server/guard.ts`): per-company result caching (TTL a few hours),
  a per-IP request cap, and a single-in-flight-run lock for the whole
  deployment, since Gemini's free-tier RPM is a shared budget across every
  visitor, not per-user. Resets on cold start / isn't shared across
  serverless instances — a known limitation, not an oversight (see below).

- **Citations on every claim.** Each research section carries the actual
  source URLs it was grounded in (Tavily search results, Finnhub data
  links). Nothing in the memo is asserted without a link a reader can check.

## Example runs

### Tesla → **Watch** (composite score 3.65/5)

> *"Tesla's dominant market position and strong growth are significantly
> challenged by severe litigation and regulatory risks surrounding its Full
> Self-Driving technology."*

| Dimension | Score | Why |
|---|---|---|
| Financial health | 4/5 | Current ratio 2.16, debt/equity 0.102, 5yr EPS growth 38.32% |
| Market position | 5/5 | "Wide moat" — integrated software ecosystem, manufacturing efficiency, DTC brand |
| Momentum | 3/5 | News research hit a transient Gemini 503 mid-run — scored conservatively rather than guessing |
| Growth trajectory | 5/5 | 38.32% 5yr EPS growth, multi-market expansion (auto, AI, energy) |
| Risk factors | 5/5 (high risk) | Multiple active NHTSA investigations and lawsuits over FSD-related fatal crashes |

This run is a good demonstration of the graceful-degradation path in
practice, not just in theory: the **news** and **bear case** steps both hit
a real `503 (high demand)` from Gemini mid-run. Both failures were caught,
recorded, and the run still produced a complete memo — momentum scored
conservatively and bear case fell back to unavailable, rather than the
whole request failing. Full raw output (errors included) is in
`docs/example-runs/tesla.json`.

### [Second company — see below, captured live]

## What I would improve with more time

- **Cut Gemini calls further.** Even at 6 calls/run, the free tier's RPM
  means most runs spend real time in backoff. Folding the bull/bear pair
  into one structured call (two fields, one request) would bring it to ~5
  and make most runs comfortably rate-limit-free instead of usually-fine.
- **Durable cache.** The in-memory cache resets on every cold start and
  isn't shared across serverless instances. Upstash Redis or Vercel KV would
  make the caching guardrail actually reliable in production, not just
  within one warm lambda.
- **Decouple thesis generation from rubric scoring** so the one-line thesis
  can't theoretically drift from the deterministically-computed verdict —
  currently they're generated by the same call and are highly correlated in
  practice, but not formally guaranteed consistent.
- **Eval harness.** A small set of test companies with an LLM-as-judge pass
  checking citation grounding and rubric consistency across runs, to catch
  drift instead of only catching it by hand.
- **Follow-up chat** on a completed memo, grounded in the same research
  context, so the tool becomes interactive instead of one-shot.
- **Peer benchmarking table** — Finnhub already returns peer tickers; a
  side-by-side score comparison would be a natural extension of the
  competitive-landscape research that's already being fetched.
- **Shareable/exportable memo** (copy link or PDF) so a result can be
  revisited or forwarded, reusing the existing cache layer.

## Bonus: LLM chat transcript

This entire project — PRD, architecture decisions, every line of code, and
the live debugging session that uncovered the rate-limit/model-alias issues
above — was built in a single conversation with Claude Code (Claude Sonnet
4.6). [Transcript / chat log placeholder — export and attach per the
assignment's bonus instructions.]

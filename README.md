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

**Requirements:** Node 18+, and four free API keys.

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Get four free API keys** and put them in a `.env` (or `.env.local`)
   file in the project root:

   ```
   GOOGLE_API_KEY=
   GROQ_API_KEY=
   FINNHUB_API_KEY=
   TAVILY_API_KEY=
   ```

   - **Gemini** — https://aistudio.google.com/apikey (Google AI Studio, free tier)
   - **Groq** — https://console.groq.com/keys (free, no billing required —
     automatic fallback LLM when Gemini is rate-limited; see below)
   - **Finnhub** — https://finnhub.io/register (free tier, ~60 calls/min)
   - **Tavily** — https://app.tavily.com/sign-up (free tier, 1,000 searches/month)

3. **Run it**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, type a company name (e.g. `Tesla`), hit
   Research.

   **A run typically takes 15-30 seconds.** Gemini's free tier on this
   account caps at 20 requests/day (measured live — see
   [Example runs](#example-runs)); once that's hit, every Gemini call fails
   identically regardless of which Gemini model is used. Rather than
   waiting out a quota that won't reset for hours, the app falls back to
   Groq automatically on any Gemini failure, so a run stays fast and
   working instead of stalling.

4. **Deploy (optional, bonus points):**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```
   Then add the same four env vars in the Vercel dashboard
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
- **LLM:** Google Gemini (`gemini-2.5-flash`, via `@langchain/google-genai`)
  as primary, with Groq (`llama-3.3-70b-versatile`, via `@langchain/groq`)
  as an automatic fallback when Gemini is rate-limited or quota-exhausted
  (see trade-offs below).
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

- **`gemini-2.5-flash`, not `gemini-flash-latest`.** Caught by actually
  running the pipeline, not by reading docs: the `-latest` alias resolved to
  `gemini-3.5-flash`, a preview model with a 5 RPM ceiling. Switching to the
  established `gemini-2.5-flash` model fixed the per-minute throttling —
  but **this Google account's free tier turned out to cap at a flat 20
  requests/day, and that cap applies identically across every Gemini model
  tried.** Switching models bought a fresh per-minute budget, not a fresh
  daily one. See the Zomato example below for what that looks like live.

- **Groq as an automatic fallback LLM** (`src/lib/clients/llm.ts`), wired in
  with LangChain's `.withFallbacks()` once the daily-cap discovery above
  made it clear that waiting out a Gemini quota mid-run wasn't a viable
  fix — there's nothing to wait *for* until the next Pacific-time reset.
  Every call tries Gemini first; on any failure (rate limit, quota, a
  transient 503), it falls straight to Groq's `llama-3.3-70b-versatile`
  instead of retrying the same exhausted quota. This both fixed today's
  testing wall and made the product itself more resilient than a
  single-provider design — a free account hitting its daily cap mid-run
  no longer means the run stalls or fails.

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
[`docs/example-runs/tesla.json`](docs/example-runs/tesla.json).

### Zomato → **Invest** (composite score 3.8/5) — and the two real bugs it surfaced

This example is included for the iteration story as much as the result —
three live runs, two real bugs found and fixed in between, kept rather than
quietly smoothed over:

**Run 1 (total failure):** Finnhub returned a 403 on Zomato's profile
lookup — its free tier doesn't reliably cover NSE-listed (Indian exchange)
companies the way it covers US-listed ones, a real international-coverage
gap, not a code bug. Simultaneously, Gemini's account-level daily cap (20
requests/day, hit earlier that day testing Tesla across two different
model IDs) meant **zero** of the six Gemini calls succeeded either. The
system still returned a clean, complete memo — verdict defaulted to
`watch`, every section marked "Unavailable for this run," no crash, no
hang. That run is exactly what motivated adding the Groq fallback.

**Run 2 (Groq fallback added, ~7s):** same Zomato request, now failing
over to Groq on every Gemini call instead of stalling on the dead daily
quota. It produced a full memo — but inspecting it surfaced a second real
bug: the **news** and **risk** sections summarized completely unrelated
search results (a Peabody Energy lawsuit, a Taco Bell parking-lot story,
Tesla FSD news) as if they were findings about Zomato, because the
grounding instruction said "don't make unsupported claims" but never said
"discard sources that aren't actually about the company." Tavily's search
noise was being summarized as signal.

**Run 3 (grounding prompt tightened, ~7s):** same request, after adding an
explicit instruction to discard off-topic sources and say so plainly
instead of summarizing them. Same noisy Tavily results, very different
output — **news** and **risk** now correctly read *"No relevant
information was found about Zomato in the provided sources... none of
these sources mention Zomato."* **competitive**, whose search results were
actually on-topic, still produced a real summary (56% Indian food-delivery
market share, Swiggy as the closest competitor, Blinkit's quick-commerce
expansion). Verdict: **Invest**, 3.8/5, with financial health and risk
both scored conservatively (3/5) precisely because that data was genuinely
unavailable, not guessed at.

Full raw output for all three stages — the failure, the fallback, and the
grounding fix — is in
[`docs/example-runs/zomato.json`](docs/example-runs/zomato.json) (final
state) and the chat transcript (full history).

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
- **Better non-US exchange coverage.** Finnhub's free tier 403'd on
  Zomato's NSE listing — a paid Finnhub tier or a secondary fallback data
  source (e.g. Yahoo Finance's unofficial API) would close this gap for
  Indian and other non-US-listed companies specifically.
- **A third LLM provider, or retry logic within Groq itself.** The current
  fallback chain is Gemini → Groq, one level deep. If Groq also has a
  transient issue (or its own free-tier limits, under heavier use), there's
  currently no second fallback — the section just degrades, same as before
  the fallback existed.
- **Surface which provider actually answered.** Right now a Groq-served
  section looks identical to a Gemini-served one in the UI. A small
  "via Groq fallback" tag would make the resilience visible instead of
  invisible.
- **Drop citations when a section finds nothing relevant.** When the
  grounding fix correctly says "no relevant information found" (see the
  Zomato news/risk sections), the citations array still lists the
  irrelevant sources that were searched but discarded — a minor but real
  inconsistency between what the summary says and what the UI displays
  underneath it.

## Bonus: LLM chat transcript

This entire project — PRD, architecture decisions, every line of code, and
the live debugging session that uncovered the rate-limit/model-alias issues
above — was built in a single conversation with Claude Code (Claude Sonnet
4.6). [Transcript / chat log placeholder — export and attach per the
assignment's bonus instructions.]

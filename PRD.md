# PRD — Scout.fi: AI Investment Research Agent

**Context:** Take-home for AI Product Development Engineer (Intern) — InsideIIM × Altuni AI Labs
**Deadline:** 7 days from receipt
**Author:** Alen Alex

---

## 1. Problem & Goal

The assignment is open-ended on purpose: "takes a company name, does research, decides invest/pass, with reasoning." The bar isn't the idea — every candidate gets the same one-liner — the bar is **rigor of the decision process** and **product polish**. A recruiter will read ~50 of these. What gets remembered is: did it feel like a real analyst tool, or a wrapper around one prompt?

**Goal:** Build a tool where you give it a company name and get back a structured, evidence-backed investment memo with a clear Invest/Pass/Watch verdict — fast, transparent about its sources, and pleasant to use.

## 2. Non-goals

- Not a real trading/advisory product — no real money, no compliance-grade financial advice. Add a visible disclaimer.
- Not trying to cover every asset class — pick one lane (see §5) and go deep rather than shallow-covering public + private + crypto.
- Not building user accounts/auth/multi-tenant infra — single-session tool is fine.

## 3. Mandated constraints (from the assignment — non-negotiable)

| Constraint | Detail |
|---|---|
| Frontend | React or Next.js |
| Backend | Node.js or Next.js |
| AI orchestration | LangChain.js / LangGraph.js |
| LLM provider | Free choice (cost/quality tradeoff is yours to own and justify in README) |
| Deploy | Bonus for live Vercel link |
| Deliverable | Zip with code + README (Overview, How to run, How it works, Key decisions & trade-offs, Example runs, What you'd improve) |
| Bonus | Full LLM chat transcripts from building it |
| Rule | Strictly solo; must be able to explain every line |

## 4. Target persona

Two audiences, same product:
- **In-story user:** a retail/angel investor or analyst who wants a fast first-pass screen on a company before deciding whether to dig deeper.
- **Real evaluator:** the recruiter/hiring panel, who is implicitly grading product judgment, AI-orchestration skill, and engineering taste — not stock-picking accuracy.

## 5. Scope decision: which companies?

Pick **public companies** as the primary lane (ticker-bearing). Reasoning to put in README:
- Public companies have abundant, structured, *free* data (SEC filings, price/financials APIs, news) — more reliable grounding, fewer hallucinations, easier to demo on names the recruiter recognizes (e.g. Tesla, Zomato, Nvidia).
- Private/startup research depends on Crunchbase-tier paid data that's hard to get free access to in 7 days.
- Note in README as an explicit, called-out trade-off (the assignment rewards naming your ambiguity calls).

## 6. Core user flow (MVP)

1. User types a company name (or ticker) into a single input.
2. Agent resolves it to a ticker/entity, fans out research across a few dimensions in parallel.
3. UI streams live progress ("Researching financials… Reading recent news… Checking competitors…") — not a blank loading spinner.
4. Agent synthesizes findings into a scored memo and a final **Invest / Pass / Watch** verdict with a one-line thesis.
5. User can expand into the full memo: per-section evidence, sources/citations, and the scoring breakdown.
6. User can ask a follow-up question in chat ("what about their debt load?") and the agent answers grounded in the same research context.

## 7. Agent architecture (LangGraph.js)

Use a graph, not a single chain — this is the single highest-leverage decision for "how you build it," since it's the part of the stack the assignment explicitly calls out.

```
                    ┌─────────────┐
                    │  Resolve     │  company name → ticker/entity + basic profile
                    │  Entity      │
                    └──────┬──────┘
                           │
        ┌──────────┬───────┴────────┬─────────────┐
        ▼          ▼                ▼             ▼
   ┌─────────┐ ┌──────────┐  ┌─────────────┐ ┌───────────┐
   │Financials│ │  News /  │  │ Competitive │ │   Risk    │   (parallel nodes)
   │  Agent   │ │ Sentiment│  │  Landscape  │ │  Agent    │
   └────┬─────┘ └────┬─────┘  └──────┬──────┘ └─────┬─────┘
        └─────────────┴───────────────┴──────────────┘
                           │
                    ┌──────▼───────┐
                    │   Bull Case   │  builds the strongest "invest" argument
                    │   Agent       │
                    └──────┬───────┘
                    ┌──────▼───────┐
                    │   Bear Case /  │  red-teams the bull case, surfaces risks
                    │   Critic Agent │
                    └──────┬───────┘
                    ┌──────▼───────┐
                    │  Scoring &    │  weighted rubric → numeric score → verdict
                    │  Verdict Node │
                    └──────┬───────┘
                    ┌──────▼───────┐
                    │  Memo Writer  │  final structured report w/ citations
                    └──────────────┘
```

Each node should be a small, typed function with explicit input/output state — this is what makes the README's "How it works" section credible vs. hand-wavy.

## 8. Decision rubric (make the "reasoning" auditable)

A bare "the LLM said invest" is what every weak submission will ship. Differentiate by making the verdict **computed from a transparent rubric**, with the LLM filling in scores *per dimension with cited evidence*, not vibes:

| Dimension | Weight | Signal sources |
|---|---|---|
| Financial health | 25% | Revenue growth, margins, debt — from filings/financial API |
| Market position / moat | 20% | Competitor comparison, market share signals |
| Momentum / sentiment | 15% | Recent news tone, analyst sentiment |
| Growth trajectory | 20% | Historical trend + forward guidance |
| Risk factors | 20% (negative weight) | Litigation, regulatory, leadership churn, debt covenants |

Score 1–5 per dimension → weighted composite → threshold bands → **Invest / Watch / Pass**. Show the math in the UI, not just the label.

## 9. Data sources (all free-tier)

- **Prices/financials:** Finnhub (free tier, ~60 calls/min — replaces the originally-considered Alpha Vantage, whose free tier caps at 25 requests/day and is too restrictive to demo against)
- **News:** NewsAPI / GNews / Tavily search
- **Filings (stretch):** SEC EDGAR full-text search (free, no key)
- **General research/grounding:** Tavily or Exa search API (built for LLM agents, returns clean snippets — pairs naturally with LangGraph tool nodes)

## 10. Tech stack

- **Frontend:** Next.js (App Router) + Tailwind — one app, no separate FE/BE repos, satisfies both mandated options at once.
- **Backend:** Next.js API routes / Route Handlers, streaming responses (SSE or LangGraph's native streaming) to drive the live "agent is thinking" UI.
- **AI orchestration:** LangGraph.js, with LangChain.js tool-calling for the data-source integrations.
- **LLM:** Google Gemini, via `@langchain/google-genai`. **Revised:** as of April 2026, Gemini Pro is paywalled off the free tier (free tier now covers Flash/Flash-Lite only) — staying free-tier, so **Gemini Flash is used for every node**, including the Bull/Bear critic and Memo Writer/Verdict nodes, not just the research fan-out. Note this explicitly in the README as a cost-driven trade-off (the original plan was Flash-for-fanout/Pro-for-synthesis; revised once Pro's free access changed), rather than silently building around it — naming the constraint is itself a "key decision" worth a line.
- **Financial data:** Finnhub (free tier, ~60 calls/min) instead of Alpha Vantage — Alpha Vantage's free tier (25 requests/day, 5/min) is too restrictive to demo against reliably.
- **Deploy:** Vercel.

## 10b. Design system / visual identity

The single fastest way to look like every other submission is the generic "AI app" template: purple-to-blue gradient blob backgrounds, glassmorphic translucent cards, rounded-3xl everything with soft pastel shadows, a centered chat-bubble layout, Inter at one weight with no type hierarchy, sparkle emoji (✨🚀📊) as section icons, stock "AI brain/circuit" hero art. A recruiter who's screened a dozen of these will clock it instantly. **Explicitly avoid all of the above.**

Lean into what the product actually is — a research memo / analyst terminal, not a chatbot — because that's both thematically correct and inherently distinct from the slop template:

- **Layout:** real grid, not a single floating centered card in empty space. Treat it like a document/dashboard with a clear left-to-right or top-to-bottom information hierarchy.
- **Typography:** confident type hierarchy — a large, plain verdict headline (Invest/Watch/Pass), then structured sub-sections. **Locked: Geist Sans for UI/prose, Geist Mono for data** (tickers, scores, %, dates, source counts) — that pairing signals "built for data" instead of "built a chatbot," and ships free via `next/font/google` or the `geist` npm package. Avoid bare Inter — it's the most overused "AI app" default and reads as template, not a choice.
- **Color:** near-monochrome base (black/white/gray), with a single accent system reserved for verdict semantics only — green (Invest) / amber (Watch) / red (Pass) — used sparingly so it carries real meaning instead of decorating everything.
- **Data viz:** render the §8 rubric as an actual small bar/radar chart, not just a number in a card. Cheap to build, disproportionately raises perceived rigor.
- **Motion:** restrained, purposeful — e.g. each research node's status stepping in as it completes — not ambient gradient/blob animation.
- **Icons:** if used at all, a single consistent icon set (e.g. Lucide) at one weight — no emoji as UI furniture.

## 11. Non-functional requirements

- Stream progress — a 30-60s multi-agent run with no feedback reads as broken, not slow.
- Every factual claim in the memo should be traceable to a source link.
- Graceful degradation: if one data source fails/rate-limits, the memo says so instead of silently fabricating.
- Visible disclaimer: outputs are not financial advice.
- Cost awareness: log token usage / approximate $ cost per run (see open differentiator list below).

## 12. 7-day build plan

| Day | Focus |
|---|---|
| 1 | Repo scaffold, decide data sources & get API keys, define LangGraph state schema |
| 2 | Build Resolve-Entity + Financials + News nodes, wire up basic graph execution (no UI yet) |
| 3 | Add Competitive + Risk nodes, Bull/Bear critic nodes, scoring node |
| 4 | Memo Writer node + citation tracking; first end-to-end CLI run on 2-3 companies |
| 5 | Frontend: input → streaming progress → memo display + score breakdown |
| 6 | Polish: follow-up chat, error handling, deploy to Vercel, example runs |
| 7 | README (all required sections), export chat transcripts, buffer for bugs |

## 13. Open questions / risks (flag in README per the "note ambiguity" ground rule)

- Free-tier API rate limits may throttle demoing multiple companies back-to-back — mitigate with caching per company.
- LLM hallucination risk on financial figures — mitigated by citation requirement + tool-grounded answers only.
- Single LLM provider key cost — keep a token/cost budget in mind across the 7 days of iteration, not just the final product's runtime cost.

## 13b. Locked scope decisions

The following are **MVP-required**, not stretch goals, per discussion:

- Bull/Bear critic nodes + auditable weighted rubric (§7, §8)
- Citations on every claim in the memo (§11)
- Streaming "agent is thinking" progress UI (§6, §11)
- Live Vercel deploy + exported real LLM chat transcripts in the submission (assignment bonus items)
- LLM provider: Gemini Flash for all nodes (free tier; Pro is no longer free as of Apr 2026 — see §10)
- Financial data: Finnhub, not Alpha Vantage (see §9, §10)
- Vercel: explicit `maxDuration` config + streaming/Fluid Compute enabled so multi-agent runs (~30–60s) don't silently time out on Hobby plan's default 60s limit (see §15)

Everything else in §6 "what to improve" / stretch ideas (peer benchmarking, follow-up chat, cost/token logging) stays optional and only gets built if Day 6 has slack.

## 14. Success criteria (how this gets graded, implicitly)

1. Does the agent's "reasoning" look like reasoning (rubric, citations, bull/bear) or like a single paragraph from one prompt?
2. Is the orchestration visibly using LangGraph's graph/state model, or is it one big chain pretending to be an agent?
3. Does the product feel finished — loading states, error states, empty states, not just the happy path?
4. Is the README good enough that someone could run it cold with their own API keys?
5. (Bonus) Live deployed link. (Bonus) Real chat transcripts, not fabricated ones.

## 15. Gaps identified in this pass

- **Company visual identity:** pull each company's logo (Clearbit Logo API `logo.clearbit.com/{domain}`, free, no key) next to its name in the memo header. Small touch, large perceived-polish payoff — turns a wall of text into something that looks like a real product.
- **Public-deploy abuse guardrails:** once the Vercel link is live, anyone (including the recruiter, repeatedly) can hit it. Add a per-IP/session rate limit and a small cache (company → memo, TTL a few hours) so free-tier API keys don't get exhausted mid-review. Currently only noted as a data-source risk in §13 — needs to become an actual implemented guardrail, not just a risk note.
- **OG image / favicon for the shared link:** if the Vercel URL gets pasted anywhere (Slack, email, LinkedIn), a default Next.js favicon and no Open Graph card undercuts all the UI work. Five-minute fix, easy to forget on day 7.
- **Shareable / exportable memo:** a "copy link to this result" or "export as PDF" affordance turns a one-off demo into something the recruiter can revisit or forward — worth more than it costs to build given it's mostly reusing the cache layer from the guardrail above.
- **Mobile responsiveness:** recruiters skim on phones between meetings. Not a redesign, just make sure the grid layout (§10b) collapses sensibly.
- **Empty/error/skeleton states matching the design system:** §11 says these must exist; §10b's design language needs to extend to them too, not just the happy-path memo view — a generic spinner or default browser error in an otherwise polished UI breaks the illusion immediately.
- **Vercel function duration:** Hobby plan defaults to 60s max without Fluid Compute (300s with it). A full multi-agent run can land right at that edge — set `maxDuration` explicitly in the route config and stream the response so it doesn't silently time out in production after working fine in local dev.
- **Gemini free-tier RPM:** Flash free tier is ~10 RPM. A single research run fires ~7-8 LLM calls (4 parallel fan-out + critic x2 + scoring + memo) — fine for one run, but back-to-back demo runs or dev-loop testing can hit the ceiling. Worth a short client-side cooldown/queue rather than letting requests silently 429.

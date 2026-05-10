# Inceptrax V2 — Phase 2 Specification

> **Tagline**: From product to business — monetization, retention, and scale.
>
> **Document version**: 1.0
> **Status**: Implementation-ready
> **Estimated build time**: 8–12 weeks for a solo developer at full pace
> **Author**: Phase 2 planning, post pitch-day

---

## 0. How to read this document

This is a working spec, not a marketing doc. Every section is meant to be turned into Linear/Notion tickets and built. Sections are ordered roughly by **what depends on what** — the migration in Section 4 must happen before anything in Sections 6 onwards, the pricing model in Section 3 drives Section 10, etc.

If you only have time to read three sections today, read 3, 6, and 14 — those are the ones where most projects bleed money or die in production.

Code snippets are illustrative patterns, not full implementations. They show the *shape* of the solution, not every line.

---

## 1. Mission & Scope

Phase 1 shipped the product. Phase 2 makes it a **business**. Two goals:

1. **Monetization** — credit system + subscription tiers + LemonSqueezy. Without this, every user is a cost center.
2. **Retention** — persistent AI agents that bring users back weekly, instead of the current one-shot "get a report and leave" pattern.

Every other Phase 2 task (FastAPI migration, RAG, programmatic SEO, observability, Docker) exists to support these two goals.

### In scope for Phase 2

- Migrate backend Flask → FastAPI
- Pricing model + credit ledger + subscription tiers
- LemonSqueezy integration (subscriptions, webhooks, refunds)
- 4 LangGraph-based AI agents (Idea Watcher, Competitor Watcher v2, Progress Coach, Pivot Suggester)
- RAG layer over user's own ideas/analyses (MongoDB Atlas Vector Search)
- Replace SerpAPI with Serper.dev + Tavily fallback
- Add Claude Haiku 4.5 to the model tier system (cheap short tasks)
- Add Claude Sonnet 4.5 for premium synthesis (Pro tier only)
- Programmatic SEO pages (target 500+ static pages)
- Inngest for background jobs (replace APScheduler + raw threading)
- Sentry for error tracking, structured logs
- Doppler/Infisical for secrets management
- Docker for environment parity (localhost == production behavior)
- Cloudflare in front of `inceptrax.com`
- Security hardening pass

### Explicitly OUT of scope (Phase 3 or later)

- AI website builder (Phase 3)
- Social media auto-posting / Markinnovate integration (Phase 3)
- Mobile native apps
- Self-hosted LLMs / GPU inference
- Multi-language support
- Team workspace / multi-seat (beyond shared idea viewing)
- Custom Stripe-style billing logic (we use LemonSqueezy as MoR specifically to avoid this)

---

## 2. Tech Stack — Phase 2 Additions

| Layer                | Phase 1                  | Phase 2                                                                   |
| -------------------- | ------------------------ | ------------------------------------------------------------------------- |
| Backend framework    | Flask 3.0                | **FastAPI 0.115+** (migrate)                                              |
| Server               | Gunicorn (sync)          | **Uvicorn** + Gunicorn worker (`uvicorn.workers.UvicornWorker`)           |
| AI cheap tier        | Gemini 2.5 Flash         | Same + **Claude Haiku 4.5** for short tasks                               |
| AI premium tier      | —                        | **Claude Sonnet 4.5** (Pro tier only, synthesis stages)                   |
| AI fallbacks         | Groq, OpenRouter         | Same                                                                      |
| Search               | SerpAPI                  | **Serper.dev** primary, **Tavily** fallback (drop SerpAPI)                |
| Background jobs      | APScheduler + threading  | **Inngest** (durable, retries, observability)                             |
| Vector DB / RAG      | None                     | **MongoDB Atlas Vector Search** (no new vendor)                           |
| Agent framework      | None                     | **LangGraph** (`langgraph`, `langchain-core`)                             |
| Payments             | None                     | **LemonSqueezy** (Merchant of Record, Pakistan-friendly)                  |
| Error tracking       | None                     | **Sentry** (free tier, 5K events/mo)                                      |
| Secrets              | `.env` files             | **Doppler** or **Infisical** (free tier)                                  |
| CDN / DDoS / WAF     | None                     | **Cloudflare** in front of domain (free)                                  |
| Containers           | None                     | **Docker** + `docker-compose` for parity                                  |
| Schema validation    | Manual                   | **Pydantic v2** (FastAPI built-in)                                        |
| HTTP client          | `requests`               | **`httpx`** (async, FastAPI-friendly)                                     |
| Logging              | print/logging            | **`structlog`** (JSON structured logs)                                    |

Frontend stays as-is (Next.js 16, React 19, Tailwind, Shadcn). Only changes there are: programmatic SEO pages, billing/upgrade UI, agent-result display components, and credit-balance widget.

---

## 3. Pricing, Credits & Profit Model

This is the most important section in the document. Get it wrong and you lose money.

### 3.1 Operation cost model

Every action that hits an external API has a known token / search cost. We translate everything into **credits** so users see one unit and we control margins.

Approximate API costs (verify on each provider's pricing page before launch — these change):

| Operation                              | Underlying cost     | Credits charged |
| -------------------------------------- | ------------------- | --------------- |
| Full 8-stage analysis (Flash + Haiku)  | ~$0.08              | **30**          |
| Re-analyze idea                        | ~$0.08              | **30**          |
| Single stage re-run                    | ~$0.012             | **5**           |
| Founder-Idea Match Score               | ~$0.005             | **2**           |
| Stress Test                            | ~$0.01              | **3**           |
| One-Liner Pitch Generator              | ~$0.003             | **1**           |
| Investor Pitch                         | ~$0.02              | **6**           |
| Research Hub                           | ~$0.025 (incl. Serper) | **8**        |
| AI Layers full session (~6 turns)      | ~$0.015             | **5**           |
| Voice/file → idea extraction           | ~$0.008             | **3**           |
| Competitor scan (manual trigger)       | ~$0.01 (Serper)     | **3**           |
| PDF / PPT export                       | $0 (no API call)    | **0**           |
| Chat / messaging                       | $0                  | **0**           |
| **Agent: Idea Watcher (weekly run)**   | ~$0.02              | **0** (included in subscription, not charged per-run) |
| **Agent: Competitor Watcher v2**       | ~$0.015             | **0**           |
| **Agent: Progress Coach**              | ~$0.005             | **0**           |
| **Agent: Pivot Suggester**             | ~$0.025             | **0**           |

**Rule:** Anything the user explicitly triggers costs credits. Anything an agent does in the background is free to the user but counts against tier-level agent caps (see 3.3).

### 3.2 Subscription tiers

| Tier      | Price (USD) | Price (PKR ~280:1) | Credits / month | Active agents | Premium models | RAG queries/day |
| --------- | ----------- | ------------------ | --------------- | ------------- | -------------- | --------------- |
| **Free**  | $0          | 0 PKR              | **50**          | 1 (Progress Coach only) | No (Flash/Haiku) | 5 |
| **Pro**   | $19/mo      | ~5,320 PKR         | **1,000**       | All 4         | Sonnet 4.5 unlocked | 100 |
| **Team**  | $49/mo      | ~13,720 PKR        | **3,000**       | All 4         | Sonnet 4.5 unlocked | 500 |

Annual billing offers 2 months free (Pro $190/yr, Team $490/yr).

**Free tier rationale:** 50 credits = 1 full analysis + ~5 small actions. Enough to prove value, not enough to be a freeloader. Hard limit: free users cannot run more than 2 ideas total (lifetime), regardless of credits. Forces upgrade for serious use.

### 3.3 Hard caps (abuse prevention)

Even Pro/Team have caps to stop runaway costs:

- Max 50 analyses per month per account (Pro)
- Max 150 analyses per month per account (Team)
- Max 20 agent-triggered scans per idea per week (caps weekly Idea Watcher / Competitor Watcher costs)
- Per-IP rate limit: 100 requests/min (in addition to user-level rate limits)
- Max 25 ideas per Pro account, 75 per Team

Caps are enforced server-side in middleware, not in the frontend. Never trust the frontend.

### 3.4 Profit math (Pro tier example)

Average user (30% credit utilization):
- API costs: ~$0.80/mo
- LemonSqueezy fee: 5% + $0.50 = ~$1.45
- Hosting share: ~$0.10
- **Net: ~$16.65/mo (88% margin)**

Power user (100% credit cap):
- API costs: ~$2.64/mo
- LemonSqueezy fee: ~$1.45
- Hosting share: ~$0.10
- **Net: ~$14.81/mo (78% margin)**

Worst-case abusive user (hits caps daily):
- API costs capped at ~$3.50/mo (because caps cap them)
- **Net: ~$13.95/mo (still profitable)**

The credit-and-cap system makes losing money on a paying user mathematically impossible.

### 3.5 Credit ledger schema (MongoDB)

New collection `credit_transactions`:

```
{
  _id, id (auto-inc),
  user_id,
  amount,              // negative = spend, positive = grant
  reason,              // "analysis", "subscription_grant", "refund", "manual_admin", etc.
  related_idea_id,     // nullable
  balance_after,       // for audit trail
  created_at
}
```

Plus on `users` collection, add denormalized `credit_balance` field. Every credit operation must update both atomically (use a MongoDB transaction or single-document `$inc` with optimistic check).

**Critical rule**: Credits are never deducted *before* the operation succeeds. Pattern:

```
1. Check balance >= cost (read)
2. Run operation (call AI, etc.)
3. On success: $inc balance by -cost AND insert ledger entry (transaction)
4. On failure: no deduction
```

If the AI call fails halfway, user gets a free retry. Better than charging for failures and dealing with refund tickets.

---

## 4. Backend Migration: Flask → FastAPI

### 4.1 Why migrate now

- **Async = 10–50× more concurrent users on the same server.** Your AI calls block for 5–30 seconds. Sync Flask = one worker tied up the whole time. FastAPI async = worker handles other requests while waiting on the AI.
- **Pydantic validation built in.** No more manual `request.json` checks. Pydantic models validate inputs and serialize outputs automatically.
- **Auto-generated `/docs`.** OpenAPI spec for free. Saves you from writing API docs by hand.
- **Better tooling.** Modern Python ecosystem has moved to async; libraries like `httpx`, `motor` (MongoDB async driver), and Inngest's Python SDK all assume async.

The longer you wait, the more code you migrate. Do it now.

### 4.2 Migration plan (week-by-week)

**Week 1: Setup and infrastructure**
- Add FastAPI to `requirements.txt`. Keep Flask installed in parallel during migration.
- Create `backend/app_fastapi/` alongside `backend/app/`. Migrate file-by-file.
- Set up `motor` for async MongoDB access. Keep PyMongo working in parallel.
- Convert `BaseDocument` ORM helpers to async versions.
- Set up Pydantic v2 models for every existing request/response shape.

**Week 2: Auth + users**
- Migrate `auth_routes.py` → `auth_router.py` (FastAPI router)
- Migrate `user_routes.py` → `user_router.py`
- JWT logic stays the same (PyJWT works fine with FastAPI)
- httpOnly cookie handling: FastAPI's `Response.set_cookie()` works identically
- Test auth flows end-to-end before moving on

**Week 3: Ideas + analysis**
- Migrate `idea_routes.py` (the big one)
- Convert background analysis from `threading.Thread` → Inngest function (see Section 9)
- Keep PDF/PPT generation sync (ReportLab/python-pptx are sync libraries — wrap in `asyncio.to_thread()`)

**Week 4: Remaining routes + cutover**
- Migrate admin, cofounder, chat, notifications, contact
- Switch `run.py` to `uvicorn` startup
- Update Render deploy config (`uvicorn app_fastapi.main:app --host 0.0.0.0 --port $PORT --workers 2`)
- Remove Flask code
- Production cutover: deploy FastAPI version behind same domain, smoke test, switch DNS if needed

### 4.3 Route conversion pattern

Flask:
```python
@bp.route("/<id>", methods=["GET"])
@token_required
def get_idea(current_user, id):
    idea = Idea.find_by_id(id)
    if not idea or idea.user_id != current_user.id:
        return jsonify({"error": "Not found"}), 404
    return jsonify(idea.to_dict())
```

FastAPI:
```python
@router.get("/{idea_id}", response_model=IdeaResponse)
async def get_idea(
    idea_id: int,
    current_user: User = Depends(get_current_user),
):
    idea = await Idea.find_by_id(idea_id)
    if not idea or idea.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Not found")
    return idea
```

Almost line-for-line. Pydantic handles serialization. `Depends()` replaces decorator chains. Errors via `HTTPException` instead of tuple returns.

### 4.4 Async patterns for AI calls

```python
async def run_stage(idea_id: int, stage: int) -> StageResult:
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            response = await call_gemini(client, prompt)
        except (TimeoutError, RateLimitError):
            try:
                response = await call_haiku(client, prompt)
            except RateLimitError:
                response = await call_groq(client, prompt)
    # ... process and store
```

`httpx.AsyncClient` replaces `requests`. All AI provider calls become async. Fallback chain stays the same logic, just async.

### 4.5 Gotchas

- **`bcrypt` is sync**: wrap in `asyncio.to_thread()` for password hashing/checking.
- **PyJWT is sync but fast**: leave it sync, no problem.
- **`reportlab` and `python-pptx` are sync**: wrap exports in `asyncio.to_thread()`. Don't try to async-ify them.
- **Flask-Limiter doesn't work with FastAPI**: use `slowapi` instead, same API surface.
- **Don't mix sync MongoDB (`pymongo`) and async (`motor`) in the same request handler.** Pick one per route.
- **`@admin_required` decorator pattern**: convert to a FastAPI `Depends()` dependency that raises `HTTPException(403)` if user isn't admin.

---

## 5. AI Model Tier Strategy

### 5.1 Model selection per task type

Build a single function `select_model(task_type, user_tier)` that maps every operation to the right model. Don't hardcode model names in route handlers.

| Task type                          | Free user model      | Pro/Team user model     |
| ---------------------------------- | -------------------- | ----------------------- |
| Quick refinement, classification   | Gemini Flash         | Claude Haiku 4.5        |
| One-liner generation               | Claude Haiku 4.5     | Claude Haiku 4.5        |
| Stage 1–4 (validation, market, audience, competitor) | Gemini Flash | Gemini Flash |
| Stage 5–7 (monetization, MVP, GTM) | Gemini Flash         | Claude Sonnet 4.5       |
| Stage 8 (final synthesis)          | Gemini Flash         | **Claude Sonnet 4.5**   |
| Founder-Idea Match Score           | Gemini Flash         | Claude Haiku 4.5        |
| Stress Test                        | Gemini Flash         | Claude Sonnet 4.5       |
| Investor Pitch                     | Gemini Flash         | Claude Sonnet 4.5       |
| AI Layers Q&A                      | Claude Haiku 4.5     | Claude Haiku 4.5        |
| Voice/file extraction              | Gemini Flash (multimodal) | Gemini Flash       |
| Agent reasoning (LangGraph nodes)  | Claude Haiku 4.5     | Claude Haiku 4.5        |
| Agent final output                 | Gemini Flash         | Claude Sonnet 4.5       |

### 5.2 Fallback chains

Each task has a fallback chain. If the primary fails (rate limit, timeout, invalid response), try the next.

| Primary               | Fallback 1            | Fallback 2            | Final fallback        |
| --------------------- | --------------------- | --------------------- | --------------------- |
| Claude Sonnet 4.5     | Claude Haiku 4.5      | Gemini Flash          | Groq Llama 3.3 70B    |
| Claude Haiku 4.5      | Gemini Flash          | Groq Llama 3.3 70B    | OpenRouter Mistral    |
| Gemini Flash          | Groq Llama 3.3 70B    | OpenRouter Mistral    | Claude Haiku 4.5      |

User never sees a quota error. Worst case the response is slightly lower quality, never absent.

### 5.3 Cost tracking middleware

Every AI call goes through a wrapper that logs:

```
{
  request_id,
  user_id,
  task_type,
  provider,
  model,
  input_tokens,
  output_tokens,
  cost_usd,        // computed from token count × provider rate
  latency_ms,
  success,
  fallback_chain_used  // ["sonnet-4.5", "haiku-4.5"] if first failed
}
```

Stored in `ai_call_log` collection with TTL index of 90 days. This is your source of truth for COGS analysis. Without this, you have no idea what each user costs.

### 5.4 Provider abstraction

```python
class AIProvider(Protocol):
    async def complete(self, prompt: str, model: str, **kwargs) -> AIResponse: ...

class GeminiProvider: ...
class AnthropicProvider: ...
class GroqProvider: ...
class OpenRouterProvider: ...

async def call_with_fallback(
    chain: list[tuple[AIProvider, str]],  # [(provider, model), ...]
    prompt: str,
    user_id: int,
    task_type: str,
) -> AIResponse:
    for provider, model in chain:
        try:
            response = await provider.complete(prompt, model)
            await log_ai_call(user_id, task_type, provider, model, response, success=True)
            return response
        except (RateLimitError, ProviderError, asyncio.TimeoutError) as e:
            await log_ai_call(user_id, task_type, provider, model, None, success=False, error=str(e))
            continue
    raise AllProvidersFailedError()
```

---

## 6. AI Agent System (LangGraph)

### 6.1 Architecture overview

LangGraph models each agent as a state machine with nodes (steps) and edges (transitions). State is persisted to MongoDB so an agent can resume after a crash, restart, or deploy.

```
agent_runs collection:
{
  id, agent_type, user_id, idea_id,
  state: {...},              // arbitrary JSON, the agent's working memory
  current_node: "research",  // where it left off
  status: "running" | "complete" | "failed" | "waiting_user",
  created_at, updated_at,
  result: {...},             // final output once complete
  cost_breakdown: {api_calls: [...], total_usd: 0.023}
}
```

Every agent run has a unique `run_id` and is triggered by Inngest (cron or event). On crash, Inngest retries from the last persisted state.

### 6.2 Agent #1: Idea Watcher (build first)

**What it does**: Once a week, for each active Pro/Team user idea, scan news and search for changes in the user's industry / problem space, summarize what's new, email the user.

**Why first**: Highest retention impact. Email open rates of 30–50% on weekly digests are realistic. Every email is a re-engagement.

**Trigger**: Inngest cron, `0 9 * * MON` (9am Monday UTC). Per user, schedule shifted into their local time zone if known.

**State machine**:

```
[start]
   ↓
[fetch_idea_context] — load idea, last week's report, RAG context
   ↓
[generate_search_queries] — Haiku produces 3–5 queries based on idea industry/keywords
   ↓
[search] — Serper.dev for each query, dedupe results
   ↓
[score_relevance] — Haiku scores each result 0–10 against idea
   ↓
[filter] — keep top 5 results scoring ≥7
   ↓
[synthesize] — Sonnet (Pro) or Flash (Free) writes a 200-word digest
   ↓
[draft_email] — Haiku writes subject + intro
   ↓
[send_email] — Resend API
   ↓
[persist] — store digest in `idea_watcher_runs`, update `last_run_at`
   ↓
[end]
```

**Cost per run**: ~$0.02. Weekly = $0.08/idea/month. For a Pro user with 5 active ideas = $0.40/month overhead. Built into subscription.

**User controls**:
- Toggle on/off per idea (default on for all ideas)
- Frequency: weekly (default) or monthly
- "Pause for 30 days" button (e.g., when user is on vacation)

**Email format**: short, scannable. Subject: "📈 3 new things about [idea name] this week". Body: bullet list of findings, each with source link, plus a one-line "what this means for you" written by Sonnet.

### 6.3 Agent #2: Competitor Watcher v2

**Upgrade your existing competitor watch from a static keyword scanner to an agent.**

**Current behavior (Phase 1)**: Daily APScheduler job runs SerpAPI on user-set keywords, dumps results, scores by relevance.

**Phase 2 behavior**:

```
[start]
   ↓
[load_known_competitors] — from previous runs
   ↓
[discover_new_competitors] — Haiku reads search results, identifies new players not in known list
   ↓
[deep_dive_each] — for each new competitor, fetch their site (Firecrawl), summarize positioning
   ↓
[compare_vs_user_idea] — Haiku scores threat level 0–10
   ↓
[detect_changes] — for known competitors, diff against last snapshot (pricing change, feature launch, funding)
   ↓
[prioritize_alerts] — only surface changes scoring ≥6 threat
   ↓
[notify] — push notification + email if any high-priority alerts
   ↓
[persist] — update competitor snapshots in `competitor_snapshots`
```

**New collection** `competitor_snapshots`:
```
{ id, idea_id, competitor_name, url, snapshot_date, content_hash, summary, threat_score }
```

Agent diffs `content_hash` week-over-week. Only triggers user notification when something meaningful changed.

**Trigger**: Inngest cron, weekly (configurable per user).

### 6.4 Agent #3: Progress Coach

**What it does**: Monitors user's checklist (`checklist_items` collection), nudges them about stale items, celebrates completions.

**Trigger**: Inngest cron, daily at 4pm user-local time. Cheap because state is small.

**Logic**:

```
- If user has checklist with items, and no item completed in past 7 days → nudge email "You've been quiet — anything blocking you?"
- If user completes 3+ items in a week → encouragement email
- If user has 0 items and idea is >7 days old → suggest 5 starter checklist items based on idea analysis
- If MVP Blueprint timeline is overdue (e.g., week 4 deliverable, week 6 today) → flag in dashboard
```

Coach uses Haiku for short personalized messages. Cost per run: ~$0.005. Run daily = $0.15/idea/month.

**Free tier gets this**, because it's cheap and drives engagement.

### 6.5 Agent #4: Pivot Suggester (build last)

**What it does**: When other agents detect significant market changes (Idea Watcher flags new trend, Competitor Watcher flags new entrant), Pivot Suggester analyzes whether the user should adjust strategy.

**Trigger**: Event-based, not cron. Fires when:
- Competitor Watcher emits `high_threat_competitor_detected`
- Idea Watcher emits `industry_disruption_detected`
- User manually requests "should I pivot?" from dashboard

**Logic**:

```
[start]
   ↓
[gather_context] — pull idea analysis, recent agent findings, RAG over user's past notes
   ↓
[generate_pivot_options] — Sonnet brainstorms 3–5 pivot directions
   ↓
[score_each_pivot] — Sonnet scores each on: feasibility, market size, founder fit, time-to-pivot
   ↓
[recommend_or_hold] — recommend top pivot OR recommend "stay course" with reasoning
   ↓
[draft_report] — short report, save to idea
   ↓
[notify] — in-app notification + optional email
```

**Cost per run**: ~$0.025. Triggered roughly 2–4× per idea per month max. ~$0.08/idea/month overhead.

### 6.6 Cross-agent infrastructure

**`agent_runs` collection** (shared by all 4 agents):

```
{
  id, agent_type, user_id, idea_id, run_id (Inngest),
  state: {},            // working memory
  current_node, status,
  result: {},
  cost_breakdown: {},
  started_at, completed_at,
  error: nullable
}
```

**Concurrency**: at most one active run of each agent type per idea at a time. Use a unique compound index `(agent_type, idea_id, status="running")` to enforce.

**User controls (settings page)**:
- Master switch: pause all agents
- Per-agent toggles
- Per-idea toggles
- Email delivery preferences (digest vs immediate)

**Observability**: Sentry breadcrumbs on every node. Inngest dashboard shows per-run timing/cost. Admin panel gets a "Recent agent runs" tab.

---

## 7. RAG Layer

### 7.1 What it powers

Two features:
1. **"Ask anything about my startup"** — chat-style query against user's own ideas, analyses, notes, agent findings. New dashboard page `/dashboard/idea/[id]/ask`.
2. **Agent context retrieval** — when an agent runs, RAG pulls the most relevant prior data (past analyses, user notes, agent findings) to ground the LLM call.

### 7.2 Why MongoDB Atlas Vector Search

You're already on Atlas. Atlas Vector Search:
- No new vendor, no new bill (free on M0/M2, included in M10+)
- Vectors stored alongside your documents
- Single query language across structured + vector
- Native aggregation pipeline integration

Pinecone would mean a 4th database. Don't.

### 7.3 What gets embedded

| Source                         | When embedded                | Chunk size  |
| ------------------------------ | ---------------------------- | ----------- |
| Idea description + problem + solution | On idea creation     | Whole       |
| Each stage result              | On stage completion          | Per stage   |
| Research notes (`research_notes`) | On note save              | 500 tokens  |
| Idea Watcher digests           | On digest creation           | Whole       |
| Pivot suggestions              | On suggestion                | Whole       |
| User chat transcripts (Layers) | On session finalize          | 500 tokens  |

### 7.4 Embedding model

**Voyage AI `voyage-3-lite`** (recommended) or **OpenAI `text-embedding-3-small`** as fallback. Voyage is cheaper ($0.02/M tokens) and Anthropic's official recommendation. OpenAI is reliable, slightly more expensive ($0.02/M tokens).

Skip Gemini embeddings — quality has been mixed for retrieval tasks.

### 7.5 Schema

Add `embedding` field (1024-dim vector) to relevant collections. Create Atlas Vector Search index:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "embedding": { "type": "knnVector", "dimensions": 1024, "similarity": "cosine" },
      "user_id": { "type": "number" },
      "idea_id": { "type": "number" }
    }
  }
}
```

### 7.6 Retrieval pattern

```python
async def retrieve_context(query: str, idea_id: int, k: int = 5) -> list[Document]:
    query_emb = await embed(query)
    pipeline = [
        {"$vectorSearch": {
            "index": "idea_context_idx",
            "path": "embedding",
            "queryVector": query_emb,
            "numCandidates": 100,
            "limit": k,
            "filter": {"idea_id": idea_id}
        }},
        {"$project": {"content": 1, "source_type": 1, "score": {"$meta": "vectorSearchScore"}}}
    ]
    return await db.idea_context.aggregate(pipeline).to_list(k)
```

`filter` ensures user only retrieves their own data. **Critical security check** — never run vector search without a user_id/idea_id filter.

### 7.7 Rate limits per tier

- Free: 5 RAG queries/day
- Pro: 100/day
- Team: 500/day

Each RAG query costs ~$0.001 (embedding + search) + LLM call cost = ~$0.005 total.

---

## 8. Search Provider Chain

Replace SerpAPI entirely.

### 8.1 New chain

```
1. Serper.dev (primary)         — $50/mo for 50K searches, Google-quality data
2. Tavily (fallback)            — $0.008/search, AI-optimized
3. (Brave Search optional)      — free tier 2K/mo, $3/CPM after, less data quality
```

### 8.2 Migration

- Remove all `from serpapi import` imports
- Add `serper_search(query: str)` and `tavily_search(query: str)` adapters
- Wrap with same fallback pattern as AI providers
- Keep `SERPAPI_KEY` in env temporarily for rollback safety, remove after 2 weeks of stable Serper

### 8.3 Cost projection

If you do ~5K total searches/month across all users (agents + manual scans + market research), Serper covers 10× that for $50/mo. At your current scale (free tier dominant), you're well below the $50 threshold for now — Serper has a free trial of 2,500 queries that gets you to first revenue.

---

## 9. Background Jobs (Inngest)

### 9.1 Why Inngest, not APScheduler

APScheduler runs in your Flask process. Problems:
- Jobs die when the process restarts (Render free tier sleeps and restarts often)
- No retries on failure
- No observability (you find out a job failed when a user complains)
- Can't fan out (one user's job blocks others)

Inngest:
- Free tier: 50K function runs/month (way more than you'll need at <500 users)
- Durable: jobs persist across deploys/crashes
- Automatic retries with exponential backoff
- Dashboard with logs and timing per run
- Native Python SDK
- Works with FastAPI

### 9.2 What moves to Inngest

| Phase 1 location              | Phase 2 destination |
| ----------------------------- | ------------------- |
| Background `threading.Thread` for analysis | `inngest.create_function("run_analysis", ...)` |
| APScheduler daily competitor scan | `inngest.create_function(cron="0 9 * * MON", ...)` |
| Email send (currently sync)   | Inngest function (so failures retry) |
| Re-analyze endpoint           | Inngest function (returns immediately) |

### 9.3 Pattern

```python
@inngest_client.create_function(
    fn_id="run-idea-analysis",
    trigger=TriggerEvent(event="idea.created"),
    retries=3,
)
async def run_analysis(ctx, step):
    idea_id = ctx.event.data["idea_id"]
    
    for stage_num in range(1, 9):
        await step.run(f"stage-{stage_num}", lambda: run_stage(idea_id, stage_num))
    
    await step.run("notify-user", lambda: send_completion_email(idea_id))
```

`step.run` makes each stage independently retriable. If stage 5 fails, only stage 5 retries — stages 1–4 don't re-run.

### 9.4 Triggering events

Replace `Thread(target=...).start()` in route handlers with:

```python
await inngest_client.send(Event(name="idea.created", data={"idea_id": idea.id}))
```

Returns instantly, job runs in background.

---

## 10. Payments (LemonSqueezy)

### 10.1 Why LemonSqueezy, not Stripe

- **Stripe doesn't support Pakistan** for direct merchant accounts (as of early 2026 — verify).
- LemonSqueezy is a **Merchant of Record**. They handle: global tax/VAT, fraud, chargebacks, currency conversion.
- They pay you out to a Pakistani bank account or Wise.
- 5% + $0.50 per transaction, no monthly fee.
- LemonSqueezy is owned by Stripe now (acquired 2024) — it has Stripe's reliability with founder-friendly access.

### 10.2 Subscription flow

1. User clicks "Upgrade to Pro" → frontend calls `POST /api/billing/checkout` with `tier: "pro"`.
2. Backend creates LemonSqueezy checkout via API, returns checkout URL.
3. User redirected to LemonSqueezy hosted checkout page (we don't handle card data).
4. User pays, gets redirected back to `/dashboard/billing/success`.
5. **Truth source**: LemonSqueezy webhook to `/api/billing/webhook` confirms the subscription. Don't trust the redirect.
6. Webhook handler grants credits and sets `subscription_tier`.

### 10.3 Webhooks to handle

| Event                                | Action |
| ------------------------------------ | ------ |
| `subscription_created`               | Set tier, grant initial credits, log |
| `subscription_updated`               | Update tier (upgrades/downgrades) |
| `subscription_cancelled`             | Mark as cancelling, keep tier until period_end |
| `subscription_expired`               | Drop tier to free, zero credits |
| `subscription_payment_success`       | Grant new month's credits (reset to tier amount, don't accumulate) |
| `subscription_payment_failed`        | Email user, keep tier active for grace period |
| `order_refunded`                     | Drop tier immediately, log |

### 10.4 Webhook security

LemonSqueezy signs every webhook with HMAC-SHA256 using your webhook secret. Verify before processing:

```python
@router.post("/billing/webhook")
async def lemon_webhook(request: Request):
    signature = request.headers.get("X-Signature")
    body = await request.body()
    expected = hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(401)
    # ... process event
```

Reject unsigned webhooks always. Reject duplicate `event_id`s (idempotency — store processed event IDs for 30 days).

### 10.5 Credit reset rule

On monthly renewal, **reset to tier credit amount, not accumulate**. Example: Pro user has 200 credits unused, renews → balance becomes 1000 (not 1200). Otherwise hoarders break the cost model.

Communicate this clearly in the UI: "Credits reset every month. Use them or lose them."

### 10.6 Refunds and disputes

- 7-day refund policy stated on pricing page
- Manual refunds via LemonSqueezy admin
- On refund webhook: drop tier, deduct credits, soft-delete agent runs (don't fully delete — abuse signal)
- Track refund rate; >5% means something is wrong with onboarding

---

## 11. Programmatic SEO

### 11.1 The strategy

You won't out-rank "AI startup validator" with backlinks alone. You **will** rank for thousands of long-tail queries by generating one page per industry × startup-type combination.

### 11.2 URL structure

```
/validate/saas-startup
/validate/saas/dental-scheduling
/validate/fintech-startup
/validate/fintech/remittance-pakistan
/validate/edtech-startup
/validate/edtech/coding-bootcamp-india
/validate/marketplace/freelance-services
...
```

Pattern: `/validate/[industry]/[type?]`

### 11.3 Content generation

Build a one-time script:

1. Compile a list of ~25 industries × ~20 startup types = 500 combos
2. For each combo, use Sonnet (one-time cost ~$5 total) to generate:
   - 800–1200 word page
   - Real-feeling pain points for that industry/type
   - Sample analysis preview (a teaser of what Inceptrax produces)
   - Industry-specific keywords woven in
   - CTA to "Run free analysis for [combo]"
3. Save as MDX files in `frontend/content/validate/`
4. Next.js `generateStaticParams()` builds all pages at deploy time
5. Each page has unique:
   - `<title>`: "Validate Your [Type] Startup in [Industry] | Inceptrax"
   - meta description
   - JSON-LD schema (Article + Organization)
   - Internal links to related industries

### 11.4 Technical SEO checklist

- `robots.ts` and `sitemap.ts` already exist in Phase 1 — extend sitemap with all 500 pages
- `next-sitemap` auto-regenerates on deploy
- All pages statically generated (`output: 'export'` per route or default SSG)
- Open Graph images per industry (use Vercel OG for dynamic generation)
- Internal linking: each page links to 3–5 related industries
- Submit sitemap to Google Search Console + Bing Webmaster
- Add `<link rel="canonical">` to every page
- Lighthouse score target: 95+ on all four metrics
- Core Web Vitals: LCP <2.5s, INP <200ms, CLS <0.1

### 11.5 Backlink plan (the 20% that's not technical)

- Launch on Product Hunt with the Phase 2 release
- Post on Indie Hackers, r/SaaS, r/startups (don't spam — one good post per community)
- Reach out to 20 startup-blogger newsletters offering Inceptrax for free in exchange for a review
- Get listed on AI tool directories: Future Tools, There's An AI For That, AI Scout, Topai.tools (most are free)
- Write 4–6 substantial blog posts on `inceptrax.com/blog` targeting top long-tail keywords

Three months in: target 50+ referring domains. Six months: 150+. That's enough for entity authority on "startup validation" terms.

---

## 12. Security Hardening

### 12.1 Critical fixes (do before any Phase 2 launch)

- **All keys rotated** — done in pre-Phase-2 cleanup
- **Move secrets to Doppler/Infisical** — no more `.env` in repo, no more pasting in chats
- **`.env` in `.gitignore`** — verify, and check git history with `git log --all --full-history -- backend/.env`
- **CSRF tokens** for non-API state-changing endpoints (forms posted from your own site)
- **Rate limit by user_id, not just IP** — IPs are cheap, accounts cost users effort to make
- **Add CAPTCHA** (Cloudflare Turnstile, free) on register, login, contact form
- **Cloudflare WAF** in front of `inceptrax.com` — free tier covers basic OWASP rules

### 12.2 Auth hardening

- 2FA for admin accounts (TOTP, use `pyotp`)
- Password requirements: 12+ chars (current is probably 8 — increase)
- Session timeout: 7 days for cookies (current good)
- Refresh token rotation: invalidate old refresh token on use
- Account lockout: 5 failed login attempts → 15-min lockout (already partially via rate limiter, make it user-specific)
- Admin endpoints require recent re-auth (within 30 min) for destructive actions (backup/restore, role changes)

### 12.3 Data protection

- All PII encrypted at rest (MongoDB Atlas does this by default — confirm)
- TLS 1.3 only (Cloudflare handles)
- HSTS header with `max-age=31536000; includeSubDomains; preload` — submit to HSTS preload list
- Backups encrypted (MongoDB Atlas auto-backups for M10+; for M0 use admin endpoint daily, encrypt JSON, push to Cloudflare R2 ($0/mo for first 10GB))

### 12.4 Input validation

- Pydantic v2 strict mode on all request bodies (already comes with FastAPI migration)
- Bleach sanitize on all user text that gets rendered (already in Phase 1, keep it)
- SQL injection: N/A (MongoDB), but watch for NoSQL injection — never pass raw user input to `$where` or `$regex` without sanitizing
- File upload limits: 10MB max, MIME type whitelist (already in Phase 1, audit)

### 12.5 Dependency hygiene

- Enable Dependabot on GitHub repo (free)
- Run `pip-audit` weekly in CI
- Run `npm audit` weekly in CI
- Pin all dependency versions in `requirements.txt` and `package-lock.json`

### 12.6 Logging that doesn't leak

- Never log full request bodies (might contain passwords, API keys)
- Never log JWT tokens, even partial
- Never log user emails alongside other PII (`user_id` is enough)
- Sentry: set `before_send` filter to scrub sensitive fields

---

## 13. Observability

### 13.1 Sentry (errors)

- Frontend: `@sentry/nextjs`, free tier 5K events/mo (plenty for <1000 users)
- Backend: `sentry-sdk[fastapi]`, same project two environments (`prod`, `dev`)
- Tag every event with `user_id` and `idea_id` when available
- Slack/email alert on `level: error` events in prod

### 13.2 PostHog (already integrated, expand it)

Track these events:
- `signup_completed`, `idea_created`, `analysis_started`, `analysis_completed`
- `agent_run_started`, `agent_run_completed`, `agent_email_sent`, `agent_email_clicked`
- `upgrade_clicked`, `checkout_started`, `checkout_completed`
- `feature_used` with property `feature_name` for everything

This becomes your funnel and cohort analysis. Critical for understanding what makes users upgrade.

### 13.3 Structured logging

Move from `print` / standard `logging` to `structlog` with JSON output:

```python
log.info("ai_call", user_id=42, provider="anthropic", model="haiku-4.5", latency_ms=480, cost_usd=0.002)
```

Render captures these. You can later pipe to Better Stack, Axiom, or grep them.

### 13.4 Health checks

- `/api/health` — returns 200 if DB reachable, AI provider reachable
- Used by cron-job.org ping (if you stay on Render free) and by Cloudflare uptime monitor
- Don't expose internal details (no DB version, no env values)

### 13.5 Cost monitoring dashboard

Build admin page `/admin/costs`:
- Daily API spend by provider
- Top 10 users by cost (this month)
- Cost per analysis (rolling avg)
- Cost per Pro user (rolling avg) — the most important number
- Alert if any single user exceeds $10/mo cost (sign of abuse or pricing miscalibration)

---

## 14. Deployment: Localhost ↔ Production Parity

The most common production bugs come from "works on my machine." This section is how you eliminate that class entirely.

### 14.1 The principle

**Production runs in Docker containers. Localhost runs the same Docker containers.** If it works in your local container, it works in prod. Period.

### 14.2 Repo layout

```
inceptrax/
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml (or requirements.txt)
│   └── app/
├── frontend/
│   ├── Dockerfile
│   └── (Next.js code)
├── docker-compose.yml          # localhost orchestration
├── docker-compose.override.yml # localhost-only overrides (volumes, hot reload)
├── .dockerignore
├── .gitignore                  # ensure .env, node_modules, __pycache__, .venv
└── README.md
```

### 14.3 Backend Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# System deps for ReportLab fonts, etc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpango-1.0-0 libpangoft2-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000
CMD ["uvicorn", "app_fastapi.main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "2"]
```

### 14.4 Frontend Dockerfile

Multi-stage build for small image:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### 14.5 docker-compose.yml (localhost)

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - APP_ENV=development
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      # ... etc, pulled from .env (gitignored)
    env_file:
      - ./backend/.env.local
    volumes:
      - ./backend:/app  # hot reload
    command: uvicorn app_fastapi.main:app --host 0.0.0.0 --port 5000 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:5000/api
    env_file:
      - ./frontend/.env.local
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
```

### 14.6 Environment variable management

Every variable is declared in **three places** and synchronized:

1. `.env.example` (committed) — names only, dummy values, comments explaining each
2. `.env.local` (gitignored) — your local actual values
3. **Doppler / Infisical** — production values, synced to Render

Doppler CLI: `doppler run -- uvicorn app_fastapi.main:app` injects secrets at runtime, no `.env` file needed.

### 14.7 The four classes of localhost vs prod bugs (and how Docker prevents them)

| Bug class                              | Cause                                  | Docker fix |
| -------------------------------------- | -------------------------------------- | ---------- |
| "Module not found in prod"             | Different Python/Node version          | Image pins version |
| "Works on my Mac, breaks on Linux"     | macOS has different glibc/binaries     | Linux container both places |
| "ReportLab font missing"               | System lib not installed in prod       | Dockerfile installs it |
| "CORS works locally, breaks in prod"   | Different `NEXT_PUBLIC_API_URL`        | Env var validation at startup |

Always validate env vars at startup. If `MONGODB_URI` is missing, app should fail loudly within 100ms, not 5 minutes later when first request comes in:

```python
# backend/app_fastapi/config.py
class Settings(BaseSettings):
    mongodb_uri: str
    jwt_secret_key: str
    gemini_api_key: str
    # ...
    
    class Config:
        env_file = ".env.local"

settings = Settings()  # raises if any required var missing
```

### 14.8 Render deploy config

Render reads from:
- `render.yaml` (committed) — build command, start command, health check path
- Doppler integration — secrets injected at build/run time

```yaml
# render.yaml
services:
  - type: web
    name: inceptrax-backend
    runtime: docker
    plan: starter  # $7/mo, no spin-down (after first paying user)
    healthCheckPath: /api/health
    envVars:
      - fromDoppler: true
```

Frontend stays on Vercel — Vercel handles Next.js better than Render. Set `NEXT_PUBLIC_API_URL` in Vercel dashboard pointing to Render backend URL.

### 14.9 CORS configuration

Single source of truth in backend:

```python
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://www.inceptrax.com",
    "https://inceptrax.com",
    # NO wildcards
]
```

For preview deploys (Vercel branch URLs), use a regex matcher instead of wildcards:

```python
allow_origin_regex=r"https://inceptrax-.*\.vercel\.app"
```

### 14.10 Pre-deploy checklist

Before every production deploy, run:

- `pytest` — backend tests pass
- `npm run build` — frontend builds clean
- `docker compose build` — both images build clean
- `docker compose up` — local stack starts and health check returns 200
- Smoke test: register → create idea → check stage tracker → export PDF (5 min manual)
- Sentry shows no new errors in last 24h
- Render dashboard shows healthy
- Cloudflare cache purged (if frontend changed)

Automate this with GitHub Actions when you have time.

---

## 15. Database (MongoDB Atlas — staying)

Confirmed: stick with MongoDB Atlas. No migration to Postgres. Rationale already covered.

### 15.1 New collections in Phase 2

- `credit_transactions` — credit ledger
- `subscriptions` — LemonSqueezy subscription state mirror
- `agent_runs` — all agent execution state
- `idea_watcher_runs` — Idea Watcher specific outputs
- `competitor_snapshots` — Competitor Watcher v2 history
- `pivot_suggestions` — Pivot Suggester outputs
- `ai_call_log` (TTL 90 days) — every AI call for cost tracking
- `webhook_events` (TTL 30 days) — LemonSqueezy idempotency
- `idea_context` — embedded chunks for RAG (with vector index)

### 15.2 Index strategy

| Collection             | Index                                                  |
| ---------------------- | ------------------------------------------------------ |
| `credit_transactions`  | `(user_id, created_at desc)` |
| `subscriptions`        | `user_id` unique, `lemonsqueezy_subscription_id` unique |
| `agent_runs`           | `(user_id, agent_type, status)`, `(idea_id, agent_type)` |
| `ai_call_log`          | `(user_id, created_at)`, TTL on `created_at` (90 days) |
| `webhook_events`       | `event_id` unique, TTL on `created_at` (30 days)       |
| `idea_context`         | Atlas Vector Search index on `embedding`               |

### 15.3 Backups

- M0 free tier: no auto-backup. Build admin cron that nightly dumps to JSON, encrypts, uploads to Cloudflare R2 (free first 10 GB).
- M10+: Atlas auto-backups (daily, 2-day retention free, longer paid).
- Test restore once per quarter. Untested backups are not backups.

---

## 16. Scaling Roadmap (0 → 5000+ users)

### 16.1 Stage 1: 0–500 users (month 0–6)

**Free tiers everywhere. Total monthly cost: $0–10.**

| Service      | Tier              | Cost  |
| ------------ | ----------------- | ----- |
| Vercel       | Hobby             | $0    |
| Render       | Free → Starter    | $0–7  |
| MongoDB Atlas| M0 (512 MB)       | $0    |
| Cloudflare   | Free              | $0    |
| Sentry       | Developer (5K events) | $0 |
| PostHog      | Free (1M events)  | $0    |
| Inngest      | Free (50K runs)   | $0    |
| Doppler      | Free (3 users)    | $0    |
| LemonSqueezy | 5% + $0.50/txn    | only on revenue |
| Domain       | Spaceship         | ~$10/yr |
| AI APIs      | Pay-as-you-go     | scales with usage |

**Action triggers:**
- First paying user → upgrade Render to Starter ($7/mo)
- Database 70% full (350 MB) → upgrade to M2 ($9/mo) or M10 ($57/mo) depending on traffic
- Sentry 5K events approaching → review logging volume, only upgrade if needed

### 16.2 Stage 2: 500–5000 users (month 6–18)

**Total monthly cost: $80–250.**

| Service        | Tier                     | Cost     |
| -------------- | ------------------------ | -------- |
| Vercel         | Pro                      | $20      |
| Render         | Standard (or Starter ×2) | $25      |
| MongoDB Atlas  | M10                      | $57      |
| Cloudflare     | Free still works         | $0       |
| Sentry         | Team                     | $26      |
| PostHog        | Free still works         | $0       |
| Inngest        | Pro (1M runs)            | $20      |
| Doppler        | Team                     | $7       |
| AI APIs        | Variable                 | ~$50–150 |
| LemonSqueezy   | 5% + $0.50/txn           | scales with revenue |

**Revenue assumption**: 100 Pro users × $19 = $1,900/mo. After costs ($250) and LemonSqueezy fees ($145): **~$1,500/mo profit**.

**Action triggers:**
- API costs ramp toward $200/mo → audit per-user cost in admin dashboard, raise hard caps if needed
- 3+ support tickets/day → set up help-desk (Plain.com, free for <100 tickets)

### 16.3 Stage 3: 5000+ users (month 18+)

**Now you're a real company. Total monthly cost: $500–2000.**

This is when you:
- Hire your first contractor (frontend or marketing)
- Get a CDN tier upgrade if egress >100 GB
- Move from M10 → M30 ($350/mo) MongoDB
- Negotiate enterprise pricing with Anthropic / Google directly (you'll have volume)
- Consider SOC 2 compliance prep (if any business customers)

**Don't optimize for this stage today.** Focus on stage 1.

---

## 17. Build Order (Week-by-Week)

This is opinionated. Follow it unless you have a specific reason not to.

| Week | Focus | Outcome |
| ---- | ----- | ------- |
| **1**  | Cleanup: rotate keys, set up Doppler, set up Cloudflare, set up Sentry, add `.env.example`, commit `.gitignore` audit | Secure baseline |
| **2**  | Docker setup: backend + frontend Dockerfiles, docker-compose, parity testing | Localhost == prod |
| **3**  | FastAPI migration: auth + users routes, async MongoDB (motor), Pydantic models | Auth works on FastAPI |
| **4**  | FastAPI migration: idea routes, all stages, exports, layers | Full backend on FastAPI |
| **5**  | FastAPI migration: chat, cofounder, admin, notifications. Cutover. Remove Flask. | Flask deleted |
| **6**  | Inngest setup. Move analysis from threading → Inngest functions. | Production-grade jobs |
| **7**  | Credit ledger + tier gating in middleware. Admin tools to grant/deduct credits. | Credit system live |
| **8**  | LemonSqueezy integration: checkout, webhooks, subscription state. End-to-end test with real payment. | Can charge users |
| **9**  | Search migration: Serper.dev primary, Tavily fallback. Drop SerpAPI. | Cheaper search |
| **10** | RAG layer: embed all existing data, MongoDB Vector Search index, "Ask anything" UI. | RAG works |
| **11** | Agent #1: Idea Watcher. LangGraph state machine, Inngest cron, email digest, user controls. | First agent live |
| **12** | Agent #2: Competitor Watcher v2. Upgrade existing competitor watch to agent. | Second agent live |
| **13** | Agent #3: Progress Coach. (Easy week, build buffer for catch-up.) | Third agent live |
| **14** | Agent #4: Pivot Suggester. Event-triggered, integration with other agents' outputs. | All agents live |
| **15** | Programmatic SEO: generate 500 pages, sitemap, deploy. Submit to Google. | SEO machine running |
| **16** | Beta launch: 20 hand-picked users on Pro free for 1 month. Iterate on feedback. | Real-user signal |
| **17** | Public Pro launch: Product Hunt, Indie Hackers, Reddit. | First paying users |
| **18** | Bug-fix and polish based on launch. Set up cost monitoring dashboard. | Stable revenue |

If any week takes 1.5×, push everything else back. Don't sacrifice quality for the schedule. Solo devs who burn out building under time pressure ship buggy code that costs more time later.

---

## 18. Testing Strategy

You don't have a QA team. Tests have to do double duty: catch bugs AND let you refactor without fear.

### 18.1 Backend tests

- **Unit tests** for pure functions (cost calculation, prompt builders, validators) — pytest, run on every commit
- **Integration tests** for routes against a test MongoDB (use `mongomock-motor` or a Docker test DB)
- **Critical path E2E tests**:
  - Register → login → create idea → analysis runs → results stored
  - Subscribe → webhook → credits granted → can use Pro features
  - Hit credit limit → cannot run analysis → upgrade prompt shown

Target: 60% line coverage on backend. Don't chase 100% — aim for coverage on payment, auth, agents, and credit ledger specifically.

### 18.2 Frontend tests

- **Type checking** (`tsc --noEmit`) on every commit
- **Component tests** for billing flow, agent setup flow (Vitest + Testing Library)
- **No need for full E2E framework** like Playwright until 5K+ users

### 18.3 Manual QA before each release

A 10-step smoke test you run manually:
1. Register a new user
2. Create an idea
3. Wait for analysis (watch stage tracker)
4. Generate one-liner pitch
5. Export PDF
6. Toggle idea public, view via share link in incognito
7. Comment on shared idea
8. Click upgrade → reach LemonSqueezy checkout (don't pay, just verify URL loads)
9. Open `/admin` as admin user — verify stats load
10. Force an error (bad input) — verify Sentry captures it

If all 10 pass, deploy. If any fail, fix and retest.

---

## 19. Risk Register

| Risk                                              | Likelihood | Impact | Mitigation |
| ------------------------------------------------- | ---------- | ------ | ---------- |
| API costs exceed revenue at small scale           | Medium     | High   | Hard caps, per-user cost dashboard, alerting |
| LemonSqueezy account suspended / Pakistan issue   | Low        | High   | Have Paddle as backup MoR, save webhook logs for migration |
| Major AI provider rate limits during launch       | High       | Medium | Triple fallback chain (existing) |
| MongoDB free tier hits 512 MB limit               | Medium     | Medium | Monitor weekly, M10 upgrade ready |
| Render spin-down causes UX degradation            | Certain    | Medium | Upgrade to Starter immediately on first paying user |
| Webhook from LemonSqueezy lost / not delivered    | Low        | High   | LemonSqueezy retries; idempotent webhook handler; reconcile job daily |
| Sonnet pricing increase breaks margin             | Medium     | Medium | Tier-locked usage, can downgrade Pro to Haiku-only if needed |
| Key leak (again)                                  | Medium     | Critical | Doppler rotation, no `.env` in repo, scrub from logs |
| Agent generates harmful content                   | Low        | Medium | Output moderation step (Anthropic moderation endpoint, free) |
| Solo founder burnout                              | High       | Critical | Build at sustainable pace, take 1 day off/week, the schedule above is generous |

---

## 20. Environment Variables (names only, never values)

This is the canonical list. Every value lives in Doppler.

```
# Backend
APP_ENV=development|production
SECRET_KEY=
JWT_SECRET_KEY=
JWT_REFRESH_SECRET_KEY=
MONGODB_URI=
MONGODB_DB_NAME=

# AI providers
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
VOYAGE_API_KEY=

# Search
SERPER_API_KEY=
TAVILY_API_KEY=
FIRECRAWL_API_KEY=

# Email
RESEND_API_KEY=
EMAIL_FROM=

# Payments
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_STORE_ID=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_PRO_VARIANT_ID=
LEMONSQUEEZY_TEAM_VARIANT_ID=

# Background jobs
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Observability
SENTRY_DSN=
POSTHOG_KEY=
POSTHOG_HOST=

# Frontend (NEXT_PUBLIC_ prefix exposes to browser — be careful)
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_LEMONSQUEEZY_STORE_URL=
```

---

## 21. References & Resources

**Frameworks & docs**
- FastAPI: https://fastapi.tiangolo.com
- LangGraph: https://langchain-ai.github.io/langgraph/
- Inngest: https://www.inngest.com/docs
- MongoDB Atlas Vector Search: https://www.mongodb.com/docs/atlas/atlas-vector-search/

**Pricing pages (verify before launch — these change)**
- Anthropic: https://www.anthropic.com/pricing
- Google AI: https://ai.google.dev/pricing
- Groq: https://groq.com/pricing
- OpenRouter: https://openrouter.ai/models
- Serper: https://serper.dev/
- LemonSqueezy: https://www.lemonsqueezy.com/pricing

**Tools**
- Doppler: https://doppler.com
- Sentry: https://sentry.io
- PostHog: https://posthog.com
- Cloudflare: https://cloudflare.com

---

## Final notes

Phase 2 is not about building more features. Phase 1 already has more features than 95% of seed-stage products. Phase 2 is about turning those features into a sustainable business: charge for them, retain users with agents, scale safely, sleep through deploys.

Build the boring stuff (credits, payments, observability, Docker) first. The fun stuff (agents, RAG, programmatic SEO) builds on top of it. If you flip the order, you build agents that bankrupt you on AI costs, with no way to turn off paying users you can't afford.

Ship Phase 2 in 12–18 weeks at sustainable pace. Get to $1,000 MRR. *Then* think about Phase 3.

— end of document —

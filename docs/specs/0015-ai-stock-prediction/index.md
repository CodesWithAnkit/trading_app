# 0015. Implement AI-based stock predictions using Gemini and Alpha Vantage

**Date**: 2026-10-01
**Status**: In Progress

## Summary

Integrate stock market news and AI intelligence to predict short-term market behavior. The NestJS backend will use Alpha Vantage for news and Gemini for sentiment analysis, caching the results in Supabase. The Next.js frontend will display these insights in a dedicated panel on the stock page.

## Context

The trading application requires a way to integrate news and findings on suggested stocks, along with an AI intelligence layer that can predict what could happen if a user enters a trade right now based on previous performance. The goal is to provide actionable insights (Bullish/Bearish) without building a complex, custom machine-learning pipeline from scratch. We must also manage external API costs and rate limits.

## Requirements

**User stories**:
- As a trader, I want to see an AI-generated prediction and recent news sentiment for a specific stock so that I can make a more informed entry decision.

**Acceptance criteria**:
- **AC-1**: The backend fetches recent news and sentiment data for a requested stock symbol using the Alpha Vantage API.
- **AC-2**: The backend uses the Gemini API to analyze the data and generate a prediction (Bullish/Bearish) with a brief text summary.
- **AC-3**: Both the raw news articles and the AI prediction are stored (cached) in Supabase. On-demand requests only trigger fresh API calls if the cache has expired.
- **AC-4**: The frontend displays a dedicated "AI Insights" panel containing a confidence gauge and the text summary.

## Options considered

### Option 1: LLM API via NestJS (Gemini + Alpha Vantage)

Use the existing NestJS backend to fetch news from Alpha Vantage and send it to the Gemini API for sentiment analysis and prediction.
**Pros**:
- Fits seamlessly into the current TypeScript/NestJS stack.
- Rapid implementation without managing Python ML infrastructure.
**Cons**:
- Relies on an LLM for price prediction, which may hallucinate or lack deep time-series context compared to a dedicated model.

### Option 2: Custom Python ML Microservice

Build a dedicated FastAPI service that runs an LSTM (Long Short-Term Memory) neural network trained on historical price data, combined with NLP for news sentiment.
**Pros**:
- True time-series forecasting tailored specifically for financial markets.
**Cons**:
- High architectural complexity (introduces Python and ML ops into the stack).

## Decision

**Chosen option**: Option 1: LLM API via NestJS (Gemini + Alpha Vantage)

We will implement the AI prediction feature directly in the NestJS backend using the Gemini API and Alpha Vantage, caching the results in Supabase to mitigate rate limits.

## Rationale

The engineer explicitly chose the Gemini integration (Option A) over a custom Python microservice. This approach leverages the existing NestJS architecture and Supabase database, delivering powerful AI insights quickly without the overhead of maintaining a separate machine-learning pipeline. Alpha Vantage was chosen for news fetching because it includes native sentiment scores that feed well into the LLM prompt.

## Feature design

**Data model sketch**:
- `stock_news`: `id` (UUID, PK), `symbol` (string, required), `title` (string), `url` (string), `sentiment_score` (numeric), `published_at` (timestamp).
- `ai_predictions`: `id` (UUID, PK), `symbol` (string, required, indexed), `direction` (enum: Bullish/Bearish/Neutral), `confidence_score` (numeric), `summary_text` (text), `created_at` (timestamp), `expires_at` (timestamp).

**State transitions**:
N/A

**API surface**:
| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/insights/:symbol` | GET | `symbol` (path param) | `direction`, `score`, `summary`, `news` | Bearer | 429 Too Many Requests, 502 Bad Gateway |

**Value sourcing**:
| Action | Value produced / displayed | Source |
|---|---|---|
| Predict market | News articles & initial sentiment | Alpha Vantage API |
| Predict market | AI prediction text and direction | Gemini API |
| Fetch insight | Cache expiration time | Backend configuration (e.g., `CACHE_TTL_HOURS`) |

**Key invariants**:
- The system must never call the Gemini or Alpha Vantage APIs for a symbol if a valid, unexpired record exists in the `ai_predictions` table.

**Security model**:
- Read access to predictions requires a valid user session (authenticated).
- Write access to the `stock_news` and `ai_predictions` tables is restricted to a service role (the NestJS backend).

**Configuration required**:
- `ALPHA_VANTAGE_API_KEY`: For fetching news.
- `GEMINI_API_KEY`: For generating the AI prediction.
- `INSIGHTS_CACHE_TTL_HOURS`: To control how long predictions remain valid.

**Critical test scenarios**:
- Happy path: Requesting insights for a new symbol fetches from Alpha Vantage, calls Gemini, saves to Supabase, and returns the data, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**.
- Cache hit: Requesting insights for a recently checked symbol returns data directly from Supabase without calling external APIs, verifies **AC-3**.
- API failure: If Gemini is down, the system gracefully degrades (e.g., returning only raw news or a specific error message), verifies **AC-2**.

## Build plan

1. Create Supabase migrations for the `stock_news` and `ai_predictions` tables with appropriate RLS policies. (satisfies **AC-3**)
2. Implement `NewsService` in NestJS to fetch data from Alpha Vantage. (satisfies **AC-1**)
3. Implement `AIPredictionService` in NestJS to prompt Gemini with the fetched news and historical context. (satisfies **AC-2**)
4. Create `InsightsController` in NestJS to orchestrate the request, checking the Supabase cache before triggering the services. (satisfies **AC-3**)
5. Build the `AIInsightsPanel` component in Next.js to display the gauge and summary on the stock details page. (satisfies **AC-4**)

## Consequences

**Positive**:
- Users get immediate, AI-driven context on stocks without needing a heavy data science infrastructure.
- Caching strategy protects against unpredictable API billing spikes.

**Negative / tradeoffs**:
- LLM predictions are inherently qualitative; the system relies heavily on prompt engineering to ensure consistent output formats (e.g., strict JSON responses for the gauge).

**Neutral**:
- Requires monitoring of API usage and potentially tweaking the cache TTL to balance freshness with cost.

## Follow-up

- [ ] Determine the exact prompt structure to ensure Gemini consistently returns parseable JSON for the frontend gauge.
- [ ] Finalize the cache TTL duration (e.g., 2 hours vs 4 hours) based on expected traffic.

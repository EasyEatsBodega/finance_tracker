# Scope Document: Personal Ticker Tracker App

## 1. Problem Statement
You want a low-maintenance personal app that:
- Watches a fixed list of tickers (e.g. CIFR, IREN, OPEN, MSTR, COIN, etc.)
- Surfaces news/price updates for them as they happen
- Lets you ask "what's been going on with these over the past week?" and get a plain-English summary
- Separately, surfaces pattern-based alerts like "these 10 are up this month" or "this is the biggest X-day move in N months"
- Requires near-zero ongoing maintenance once built

This is **not** meant to be a trading platform, a multi-user product, or something you'll actively develop over time. It's a personal dashboard.

---

## 2. Core Features (In Scope)

### 2.1 Watchlist (Add / Untrack)
- A persistent, editable watchlist — not a hardcoded list you have to hand-edit in a file
- You can **add a ticker** at any time (e.g. type "CIFR" in) and it starts pulling price/news data for it going forward
- You can **untrack a ticker**, and it immediately stops showing up in digests, screeners, and news feeds
- Untracking should just mean "stop surfacing this" — it doesn't need to delete any historical data you've already pulled, in case you re-add it later
- Starting list: CIFR, IREN, OPEN, MSTR, COIN (added at setup, then you manage the list yourself from here)

### 2.2 News & Update Feed
- Pull recent news per ticker from a free news API
- Pull price/volume data from a market data API
- On demand: "What's going on with these over the past week?" → returns a summarized digest (price moves + news headlines + a plain-language takeaway per ticker)

### 2.3 Pattern / Momentum Screener
- On demand or daily: "Which of my tickers are up the most in the last N days?"
- Rank the watchlist by % change over a chosen window (default: 10 days)
- Flag statistical outliers, e.g. "IREN is up 22% in 10 days — that's the biggest 10-day move in the past 6 months"
- This is comparing current move size to that ticker's own historical distribution of N-day moves — not "AI-detected patterns" in a fuzzy sense, just percentile/z-score-style comparison, which is what makes it cheap and reliable to build

### 2.4 Access Model
- Something you open (browser tab, bookmark, or simple app) whenever you want, not something that needs babysitting
- Data refreshes automatically on a schedule (e.g. every 15–60 min during market hours) so it's ready when you open it

---

## 3. Out of Scope (for v1)
- Real-time streaming tick data (delayed/periodic refresh is fine)
- Trade execution or brokerage integration
- Multi-user accounts/auth
- Mobile push notifications (can be a v2 add-on)
- Backtesting or portfolio P&L tracking
- Predictive/forecasting models (this is descriptive pattern-flagging, not prediction)

---

## 4. Data Sources

| Need | Options | Notes |
|---|---|---|
| Price/volume data | Yahoo Finance (unofficial, via `yfinance` Python lib) | Free, no key needed, but unofficial/rate-limited — fine for personal use at this volume |
| Price/volume (backup) | Alpha Vantage, Finnhub, Twelve Data | All have free tiers with API keys; good fallback if Yahoo gets flaky |
| News | Finnhub (company news endpoint), Marketaux, NewsAPI.org | Finnhub's free tier covers per-ticker news directly, which maps well to your use case |
| Summarization | Claude API | Turns raw headlines + price data into the plain-English "what happened this week" digest |

**Recommendation:** Yahoo Finance (via `yfinance`) for prices + Finnhub for news. Both have workable free tiers and Finnhub's news endpoint is ticker-scoped, which matches exactly what you described.

**Note now that you're hosting on Vercel:** `yfinance` is a Python library. Vercel supports Python serverless functions, so this still works, but it means your API routes (`/api/refresh`, etc.) would be Python while the rest of a Next.js app is normally JS/TS — a fine and common setup, just worth knowing going in. If you'd rather keep everything in one language, the alternative is hitting Yahoo Finance's underlying JSON endpoints directly with `fetch` from a JS/TS function (no official library, but well-documented community patterns exist), or switching primary price data to a provider with an official JS SDK, like Finnhub or Twelve Data (both also free-tier).

---

## 5. Recommended Architecture (Vercel-hosted)

Vercel is serverless — functions spin up per-request and don't keep a local file or background process alive between calls. That rules out "just write to a JSON file on disk," but the equivalent is still simple:

1. **Watchlist storage: Vercel KV** (or Upstash Redis, which is what Vercel KV is built on — free tier is plenty for one person's list)
   - One key, e.g. `watchlist`, holding the tracked ticker array
   - `add_ticker` / `remove_ticker` API routes just read the array, modify it, write it back

2. **App structure: a small Next.js app** (or plain Vercel API routes if you don't want a framework at all)
   - `/api/add-ticker`, `/api/remove-ticker` — mutate the KV watchlist
   - `/api/refresh` — pulls price + news for everything currently in the watchlist, computes momentum stats, calls the Claude API for the digest, and caches the result (also in KV) so the dashboard loads instantly instead of re-fetching live every time
   - One page (`/`) — reads the cached digest from KV and renders it, with a simple input box to add/untrack tickers

3. **Scheduling: Vercel Cron Jobs**
   - Vercel supports cron-triggered API routes natively (defined in `vercel.json`) — e.g. hit `/api/refresh` every 15–30 min during market hours
   - This replaces the `launchd`/`cron`-on-your-laptop idea from before — same concept, just running on Vercel's schedule instead of yours

4. **Result:** you open the URL from your phone or laptop, it's always showing a recently-refreshed digest, and adding/untracking a ticker is a form submit — no server to manage, no local process to keep alive, and it's live from anywhere.

**Free-tier notes worth flagging:** Vercel's free (Hobby) tier has limits on cron frequency (currently once/day on Hobby unless you're on Pro — worth double-checking current limits before committing to a 15-30 min refresh cadence) and function execution time. If a 30-min cadence isn't available on the free tier, the fallback is refreshing on-demand when you open the page (with a "last updated X min ago" timestamp) instead of a strict background schedule — same effective experience, slightly different mechanism.

### 5.1 Decision: No Database
**Do not add a Postgres/relational database for v1.** Everything this app needs to persist is key-value shaped:
- The watchlist (array of tickers) → one KV key
- The latest cached digest (so the page loads instantly instead of live-fetching on every visit) → one KV key

Historical price data for the momentum/pattern screener does **not** need to be stored — it's fetched fresh from the price API each time the stats are computed, since the provider already retains full history. There's no need to duplicate that.

Vercel KV (Redis-backed) covers both storage needs. **Do not reach for Postgres, Supabase, Mongo, etc. unless one of these specific needs shows up later:**
- User wants to store their own annotations/notes on a ticker over time
- User wants a permanent log of every past digest, not just the latest one
- Watchlist logic grows relational (categories, tags, multiple lists)

If none of those apply, KV alone is sufficient — adding a real database now would be unnecessary complexity for a single-user personal dashboard.

---

## 6. Open Questions (need your input before build)
1. Laptop-only, or do you want this viewable on your phone too?
2. Push/pull model — do you want it to *notify* you (text/email digest) or is opening a page and checking whenever enough?
3. Any preference between "up this month" and "up in the last N days" as the default screener window, or do you want both toggle-able?
4. Should the news digest cover *all* headlines, or only ones that look market-moving (filtered by some relevance threshold)?

---

## 7. Success Criteria
- You can open one thing (a file, a bookmarked page) and immediately see: recent price action + a plain-English news summary + momentum flags for your whole watchlist
- Updating the ticker list takes editing one line, not touching code logic
- Once running, it requires no ongoing intervention — it just keeps producing fresh snapshots on schedule

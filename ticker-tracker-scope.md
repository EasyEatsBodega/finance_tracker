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
- Pull recent news per ticker from Finnhub's per-ticker company news endpoint
- Pull price/volume data from Finnhub
- Per ticker, the dashboard shows:
  - **Raw headline list** — source, timestamp, link (this is the ground truth)
  - **Claude TL;DR line** — a single sentence per ticker synthesizing the week, rendered *above* the headline list, not instead of it
- The TL;DR is a nice-to-have layered on top of raw data — if it fails or the API key is missing, the raw headlines still render and the app is still useful

### 2.3 Pattern / Momentum Screener
- On demand or on the scheduled refresh: "Which of my tickers are up the most over window N?"
- Rank the watchlist by % change over a chosen window
- **Default window: 10 days.** UI toggle exposes: 5d / 10d / 1mo / 3mo
- Flag statistical outliers, e.g. "IREN is up 22% in 10 days — that's the biggest 10-day move in the past 6 months"
- This is comparing current move size to that ticker's own historical distribution of N-day moves — not "AI-detected patterns" in a fuzzy sense, just percentile/z-score-style comparison, which is what makes it cheap and reliable to build

### 2.4 Access Model
- Something you open (browser tab, bookmark, or simple app) whenever you want, not something that needs babysitting
- **Responsive layout — usable on both phone and laptop.** One dashboard page, mobile-friendly by default
- **Pull-only.** No email, SMS, or push notifications in v1 — you open the page when you want to check
- Data refreshes automatically on a schedule (see §5 for cadence caveats) so it's ready when you open it

### 2.5 Claude API Key (BYOK)
- The Claude TL;DR feature uses **your own** Claude API key
- `/settings` page (or modal from the dashboard) with a "Claude API Key" input
- On save, the key is written to Vercel KV under a single key, e.g. `claude_api_key`
- `/api/refresh` reads it from KV at run time. **If it's missing, the refresh still runs** — it just skips the TL;DR line and renders only the raw headline list
- UI masks the stored key once saved (show `sk-ant-…abcd` with a "Replace" button)
- Still single-user — this is just so *you* don't have to redeploy or edit env vars every time the key rotates

---

## 3. Out of Scope (for v1)
- Real-time streaming tick data (delayed/periodic refresh is fine)
- Trade execution or brokerage integration
- Multi-user accounts / auth / user profiles
- Mobile push, email, or SMS notifications (can be a v2 add-on)
- Backtesting or portfolio P&L tracking
- Predictive/forecasting models (this is descriptive pattern-flagging, not prediction)
- AI-generated pattern detection (the screener is pure math over historical distributions)

---

## 4. Data Sources

| Need | Provider | Notes |
|---|---|---|
| Price/volume data | **Finnhub** | Official REST API, free tier ~60 calls/min — plenty for 5–10 tickers refreshed every 15–30 min. One API key covers both prices and news. |
| Per-ticker news | **Finnhub** company-news endpoint | Same key as prices. Ticker-scoped, dated, has source + URL. |
| TL;DR line | **Claude API** (BYOK — user-provided key stored in KV, see §2.5) | Optional layer — the app fully functions without it. |

**Why not Yahoo Finance / `yfinance`:** the earlier draft floated Yahoo via the Python `yfinance` library. That would have meant a Python serverless function alongside a TypeScript Next.js app — two languages for one small app. Decided against. Everything is TypeScript.

**Backup providers** (only if Finnhub proves flaky in practice): Alpha Vantage, Twelve Data. Both have free tiers with JS SDKs. Not implemented in v1.

---

## 5. Architecture (Vercel-hosted)

Vercel is serverless — functions spin up per-request and don't keep a local file or background process alive between calls. That rules out "just write to a JSON file on disk," but the equivalent is still simple:

1. **Persistence: Vercel KV** (Upstash Redis under the hood — free tier is plenty for one person)
   - `watchlist` — the tracked ticker array
   - `claude_api_key` — your stored Claude key (see §2.5)
   - `cache:digest` — the latest refresh result (price stats + headlines + TL;DR), so the dashboard loads instantly from cache instead of live-fetching on every page load

2. **App structure: Next.js (App Router), TypeScript end to end**
   - `/api/add-ticker`, `/api/remove-ticker` — mutate the KV watchlist
   - `/api/set-key` — write the user's Claude key to KV
   - `/api/refresh` — for each ticker in the watchlist: pull Finnhub prices, pull Finnhub news, compute momentum stats + historical percentiles, optionally call Claude for the TL;DR line (skip if no key), write the whole assembled result to `cache:digest`
   - `/` — dashboard: reads `cache:digest` from KV and renders the responsive layout (ticker cards with % change, screener toggle for 5d/10d/1mo/3mo, TL;DR line if present, expandable raw headline list, "last updated X min ago" timestamp)
   - `/settings` — Claude API key input, watchlist management

3. **Scheduling: Vercel Cron**
   - Cron-triggered API routes defined in `vercel.json` — e.g. `/api/refresh` every 15–30 min during US market hours

4. **Result:** open the URL from phone or laptop, always see a recently-refreshed dashboard, adding/untracking a ticker is a form submit, entering your Claude key is a form submit, no server to manage.

**Free-tier caveat:** Vercel's Hobby tier historically limits cron frequency (once/day, not every 15 min). If that's still the case, the fallback is: on-demand refresh when you open the page (with an "as of X min ago" timestamp and a rate-limit guard so opening it 5 times in a row doesn't spam Finnhub). Confirm current Hobby limits before deploying.

### 5.1 Decision: No Database
**Do not add a Postgres/relational database for v1.** Everything this app needs to persist is key-value shaped and covered by KV:
- Watchlist (array of tickers) → one KV key
- Claude API key → one KV key
- Latest cached digest → one KV key

Historical price data for the momentum/pattern screener does **not** need to be stored — it's fetched fresh from Finnhub each refresh, since the provider already retains full history.

**Do not reach for Postgres, Supabase, Mongo, etc. unless one of these specific needs shows up later:**
- Storing your own annotations/notes on a ticker over time
- A permanent log of every past digest, not just the latest
- Watchlist logic grows relational (categories, tags, multiple lists)
- Multi-user (would also require auth — a much bigger change, see §3)

---

## 6. Scope Decisions (Answered)

The v0 draft left four open questions. Locked answers:

1. **Device support** → Phone + laptop, responsive layout, one dashboard page (§2.4)
2. **Notifications** → Pull-only, no email/SMS/push in v1 (§2.4, §3)
3. **Screener window** → Default 10d, toggle for 5d / 10d / 1mo / 3mo (§2.3)
4. **News filtering** → Show *all* Finnhub headlines per ticker as a raw list; layer a Claude TL;DR line on top when a key is available (§2.2). No keyword filtering, no relevance threshold.

Additional decisions made during scope review:

5. **Claude key handling** → BYOK, stored in Vercel KV via a settings UI, single-user (§2.5)
6. **Price data provider** → Finnhub (dropped Yahoo/`yfinance` to keep the stack single-language TypeScript) (§4)

---

## 7. Success Criteria
- You can open one URL and immediately see: recent price action, a per-ticker headline list, an optional TL;DR line, and momentum flags for the whole watchlist
- Updating the ticker list is a form submit, not a code change
- Entering/rotating your Claude API key is a form submit, not a redeploy
- Once running, it requires no ongoing intervention — it just keeps producing fresh snapshots on schedule

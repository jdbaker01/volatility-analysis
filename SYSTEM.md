# System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Browser                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     React Frontend (Vite)                          │  │
│  │                     http://localhost:5173                          │  │
│  │  ┌─────────────┐  ┌──────────────────┐  ┌───────────────────┐    │  │
│  │  │ TickerInput │  │ VolatilityTable  │  │ VolatilityChart   │    │  │
│  │  └─────────────┘  └──────────────────┘  └───────────────────┘    │  │
│  │         │                   ▲                    ▲                │  │
│  │         │                   │                    │                │  │
│  │         └───────────────────┴────────────────────┘                │  │
│  │                             │                                      │  │
│  │                      ┌──────┴──────┐                              │  │
│  │                      │   App.jsx   │                              │  │
│  │                      │   (state)   │                              │  │
│  │                      └──────┬──────┘                              │  │
│  └─────────────────────────────┼─────────────────────────────────────┘  │
│                                │                                         │
│                         HTTP REST API                                    │
│                                │                                         │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend                                  │
│                      http://localhost:8000                               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                          main.py                                 │   │
│  │                      API Endpoints                               │   │
│  │            /api/health    /api/volatility/{ticker}               │   │
│  └─────────────────────────────┬───────────────────────────────────┘   │
│                                │                                         │
│                                ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                       volatility.py                              │   │
│  │                   Calculation Engine                             │   │
│  │  • Log returns: ln(price_t / price_t-1)                         │   │
│  │  • Rolling volatility: std(returns) × √252                      │   │
│  │  • Percentile rankings against historical distribution          │   │
│  │  • Returns: daily, weekly, monthly, YTD                         │   │
│  └─────────────────────────────┬───────────────────────────────────┘   │
│                                │                                         │
│                                ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         cache.py                                 │   │
│  │                      Caching Layer                               │   │
│  │  ┌─────────────┐        ┌──────────────────────────────────┐   │   │
│  │  │   SQLite    │◄──────►│  fetch_and_cache()               │   │   │
│  │  │ price_cache │        │  • Check cache freshness          │   │   │
│  │  │    .db      │        │  • Fetch if stale (daily)         │   │   │
│  │  └─────────────┘        │  • Return cached or fresh data    │   │   │
│  │                         └──────────────────────────────────┘   │   │
│  └─────────────────────────────┬───────────────────────────────────┘   │
│                                │                                         │
└────────────────────────────────┼─────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │    Yahoo Finance API   │
                    │   (External Service)   │
                    └────────────────────────┘
```

## Data Flow

```
User Input                Processing                    Output
─────────────────────────────────────────────────────────────────────────

  ┌────────┐
  │ Ticker │
  │  "SPY" │
  └───┬────┘
      │
      ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────────────┐
│ TickerInput │────►│  App.jsx     │────►│  fetch('/api/volatility │
│  Component  │     │  fetchData() │     │         /SPY')          │
└─────────────┘     └──────────────┘     └───────────┬─────────────┘
                                                     │
                                                     ▼
                                         ┌───────────────────────┐
                                         │      FastAPI          │
                                         │  get_volatility()     │
                                         └───────────┬───────────┘
                                                     │
                          ┌──────────────────────────┼───────────────────┐
                          │                          │                   │
                          ▼                          ▼                   │
                  ┌───────────────┐         ┌───────────────┐           │
                  │ Cache Hit?    │   No    │ Yahoo Finance │           │
                  │ (today's date)├────────►│ API Request   │           │
                  └───────┬───────┘         └───────┬───────┘           │
                          │ Yes                     │                    │
                          │                         ▼                    │
                          │                 ┌───────────────┐           │
                          │                 │ Save to Cache │           │
                          │                 └───────┬───────┘           │
                          │                         │                    │
                          └────────────┬────────────┘                    │
                                       │                                 │
                                       ▼                                 │
                          ┌────────────────────────┐                    │
                          │   calculate_volatility │                    │
                          │   ─────────────────────│                    │
                          │   • Log returns        │                    │
                          │   • 30d/90d rolling    │                    │
                          │   • Percentiles        │                    │
                          │   • Returns calc       │                    │
                          └───────────┬────────────┘                    │
                                      │                                  │
                                      ▼                                  │
                          ┌────────────────────────┐                    │
                          │     JSON Response      │◄───────────────────┘
                          │  {                     │
                          │    ticker, price,      │
                          │    vol_30d, vol_90d,   │
                          │    percentiles,        │
                          │    returns, history    │
                          │  }                     │
                          └───────────┬────────────┘
                                      │
      ┌───────────────────────────────┼───────────────────────────────┐
      │                               │                               │
      ▼                               ▼                               ▼
┌───────────────┐           ┌─────────────────┐           ┌──────────────┐
│VolatilityTable│           │ VolatilityChart │           │   History    │
│───────────────│           │─────────────────│           │   Sidebar    │
│ • Price/OHLC  │           │ • Line chart    │           │──────────────│
│ • Returns     │           │ • 30d/90d lines │           │ localStorage │
│ • Vol metrics │           │ • Reference     │           │ persistence  │
│ • Percentiles │           │   lines (p50,   │           └──────────────┘
└───────────────┘           │   p90, p99)     │
                            └─────────────────┘
```

## Component Responsibilities

### Frontend

| Component | Responsibility |
|-----------|----------------|
| `App.jsx` | State management, API calls, layout orchestration |
| `TickerInput.jsx` | User input handling, form submission |
| `VolatilityTable.jsx` | Price display, returns, volatility metrics |
| `VolatilityChart.jsx` | Historical volatility visualization with Recharts |

### Backend

| Module | Responsibility |
|--------|----------------|
| `main.py` | FastAPI app, routing, CORS, error handling |
| `volatility.py` | Core calculations: log returns, rolling std, percentiles |
| `cache.py` | SQLite storage, cache freshness checks, Yahoo Finance fetching |

## Database Schema

```sql
-- OHLCV price data
daily_prices (
    ticker     TEXT NOT NULL,
    date       TEXT NOT NULL,
    open       REAL,
    high       REAL,
    low        REAL,
    close      REAL,
    adj_close  REAL,
    volume     INTEGER,
    PRIMARY KEY (ticker, date)
)

-- Cache freshness tracking
cache_metadata (
    ticker       TEXT PRIMARY KEY,
    last_updated TEXT
)
```

## Volatility Calculation

```
Annualized Volatility = σ(log returns) × √252

Where:
  • log return = ln(price_t / price_t-1)
  • σ = standard deviation over rolling window (30 or 90 days)
  • 252 = trading days per year
```

## Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (FastAPI) | 8000 | http://localhost:8000 |

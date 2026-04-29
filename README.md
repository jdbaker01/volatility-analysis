# Volatility Analysis Terminal

A full-stack web application for analyzing stock market volatility. Query any stock ticker to receive detailed volatility metrics across 30-day and 90-day time horizons, with historical trends and percentile-based comparisons.

## Features

- Real-time volatility calculations for any stock ticker
- 30-day and 90-day rolling volatility metrics
- Historical percentile rankings (p50, p90, p99)
- Returns tracking (daily, weekly, monthly, YTD)
- Interactive volatility chart with 1-year history
- Local caching for fast repeat queries
- Search history with quick-access sidebar

## Tech Stack

**Backend:** FastAPI, Python 3, pandas, numpy, SQLite
**Frontend:** React 18, Vite, Tailwind CSS, Recharts

## Quick Start

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Database Setup

The portfolios feature requires a PostgreSQL database. Volatility analysis endpoints work without one.

1. Create a free project at [Neon](https://neon.tech) and copy the connection string.
2. Copy `backend/.env.example` to `backend/.env` and fill in `DATABASE_URL`:
   ```
   DATABASE_URL=postgresql://user:password@ep-xxx.<region>.aws.neon.tech/neondb?sslmode=require
   ```
3. Start the backend — the `portfolios` table and indexes are created automatically on first run via a startup hook in `backend/main.py`.

For deployment, set `DATABASE_URL` in your platform's environment variables (e.g. Vercel project settings) for both Preview and Production. Without it, the backend boots but every `/api/portfolios*` call returns a 500.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/volatility/{ticker}` | Volatility metrics for a ticker |

### Query Parameters

- `lookback_years` (default: 5) - Historical data range for percentile calculations

### Response Example

```json
{
  "ticker": "SPY",
  "current_price": 450.25,
  "vol_30d": 0.1523,
  "vol_90d": 0.1412,
  "vol_30d_percentile": 65.2,
  "vol_90d_percentile": 58.7,
  "returns": {
    "daily": 0.0012,
    "week": 0.0085,
    "month": 0.0234,
    "ytd": 0.1245
  },
  "history": [...]
}
```

## Development

```bash
# Backend tests
cd backend && pytest --cov

# Frontend tests
cd frontend && npm test
```

## Data Source

Price data is fetched from Yahoo Finance and cached locally in SQLite. Cache is refreshed daily.

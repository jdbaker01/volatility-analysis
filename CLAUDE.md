# CLAUDE.md

## Project Overview

**Volatility Analysis Terminal** - A full-stack web application for analyzing stock market volatility. Users can query any stock ticker to receive detailed volatility metrics across 30-day and 90-day time horizons, with historical trends and percentile-based comparisons.

## Tech Stack

**Backend:** FastAPI, Python 3, pandas, numpy, yfinance, SQLite (caching), pytest
**Frontend:** React 18, Vite, Tailwind CSS, Recharts

## Project Structure

```
backend/
  main.py           # FastAPI app and API endpoints
  volatility.py     # Core volatility calculation logic
  cache.py          # SQLite caching system
  tests/            # pytest tests

frontend/
  src/
    App.jsx         # Main application component
    components/     # TickerInput, VolatilityTable, VolatilityChart
    test/           # Vitest tests
```

## Development Commands

### Backend
**Always use a virtual environment when working with the backend.**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
pytest                    # Run tests
pytest --cov             # Run with coverage
```

### Frontend
```bash
cd frontend
npm install
npm run dev              # Dev server on http://localhost:5173
npm run build            # Production build
npm test                 # Run Vitest
npm run test:coverage    # Tests with coverage
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/volatility/{ticker}?lookback_years=5` - Get volatility metrics for a ticker

## Code Conventions

- **Python:** Type hints, async/await for endpoints, HTTPException for errors
- **React:** Functional components with hooks, Tailwind utility classes
- **Testing:** 100% coverage required (enforced in vite.config.js)
- **New Features:** All new features must start with a feature file in the `features/` folder named `FEATURE-<feature-name>.md`. Create a new branch off origin before coding.

## Key Implementation Details

- Volatility: annualized standard deviation of log returns (×√252)
- Cache: SQLite stores OHLCV data, checked daily
- CORS: Accepts requests from localhost:5173

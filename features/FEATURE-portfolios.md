# Feature: Portfolio Management

## Overview
Add the ability to define hierarchical portfolios with tree-like nesting. A portfolio either contains child portfolios (group) or individual holdings (leaf). Calculate daily/weekly/monthly PnL and daily Value-at-Risk (both Historical Simulation and Parametric) for each portfolio, with aggregate metrics rolling up through the tree.

## Architecture

### Storage
- **Neon PostgreSQL** (free tier, JSONB for holdings)
- Single `portfolios` table with self-referencing `parent_id` for tree structure
- Holdings stored as JSONB array within each leaf portfolio row
- `ON DELETE CASCADE` for automatic cleanup of children

### Database Schema
```sql
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    portfolio_type TEXT NOT NULL CHECK (portfolio_type IN ('group', 'leaf')),
    holdings JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Implementation

### Backend
- `backend/database.py` — Neon PostgreSQL connection pool (asyncpg)
- `backend/portfolio.py` — Portfolio CRUD operations
- `backend/portfolio_analytics.py` — PnL and VaR calculations
- `backend/main.py` — 7 new API endpoints (all auth-protected)

### Frontend
- Tab navigation: ANALYSIS | PORTFOLIOS
- `PortfolioPage` — container with sidebar tree + main content
- `PortfolioTree` — collapsible tree view
- `PortfolioForm` — create/edit portfolio
- `HoldingsTable` — manage holdings inline
- `PortfolioAnalytics` — PnL grid + VaR display

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/portfolios` | List user's portfolios |
| POST | `/api/portfolios` | Create portfolio |
| GET | `/api/portfolios/{id}` | Get portfolio |
| PUT | `/api/portfolios/{id}` | Update portfolio |
| DELETE | `/api/portfolios/{id}` | Delete portfolio (cascades) |
| PUT | `/api/portfolios/{id}/holdings` | Replace holdings array |
| GET | `/api/portfolios/{id}/analytics` | PnL + VaR |

## Acceptance Criteria
- [ ] Portfolios can be nested in a tree structure (group contains portfolios, leaf contains holdings)
- [ ] Holdings are ticker + shares stored as JSONB
- [ ] Daily, weekly, monthly PnL calculated for each portfolio
- [ ] Historical Simulation VaR (95%, 1-day) calculated
- [ ] Parametric VaR (95%, 1-day) calculated
- [ ] Aggregate portfolios roll up metrics from descendants
- [ ] Separate tab/page from existing analysis view
- [ ] Portfolio data persists in Neon PostgreSQL
- [ ] 100% test coverage maintained

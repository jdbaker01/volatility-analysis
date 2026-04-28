import json
from typing import Dict, Any, List, Optional
from database import get_pool


async def create_portfolio(
    user_email: str,
    name: str,
    portfolio_type: str,
    parent_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a new portfolio."""
    if portfolio_type not in ("group", "leaf"):
        raise ValueError("portfolio_type must be 'group' or 'leaf'")

    pool = await get_pool()
    async with pool.acquire() as conn:
        if parent_id:
            parent = await conn.fetchrow(
                "SELECT id, portfolio_type FROM portfolios WHERE id = $1 AND user_email = $2",
                parent_id, user_email,
            )
            if not parent:
                raise ValueError("Parent portfolio not found")
            if parent["portfolio_type"] != "group":
                raise ValueError("Cannot add child to a leaf portfolio")

        row = await conn.fetchrow(
            """INSERT INTO portfolios (user_email, name, parent_id, portfolio_type)
               VALUES ($1, $2, $3, $4)
               RETURNING id, user_email, name, parent_id, portfolio_type, holdings,
                         created_at, updated_at""",
            user_email, name, parent_id, portfolio_type,
        )
        return _row_to_dict(row)


async def get_portfolios(user_email: str) -> List[Dict[str, Any]]:
    """Get all portfolios for a user as a flat list."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT id, user_email, name, parent_id, portfolio_type, holdings,
                      created_at, updated_at
               FROM portfolios WHERE user_email = $1
               ORDER BY created_at""",
            user_email,
        )
        return [_row_to_dict(r) for r in rows]


async def get_portfolio(user_email: str, portfolio_id: str) -> Optional[Dict[str, Any]]:
    """Get a single portfolio by ID."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """SELECT id, user_email, name, parent_id, portfolio_type, holdings,
                      created_at, updated_at
               FROM portfolios WHERE id = $1 AND user_email = $2""",
            portfolio_id, user_email,
        )
        if not row:
            return None
        return _row_to_dict(row)


async def update_portfolio(
    user_email: str,
    portfolio_id: str,
    name: Optional[str] = None,
    portfolio_type: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Update portfolio name or type."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        current = await conn.fetchrow(
            "SELECT * FROM portfolios WHERE id = $1 AND user_email = $2",
            portfolio_id, user_email,
        )
        if not current:
            return None

        if portfolio_type and portfolio_type != current["portfolio_type"]:
            if portfolio_type == "leaf":
                children = await conn.fetchval(
                    "SELECT count(*) FROM portfolios WHERE parent_id = $1",
                    portfolio_id,
                )
                if children > 0:
                    raise ValueError("Cannot change to leaf: portfolio has children")
            elif portfolio_type == "group":
                holdings = json.loads(current["holdings"]) if isinstance(current["holdings"], str) else current["holdings"]
                if holdings:
                    raise ValueError("Cannot change to group: portfolio has holdings")

        new_name = name if name is not None else current["name"]
        new_type = portfolio_type if portfolio_type is not None else current["portfolio_type"]

        row = await conn.fetchrow(
            """UPDATE portfolios SET name = $1, portfolio_type = $2, updated_at = now()
               WHERE id = $3 AND user_email = $4
               RETURNING id, user_email, name, parent_id, portfolio_type, holdings,
                         created_at, updated_at""",
            new_name, new_type, portfolio_id, user_email,
        )
        return _row_to_dict(row)


async def delete_portfolio(user_email: str, portfolio_id: str) -> bool:
    """Delete a portfolio (cascades to children)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM portfolios WHERE id = $1 AND user_email = $2",
            portfolio_id, user_email,
        )
        return result == "DELETE 1"


async def set_holdings(
    user_email: str,
    portfolio_id: str,
    holdings: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Replace the holdings JSONB array on a leaf portfolio."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        current = await conn.fetchrow(
            "SELECT portfolio_type FROM portfolios WHERE id = $1 AND user_email = $2",
            portfolio_id, user_email,
        )
        if not current:
            raise ValueError("Portfolio not found")
        if current["portfolio_type"] != "leaf":
            raise ValueError("Can only set holdings on a leaf portfolio")

        validated = []
        seen_tickers = set()
        for h in holdings:
            ticker = h.get("ticker", "").upper().strip()
            shares = h.get("shares")
            if not ticker:
                raise ValueError("Each holding must have a ticker")
            if shares is None or shares <= 0:
                raise ValueError(f"Shares must be positive for {ticker}")
            if ticker in seen_tickers:
                raise ValueError(f"Duplicate ticker: {ticker}")
            seen_tickers.add(ticker)
            validated.append({"ticker": ticker, "shares": shares})

        row = await conn.fetchrow(
            """UPDATE portfolios SET holdings = $1::jsonb, updated_at = now()
               WHERE id = $2 AND user_email = $3
               RETURNING id, user_email, name, parent_id, portfolio_type, holdings,
                         created_at, updated_at""",
            json.dumps(validated), portfolio_id, user_email,
        )
        return _row_to_dict(row)


async def get_all_leaf_holdings(
    user_email: str, portfolio_id: str
) -> List[Dict[str, Any]]:
    """Recursively get all holdings under a portfolio using a CTE."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """WITH RECURSIVE descendants AS (
                   SELECT id, portfolio_type, holdings
                   FROM portfolios
                   WHERE id = $1 AND user_email = $2
                   UNION ALL
                   SELECT p.id, p.portfolio_type, p.holdings
                   FROM portfolios p
                   JOIN descendants d ON p.parent_id = d.id
               )
               SELECT holdings FROM descendants WHERE portfolio_type = 'leaf'""",
            portfolio_id, user_email,
        )

        merged: Dict[str, float] = {}
        for row in rows:
            holdings = json.loads(row["holdings"]) if isinstance(row["holdings"], str) else row["holdings"]
            for h in holdings:
                ticker = h["ticker"]
                merged[ticker] = merged.get(ticker, 0) + h["shares"]

        return [{"ticker": t, "shares": s} for t, s in merged.items()]


def _row_to_dict(row) -> Dict[str, Any]:
    """Convert an asyncpg Record to a dict with serializable types."""
    d = dict(row)
    d["id"] = str(d["id"])
    if d.get("parent_id"):
        d["parent_id"] = str(d["parent_id"])
    if isinstance(d.get("holdings"), str):
        d["holdings"] = json.loads(d["holdings"])
    if d.get("created_at"):
        d["created_at"] = d["created_at"].isoformat()
    if d.get("updated_at"):
        d["updated_at"] = d["updated_at"].isoformat()
    return d

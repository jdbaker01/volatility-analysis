import os
import asyncpg
from typing import Optional

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    """Get or create the asyncpg connection pool for Neon PostgreSQL."""
    global _pool
    if _pool is None or _pool._closed:
        database_url = os.environ.get("DATABASE_URL", "")
        if not database_url:
            raise RuntimeError("DATABASE_URL environment variable not set")
        _pool = await asyncpg.create_pool(
            database_url,
            min_size=1,
            max_size=5,
            command_timeout=30,
        )
    return _pool


async def close_pool():
    """Close the connection pool."""
    global _pool
    if _pool is not None and not _pool._closed:
        await _pool.close()
        _pool = None


async def init_schema():
    """Create portfolio tables if they don't exist."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS portfolios (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_email TEXT NOT NULL,
                name TEXT NOT NULL,
                parent_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
                portfolio_type TEXT NOT NULL CHECK (portfolio_type IN ('group', 'leaf')),
                holdings JSONB NOT NULL DEFAULT '[]',
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            )
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_portfolios_user
            ON portfolios(user_email)
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_portfolios_parent
            ON portfolios(parent_id)
        """)

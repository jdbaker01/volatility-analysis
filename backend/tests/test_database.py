import pytest
from unittest.mock import patch, AsyncMock, MagicMock, PropertyMock

import sys
sys.path.insert(0, '..')

import database


@pytest.fixture(autouse=True)
def reset_pool():
    """Reset the global pool before each test."""
    database._pool = None
    yield
    database._pool = None


class TestGetPool:
    """Test the get_pool function."""

    @pytest.mark.asyncio
    @patch('database.asyncpg')
    async def test_creates_pool_on_first_call(self, mock_asyncpg):
        mock_pool = AsyncMock()
        type(mock_pool)._closed = PropertyMock(return_value=False)
        mock_asyncpg.create_pool = AsyncMock(return_value=mock_pool)

        with patch.dict('os.environ', {'DATABASE_URL': 'postgresql://test'}):
            pool = await database.get_pool()

        assert pool is mock_pool
        mock_asyncpg.create_pool.assert_called_once()

    @pytest.mark.asyncio
    @patch('database.asyncpg')
    async def test_returns_existing_pool(self, mock_asyncpg):
        mock_pool = AsyncMock()
        type(mock_pool)._closed = PropertyMock(return_value=False)
        database._pool = mock_pool

        with patch.dict('os.environ', {'DATABASE_URL': 'postgresql://test'}):
            pool = await database.get_pool()

        assert pool is mock_pool
        mock_asyncpg.create_pool.assert_not_called()

    @pytest.mark.asyncio
    async def test_raises_if_no_database_url(self):
        with patch.dict('os.environ', {}, clear=True):
            # Remove DATABASE_URL if set
            import os
            os.environ.pop('DATABASE_URL', None)
            with pytest.raises(RuntimeError, match="DATABASE_URL"):
                await database.get_pool()

    @pytest.mark.asyncio
    @patch('database.asyncpg')
    async def test_creates_new_pool_if_closed(self, mock_asyncpg):
        old_pool = AsyncMock()
        type(old_pool)._closed = PropertyMock(return_value=True)
        database._pool = old_pool

        new_pool = AsyncMock()
        type(new_pool)._closed = PropertyMock(return_value=False)
        mock_asyncpg.create_pool = AsyncMock(return_value=new_pool)

        with patch.dict('os.environ', {'DATABASE_URL': 'postgresql://test'}):
            pool = await database.get_pool()

        assert pool is new_pool


class TestClosePool:
    """Test the close_pool function."""

    @pytest.mark.asyncio
    async def test_closes_open_pool(self):
        mock_pool = AsyncMock()
        type(mock_pool)._closed = PropertyMock(return_value=False)
        database._pool = mock_pool

        await database.close_pool()

        mock_pool.close.assert_called_once()
        assert database._pool is None

    @pytest.mark.asyncio
    async def test_safe_when_no_pool(self):
        database._pool = None
        await database.close_pool()
        assert database._pool is None

    @pytest.mark.asyncio
    async def test_safe_when_pool_already_closed(self):
        mock_pool = AsyncMock()
        type(mock_pool)._closed = PropertyMock(return_value=True)
        database._pool = mock_pool

        await database.close_pool()
        mock_pool.close.assert_not_called()


class TestInitSchema:
    """Test the init_schema function."""

    @pytest.mark.asyncio
    @patch('database.get_pool')
    async def test_executes_create_table(self, mock_get_pool):
        mock_conn = AsyncMock()
        mock_pool = MagicMock()
        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=mock_conn)
        cm.__aexit__ = AsyncMock(return_value=False)
        mock_pool.acquire.return_value = cm
        mock_get_pool.return_value = mock_pool

        await database.init_schema()

        assert mock_conn.execute.call_count == 3
        first_call = mock_conn.execute.call_args_list[0][0][0]
        assert "CREATE TABLE IF NOT EXISTS portfolios" in first_call

    @pytest.mark.asyncio
    @patch('database.get_pool')
    async def test_creates_indexes(self, mock_get_pool):
        mock_conn = AsyncMock()
        mock_pool = MagicMock()
        cm = MagicMock()
        cm.__aenter__ = AsyncMock(return_value=mock_conn)
        cm.__aexit__ = AsyncMock(return_value=False)
        mock_pool.acquire.return_value = cm
        mock_get_pool.return_value = mock_pool

        await database.init_schema()

        calls = [c[0][0] for c in mock_conn.execute.call_args_list]
        assert any("idx_portfolios_user" in c for c in calls)
        assert any("idx_portfolios_parent" in c for c in calls)

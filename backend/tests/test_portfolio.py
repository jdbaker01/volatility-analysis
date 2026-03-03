import pytest
import json
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timezone

import sys
sys.path.insert(0, '..')

from portfolio import (
    create_portfolio, get_portfolios, get_portfolio,
    update_portfolio, delete_portfolio, set_holdings,
    get_all_leaf_holdings, _row_to_dict,
)


def make_row(overrides=None):
    """Create a mock asyncpg Record."""
    import uuid
    base = {
        "id": uuid.UUID("12345678-1234-1234-1234-123456789abc"),
        "user_email": "test@example.com",
        "name": "Test Portfolio",
        "parent_id": None,
        "portfolio_type": "leaf",
        "holdings": "[]",
        "created_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
        "updated_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
    }
    if overrides:
        base.update(overrides)

    mock = MagicMock()
    mock.__getitem__ = lambda self, key: base[key]
    mock.__contains__ = lambda self, key: key in base
    mock.get = lambda key, default=None: base.get(key, default)
    mock.keys = lambda: base.keys()
    mock.__iter__ = lambda self: iter(base)

    # Make dict() work on the mock
    def items():
        return base.items()
    mock.items = items

    return mock


@pytest.fixture
def mock_pool():
    """Create a mock pool with connection context manager."""
    mock_conn = AsyncMock()
    mock_p = MagicMock()
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=mock_conn)
    cm.__aexit__ = AsyncMock(return_value=False)
    mock_p.acquire.return_value = cm
    return mock_p, mock_conn


class TestCreatePortfolio:
    """Test create_portfolio function."""

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_creates_root_portfolio(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        conn.fetchrow.return_value = make_row()

        result = await create_portfolio("test@example.com", "My Portfolio", "leaf")

        assert result["name"] == "Test Portfolio"
        assert conn.fetchrow.call_count == 1

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_creates_child_under_group(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        parent_row = MagicMock()
        parent_row.__getitem__ = lambda self, key: {
            "id": "parent-id", "portfolio_type": "group"
        }[key]
        conn.fetchrow.side_effect = [parent_row, make_row()]

        result = await create_portfolio(
            "test@example.com", "Child", "leaf", "parent-id"
        )

        assert result["name"] == "Test Portfolio"

    @pytest.mark.asyncio
    async def test_rejects_invalid_type(self):
        with pytest.raises(ValueError, match="portfolio_type"):
            await create_portfolio("test@example.com", "Bad", "invalid")

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_rejects_child_under_leaf(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        parent_row = MagicMock()
        parent_row.__getitem__ = lambda self, key: {
            "id": "parent-id", "portfolio_type": "leaf"
        }[key]
        conn.fetchrow.return_value = parent_row

        with pytest.raises(ValueError, match="leaf portfolio"):
            await create_portfolio(
                "test@example.com", "Child", "leaf", "parent-id"
            )

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_rejects_nonexistent_parent(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        conn.fetchrow.return_value = None

        with pytest.raises(ValueError, match="Parent portfolio not found"):
            await create_portfolio(
                "test@example.com", "Child", "leaf", "bad-id"
            )


class TestGetPortfolios:
    """Test get_portfolios function."""

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_returns_flat_list(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        conn.fetch.return_value = [make_row(), make_row({"name": "Second"})]

        result = await get_portfolios("test@example.com")

        assert len(result) == 2

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_returns_empty_list(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        conn.fetch.return_value = []

        result = await get_portfolios("test@example.com")

        assert result == []


class TestGetPortfolio:
    """Test get_portfolio function."""

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_returns_portfolio(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        conn.fetchrow.return_value = make_row()

        result = await get_portfolio("test@example.com", "some-id")

        assert result is not None
        assert result["name"] == "Test Portfolio"

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_returns_none_if_not_found(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        conn.fetchrow.return_value = None

        result = await get_portfolio("test@example.com", "bad-id")

        assert result is None


class TestUpdatePortfolio:
    """Test update_portfolio function."""

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_updates_name(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        current = make_row()
        updated = make_row({"name": "Updated"})
        conn.fetchrow.side_effect = [current, updated]

        result = await update_portfolio("test@example.com", "id", name="Updated")

        assert result is not None

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_returns_none_if_not_found(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        conn.fetchrow.return_value = None

        result = await update_portfolio("test@example.com", "bad-id", name="X")

        assert result is None

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_rejects_group_to_leaf_with_children(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        current = make_row({"portfolio_type": "group"})
        conn.fetchrow.return_value = current
        conn.fetchval.return_value = 2

        with pytest.raises(ValueError, match="has children"):
            await update_portfolio(
                "test@example.com", "id", portfolio_type="leaf"
            )

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_rejects_leaf_to_group_with_holdings(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        current = make_row({
            "portfolio_type": "leaf",
            "holdings": '[{"ticker": "AAPL", "shares": 10}]',
        })
        conn.fetchrow.return_value = current

        with pytest.raises(ValueError, match="has holdings"):
            await update_portfolio(
                "test@example.com", "id", portfolio_type="group"
            )


class TestDeletePortfolio:
    """Test delete_portfolio function."""

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_deletes_portfolio(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        conn.execute.return_value = "DELETE 1"

        result = await delete_portfolio("test@example.com", "some-id")

        assert result is True

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_returns_false_if_not_found(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        conn.execute.return_value = "DELETE 0"

        result = await delete_portfolio("test@example.com", "bad-id")

        assert result is False


class TestSetHoldings:
    """Test set_holdings function."""

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_sets_holdings_on_leaf(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        type_row = MagicMock()
        type_row.__getitem__ = lambda self, key: {"portfolio_type": "leaf"}[key]
        conn.fetchrow.side_effect = [type_row, make_row()]

        result = await set_holdings(
            "test@example.com", "id",
            [{"ticker": "AAPL", "shares": 100}],
        )

        assert result is not None

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_rejects_on_group(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        type_row = MagicMock()
        type_row.__getitem__ = lambda self, key: {"portfolio_type": "group"}[key]
        conn.fetchrow.return_value = type_row

        with pytest.raises(ValueError, match="leaf portfolio"):
            await set_holdings("test@example.com", "id", [])

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_rejects_not_found(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        conn.fetchrow.return_value = None

        with pytest.raises(ValueError, match="not found"):
            await set_holdings("test@example.com", "bad-id", [])

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_uppercases_tickers(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        type_row = MagicMock()
        type_row.__getitem__ = lambda self, key: {"portfolio_type": "leaf"}[key]
        conn.fetchrow.side_effect = [type_row, make_row()]

        await set_holdings(
            "test@example.com", "id",
            [{"ticker": "aapl", "shares": 50}],
        )

        call_args = conn.fetchrow.call_args_list[1][0]
        holdings_json = json.loads(call_args[1])
        assert holdings_json[0]["ticker"] == "AAPL"

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_rejects_negative_shares(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        type_row = MagicMock()
        type_row.__getitem__ = lambda self, key: {"portfolio_type": "leaf"}[key]
        conn.fetchrow.return_value = type_row

        with pytest.raises(ValueError, match="positive"):
            await set_holdings(
                "test@example.com", "id",
                [{"ticker": "AAPL", "shares": -10}],
            )

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_rejects_duplicate_tickers(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        type_row = MagicMock()
        type_row.__getitem__ = lambda self, key: {"portfolio_type": "leaf"}[key]
        conn.fetchrow.return_value = type_row

        with pytest.raises(ValueError, match="Duplicate"):
            await set_holdings(
                "test@example.com", "id",
                [{"ticker": "AAPL", "shares": 10}, {"ticker": "AAPL", "shares": 20}],
            )

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_rejects_empty_ticker(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        type_row = MagicMock()
        type_row.__getitem__ = lambda self, key: {"portfolio_type": "leaf"}[key]
        conn.fetchrow.return_value = type_row

        with pytest.raises(ValueError, match="must have a ticker"):
            await set_holdings(
                "test@example.com", "id",
                [{"ticker": "", "shares": 10}],
            )


class TestGetAllLeafHoldings:
    """Test get_all_leaf_holdings function."""

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_returns_holdings_for_leaf(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        row = MagicMock()
        row.__getitem__ = lambda self, key: {
            "holdings": '[{"ticker": "AAPL", "shares": 100}]'
        }[key]
        conn.fetch.return_value = [row]

        result = await get_all_leaf_holdings("test@example.com", "id")

        assert len(result) == 1
        assert result[0]["ticker"] == "AAPL"
        assert result[0]["shares"] == 100

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_merges_holdings_across_leaves(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        row1 = MagicMock()
        row1.__getitem__ = lambda self, key: {
            "holdings": '[{"ticker": "AAPL", "shares": 50}]'
        }[key]
        row2 = MagicMock()
        row2.__getitem__ = lambda self, key: {
            "holdings": '[{"ticker": "AAPL", "shares": 30}, {"ticker": "MSFT", "shares": 20}]'
        }[key]
        conn.fetch.return_value = [row1, row2]

        result = await get_all_leaf_holdings("test@example.com", "id")

        holdings_map = {h["ticker"]: h["shares"] for h in result}
        assert holdings_map["AAPL"] == 80
        assert holdings_map["MSFT"] == 20

    @pytest.mark.asyncio
    @patch('portfolio.get_pool')
    async def test_returns_empty_for_no_leaves(self, mock_get_pool, mock_pool):
        pool, conn = mock_pool
        mock_get_pool.return_value = pool
        conn.fetch.return_value = []

        result = await get_all_leaf_holdings("test@example.com", "id")

        assert result == []


class TestRowToDict:
    """Test _row_to_dict helper."""

    def test_converts_uuid_to_string(self):
        row = make_row()
        result = _row_to_dict(row)
        assert isinstance(result["id"], str)

    def test_converts_parent_id_to_string(self):
        import uuid
        row = make_row({"parent_id": uuid.UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")})
        result = _row_to_dict(row)
        assert result["parent_id"] == "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

    def test_parses_holdings_json_string(self):
        row = make_row({"holdings": '[{"ticker": "AAPL", "shares": 10}]'})
        result = _row_to_dict(row)
        assert isinstance(result["holdings"], list)
        assert result["holdings"][0]["ticker"] == "AAPL"

    def test_handles_list_holdings(self):
        row = make_row({"holdings": [{"ticker": "AAPL", "shares": 10}]})
        result = _row_to_dict(row)
        assert isinstance(result["holdings"], list)

    def test_converts_timestamps(self):
        row = make_row()
        result = _row_to_dict(row)
        assert isinstance(result["created_at"], str)
        assert isinstance(result["updated_at"], str)

import pytest
from unittest.mock import patch, MagicMock, AsyncMock
import httpx

import sys
sys.path.insert(0, '..')

from main import app
from auth import verify_google_token


# Mock auth dependency for most tests
async def mock_verify_token():
    return {"email": "test@example.com", "name": "Test User"}


app.dependency_overrides[verify_google_token] = mock_verify_token


# Use httpx AsyncClient for testing
@pytest.fixture
async def client():
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test"
    ) as c:
        yield c


class TestHealthCheck:
    """Test the health check endpoint."""

    @pytest.mark.asyncio
    async def test_health_check_returns_200(self, client):
        """Test that health check returns 200 status."""
        response = await client.get("/api/health")
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_health_check_returns_healthy(self, client):
        """Test that health check returns healthy status."""
        response = await client.get("/api/health")
        data = response.json()
        assert data["status"] == "healthy"


class TestGetVolatility:
    """Test the volatility endpoint."""

    @pytest.mark.asyncio
    @patch('main.calculate_volatility')
    async def test_returns_volatility_data(self, mock_calc, client):
        """Test that endpoint returns volatility data."""
        mock_calc.return_value = {
            'ticker': 'SPY',
            'current_price': 450.25,
            'daily_open': 449.00,
            'daily_high': 452.00,
            'daily_low': 448.00,
            'vol_30d': 0.15,
            'vol_90d': 0.14,
            'vol_30d_percentile': 50.0,
            'vol_90d_percentile': 45.0,
            'vol_30d_bucket': '<p50',
            'vol_90d_bucket': '<p50',
            'percentile_thresholds': {
                '30d': {'p50': 0.15, 'p90': 0.25, 'p99': 0.40},
                '90d': {'p50': 0.14, 'p90': 0.22, 'p99': 0.35}
            },
            'history': []
        }

        response = await client.get("/api/volatility/SPY")

        assert response.status_code == 200
        data = response.json()
        assert data['ticker'] == 'SPY'
        assert 'vol_30d' in data
        assert 'vol_90d' in data

    @pytest.mark.asyncio
    @patch('main.calculate_volatility')
    async def test_accepts_lookback_years_param(self, mock_calc, client):
        """Test that lookback_years parameter is passed."""
        mock_calc.return_value = {
            'ticker': 'AAPL',
            'current_price': 180.00,
            'daily_open': 179.00,
            'daily_high': 182.00,
            'daily_low': 178.00,
            'vol_30d': 0.20,
            'vol_90d': 0.18,
            'vol_30d_percentile': 60.0,
            'vol_90d_percentile': 55.0,
            'vol_30d_bucket': 'p50-p90',
            'vol_90d_bucket': 'p50-p90',
            'percentile_thresholds': {
                '30d': {'p50': 0.18, 'p90': 0.30, 'p99': 0.45},
                '90d': {'p50': 0.16, 'p90': 0.28, 'p99': 0.42}
            },
            'history': []
        }

        response = await client.get("/api/volatility/AAPL?lookback_years=3")

        assert response.status_code == 200
        mock_calc.assert_called_once_with('AAPL', 3)

    @pytest.mark.asyncio
    @patch('main.calculate_volatility')
    async def test_default_lookback_years(self, mock_calc, client):
        """Test that default lookback_years is 5."""
        mock_calc.return_value = {
            'ticker': 'MSFT',
            'current_price': 380.00,
            'daily_open': 379.00,
            'daily_high': 382.00,
            'daily_low': 378.00,
            'vol_30d': 0.18,
            'vol_90d': 0.16,
            'vol_30d_percentile': 55.0,
            'vol_90d_percentile': 50.0,
            'vol_30d_bucket': 'p50-p90',
            'vol_90d_bucket': '<p50',
            'percentile_thresholds': {
                '30d': {'p50': 0.17, 'p90': 0.28, 'p99': 0.42},
                '90d': {'p50': 0.16, 'p90': 0.26, 'p99': 0.40}
            },
            'history': []
        }

        response = await client.get("/api/volatility/MSFT")

        mock_calc.assert_called_once_with('MSFT', 5)

    @pytest.mark.asyncio
    @patch('main.calculate_volatility')
    async def test_returns_404_for_value_error(self, mock_calc, client):
        """Test that ValueError results in 404 response."""
        mock_calc.side_effect = ValueError("No data found for ticker: INVALID")

        response = await client.get("/api/volatility/INVALID")

        assert response.status_code == 404
        data = response.json()
        assert "No data found" in data['detail']

    @pytest.mark.asyncio
    @patch('main.calculate_volatility')
    async def test_returns_500_for_other_errors(self, mock_calc, client):
        """Test that other exceptions result in 500 response."""
        mock_calc.side_effect = Exception("Database error")

        response = await client.get("/api/volatility/SPY")

        assert response.status_code == 500
        data = response.json()
        assert "Error calculating volatility" in data['detail']

    @pytest.mark.asyncio
    @patch('main.calculate_volatility')
    async def test_case_insensitive_ticker(self, mock_calc, client):
        """Test that lowercase ticker works."""
        mock_calc.return_value = {
            'ticker': 'AAPL',
            'current_price': 180.00,
            'daily_open': 179.00,
            'daily_high': 182.00,
            'daily_low': 178.00,
            'vol_30d': 0.20,
            'vol_90d': 0.18,
            'vol_30d_percentile': 60.0,
            'vol_90d_percentile': 55.0,
            'vol_30d_bucket': 'p50-p90',
            'vol_90d_bucket': 'p50-p90',
            'percentile_thresholds': {
                '30d': {'p50': 0.18, 'p90': 0.30, 'p99': 0.45},
                '90d': {'p50': 0.16, 'p90': 0.28, 'p99': 0.42}
            },
            'history': []
        }

        response = await client.get("/api/volatility/aapl")

        assert response.status_code == 200
        mock_calc.assert_called_once_with('aapl', 5)


class TestAuthProtection:
    """Test that endpoints are properly protected."""

    @pytest.mark.asyncio
    async def test_volatility_returns_403_without_token(self):
        """Test that volatility endpoint requires auth."""
        app.dependency_overrides.pop(verify_google_token, None)
        try:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app),
                base_url="http://test"
            ) as client:
                response = await client.get("/api/volatility/SPY")
                assert response.status_code == 403
        finally:
            app.dependency_overrides[verify_google_token] = mock_verify_token

    @pytest.mark.asyncio
    async def test_health_check_no_auth_required(self):
        """Test that health check works without auth."""
        app.dependency_overrides.pop(verify_google_token, None)
        try:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app),
                base_url="http://test"
            ) as client:
                response = await client.get("/api/health")
                assert response.status_code == 200
        finally:
            app.dependency_overrides[verify_google_token] = mock_verify_token


class TestCORS:
    """Test CORS configuration."""

    @pytest.mark.asyncio
    async def test_cors_headers_present(self, client):
        """Test that CORS headers are present in response."""
        response = await client.get(
            "/api/health",
            headers={"Origin": "http://localhost:5173"}
        )

        # CORS should allow the localhost:5173 origin
        assert response.status_code == 200


class TestAppConfiguration:
    """Test app configuration."""

    def test_app_title(self):
        """Test that app has correct title."""
        assert app.title == "Volatility Analysis API"


# --- Portfolio endpoint tests ---

mock_portfolio = {
    "id": "test-uuid",
    "user_email": "test@example.com",
    "name": "Test Portfolio",
    "parent_id": None,
    "portfolio_type": "leaf",
    "holdings": [],
    "created_at": "2024-01-01T00:00:00+00:00",
    "updated_at": "2024-01-01T00:00:00+00:00",
}


class TestListPortfolios:
    """Test GET /api/portfolios."""

    @pytest.mark.asyncio
    @patch('main.get_portfolios')
    async def test_returns_portfolios(self, mock_get, client):
        mock_get.return_value = [mock_portfolio]
        response = await client.get("/api/portfolios")
        assert response.status_code == 200
        data = response.json()
        assert "portfolios" in data
        assert len(data["portfolios"]) == 1

    @pytest.mark.asyncio
    @patch('main.get_portfolios')
    async def test_returns_empty_list(self, mock_get, client):
        mock_get.return_value = []
        response = await client.get("/api/portfolios")
        assert response.status_code == 200
        assert response.json()["portfolios"] == []


class TestCreatePortfolio:
    """Test POST /api/portfolios."""

    @pytest.mark.asyncio
    @patch('main.create_portfolio')
    async def test_creates_portfolio(self, mock_create, client):
        mock_create.return_value = mock_portfolio
        response = await client.post("/api/portfolios", json={
            "name": "Test", "portfolio_type": "leaf"
        })
        assert response.status_code == 201
        assert response.json()["name"] == "Test Portfolio"

    @pytest.mark.asyncio
    @patch('main.create_portfolio')
    async def test_creates_with_parent(self, mock_create, client):
        mock_create.return_value = mock_portfolio
        response = await client.post("/api/portfolios", json={
            "name": "Child", "portfolio_type": "leaf", "parent_id": "parent-uuid"
        })
        assert response.status_code == 201

    @pytest.mark.asyncio
    @patch('main.create_portfolio')
    async def test_returns_400_on_value_error(self, mock_create, client):
        mock_create.side_effect = ValueError("Parent not found")
        response = await client.post("/api/portfolios", json={
            "name": "Bad", "portfolio_type": "leaf", "parent_id": "bad"
        })
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_returns_422_for_invalid_type(self, client):
        response = await client.post("/api/portfolios", json={
            "name": "Bad", "portfolio_type": "invalid"
        })
        assert response.status_code == 422


class TestGetPortfolioEndpoint:
    """Test GET /api/portfolios/{id}."""

    @pytest.mark.asyncio
    @patch('main.get_portfolio')
    async def test_returns_portfolio(self, mock_get, client):
        mock_get.return_value = mock_portfolio
        response = await client.get("/api/portfolios/test-uuid")
        assert response.status_code == 200
        assert response.json()["id"] == "test-uuid"

    @pytest.mark.asyncio
    @patch('main.get_portfolio')
    async def test_returns_404_not_found(self, mock_get, client):
        mock_get.return_value = None
        response = await client.get("/api/portfolios/bad-uuid")
        assert response.status_code == 404


class TestUpdatePortfolioEndpoint:
    """Test PUT /api/portfolios/{id}."""

    @pytest.mark.asyncio
    @patch('main.update_portfolio')
    async def test_updates_portfolio(self, mock_update, client):
        mock_update.return_value = mock_portfolio
        response = await client.put("/api/portfolios/test-uuid", json={
            "name": "Updated"
        })
        assert response.status_code == 200

    @pytest.mark.asyncio
    @patch('main.update_portfolio')
    async def test_returns_404_not_found(self, mock_update, client):
        mock_update.return_value = None
        response = await client.put("/api/portfolios/bad-uuid", json={
            "name": "X"
        })
        assert response.status_code == 404

    @pytest.mark.asyncio
    @patch('main.update_portfolio')
    async def test_returns_400_on_value_error(self, mock_update, client):
        mock_update.side_effect = ValueError("has children")
        response = await client.put("/api/portfolios/test-uuid", json={
            "portfolio_type": "leaf"
        })
        assert response.status_code == 400


class TestDeletePortfolioEndpoint:
    """Test DELETE /api/portfolios/{id}."""

    @pytest.mark.asyncio
    @patch('main.delete_portfolio')
    async def test_deletes_portfolio(self, mock_delete, client):
        mock_delete.return_value = True
        response = await client.delete("/api/portfolios/test-uuid")
        assert response.status_code == 200
        assert response.json()["status"] == "deleted"

    @pytest.mark.asyncio
    @patch('main.delete_portfolio')
    async def test_returns_404_not_found(self, mock_delete, client):
        mock_delete.return_value = False
        response = await client.delete("/api/portfolios/bad-uuid")
        assert response.status_code == 404


class TestSetHoldingsEndpoint:
    """Test PUT /api/portfolios/{id}/holdings."""

    @pytest.mark.asyncio
    @patch('main.set_holdings')
    async def test_sets_holdings(self, mock_set, client):
        mock_set.return_value = mock_portfolio
        response = await client.put("/api/portfolios/test-uuid/holdings", json={
            "holdings": [{"ticker": "AAPL", "shares": 100}]
        })
        assert response.status_code == 200

    @pytest.mark.asyncio
    @patch('main.set_holdings')
    async def test_returns_400_on_value_error(self, mock_set, client):
        mock_set.side_effect = ValueError("not a leaf")
        response = await client.put("/api/portfolios/test-uuid/holdings", json={
            "holdings": [{"ticker": "AAPL", "shares": 100}]
        })
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_returns_422_for_invalid_shares(self, client):
        response = await client.put("/api/portfolios/test-uuid/holdings", json={
            "holdings": [{"ticker": "AAPL", "shares": -10}]
        })
        assert response.status_code == 422


class TestGetPortfolioAnalytics:
    """Test GET /api/portfolios/{id}/analytics."""

    @pytest.mark.asyncio
    @patch('main.calculate_portfolio_analytics')
    @patch('main.get_all_leaf_holdings')
    @patch('main.get_portfolio')
    async def test_returns_analytics(self, mock_get_p, mock_get_h, mock_calc, client):
        mock_get_p.return_value = mock_portfolio
        mock_get_h.return_value = [{"ticker": "AAPL", "shares": 100}]
        mock_calc.return_value = {
            "current_value": 15000.0,
            "daily_pnl": 100.0,
            "weekly_pnl": 250.0,
            "monthly_pnl": -500.0,
            "holdings_detail": [],
            "var": {
                "historical": {"var_95": 500.0, "var_95_pct": 3.33, "method": "historical"},
                "parametric": {"var_95": 480.0, "var_95_pct": 3.20, "method": "parametric"},
            },
        }
        response = await client.get("/api/portfolios/test-uuid/analytics")
        assert response.status_code == 200
        data = response.json()
        assert data["current_value"] == 15000.0
        assert "var" in data

    @pytest.mark.asyncio
    @patch('main.get_portfolio')
    async def test_returns_404_not_found(self, mock_get_p, client):
        mock_get_p.return_value = None
        response = await client.get("/api/portfolios/bad-uuid/analytics")
        assert response.status_code == 404

    @pytest.mark.asyncio
    @patch('main.get_all_leaf_holdings')
    @patch('main.get_portfolio')
    async def test_returns_empty_for_no_holdings(self, mock_get_p, mock_get_h, client):
        mock_get_p.return_value = mock_portfolio
        mock_get_h.return_value = []
        response = await client.get("/api/portfolios/test-uuid/analytics")
        assert response.status_code == 200
        data = response.json()
        assert data["current_value"] == 0

    @pytest.mark.asyncio
    @patch('main.calculate_portfolio_analytics')
    @patch('main.get_all_leaf_holdings')
    @patch('main.get_portfolio')
    async def test_returns_404_on_value_error(self, mock_get_p, mock_get_h, mock_calc, client):
        mock_get_p.return_value = mock_portfolio
        mock_get_h.return_value = [{"ticker": "BAD", "shares": 10}]
        mock_calc.side_effect = ValueError("No price data")
        response = await client.get("/api/portfolios/test-uuid/analytics")
        assert response.status_code == 404

    @pytest.mark.asyncio
    @patch('main.calculate_portfolio_analytics')
    @patch('main.get_all_leaf_holdings')
    @patch('main.get_portfolio')
    async def test_returns_500_on_exception(self, mock_get_p, mock_get_h, mock_calc, client):
        mock_get_p.return_value = mock_portfolio
        mock_get_h.return_value = [{"ticker": "AAPL", "shares": 10}]
        mock_calc.side_effect = Exception("Unexpected")
        response = await client.get("/api/portfolios/test-uuid/analytics")
        assert response.status_code == 500


class TestPortfolioAuthProtection:
    """Test that portfolio endpoints require auth."""

    @pytest.mark.asyncio
    async def test_portfolios_list_requires_auth(self):
        app.dependency_overrides.pop(verify_google_token, None)
        try:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app),
                base_url="http://test"
            ) as client:
                response = await client.get("/api/portfolios")
                assert response.status_code == 403
        finally:
            app.dependency_overrides[verify_google_token] = mock_verify_token

    @pytest.mark.asyncio
    async def test_portfolios_create_requires_auth(self):
        app.dependency_overrides.pop(verify_google_token, None)
        try:
            async with httpx.AsyncClient(
                transport=httpx.ASGITransport(app=app),
                base_url="http://test"
            ) as client:
                response = await client.post("/api/portfolios", json={
                    "name": "Test", "portfolio_type": "leaf"
                })
                assert response.status_code == 403
        finally:
            app.dependency_overrides[verify_google_token] = mock_verify_token

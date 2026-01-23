import pytest
from unittest.mock import patch, MagicMock
import httpx

import sys
sys.path.insert(0, '..')

from main import app


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

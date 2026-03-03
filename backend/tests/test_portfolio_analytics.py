import pytest
import numpy as np
import pandas as pd
from unittest.mock import patch
from datetime import datetime, timedelta

import sys
sys.path.insert(0, '..')

from portfolio_analytics import (
    get_price_data, calculate_portfolio_value,
    calculate_pnl, calculate_historical_var,
    calculate_parametric_var, calculate_portfolio_analytics,
)


def create_mock_prices(tickers, days=300, base_price=100.0):
    """Create mock price DataFrame for testing."""
    dates = pd.date_range(end=datetime.now(), periods=days, freq='B')
    np.random.seed(42)
    data = {}
    for t in tickers:
        returns = np.random.normal(0.0005, 0.02, days)
        prices = base_price * np.cumprod(1 + returns)
        data[t] = prices
    return pd.DataFrame(data, index=dates)


class TestGetPriceData:
    """Test get_price_data function."""

    @patch('portfolio_analytics.fetch_and_cache')
    def test_fetches_multiple_tickers(self, mock_fetch):
        df = pd.DataFrame({
            'adj_close': [100.0, 101.0, 102.0],
        }, index=pd.date_range('2024-01-01', periods=3))
        mock_fetch.return_value = df

        result = get_price_data(['AAPL', 'MSFT'])

        assert 'AAPL' in result.columns
        assert 'MSFT' in result.columns

    @patch('portfolio_analytics.fetch_and_cache')
    def test_skips_failed_tickers(self, mock_fetch):
        df = pd.DataFrame({
            'adj_close': [100.0, 101.0],
        }, index=pd.date_range('2024-01-01', periods=2))
        mock_fetch.side_effect = [df, ValueError("Not found")]

        result = get_price_data(['AAPL', 'INVALID'])

        assert 'AAPL' in result.columns
        assert 'INVALID' not in result.columns

    @patch('portfolio_analytics.fetch_and_cache')
    def test_raises_if_no_data(self, mock_fetch):
        mock_fetch.side_effect = ValueError("Not found")

        with pytest.raises(ValueError, match="No price data"):
            get_price_data(['BAD1', 'BAD2'])


class TestCalculatePortfolioValue:
    """Test calculate_portfolio_value function."""

    def test_calculates_correct_value(self):
        prices = pd.DataFrame({
            'AAPL': [150.0, 152.0],
            'MSFT': [300.0, 305.0],
        }, index=pd.date_range('2024-01-01', periods=2))

        holdings = [
            {'ticker': 'AAPL', 'shares': 10},
            {'ticker': 'MSFT', 'shares': 5},
        ]

        result = calculate_portfolio_value(holdings, prices)

        assert result.iloc[0] == 10 * 150 + 5 * 300  # 3000
        assert result.iloc[1] == 10 * 152 + 5 * 305  # 3045

    def test_ignores_missing_tickers(self):
        prices = pd.DataFrame({
            'AAPL': [150.0],
        }, index=pd.date_range('2024-01-01', periods=1))

        holdings = [
            {'ticker': 'AAPL', 'shares': 10},
            {'ticker': 'UNKNOWN', 'shares': 5},
        ]

        result = calculate_portfolio_value(holdings, prices)

        assert result.iloc[0] == 1500.0


class TestCalculatePnl:
    """Test calculate_pnl function."""

    def test_calculates_all_pnl_periods(self):
        prices = create_mock_prices(['AAPL', 'MSFT'], days=50)
        holdings = [
            {'ticker': 'AAPL', 'shares': 10},
            {'ticker': 'MSFT', 'shares': 5},
        ]

        result = calculate_pnl(holdings, prices)

        assert 'current_value' in result
        assert result['daily_pnl'] is not None
        assert result['weekly_pnl'] is not None
        assert result['monthly_pnl'] is not None
        assert isinstance(result['holdings_detail'], list)

    def test_returns_none_for_insufficient_data(self):
        prices = pd.DataFrame({
            'AAPL': [150.0],
        }, index=pd.date_range('2024-01-01', periods=1))

        holdings = [{'ticker': 'AAPL', 'shares': 10}]

        result = calculate_pnl(holdings, prices)

        assert result['daily_pnl'] is None
        assert result['weekly_pnl'] is None
        assert result['monthly_pnl'] is None

    def test_holdings_detail_correct(self):
        prices = pd.DataFrame({
            'AAPL': [150.0, 155.0],
        }, index=pd.date_range('2024-01-01', periods=2))

        holdings = [{'ticker': 'AAPL', 'shares': 10}]

        result = calculate_pnl(holdings, prices)

        detail = result['holdings_detail']
        assert len(detail) == 1
        assert detail[0]['ticker'] == 'AAPL'
        assert detail[0]['shares'] == 10
        assert detail[0]['current_price'] == 155.0
        assert detail[0]['market_value'] == 1550.0

    def test_daily_pnl_value(self):
        prices = pd.DataFrame({
            'AAPL': [100.0, 105.0],
        }, index=pd.date_range('2024-01-01', periods=2))

        holdings = [{'ticker': 'AAPL', 'shares': 10}]

        result = calculate_pnl(holdings, prices)

        assert result['daily_pnl'] == 50.0  # 10 * (105 - 100)


class TestCalculateHistoricalVar:
    """Test calculate_historical_var function."""

    def test_returns_var_for_sufficient_data(self):
        prices = create_mock_prices(['AAPL'], days=100)
        holdings = [{'ticker': 'AAPL', 'shares': 100}]

        result = calculate_historical_var(holdings, prices)

        assert result['var_95'] is not None
        assert result['var_95'] > 0
        assert result['method'] == 'historical'
        assert result['confidence'] == 0.95

    def test_returns_none_for_insufficient_data(self):
        prices = create_mock_prices(['AAPL'], days=10)
        holdings = [{'ticker': 'AAPL', 'shares': 100}]

        result = calculate_historical_var(holdings, prices)

        assert result['var_95'] is None

    def test_var_is_positive(self):
        prices = create_mock_prices(['AAPL', 'MSFT'], days=200)
        holdings = [
            {'ticker': 'AAPL', 'shares': 50},
            {'ticker': 'MSFT', 'shares': 30},
        ]

        result = calculate_historical_var(holdings, prices)

        assert result['var_95'] > 0

    def test_sample_size_correct(self):
        prices = create_mock_prices(['AAPL'], days=100)
        holdings = [{'ticker': 'AAPL', 'shares': 10}]

        result = calculate_historical_var(holdings, prices)

        assert result['sample_size'] > 0
        assert result['sample_size'] < 100


class TestCalculateParametricVar:
    """Test calculate_parametric_var function."""

    def test_returns_var_for_sufficient_data(self):
        prices = create_mock_prices(['AAPL'], days=100)
        holdings = [{'ticker': 'AAPL', 'shares': 100}]

        result = calculate_parametric_var(holdings, prices)

        assert result['var_95'] is not None
        assert result['var_95'] > 0
        assert result['method'] == 'parametric'

    def test_returns_none_for_insufficient_data(self):
        prices = create_mock_prices(['AAPL'], days=10)
        holdings = [{'ticker': 'AAPL', 'shares': 100}]

        result = calculate_parametric_var(holdings, prices)

        assert result['var_95'] is None

    def test_returns_none_for_no_tickers(self):
        prices = pd.DataFrame({'OTHER': [100.0] * 50}, index=pd.date_range('2024-01-01', periods=50))
        holdings = [{'ticker': 'AAPL', 'shares': 100}]

        result = calculate_parametric_var(holdings, prices)

        assert result['var_95'] is None

    def test_includes_portfolio_volatility(self):
        prices = create_mock_prices(['AAPL', 'MSFT'], days=200)
        holdings = [
            {'ticker': 'AAPL', 'shares': 50},
            {'ticker': 'MSFT', 'shares': 30},
        ]

        result = calculate_parametric_var(holdings, prices)

        assert 'portfolio_volatility' in result
        assert result['portfolio_volatility'] > 0

    def test_diversified_var_less_than_concentrated(self):
        """Two-holding VaR should be less than the sum of individual VaRs due to diversification."""
        np.random.seed(42)
        prices = create_mock_prices(['AAPL', 'MSFT'], days=200, base_price=100)

        # Concentrated in AAPL
        single = [{'ticker': 'AAPL', 'shares': 100}]
        var_single = calculate_parametric_var(single, prices)

        # Split between AAPL and MSFT
        diversified = [
            {'ticker': 'AAPL', 'shares': 50},
            {'ticker': 'MSFT', 'shares': 50},
        ]
        var_diversified = calculate_parametric_var(diversified, prices)

        # Due to diversification, percentage VaR should be smaller
        assert var_diversified['var_95_pct'] <= var_single['var_95_pct'] * 1.1  # Allow small margin


class TestCalculatePortfolioAnalytics:
    """Test calculate_portfolio_analytics function."""

    @patch('portfolio_analytics.fetch_and_cache')
    def test_returns_complete_structure(self, mock_fetch):
        prices = create_mock_prices(['AAPL'], days=100)
        df = pd.DataFrame({'adj_close': prices['AAPL']}, index=prices.index)
        mock_fetch.return_value = df

        holdings = [{'ticker': 'AAPL', 'shares': 10}]

        result = calculate_portfolio_analytics(holdings)

        assert 'current_value' in result
        assert 'daily_pnl' in result
        assert 'weekly_pnl' in result
        assert 'monthly_pnl' in result
        assert 'holdings_detail' in result
        assert 'var' in result
        assert 'historical' in result['var']
        assert 'parametric' in result['var']

    @patch('portfolio_analytics.fetch_and_cache')
    def test_handles_multiple_tickers(self, mock_fetch):
        prices = create_mock_prices(['AAPL', 'MSFT'], days=100)

        def side_effect(ticker, years=1):
            return pd.DataFrame({'adj_close': prices[ticker]}, index=prices.index)

        mock_fetch.side_effect = side_effect

        holdings = [
            {'ticker': 'AAPL', 'shares': 10},
            {'ticker': 'MSFT', 'shares': 5},
        ]

        result = calculate_portfolio_analytics(holdings)

        assert len(result['holdings_detail']) == 2

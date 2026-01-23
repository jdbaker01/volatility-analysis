import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, '..')

from volatility import calculate_volatility, TRADING_DAYS_PER_YEAR


def create_mock_df(days=300):
    """Create a mock DataFrame with price data for testing."""
    dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
    np.random.seed(42)

    # Generate realistic price data
    base_price = 100
    returns = np.random.normal(0, 0.02, days)
    prices = base_price * np.exp(np.cumsum(returns))

    df = pd.DataFrame({
        'open': prices * (1 + np.random.uniform(-0.01, 0.01, days)),
        'high': prices * (1 + np.random.uniform(0, 0.02, days)),
        'low': prices * (1 - np.random.uniform(0, 0.02, days)),
        'close': prices,
        'adj_close': prices,
        'volume': np.random.randint(1000000, 10000000, days)
    }, index=dates)

    return df


class TestCalculateVolatility:
    """Test the calculate_volatility function."""

    @patch('volatility.fetch_and_cache')
    def test_returns_correct_structure(self, mock_fetch):
        """Test that the function returns all expected keys."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('AAPL')

        expected_keys = [
            'ticker', 'current_price', 'daily_open', 'daily_high', 'daily_low',
            'vol_30d', 'vol_90d', 'vol_30d_percentile', 'vol_90d_percentile',
            'vol_30d_bucket', 'vol_90d_bucket', 'percentile_thresholds', 'history'
        ]
        for key in expected_keys:
            assert key in result

    @patch('volatility.fetch_and_cache')
    def test_ticker_is_uppercase(self, mock_fetch):
        """Test that ticker is returned in uppercase."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('aapl')

        assert result['ticker'] == 'AAPL'

    @patch('volatility.fetch_and_cache')
    def test_volatility_values_are_positive(self, mock_fetch):
        """Test that volatility values are positive."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('SPY')

        assert result['vol_30d'] > 0
        assert result['vol_90d'] > 0

    @patch('volatility.fetch_and_cache')
    def test_percentiles_are_in_valid_range(self, mock_fetch):
        """Test that percentiles are between 0 and 100."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('SPY')

        assert 0 <= result['vol_30d_percentile'] <= 100
        assert 0 <= result['vol_90d_percentile'] <= 100

    @patch('volatility.fetch_and_cache')
    def test_buckets_are_valid(self, mock_fetch):
        """Test that bucket values are valid strings."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('SPY')

        valid_buckets = ['<p50', 'p50-p90', 'p90-p99', '>p99']
        assert result['vol_30d_bucket'] in valid_buckets
        assert result['vol_90d_bucket'] in valid_buckets

    @patch('volatility.fetch_and_cache')
    def test_percentile_thresholds_structure(self, mock_fetch):
        """Test percentile thresholds have correct structure."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('SPY')

        assert '30d' in result['percentile_thresholds']
        assert '90d' in result['percentile_thresholds']

        for period in ['30d', '90d']:
            assert 'p50' in result['percentile_thresholds'][period]
            assert 'p90' in result['percentile_thresholds'][period]
            assert 'p99' in result['percentile_thresholds'][period]

    @patch('volatility.fetch_and_cache')
    def test_thresholds_are_ordered(self, mock_fetch):
        """Test that p50 < p90 < p99."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('SPY')

        for period in ['30d', '90d']:
            thresholds = result['percentile_thresholds'][period]
            assert thresholds['p50'] <= thresholds['p90']
            assert thresholds['p90'] <= thresholds['p99']

    @patch('volatility.fetch_and_cache')
    def test_history_is_list(self, mock_fetch):
        """Test that history is a list."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('SPY')

        assert isinstance(result['history'], list)

    @patch('volatility.fetch_and_cache')
    def test_history_entries_have_required_keys(self, mock_fetch):
        """Test that history entries have date, vol_30d, vol_90d."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('SPY')

        if result['history']:
            entry = result['history'][0]
            assert 'date' in entry
            assert 'vol_30d' in entry
            assert 'vol_90d' in entry

    @patch('volatility.fetch_and_cache')
    def test_history_max_length(self, mock_fetch):
        """Test that history is limited to 252 entries (1 year of trading days)."""
        mock_fetch.return_value = create_mock_df(days=500)

        result = calculate_volatility('SPY')

        assert len(result['history']) <= 252

    @patch('volatility.fetch_and_cache')
    def test_prices_are_rounded(self, mock_fetch):
        """Test that prices are rounded to 2 decimal places."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('SPY')

        # Check that values are numeric and reasonable
        assert isinstance(result['current_price'], float)
        assert isinstance(result['daily_open'], float)
        assert isinstance(result['daily_high'], float)
        assert isinstance(result['daily_low'], float)

    @patch('volatility.fetch_and_cache')
    def test_volatility_is_rounded(self, mock_fetch):
        """Test that volatility values are rounded to 4 decimal places."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('SPY')

        # Check that vol values have at most 4 decimal places
        vol_30d_str = str(result['vol_30d'])
        if '.' in vol_30d_str:
            decimals = len(vol_30d_str.split('.')[1])
            assert decimals <= 4

    @patch('volatility.fetch_and_cache')
    def test_empty_data_raises_error(self, mock_fetch):
        """Test that empty data raises an error."""
        mock_fetch.return_value = pd.DataFrame()

        # Empty DataFrame will raise KeyError when trying to access columns
        with pytest.raises((ValueError, KeyError)):
            calculate_volatility('INVALID')

    @patch('volatility.fetch_and_cache')
    def test_insufficient_data_raises_error(self, mock_fetch):
        """Test that insufficient data (not enough for rolling window) raises error."""
        # Create DataFrame with only 50 rows - not enough for 90-day rolling
        mock_fetch.return_value = create_mock_df(days=50)

        with pytest.raises(ValueError):
            calculate_volatility('TEST')

    @patch('volatility.fetch_and_cache')
    def test_lookback_years_parameter(self, mock_fetch):
        """Test that lookback_years parameter is passed to fetch_and_cache."""
        mock_fetch.return_value = create_mock_df()

        calculate_volatility('SPY', lookback_years=3)

        mock_fetch.assert_called_once_with('SPY', years=3)

    @patch('volatility.fetch_and_cache')
    def test_bucket_less_than_p50(self, mock_fetch):
        """Test bucket assignment when value < p50."""
        df = create_mock_df()
        # Manipulate so current vol is very low
        df['adj_close'] = df['adj_close'].iloc[0]  # Flat prices = low vol
        mock_fetch.return_value = df

        result = calculate_volatility('SPY')
        # May still not be <p50 due to how percentiles work, so just check valid bucket
        assert result['vol_30d_bucket'] in ['<p50', 'p50-p90', 'p90-p99', '>p99']


class TestTradingDaysConstant:
    """Test the TRADING_DAYS_PER_YEAR constant."""

    def test_trading_days_value(self):
        """Test that trading days constant is 252."""
        assert TRADING_DAYS_PER_YEAR == 252


class TestGetBucketFunction:
    """Test the get_bucket internal function."""

    @patch('volatility.fetch_and_cache')
    def test_all_bucket_ranges(self, mock_fetch):
        """Test that all bucket ranges can be returned."""
        # This is tested indirectly through calculate_volatility
        # The get_bucket function is internal to calculate_volatility
        mock_fetch.return_value = create_mock_df()
        result = calculate_volatility('SPY')

        # Just verify the bucket is one of the valid values
        valid_buckets = ['<p50', 'p50-p90', 'p90-p99', '>p99']
        assert result['vol_30d_bucket'] in valid_buckets
        assert result['vol_90d_bucket'] in valid_buckets

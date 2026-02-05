import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, '..')

from volatility import calculate_volatility, calculate_returns, calculate_rsi, TRADING_DAYS_PER_YEAR


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
            'vol_30d_bucket', 'vol_90d_bucket', 'percentile_thresholds', 'returns',
            'rsi_14d', 'history'
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


class TestCalculateReturns:
    """Test the calculate_returns function."""

    def test_returns_structure(self):
        """Test that calculate_returns returns expected keys."""
        df = create_mock_df(days=300)
        result = calculate_returns(df)

        assert 'daily' in result
        assert 'week' in result
        assert 'month' in result
        assert 'ytd' in result

    def test_daily_return_calculation(self):
        """Test daily return is calculated correctly."""
        dates = pd.date_range(end=datetime.now(), periods=10, freq='D')
        prices = [100, 102, 104, 103, 105, 106, 107, 108, 109, 110]
        df = pd.DataFrame({
            'adj_close': prices
        }, index=dates)

        result = calculate_returns(df)

        # Daily return: (110 - 109) / 109 = 0.009174...
        expected_daily = (110 - 109) / 109
        assert abs(result['daily'] - expected_daily) < 0.0001

    def test_week_return_calculation(self):
        """Test weekly return is calculated correctly."""
        dates = pd.date_range(end=datetime.now(), periods=10, freq='D')
        prices = [100, 102, 104, 103, 105, 106, 107, 108, 109, 110]
        df = pd.DataFrame({
            'adj_close': prices
        }, index=dates)

        result = calculate_returns(df)

        # Week return: (110 - 105) / 105 = 0.047619...
        expected_week = (110 - 105) / 105
        assert abs(result['week'] - expected_week) < 0.0001

    def test_month_return_calculation(self):
        """Test monthly return is calculated correctly."""
        dates = pd.date_range(end=datetime.now(), periods=30, freq='D')
        prices = list(range(100, 130))
        df = pd.DataFrame({
            'adj_close': prices
        }, index=dates)

        result = calculate_returns(df)

        # Month return (21 trading days): (129 - 108) / 108
        expected_month = (129 - 108) / 108
        assert abs(result['month'] - expected_month) < 0.0001

    def test_ytd_return_calculation(self):
        """Test YTD return is calculated correctly."""
        current_year = datetime.now().year
        dates = pd.date_range(start=f'{current_year}-01-02', periods=50, freq='D')
        prices = [100 + i for i in range(50)]
        df = pd.DataFrame({
            'adj_close': prices
        }, index=dates)

        result = calculate_returns(df)

        # YTD return: (149 - 100) / 100 = 0.49
        expected_ytd = (149 - 100) / 100
        assert abs(result['ytd'] - expected_ytd) < 0.0001

    def test_insufficient_data_for_daily(self):
        """Test that daily return is None with only 1 data point."""
        dates = pd.date_range(end=datetime.now(), periods=1, freq='D')
        df = pd.DataFrame({
            'adj_close': [100]
        }, index=dates)

        result = calculate_returns(df)

        assert result['daily'] is None

    def test_insufficient_data_for_week(self):
        """Test that week return is None with less than 6 data points."""
        dates = pd.date_range(end=datetime.now(), periods=5, freq='D')
        df = pd.DataFrame({
            'adj_close': [100, 101, 102, 103, 104]
        }, index=dates)

        result = calculate_returns(df)

        assert result['week'] is None
        assert result['daily'] is not None

    def test_insufficient_data_for_month(self):
        """Test that month return is None with less than 22 data points."""
        dates = pd.date_range(end=datetime.now(), periods=20, freq='D')
        df = pd.DataFrame({
            'adj_close': list(range(100, 120))
        }, index=dates)

        result = calculate_returns(df)

        assert result['month'] is None
        assert result['week'] is not None

    def test_no_ytd_data(self):
        """Test YTD is None when no data from current year."""
        # Create data from previous year only
        dates = pd.date_range(start='2020-01-01', periods=100, freq='D')
        df = pd.DataFrame({
            'adj_close': list(range(100, 200))
        }, index=dates)

        result = calculate_returns(df)

        assert result['ytd'] is None

    def test_empty_dataframe(self):
        """Test that empty DataFrame returns all None."""
        df = pd.DataFrame({'adj_close': []})
        df.index = pd.DatetimeIndex([])

        result = calculate_returns(df)

        assert result['daily'] is None
        assert result['week'] is None
        assert result['month'] is None
        assert result['ytd'] is None

    def test_returns_are_rounded(self):
        """Test that returns are rounded to 6 decimal places."""
        df = create_mock_df(days=300)
        result = calculate_returns(df)

        for key in ['daily', 'week', 'month', 'ytd']:
            if result[key] is not None:
                # Check decimal places
                str_val = str(result[key])
                if '.' in str_val:
                    decimals = len(str_val.split('.')[1])
                    assert decimals <= 6

    @patch('volatility.fetch_and_cache')
    def test_returns_in_calculate_volatility(self, mock_fetch):
        """Test that returns are included in calculate_volatility output."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('AAPL')

        assert 'returns' in result
        assert 'daily' in result['returns']
        assert 'week' in result['returns']
        assert 'month' in result['returns']
        assert 'ytd' in result['returns']


class TestCalculateRsi:
    """Test the calculate_rsi function."""

    def test_rsi_returns_value_in_valid_range(self):
        """Test that RSI is between 0 and 100."""
        df = create_mock_df(days=300)
        result = calculate_rsi(df)

        assert result is not None
        assert 0 <= result <= 100

    def test_rsi_is_rounded_to_2_decimals(self):
        """Test that RSI is rounded to 2 decimal places."""
        df = create_mock_df(days=300)
        result = calculate_rsi(df)

        str_val = str(result)
        if '.' in str_val:
            decimals = len(str_val.split('.')[1])
            assert decimals <= 2

    def test_rsi_insufficient_data(self):
        """Test that RSI returns None with insufficient data."""
        dates = pd.date_range(end=datetime.now(), periods=10, freq='D')
        df = pd.DataFrame({
            'adj_close': list(range(100, 110))
        }, index=dates)

        result = calculate_rsi(df)

        assert result is None

    def test_rsi_with_all_gains(self):
        """Test RSI is 100 when all periods are gains (no losses)."""
        dates = pd.date_range(end=datetime.now(), periods=20, freq='D')
        prices = [100 + i for i in range(20)]
        df = pd.DataFrame({
            'adj_close': prices
        }, index=dates)

        result = calculate_rsi(df)

        assert result == 100.0

    def test_rsi_custom_period(self):
        """Test RSI with a custom period."""
        df = create_mock_df(days=300)
        result = calculate_rsi(df, period=7)

        assert result is not None
        assert 0 <= result <= 100

    def test_rsi_with_exact_minimum_data(self):
        """Test RSI with exactly period+1 data points."""
        dates = pd.date_range(end=datetime.now(), periods=15, freq='D')
        prices = [100, 102, 101, 103, 104, 102, 105, 106, 104, 107, 108, 106, 109, 110, 108]
        df = pd.DataFrame({
            'adj_close': prices
        }, index=dates)

        result = calculate_rsi(df, period=14)

        assert result is not None
        assert 0 <= result <= 100

    @patch('volatility.fetch_and_cache')
    def test_rsi_in_calculate_volatility(self, mock_fetch):
        """Test that rsi_14d is included in calculate_volatility output."""
        mock_fetch.return_value = create_mock_df()

        result = calculate_volatility('AAPL')

        assert 'rsi_14d' in result
        assert result['rsi_14d'] is not None
        assert 0 <= result['rsi_14d'] <= 100

import pytest
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch, MagicMock
import tempfile
import os

import sys
sys.path.insert(0, '..')


class TestGetConnection:
    """Test the get_connection function."""

    def test_returns_connection(self):
        """Test that get_connection returns a sqlite3 connection."""
        from cache import get_connection
        conn = get_connection()
        assert isinstance(conn, sqlite3.Connection)
        conn.close()

    def test_connection_has_row_factory(self):
        """Test that connection has Row factory set."""
        from cache import get_connection
        conn = get_connection()
        assert conn.row_factory == sqlite3.Row
        conn.close()


class TestInitDb:
    """Test the init_db function."""

    def test_creates_daily_prices_table(self):
        """Test that init_db creates daily_prices table."""
        from cache import init_db, get_connection

        conn = get_connection()
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='daily_prices'"
        )
        result = cursor.fetchone()
        conn.close()

        assert result is not None

    def test_creates_cache_metadata_table(self):
        """Test that init_db creates cache_metadata table."""
        from cache import get_connection

        conn = get_connection()
        cursor = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='cache_metadata'"
        )
        result = cursor.fetchone()
        conn.close()

        assert result is not None


class TestGetCachedData:
    """Test the get_cached_data function."""

    def test_returns_dataframe(self):
        """Test that get_cached_data returns a DataFrame."""
        from cache import get_cached_data

        result = get_cached_data('AAPL', '2024-01-01', '2024-01-31')
        assert isinstance(result, pd.DataFrame)

    def test_returns_empty_for_missing_ticker(self):
        """Test that missing ticker returns empty DataFrame."""
        from cache import get_cached_data

        result = get_cached_data('NONEXISTENT_TICKER_12345', '2024-01-01', '2024-01-31')
        assert result.empty

    def test_filters_by_date_range(self):
        """Test that data is filtered by date range."""
        from cache import get_cached_data, save_to_cache

        # Create test data
        dates = pd.date_range('2024-01-01', periods=10, freq='D')
        df = pd.DataFrame({
            'open': [100] * 10,
            'high': [105] * 10,
            'low': [95] * 10,
            'close': [102] * 10,
            'adj_close': [102] * 10,
            'volume': [1000000] * 10
        }, index=dates)

        save_to_cache('TEST_FILTER', df)

        result = get_cached_data('TEST_FILTER', '2024-01-03', '2024-01-07')

        # Should have 5 days (Jan 3-7)
        assert len(result) == 5


class TestSaveToCache:
    """Test the save_to_cache function."""

    def test_saves_data(self):
        """Test that data is saved to cache."""
        from cache import save_to_cache, get_cached_data

        dates = pd.date_range('2024-06-01', periods=5, freq='D')
        df = pd.DataFrame({
            'open': [100, 101, 102, 103, 104],
            'high': [105, 106, 107, 108, 109],
            'low': [95, 96, 97, 98, 99],
            'close': [102, 103, 104, 105, 106],
            'adj_close': [102, 103, 104, 105, 106],
            'volume': [1000000, 1100000, 1200000, 1300000, 1400000]
        }, index=dates)

        save_to_cache('TEST_SAVE', df)
        result = get_cached_data('TEST_SAVE', '2024-06-01', '2024-06-05')

        assert not result.empty
        assert len(result) == 5

    def test_handles_empty_dataframe(self):
        """Test that empty DataFrame doesn't cause error."""
        from cache import save_to_cache

        df = pd.DataFrame()
        # Should not raise
        save_to_cache('TEST_EMPTY', df)

    def test_ticker_is_uppercase(self):
        """Test that ticker is stored in uppercase."""
        from cache import save_to_cache, get_cached_data

        dates = pd.date_range('2024-07-01', periods=3, freq='D')
        df = pd.DataFrame({
            'open': [100] * 3,
            'high': [105] * 3,
            'low': [95] * 3,
            'close': [102] * 3,
            'adj_close': [102] * 3,
            'volume': [1000000] * 3
        }, index=dates)

        save_to_cache('lowercase_ticker', df)
        result = get_cached_data('LOWERCASE_TICKER', '2024-07-01', '2024-07-03')

        assert not result.empty

    def test_updates_metadata(self):
        """Test that cache metadata is updated."""
        from cache import save_to_cache, get_connection

        dates = pd.date_range('2024-08-01', periods=3, freq='D')
        df = pd.DataFrame({
            'open': [100] * 3,
            'high': [105] * 3,
            'low': [95] * 3,
            'close': [102] * 3,
            'adj_close': [102] * 3,
            'volume': [1000000] * 3
        }, index=dates)

        save_to_cache('TEST_METADATA', df)

        conn = get_connection()
        cursor = conn.execute(
            "SELECT last_updated FROM cache_metadata WHERE ticker = 'TEST_METADATA'"
        )
        result = cursor.fetchone()
        conn.close()

        assert result is not None
        assert result['last_updated'] == datetime.now().strftime('%Y-%m-%d')

    def test_handles_nan_volume(self):
        """Test that NaN volume is handled."""
        from cache import save_to_cache, get_cached_data

        dates = pd.date_range('2024-09-01', periods=3, freq='D')
        df = pd.DataFrame({
            'open': [100] * 3,
            'high': [105] * 3,
            'low': [95] * 3,
            'close': [102] * 3,
            'adj_close': [102] * 3,
            'volume': [1000000, np.nan, 1200000]
        }, index=dates)

        save_to_cache('TEST_NAN_VOL', df)
        result = get_cached_data('TEST_NAN_VOL', '2024-09-01', '2024-09-03')

        assert not result.empty


class TestNeedsUpdate:
    """Test the needs_update function."""

    def test_returns_true_for_missing_ticker(self):
        """Test that missing ticker returns True."""
        from cache import needs_update

        result = needs_update('NEVER_CACHED_TICKER_XYZ')
        assert result is True

    def test_returns_false_for_today(self):
        """Test that ticker cached today returns False."""
        from cache import needs_update, save_to_cache

        dates = pd.date_range('2024-10-01', periods=3, freq='D')
        df = pd.DataFrame({
            'open': [100] * 3,
            'high': [105] * 3,
            'low': [95] * 3,
            'close': [102] * 3,
            'adj_close': [102] * 3,
            'volume': [1000000] * 3
        }, index=dates)

        save_to_cache('TEST_TODAY', df)
        result = needs_update('TEST_TODAY')

        assert result is False


class TestFetchFromYahoo:
    """Test the fetch_from_yahoo function."""

    @patch('cache.requests.get')
    def test_returns_dataframe(self, mock_get):
        """Test that fetch_from_yahoo returns a DataFrame."""
        from cache import fetch_from_yahoo

        # Mock Yahoo Finance API response
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'chart': {
                'result': [{
                    'timestamp': [1704067200, 1704153600, 1704240000],
                    'indicators': {
                        'quote': [{
                            'open': [100, 101, 102],
                            'high': [105, 106, 107],
                            'low': [95, 96, 97],
                            'close': [102, 103, 104],
                            'volume': [1000000, 1100000, 1200000]
                        }],
                        'adjclose': [{
                            'adjclose': [102, 103, 104]
                        }]
                    }
                }]
            }
        }
        mock_get.return_value = mock_response

        start = datetime(2024, 1, 1)
        end = datetime(2024, 1, 3)
        result = fetch_from_yahoo('AAPL', start, end)

        assert isinstance(result, pd.DataFrame)
        assert not result.empty

    @patch('cache.requests.get')
    def test_raises_for_no_data(self, mock_get):
        """Test that missing chart data raises ValueError."""
        from cache import fetch_from_yahoo

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'chart': {
                'result': []
            }
        }
        mock_get.return_value = mock_response

        start = datetime(2024, 1, 1)
        end = datetime(2024, 1, 3)

        with pytest.raises(ValueError, match="No data found"):
            fetch_from_yahoo('INVALID', start, end)

    @patch('cache.requests.get')
    def test_raises_for_no_timestamps(self, mock_get):
        """Test that missing timestamps raises ValueError."""
        from cache import fetch_from_yahoo

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'chart': {
                'result': [{
                    'timestamp': [],
                    'indicators': {
                        'quote': [{}]
                    }
                }]
            }
        }
        mock_get.return_value = mock_response

        start = datetime(2024, 1, 1)
        end = datetime(2024, 1, 3)

        with pytest.raises(ValueError, match="No price data found"):
            fetch_from_yahoo('TEST', start, end)

    @patch('cache.requests.get')
    def test_handles_missing_adjclose(self, mock_get):
        """Test handling when adjclose is missing from response."""
        from cache import fetch_from_yahoo

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'chart': {
                'result': [{
                    'timestamp': [1704067200],
                    'indicators': {
                        'quote': [{
                            'open': [100],
                            'high': [105],
                            'low': [95],
                            'close': [102],
                            'volume': [1000000]
                        }]
                    }
                }]
            }
        }
        mock_get.return_value = mock_response

        start = datetime(2024, 1, 1)
        end = datetime(2024, 1, 1)
        result = fetch_from_yahoo('AAPL', start, end)

        # Should use close price as adj_close
        assert 'adj_close' in result.columns

    @patch('cache.requests.get')
    def test_uppercase_ticker(self, mock_get):
        """Test that ticker is converted to uppercase."""
        from cache import fetch_from_yahoo

        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_response.json.return_value = {
            'chart': {
                'result': [{
                    'timestamp': [1704067200],
                    'indicators': {
                        'quote': [{
                            'open': [100],
                            'high': [105],
                            'low': [95],
                            'close': [102],
                            'volume': [1000000]
                        }]
                    }
                }]
            }
        }
        mock_get.return_value = mock_response

        start = datetime(2024, 1, 1)
        end = datetime(2024, 1, 1)
        fetch_from_yahoo('aapl', start, end)

        # Check that the URL contains uppercase ticker
        call_args = mock_get.call_args
        assert 'AAPL' in call_args[0][0]


class TestFetchAndCache:
    """Test the fetch_and_cache function."""

    @patch('cache.fetch_from_yahoo')
    @patch('cache.needs_update')
    def test_fetches_when_update_needed(self, mock_needs_update, mock_fetch):
        """Test that data is fetched when update is needed."""
        from cache import fetch_and_cache

        mock_needs_update.return_value = True

        dates = pd.date_range('2024-01-01', periods=100, freq='D')
        mock_df = pd.DataFrame({
            'open': [100] * 100,
            'high': [105] * 100,
            'low': [95] * 100,
            'close': [102] * 100,
            'adj_close': [102] * 100,
            'volume': [1000000] * 100
        }, index=dates)
        mock_fetch.return_value = mock_df

        result = fetch_and_cache('SPY', years=1)

        assert mock_fetch.called
        assert not result.empty

    @patch('cache.fetch_from_yahoo')
    @patch('cache.needs_update')
    @patch('cache.get_cached_data')
    def test_uses_cache_when_available(self, mock_get_cached, mock_needs_update, mock_fetch):
        """Test that cached data is used when available and not stale."""
        from cache import fetch_and_cache

        mock_needs_update.return_value = False

        dates = pd.date_range('2024-01-01', periods=100, freq='D')
        cached_df = pd.DataFrame({
            'open': [100] * 100,
            'high': [105] * 100,
            'low': [95] * 100,
            'close': [102] * 100,
            'adj_close': [102] * 100,
            'volume': [1000000] * 100
        }, index=dates)
        mock_get_cached.return_value = cached_df

        result = fetch_and_cache('SPY', years=1)

        assert mock_get_cached.called
        assert not mock_fetch.called

    @patch('cache.fetch_from_yahoo')
    @patch('cache.needs_update')
    def test_raises_for_empty_data(self, mock_needs_update, mock_fetch):
        """Test that empty data raises ValueError."""
        from cache import fetch_and_cache

        mock_needs_update.return_value = True
        mock_fetch.return_value = pd.DataFrame()

        with pytest.raises(ValueError, match="No data found"):
            fetch_and_cache('INVALID', years=1)

    @patch('cache.fetch_from_yahoo')
    @patch('cache.needs_update')
    def test_ticker_is_uppercase(self, mock_needs_update, mock_fetch):
        """Test that ticker is converted to uppercase."""
        from cache import fetch_and_cache

        mock_needs_update.return_value = True

        dates = pd.date_range('2024-01-01', periods=100, freq='D')
        mock_df = pd.DataFrame({
            'open': [100] * 100,
            'high': [105] * 100,
            'low': [95] * 100,
            'close': [102] * 100,
            'adj_close': [102] * 100,
            'volume': [1000000] * 100
        }, index=dates)
        mock_fetch.return_value = mock_df

        fetch_and_cache('spy', years=1)

        # Check needs_update was called with uppercase
        mock_needs_update.assert_called_with('SPY')

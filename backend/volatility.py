import numpy as np
import pandas as pd
from typing import Dict, Any, Optional
from datetime import datetime
from cache import fetch_and_cache

TRADING_DAYS_PER_YEAR = 252


def calculate_rsi(df: pd.DataFrame, period: int = 14) -> Optional[float]:
    """Calculate the Relative Strength Index using Wilder smoothing."""
    if len(df) < period + 1:
        return None

    close = df['adj_close']
    delta = close.diff()

    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)

    avg_gain = gain.iloc[1:period + 1].mean()
    avg_loss = loss.iloc[1:period + 1].mean()

    for i in range(period + 1, len(delta)):
        avg_gain = (avg_gain * (period - 1) + gain.iloc[i]) / period
        avg_loss = (avg_loss * (period - 1) + loss.iloc[i]) / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    rsi = 100.0 - (100.0 / (1.0 + rs))

    return round(rsi, 2)


def calculate_returns(df: pd.DataFrame) -> Dict[str, float]:
    """Calculate returns for various time periods."""
    if len(df) < 2:
        return {
            "daily": None,
            "week": None,
            "month": None,
            "ytd": None
        }

    current_price = df['adj_close'].iloc[-1]

    # Daily return (1 day)
    daily_return = None
    if len(df) >= 2:
        prev_price = df['adj_close'].iloc[-2]
        daily_return = (current_price - prev_price) / prev_price

    # Weekly return (5 trading days)
    week_return = None
    if len(df) >= 6:
        week_ago_price = df['adj_close'].iloc[-6]
        week_return = (current_price - week_ago_price) / week_ago_price

    # Monthly return (~21 trading days)
    month_return = None
    if len(df) >= 22:
        month_ago_price = df['adj_close'].iloc[-22]
        month_return = (current_price - month_ago_price) / month_ago_price

    # YTD return (from first trading day of current year)
    ytd_return = None
    current_year = datetime.now().year
    ytd_df = df[df.index.year == current_year]
    if len(ytd_df) >= 1:
        year_start_price = ytd_df['adj_close'].iloc[0]
        ytd_return = (current_price - year_start_price) / year_start_price

    return {
        "daily": round(daily_return, 6) if daily_return is not None else None,
        "week": round(week_return, 6) if week_return is not None else None,
        "month": round(month_return, 6) if month_return is not None else None,
        "ytd": round(ytd_return, 6) if ytd_return is not None else None
    }


def calculate_volatility(ticker: str, lookback_years: int = 5) -> Dict[str, Any]:
    df = fetch_and_cache(ticker, years=lookback_years)

    df['log_return'] = np.log(df['adj_close'] / df['adj_close'].shift(1))

    df['vol_30d'] = df['log_return'].rolling(window=30).std() * np.sqrt(TRADING_DAYS_PER_YEAR)
    df['vol_90d'] = df['log_return'].rolling(window=90).std() * np.sqrt(TRADING_DAYS_PER_YEAR)

    df = df.dropna(subset=['vol_30d', 'vol_90d'])

    if df.empty:
        raise ValueError(f"Not enough data to calculate volatility for {ticker}")

    current_vol_30d = df['vol_30d'].iloc[-1]
    current_vol_90d = df['vol_90d'].iloc[-1]
    current_price = df['close'].iloc[-1]

    # Daily range data from most recent day
    daily_open = df['open'].iloc[-1]
    daily_high = df['high'].iloc[-1]
    daily_low = df['low'].iloc[-1]

    # Monthly range (last 21 trading days)
    monthly_df = df.tail(21)
    monthly_high = monthly_df['high'].max()
    monthly_low = monthly_df['low'].min()

    # Yearly range (last 252 trading days)
    yearly_df = df.tail(252)
    yearly_high = yearly_df['high'].max()
    yearly_low = yearly_df['low'].min()

    vol_30d_p50 = df['vol_30d'].quantile(0.50)
    vol_30d_p90 = df['vol_30d'].quantile(0.90)
    vol_30d_p99 = df['vol_30d'].quantile(0.99)

    vol_90d_p50 = df['vol_90d'].quantile(0.50)
    vol_90d_p90 = df['vol_90d'].quantile(0.90)
    vol_90d_p99 = df['vol_90d'].quantile(0.99)

    vol_30d_percentile = (df['vol_30d'] <= current_vol_30d).mean() * 100
    vol_90d_percentile = (df['vol_90d'] <= current_vol_90d).mean() * 100

    def get_bucket(value: float, p50: float, p90: float, p99: float) -> str:
        if value < p50:
            return "<p50"
        elif value < p90:
            return "p50-p90"
        elif value < p99:
            return "p90-p99"
        else:
            return ">p99"

    vol_30d_bucket = get_bucket(current_vol_30d, vol_30d_p50, vol_30d_p90, vol_30d_p99)
    vol_90d_bucket = get_bucket(current_vol_90d, vol_90d_p50, vol_90d_p90, vol_90d_p99)

    history_df = df.tail(252).copy()
    history = []
    for idx, row in history_df.iterrows():
        history.append({
            "date": idx.strftime('%Y-%m-%d'),
            "vol_30d": round(row['vol_30d'], 4),
            "vol_90d": round(row['vol_90d'], 4)
        })

    returns = calculate_returns(df)
    rsi_14d = calculate_rsi(df)

    return {
        "ticker": ticker.upper(),
        "current_price": round(current_price, 2),
        "daily_open": round(daily_open, 2),
        "daily_high": round(daily_high, 2),
        "daily_low": round(daily_low, 2),
        "monthly_high": round(monthly_high, 2),
        "monthly_low": round(monthly_low, 2),
        "yearly_high": round(yearly_high, 2),
        "yearly_low": round(yearly_low, 2),
        "vol_30d": round(current_vol_30d, 4),
        "vol_90d": round(current_vol_90d, 4),
        "vol_30d_percentile": round(vol_30d_percentile, 1),
        "vol_90d_percentile": round(vol_90d_percentile, 1),
        "vol_30d_bucket": vol_30d_bucket,
        "vol_90d_bucket": vol_90d_bucket,
        "percentile_thresholds": {
            "30d": {
                "p50": round(vol_30d_p50, 4),
                "p90": round(vol_30d_p90, 4),
                "p99": round(vol_30d_p99, 4)
            },
            "90d": {
                "p50": round(vol_90d_p50, 4),
                "p90": round(vol_90d_p90, 4),
                "p99": round(vol_90d_p99, 4)
            }
        },
        "returns": returns,
        "rsi_14d": rsi_14d,
        "history": history
    }

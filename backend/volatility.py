import numpy as np
import pandas as pd
from typing import Dict, Any
from cache import fetch_and_cache

TRADING_DAYS_PER_YEAR = 252


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

    return {
        "ticker": ticker.upper(),
        "current_price": round(current_price, 2),
        "daily_open": round(daily_open, 2),
        "daily_high": round(daily_high, 2),
        "daily_low": round(daily_low, 2),
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
        "history": history
    }

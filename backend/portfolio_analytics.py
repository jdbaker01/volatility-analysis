import numpy as np
import pandas as pd
from typing import Dict, Any, List
from scipy.stats import norm
from cache import fetch_and_cache

TRADING_DAYS_PER_YEAR = 252


def get_price_data(tickers: List[str], lookback_days: int = 252) -> pd.DataFrame:
    """Fetch adjusted close prices for multiple tickers using existing cache."""
    frames = {}
    for ticker in tickers:
        try:
            df = fetch_and_cache(ticker, years=max(1, lookback_days // 252 + 1))
            frames[ticker] = df["adj_close"]
        except (ValueError, Exception):
            continue

    if not frames:
        raise ValueError("No price data available for any holdings")

    prices = pd.DataFrame(frames)
    prices = prices.dropna(how="all")
    return prices


def calculate_portfolio_value(
    holdings: List[Dict[str, Any]], prices: pd.DataFrame
) -> pd.Series:
    """Calculate daily portfolio value: sum(shares_i * price_i)."""
    portfolio_value = pd.Series(0.0, index=prices.index)
    for h in holdings:
        ticker = h["ticker"]
        if ticker in prices.columns:
            portfolio_value += h["shares"] * prices[ticker].fillna(0)
    return portfolio_value


def calculate_pnl(
    holdings: List[Dict[str, Any]], prices: pd.DataFrame
) -> Dict[str, Any]:
    """Calculate PnL for a portfolio."""
    portfolio_value = calculate_portfolio_value(holdings, prices)
    current_value = float(portfolio_value.iloc[-1])

    daily_pnl = None
    if len(portfolio_value) >= 2:
        daily_pnl = round(current_value - float(portfolio_value.iloc[-2]), 2)

    weekly_pnl = None
    if len(portfolio_value) >= 6:
        weekly_pnl = round(current_value - float(portfolio_value.iloc[-6]), 2)

    monthly_pnl = None
    if len(portfolio_value) >= 22:
        monthly_pnl = round(current_value - float(portfolio_value.iloc[-22]), 2)

    holdings_detail = []
    for h in holdings:
        ticker = h["ticker"]
        if ticker in prices.columns:
            current_price = float(prices[ticker].iloc[-1])
            market_value = h["shares"] * current_price
            holdings_detail.append({
                "ticker": ticker,
                "shares": h["shares"],
                "current_price": round(current_price, 2),
                "market_value": round(market_value, 2),
            })

    return {
        "current_value": round(current_value, 2),
        "daily_pnl": daily_pnl,
        "weekly_pnl": weekly_pnl,
        "monthly_pnl": monthly_pnl,
        "holdings_detail": holdings_detail,
    }


def calculate_historical_var(
    holdings: List[Dict[str, Any]],
    prices: pd.DataFrame,
    confidence: float = 0.95,
) -> Dict[str, Any]:
    """Historical Simulation VaR (1-day)."""
    portfolio_value = calculate_portfolio_value(holdings, prices)
    portfolio_returns = portfolio_value.pct_change().dropna()
    portfolio_returns = portfolio_returns.replace([np.inf, -np.inf], np.nan).dropna()

    if len(portfolio_returns) < 30:
        return {"var_95": None, "var_95_pct": None, "method": "historical"}

    var_percentile = float(np.percentile(portfolio_returns, (1 - confidence) * 100))
    current_value = float(portfolio_value.iloc[-1])

    var_dollar = abs(current_value * var_percentile)

    return {
        "var_95": round(var_dollar, 2),
        "var_95_pct": round(abs(var_percentile) * 100, 4),
        "method": "historical",
        "confidence": confidence,
        "sample_size": len(portfolio_returns),
    }


def calculate_parametric_var(
    holdings: List[Dict[str, Any]],
    prices: pd.DataFrame,
    confidence: float = 0.95,
) -> Dict[str, Any]:
    """Parametric (Variance-Covariance) VaR (1-day)."""
    valid_tickers = [h["ticker"] for h in holdings if h["ticker"] in prices.columns]
    if not valid_tickers:
        return {"var_95": None, "var_95_pct": None, "method": "parametric"}

    returns = np.log(prices[valid_tickers] / prices[valid_tickers].shift(1)).dropna()

    if len(returns) < 30:
        return {"var_95": None, "var_95_pct": None, "method": "parametric"}

    current_prices = prices[valid_tickers].iloc[-1]
    shares_map = {h["ticker"]: h["shares"] for h in holdings}
    market_values = pd.Series(
        {t: shares_map.get(t, 0) * float(current_prices[t]) for t in valid_tickers}
    )
    total_value = float(market_values.sum())

    if total_value <= 0:
        return {"var_95": None, "var_95_pct": None, "method": "parametric"}

    weights = (market_values / total_value).values

    cov_matrix = returns.cov().values
    portfolio_var = float(weights @ cov_matrix @ weights)
    portfolio_vol = np.sqrt(portfolio_var)

    z_score = norm.ppf(confidence)

    var_dollar = total_value * z_score * portfolio_vol
    var_pct = z_score * portfolio_vol * 100

    return {
        "var_95": round(float(var_dollar), 2),
        "var_95_pct": round(float(var_pct), 4),
        "method": "parametric",
        "confidence": confidence,
        "portfolio_volatility": round(float(portfolio_vol * np.sqrt(TRADING_DAYS_PER_YEAR)), 4),
        "sample_size": len(returns),
    }


def calculate_portfolio_analytics(
    holdings: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Calculate all analytics for a set of holdings."""
    tickers = list(set(h["ticker"] for h in holdings))
    prices = get_price_data(tickers)

    pnl = calculate_pnl(holdings, prices)
    historical_var = calculate_historical_var(holdings, prices)
    parametric_var = calculate_parametric_var(holdings, prices)

    return {
        **pnl,
        "var": {
            "historical": historical_var,
            "parametric": parametric_var,
        },
    }

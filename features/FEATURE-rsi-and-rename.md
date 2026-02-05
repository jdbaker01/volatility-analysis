# Feature: Add RSI Indicator and Rename App

## Overview
Rename the application from "Volatility Analysis Terminal" to "Investment Analysis" across the frontend. Add a 14-day Relative Strength Index (RSI) indicator to the default view.

## Rename Scope
- Frontend header title
- Browser tab title (index.html)
- package.json name field

## RSI Implementation

### What is RSI?
The Relative Strength Index (RSI) is a momentum oscillator that measures the speed and magnitude of price changes. It ranges from 0 to 100.

- **Formula**: RSI = 100 - (100 / (1 + RS)), where RS = avg gain over N periods / avg loss over N periods
- **Period**: 14 days (standard)
- **Interpretation**: RSI > 70 = overbought, RSI < 30 = oversold

### Backend
- Add `calculate_rsi(df, period=14)` function to `volatility.py`
- Uses the Wilder smoothing method (exponential moving average)
- Include `rsi_14d` in the `/api/volatility/{ticker}` response

### Frontend
- Display RSI value in the `VolatilityTable` component alongside existing volatility metrics
- Color coding: red if > 70 (overbought), green if < 30 (oversold), default otherwise

## Acceptance Criteria
- [ ] App renamed to "Investment Analysis" in header, tab title, and package.json
- [ ] Backend calculates 14-day RSI correctly using Wilder smoothing
- [ ] API response includes `rsi_14d` field
- [ ] Frontend displays RSI with overbought/oversold color coding
- [ ] 100% test coverage maintained

# Feature: Returns Table

## Overview
Display a table showing stock returns across multiple time periods: daily, 1 week, 1 month, and YTD (year-to-date).

## Location
The returns table will be positioned below the volatility chart on the main page.

## Data Requirements
- **Daily Return**: Percentage change from previous trading day
- **1 Week Return**: Percentage change over the last 5 trading days
- **1 Month Return**: Percentage change over the last ~21 trading days
- **YTD Return**: Percentage change from the first trading day of the current year

## Implementation

### Backend
- Add returns calculation logic to `volatility.py`
- Include returns data in the `/api/volatility/{ticker}` response

### Frontend
- Create `ReturnsTable` component in `frontend/src/components/`
- Display returns with appropriate formatting (positive/negative coloring)
- Integrate below the `VolatilityChart` component

## Acceptance Criteria
- [x] Backend calculates all four return periods correctly
- [x] API response includes returns data
- [x] Frontend displays returns in a styled table
- [x] Positive returns shown in green, negative in red
- [x] 100% test coverage maintained

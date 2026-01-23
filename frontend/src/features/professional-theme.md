# Professional Theme Feature

## Overview
Institutional-grade terminal aesthetic inspired by Bloomberg Terminal, Reuters Eikon, and professional trading desks. Designed for data density, visual hierarchy, and minimal distraction.

## Design Principles
- **Monochromatic palette** - Pure blacks and grays with minimal color
- **Data-dense layouts** - Information first, decoration never
- **Tabular numbers** - Aligned, monospace numbers for easy scanning
- **Uppercase labels** - All-caps for section headers and labels
- **Tight spacing** - Compact but readable
- **Subtle separators** - 1px borders, minimal visual noise

## Color Palette
- **Background**: #0a0a0a (pure black)
- **Card**: #111111 (barely visible elevation)
- **Elevated**: #1a1a1a (hover states, tooltips)
- **Border**: #1f1f1f (primary dividers)
- **Border Subtle**: #262626 (secondary dividers)
- **Text Primary**: #fafafa (white, main content)
- **Text Secondary**: #a3a3a3 (values, data)
- **Text Muted**: #737373 (labels)
- **Text Dim**: #525252 (section headers)
- **Positive**: #22c55e (low volatility)
- **Warning**: #fbbf24 (medium volatility)
- **Negative**: #ef4444 (high volatility)

## Typography
- Font: Inter (Google Fonts)
- Numbers: Tabular figures for alignment
- Headers: 11px uppercase, letter-spacing: wider
- Data: 12-13px, regular weight
- Large values: 28-30px, light weight

## Component Specifications

### Header
- Compact single-line layout
- "VOLATILITY TERMINAL" branding (uppercase, 15px, semibold)
- Ticker input inline with header
- Minimal, compact input (w-28, 5 char max)

### Quote Panel
- Symbol + Price on left (bold symbol, light price)
- Daily Range on right (O/H/L with color coding)
- Price position bar (gradient Low→High, white dot indicator)

### Volatility Metrics
- 2-column grid layout with vertical divider
- Large volatility percentage (30px, light weight)
- Percentile below with color coding
- Section labeled "30-DAY VOLATILITY" / "90-DAY VOLATILITY"

### Historical Thresholds
- Darker background (#0a0a0a)
- 2-column grid for 30D/90D thresholds
- p50/p90/p99 values with muted styling

### Chart
- White line for 30D (primary metric)
- Gray line for 90D (secondary metric)
- Dashed reference lines for thresholds
- Minimal axis styling
- Compact legend in header bar

## Files Modified
- `src/index.css` - Inter font, CSS variables, scrollbar
- `src/App.jsx` - Terminal-style layout
- `src/components/TickerInput.jsx` - Compact inline input
- `src/components/VolatilityTable.jsx` - Grid layout, OHLC display
- `src/components/VolatilityChart.jsx` - Monochrome chart

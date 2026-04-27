# Feature: Mobile Responsive Layout

## Issue
GitHub Issue #10 — App is unusable on mobile. Layout elements overflow, sidebar takes permanent space, grids don't stack, and padding is excessive.

## Changes
- **Sidebar**: Hidden on mobile, togglable via hamburger menu button in header
- **Header**: Stack elements vertically on mobile; hide email, show only avatar + sign out
- **VolatilityTable**: Quote header stacks vertically; returns grid goes from 4-col to 2-col; volatility grid stacks to 1-col on mobile
- **VolatilityChart**: Legend wraps; chart margins reduced on mobile
- **Footer**: Stack vertically on mobile
- **General**: Reduce padding on mobile (`px-4` instead of `px-8`)

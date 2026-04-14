# AlphaDetail Pro View Redesign Notes

## New Section Order (Pro Mode):
1. **Factor Name** (header with grade badge + status badge)
2. **Factor Overview Data** (5 metric cards from image 1):
   - GRADE (with color + description like "Average")
   - OS SHARPE (with color coding: green/yellow/red + "Weak"/"Moderate"/"Strong")
   - RETURNS (green, "Total return")
   - DRAWDOWN (red, "Max loss")
   - TESTS (color coded, "Passed/Total")
3. **IS/OS Summary** (from image 2):
   - Header with "OS Summary" title + IS/OS toggle
   - 6 metric cards in a row: SHARPE, TURNOVER, FITNESS, RETURNS, DRAWDOWN, MARGIN
   - Yearly breakdown table: YEAR, SHARPE, TURNOVER, FITNESS, RETURNS, DRAWDOWN, MARGIN, LONG COUNT, SHORT COUNT
4. **Expression**
5. **Charts** (with chart type selector + show/hide test period)
6. **Test Status** (PASS/FAIL/PENDING expandable sections)

## Design Style (from images):
- Metric cards: dark bg (bg-accent), rounded-2xl, centered text
- Label: uppercase, small, muted color
- Value: large font-mono, color-coded
- Description: tiny text below value
- Summary cards: similar dark bg, rounded corners
- Table: clean with colored values (sharpe yellow/green, drawdown red)

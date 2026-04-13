# Alphas Card View Design Analysis

## From Reference Image:

### Layout
- Full-width card list (not grid), single column
- Dark background, cards with subtle border (left accent border for some)
- Top: subtitle "Browse proven trading signals. Use them as building blocks for your strategies."
- Search bar + filter tabs: All | Official | Graduated

### Factor Flywheel Banner
- Top info card with icon (shield/crown)
- Text: "Factor Flywheel" - "Develop factors → Submit to competition → Top factors graduate to official library → Others use them in strategies → You earn rewards"

### Card Structure (Collapsed)
- Left: Star icon (☆ for regular, 👑 crown for graduated/official)
- Name (bold) + Category tag (e.g., MOMENTUM, VOLUME, MEAN REVERSION, RISK-ADJUSTED, ON-CHAIN, DERIVATIVES)
- Right: User count icon + number (e.g., 342)
- Description text (one line)
- SHARPE value + FITNESS value (mono font, green accent for high values)
- Right bottom: "Use in Strategy >" button (outline style)

### Card Structure (Expanded - "Less" mode)
- Same as collapsed but with additional:
- "This factor can be used as a building block in your strategy. Click below to add it to a new strategy."
- Two action buttons: "⚡ Add to Time-Series Strategy" (green accent) + "Add to Cross-Sectional Strategy" (outline)
- "by CryptoQuant_Pro" author attribution for graduated factors

### Visual Details
- Green accent color (#C5FF4A or similar acid green) for Sharpe values and primary actions
- Category tags: small uppercase, muted border pill
- Left border accent: green for official, purple for graduated
- Crown icon for graduated factors
- Star icon for official factors

### Categories
- Official: Platform-curated, high-quality factors (star icon)
- Graduated: Community factors that passed competition and graduated to library (crown icon)

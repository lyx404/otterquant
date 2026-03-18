# Design System Refactor — Modern Developer Tool Aesthetic

## Design Tokens
- bg-base: Light #FFFFFF / Dark #000000
- bg-surface: Light #F4F4F5 / Dark #0A0A0A-#121212
- bg-surface-hover: Light #E4E4E7 / Dark #1A1A1A
- primary: #3B82F6 (blue) or #8B5CF6 (purple)
- glow: Light rgba(59,130,246,0.1) / Dark rgba(139,92,246,0.15)
- text-primary: Light #09090B / Dark #FFFFFF
- text-secondary: Light #52525B / Dark #A1A1AA
- text-muted: Light #A1A1AA / Dark #52525B
- border: Light #E4E4E7 / Dark #27272A
- success: #10B981, error: #EF4444, warning: #F59E0B
- radius: sm 4px, md 6-8px, xl 12-16px, full 9999px
- font: Inter/Geist + JetBrains Mono
- NO inline style allowed — all Tailwind atomic classes

## Tasks
- [ ] Rewrite index.css with CSS variables + @layer base + dual theme
- [ ] Update index.html fonts
- [ ] Rewrite AppLayout — pure Tailwind, no inline style
- [ ] Rewrite Dashboard — pure Tailwind, no inline style
- [ ] Rewrite MyAlphas — pure Tailwind, no inline style
- [ ] Rewrite Leaderboard — pure Tailwind, no inline style
- [ ] Rewrite AlphaDetail — pure Tailwind, no inline style
- [ ] Rewrite Account + NotFound — pure Tailwind, no inline style
- [ ] Rewrite LaunchGuide — pure Tailwind, no inline style
- [ ] Remove useKatanaColors hook, replace with Tailwind classes
- [ ] Update CustomCursor for new theme
- [ ] Verify dark/light toggle on all pages
- [ ] Save checkpoint

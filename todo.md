# Visual Style Upgrade - Acid Green / Dark Mode

## Typography
- [ ] Switch to Inter font globally
- [ ] Hero titles: text-7xl to text-9xl, font-medium, tracking-tighter, leading-none
- [ ] Labels/nav: text-[10px], uppercase, tracking-[0.2em], tabular-nums

## Color Palette
- [ ] Background: #0B0B0B (deep gray, not pure black)
- [ ] Accent: #C5FF4A (acid green) for buttons, key labels, hover states
- [ ] Text hierarchy: text-white for core, text-white/50 for secondary
- [ ] Borders: border-white/10 (ultra-thin semi-transparent white)

## Motion & Interaction
- [ ] Install GSAP dependency
- [ ] GSAP staggered reveal: titles from y:100 + skewY:7, power4.out easing
- [ ] Custom cursor: circle with mix-blend-mode:difference, enlarges on hover to acid green
- [ ] Card hover: border transition white/10 → #C5FF4A, inner text/icon parallax shift

## Pages to Update
- [ ] Global CSS (index.css)
- [ ] index.html (fonts)
- [ ] CustomCursor component
- [ ] GSAP animation hooks
- [ ] AppLayout (navigation)
- [ ] Dashboard
- [ ] MyAlphas
- [ ] Leaderboard
- [ ] AlphaDetail
- [ ] Account
- [ ] App.tsx + NotFound

# Obsidian Shield 设计风格重构 TODO

## Phase 1: 全局 CSS 变量和主题色
- [ ] 重写 index.css :root/.dark CSS 变量 (Primary #00FAD9, Surface #0B0E11/#161A1E)
- [ ] 统一圆角 12px, 移除 Indigo/紫色调

## Phase 2: 字体系统
- [ ] 加载 Space Grotesk + Roboto Mono 字体
- [ ] 数值用 Roboto Mono, 标签 ALL CAPS

## Phase 3-6: 页面视觉重构
- [ ] Landing: 主色替换、CTA 发光、Glassmorphism
- [ ] Dashboard: 卡片分层、数据等宽字体
- [ ] Leaderboard/AlphaDetail/LaunchGuide/Account/Auth
- [ ] AppLayout/NotificationPanel 通用组件

## 设计规范
- 不用实线分割，用背景色阶
- Glassmorphism: bg rgba(22,26,30,0.7) + blur(16px)
- Hover: Y-4px + glow shadow
- 不用纯黑 #000000, 不混合圆角, 不用蓝蓝渐变

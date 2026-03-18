# 设计系统换肤 — Indigo/Sky + Slate 色阶

## 全局配置
- [x] 更新 index.css CSS 变量（色彩、字体、间距、圆角、投影、动效）
- [x] 更新 tailwind.config.ts（如需）
- [x] 更新 client/index.html 字体引用（Inter + Roboto Mono）
- [x] 更新 useKatanaColors 钩子适配新色彩

## 组件换肤
- [x] AppLayout.tsx — 导航栏、主题切换
- [x] CustomCursor.tsx — 自定义光标
- [x] Dashboard.tsx — 仪表盘
- [x] MyAlphas.tsx — Alpha 列表
- [x] AlphaDetail.tsx — Alpha 详情
- [x] Leaderboard.tsx — 排行榜
- [x] Account.tsx — 账户设置
- [x] LaunchGuide.tsx — 引导流程
- [x] NotFound.tsx — 404 页面

## 验证
- [x] TypeScript 零错误
- [x] Light 模式视觉正确
- [x] Dark 模式视觉正确
- [x] 主题切换平滑
- [x] 保存检查点

## 新增需求
- [x] MyAlphas Pipeline Stats 卡片出场动效（仿照 Dashboard）— 已确认动效已存在（statsRef + fade-item + gsap stagger）

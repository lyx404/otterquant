# 组件注册与语义边界

> 只登记项目真实可用的组件及其语义边界，不把组件名当作页面骨架。

## 组件目录

| 组件 | 来源/路径 | 语义职责 | 主要状态 | 使用边界 |
| --- | --- | --- | --- | --- |
| SidebarLayout | `client/src/components/SidebarLayout.tsx` | 全局侧栏、页头、路由上下文与移动抽屉 | 展开/折叠、桌面/移动、当前路由 | 作为受布局页面的 App shell；无布局页面由 App 控制 |
| AppLayout | `client/src/components/AppLayout.tsx` | 旧版/轻量顶部导航与账户控制 | 登录、用户菜单、主题切换、滚动隐藏 | 仅在保留旧版顶部导航的页面使用 |
| Button / Dialog / Sheet | `client/src/components/ui/` | 基础操作、确认与响应式容器 | hover、focus、disabled、loading、open | 优先复用 shadcn/Radix 包装组件 |
| TradeTrendChart | `client/src/components/TradeTrendChart.tsx` | 收益/NAV/回撤趋势图与 Tooltip | loading、empty、hover、error | 只表达时间序列，不替代风险说明 |
| Card / Badge / Tabs / Table | `client/src/components/ui/` | 分组、状态标记、视图切换、结构化数据 | active、selected、disabled、empty | 按语义使用，避免把 Badge 当作按钮 |

## 易混组件边界

| 组件 A | 组件 B | 选择规则 |
| --- | --- | --- |
| Badge | Button | Badge 只读状态，Button 承担操作 |
| Dialog | Sheet | Dialog 用于聚焦确认；Sheet 用于移动端或侧向辅助内容 |
| Card | Table | Card 承载摘要/入口；Table 承载可比较的多行结构化数据 |

## 新手任务与策略工作台组件

| 组件 | 来源/路径 | 语义职责 | 主要状态 | 使用边界 |
| --- | --- | --- | --- | --- |
| OnboardingTaskGroup | `client/src/components/SidebarLayout.tsx` | 新手任务分组、环形进度与子任务深链 | pending、progress、complete、展开/收起 | 子任务完成状态可独立传入，不能只用连续完成步数推导 |
| 策略工作台 | `client/src/pages/MyStrategies.tsx` + `MyStrategies.css` | 文件夹、筛选、策略表格、最新运行状态与引导锚点 | folder、sort、compare、run status、横向滚动 | 表格承载高密度比较；状态标签不可承担操作 |
| 策略任务同步 | `client/src/lib/strategyOnboarding.ts` | 创建策略与运行策略任务状态的本地同步 | incomplete、complete、storage/event update | 只负责任务状态，不替代策略运行来源 |

- 新手任务浮窗可随时打开、关闭或跳转；新手引导浮窗用于当前步骤的定向教学且一次只显示一个。
- 文件夹导航表示组织上下文；筛选只缩小当前上下文的可见策略。
- 新手任务浮窗支持关闭按钮、`Escape` 与外部点击；外部点击监听必须排除浮窗自身与其触发按钮。

## 交互与可访问性

- 键盘与焦点：所有可操作元素可 Tab 到达，使用可见 focus ring；弹层打开时焦点进入并可 Escape 关闭。
- 触控目标与响应式行为：移动端关键控制不小于约 44px；侧栏转抽屉，图表与表格允许安全横向滚动而不遮挡标题。
- 异步操作反馈：提交、复制、启动交易等动作显示进行中、成功或失败反馈，并保持上下文。
- 禁用、错误和权限状态：禁用态降低对比度但保留原因；权限不足隐藏或降级高风险操作。

## 组件缺口

- [待确认] 当前需求需要但项目没有的组件：统一的风险摘要、审计记录与权限说明组件。
- 替代方案与风险：暂可用 Card + Alert/Dialog 组合；若复用过多，可能造成语义和文案不一致。

<!-- design-spec:managed:start -->
## 项目事实（自动同步）

- 组件目录与文件线索：[待确认]
- UI 依赖与组件库线索：`React`, `Vite`, `Tailwind CSS`, `Ant Design`, `Lucide`, `Framer Motion`, `Motion`, `GSAP`
- 入口文件：[待确认]
<!-- design-spec:managed:end -->

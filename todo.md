# Alpha Arena 页面修改

- [ ] 创建 Aurora 极光背景组件（WebGL/Canvas），替换 LIVE Round 的静态装饰动效
- [ ] 为 Your Alphas 列表项添加点击跳转到 AlphaDetail 页面的交互逻辑

# Landing 页面文案调整 TODO

- [ ] **Hero Section**: 标题改为新文案，CTA 按钮改为 [Get Your Skill Key] | [Explore Prize Pools]
- [ ] **Core Feature Module 1**: NL2Factor Sync — 跨平台集成，IPO 模型
- [ ] **Core Feature Module 2**: Alpha Dashboard — 专业组合管理，KPI 指标
- [ ] **Core Feature Module 3**: Alpha Competition — 激励生态，奖励机制
- [ ] **Technical Moat Section**: 4 维度表格
- [ ] **Workflow Section**: 4 步流程
- [ ] 保持现有动效和主题适配

# Account 页面修改

- [ ] 删除 Two-Factor Auth 行（第178行 div）
- [ ] 修改 Password "Change" 按钮 → 增加修改流程（发送验证码至邮箱、更新密码、保存）
- [ ] 删除 Sessions 行（第196行 div）
- [ ] 在 Account 页面底部新增消息通知板块（Alphas 相关通知、Arena 相关通知）

# Alpha Edit 页面（/alphas/new）

- [x] 分析 MyAlphas.tsx 新建按钮位置和现有跳转逻辑
- [x] 分析 Launch Guide 页面的 Agent API & Skill 和 First Run 步骤内容
- [x] 创建 /alphas/new 路由和 AlphaEdit.tsx 页面组件
- [x] 实现模式选择 UI（Platform Agent / Your Own Agent）
- [x] 实现 Platform Agent 模式：表单收集 2-3 个必要数据，其余默认收起
- [x] 实现 Your Own Agent 模式：复用 Launch Guide 的 Agent API 和 First Run 内容
- [x] 更新 MyAlphas 新建按钮跳转到 /alphas/new
- [x] 验证 TypeScript 无错误，创建 checkpoint

# LaunchGuide 修改

- [ ] 步骤顺序对换：Verify (原步骤3) ↔ First Run (原步骤4)
  - STEPS 数组中 verify 和 first-run 对换
  - canProceed 中 case 2 和 case 3 逻辑对换
  - 步骤内容渲染中 currentStep === 2 和 currentStep === 3 对换
- [ ] 原 First Run 步骤内容替换为 prompt 用例（测试 skill 的示例 prompt）

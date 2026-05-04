import type { Factor } from "@/lib/mockData";

type Translator = (en: string, zh: string) => string;

export function getAlphaUsageContext(row: Pick<Factor, "tag">, tr: Translator) {
  const tag = row.tag ?? "";
  const contexts: Record<string, { purpose: string; scenario: string; purposeZh: string; scenarioZh: string }> = {
    ARBITRAGE: {
      purpose: "Find price-discrepancy opportunities across exchanges",
      scenario: "Short-term arbitrage / high-liquidity assets / range-bound markets",
      purposeZh: "发现不同交易所之间的价格偏差机会",
      scenarioZh: "短线套利 / 高流动性资产 / 震荡行情",
    },
    SENTIMENT: {
      purpose: "Capture trading signals from shifts in social sentiment",
      scenario: "Event-driven moves / active social buzz / short-term momentum",
      purposeZh: "捕捉社交情绪变化带来的交易信号",
      scenarioZh: "事件驱动 / 热度上升资产 / 短线动量",
    },
    MOMENTUM: {
      purpose: "Identify assets whose price trend is strengthening",
      scenario: "Breakout trading / trending markets / medium-liquidity assets",
      purposeZh: "识别价格趋势正在增强的资产",
      scenarioZh: "突破交易 / 趋势行情 / 中等以上流动性资产",
    },
    "ON-CHAIN": {
      purpose: "Use capital flows to judge market direction and risk appetite",
      scenario: "Capital rotation / major assets / trend confirmation",
      purposeZh: "通过链上资金流判断市场方向与风险偏好",
      scenarioZh: "资金轮动 / 主流资产 / 趋势确认",
    },
    DEFI: {
      purpose: "Find opportunities from DeFi liquidity and TVL changes",
      scenario: "DeFi rotation / liquidity changes / protocol-driven moves",
      purposeZh: "从 DeFi 流动性和 TVL 变化中发现机会",
      scenarioZh: "DeFi 轮动 / 流动性变化 / 协议事件",
    },
    DERIVATIVES: {
      purpose: "Read futures-market pressure from funding, OI, and liquidations",
      scenario: "Perpetual contracts / mean reversion / leverage unwind",
      purposeZh: "通过资金费率、持仓和爆仓数据识别衍生品压力",
      scenarioZh: "永续合约 / 均值回归 / 杠杆出清",
    },
    ORDERBOOK: {
      purpose: "Use bid-ask depth imbalance to read short-term pressure",
      scenario: "Intraday trading / liquid pairs / fast directional moves",
      purposeZh: "用买卖盘深度失衡判断短线压力",
      scenarioZh: "日内交易 / 高流动性交易对 / 快速方向行情",
    },
    "CROSS-CHAIN": {
      purpose: "Track capital movement between chains to spot rotation",
      scenario: "Multi-chain assets / bridge flows / ecosystem rotation",
      purposeZh: "跟踪跨链资金迁移，识别生态轮动机会",
      scenarioZh: "多链资产 / 跨链桥流量 / 生态轮动",
    },
  };

  const fallback = {
    purpose: "Explain what market behavior this factor is trying to capture",
    scenario: "Use as a candidate signal before adding it to a strategy",
    purposeZh: "说明这个因子想捕捉哪类市场行为",
    scenarioZh: "作为候选信号，加入策略前继续观察验证",
  };
  const context = contexts[tag] ?? fallback;
  return {
    purpose: tr(context.purpose, context.purposeZh),
    scenario: tr(context.scenario, context.scenarioZh),
  };
}

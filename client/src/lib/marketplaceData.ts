import { strategies, type Strategy } from "@/lib/mockData";

export type MarketplaceCardDetails = {
  cumulativeReturn: string;
  descriptionZh: string;
  strategySeries: number[];
  benchmarkSeries: number[];
};

function buildPerformanceSeries(target: number, phase: number, volatility: number) {
  return Array.from({ length: 48 }, (_, index) => {
    const progress = index / 47;
    const wave = Math.sin(progress * Math.PI * 5 + phase) * volatility;
    const pulse = Math.cos(progress * Math.PI * 11 + phase * 0.6) * volatility * 0.34;
    const earlyDip = -Math.exp(-Math.pow((progress - 0.16) * 8, 2)) * volatility * 1.3;
    return Number((target * progress + wave + pulse + earlyDip).toFixed(2));
  });
}

const marketplaceExamples: Strategy[] = [
  {
    id: "STR-007",
    name: "ETH Volatility Carry",
    description: "Harvests volatility risk premium across ETH options and perpetual futures with adaptive delta hedging.",
    factorCount: 4,
    market: "CEX",
    annualReturn: "38.4%",
    sharpe: 2.08,
    maxDrawdown: "9.6%",
    winRate: "64.8%",
    status: "live",
    subscribers: 274,
    author: "Quandora Lab",
    updatedAt: "2026-03-18",
    tags: ["ETH", "Volatility", "Options"],
  },
  {
    id: "STR-008",
    name: "SOL Flow Momentum",
    description: "Combines spot order flow, validator activity, and ecosystem liquidity shifts to identify SOL momentum regimes.",
    factorCount: 5,
    market: "Mixed",
    annualReturn: "41.7%",
    sharpe: 1.94,
    maxDrawdown: "11.2%",
    winRate: "61.9%",
    status: "live",
    subscribers: 169,
    capacity: 200,
    author: "Quandora Lab",
    updatedAt: "2026-03-17",
    tags: ["SOL", "Order Flow", "Momentum"],
  },
  {
    id: "STR-009",
    name: "Multi-Asset Risk Parity",
    description: "Balances volatility and correlation risk across major crypto assets with systematic exposure rebalancing.",
    factorCount: 6,
    market: "Mixed",
    annualReturn: "21.6%",
    sharpe: 2.76,
    maxDrawdown: "4.9%",
    winRate: "69.4%",
    status: "live",
    subscribers: 633,
    author: "Quandora Lab",
    updatedAt: "2026-03-19",
    tags: ["Risk Parity", "Portfolio", "Low Risk"],
  },
  {
    id: "STR-010",
    name: "Funding Spread Capture",
    description: "Captures persistent funding spreads across liquid perpetual markets while neutralizing directional exposure.",
    factorCount: 3,
    market: "CEX",
    annualReturn: "19.3%",
    sharpe: 3.68,
    maxDrawdown: "2.7%",
    winRate: "75.1%",
    status: "live",
    subscribers: 1024,
    author: "Quandora Lab",
    updatedAt: "2026-03-20",
    tags: ["Funding", "Market Neutral", "Carry"],
  },
  {
    id: "STR-011",
    name: "On-Chain Liquidity Pulse",
    description: "Tracks stablecoin issuance, bridge flows, and exchange reserves to anticipate broad liquidity rotations.",
    factorCount: 5,
    market: "DEX",
    annualReturn: "34.1%",
    sharpe: 2.22,
    maxDrawdown: "7.4%",
    winRate: "66.2%",
    status: "live",
    subscribers: 356,
    author: "Quandora Lab",
    updatedAt: "2026-03-18",
    tags: ["On-chain", "Liquidity", "Macro"],
  },
];

export const marketplaceCardDetails: Record<string, MarketplaceCardDetails> = {
  "STR-001": {
    cumulativeReturn: "18.7%",
    descriptionZh: "融合 RSI 交叉、成交量背离与资金费率信号，捕捉 BTC 永续合约的中短周期趋势。",
    strategySeries: buildPerformanceSeries(18.7, 0.2, 2.4),
    benchmarkSeries: buildPerformanceSeries(6.1, 1.2, 1.4),
  },
  "STR-002": {
    cumulativeReturn: "15.4%",
    descriptionZh: "追踪主要 DeFi 协议的 TVL 资金流、LP 行为与 Gas 成本变化，动态调整收益仓位。",
    strategySeries: buildPerformanceSeries(15.4, 0.8, 2),
    benchmarkSeries: buildPerformanceSeries(4.8, 1.7, 1.2),
  },
  "STR-003": {
    cumulativeReturn: "12.6%",
    descriptionZh: "利用主流中心化交易所之间的价差和订单簿深度，执行低敞口跨所套利。",
    strategySeries: buildPerformanceSeries(12.6, 1.4, 1.35),
    benchmarkSeries: buildPerformanceSeries(5.3, 0.5, 1.1),
  },
  "STR-005": {
    cumulativeReturn: "8.9%",
    descriptionZh: "聚焦资金费率套利与基差交易，在控制回撤的前提下提供稳定的收益曲线。",
    strategySeries: buildPerformanceSeries(8.9, 2, 0.75),
    benchmarkSeries: buildPerformanceSeries(4.2, 1.1, 0.9),
  },
  "STR-007": {
    cumulativeReturn: "16.2%",
    descriptionZh: "通过动态 Delta 对冲，在 ETH 期权与永续合约之间获取波动率风险溢价。",
    strategySeries: buildPerformanceSeries(16.2, 0.55, 2.05),
    benchmarkSeries: buildPerformanceSeries(5.8, 1.45, 1.25),
  },
  "STR-008": {
    cumulativeReturn: "20.4%",
    descriptionZh: "结合现货订单流、验证者活动与生态流动性变化，识别 SOL 动量周期。",
    strategySeries: buildPerformanceSeries(20.4, 1.05, 2.75),
    benchmarkSeries: buildPerformanceSeries(7.2, 0.25, 1.55),
  },
  "STR-009": {
    cumulativeReturn: "10.8%",
    descriptionZh: "基于波动率与相关性平衡主流加密资产风险，并进行系统化敞口再平衡。",
    strategySeries: buildPerformanceSeries(10.8, 1.75, 1.1),
    benchmarkSeries: buildPerformanceSeries(5.1, 0.8, 1.15),
  },
  "STR-010": {
    cumulativeReturn: "9.7%",
    descriptionZh: "捕捉高流动性永续市场的资金费率差，同时对冲方向性风险。",
    strategySeries: buildPerformanceSeries(9.7, 2.25, 0.65),
    benchmarkSeries: buildPerformanceSeries(4.6, 1.3, 0.85),
  },
  "STR-011": {
    cumulativeReturn: "17.1%",
    descriptionZh: "追踪稳定币发行、跨链桥资金流与交易所储备，研判市场流动性轮动。",
    strategySeries: buildPerformanceSeries(17.1, 2.75, 1.85),
    benchmarkSeries: buildPerformanceSeries(5.6, 0.45, 1.2),
  },
};

const bundledOfficialStrategies = strategies.filter(
  (strategy) => strategy.author === "Quandora Lab" && marketplaceCardDetails[strategy.id]
);

export const marketplaceStrategies = [...bundledOfficialStrategies, ...marketplaceExamples];

export const marketplaceOwnedPortfolioStrategyIds = new Set(["STR-008"]);

export const marketplaceFundNames: Record<string, string> = {
  "STR-001": "投资组合名称",
  "STR-002": "BTCETH 趋势反转",
  "STR-003": "多因子稳健策略",
  "STR-005": "稳健套利增强",
  "STR-007": "ETH 波动率捕获",
  "STR-008": "SOL 动量趋势",
  "STR-009": "多资产风险平价",
  "STR-010": "资金费率中性套利",
  "STR-011": "链上流动性脉冲",
};

export type MarketplaceAvatarTone = "orange" | "teal" | "violet" | "blue" | "green" | "rose";

export const marketplaceAvatarImages = {
  notion: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/notion_1.png",
  notion5: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/notion_5.png",
  toon: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/toon_1.png",
  toon10: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/toon_10.png",
  threeDimensional: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/3d_2.png",
  memo: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/memo_1.png",
  memo17: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/memo_17.png",
  teams5: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/teams_5.png",
};

export const marketplaceUserProfiles: Record<string, { author: string; avatar: string; avatarTone: MarketplaceAvatarTone }> = {
  "STR-001": { author: "枫1008", avatar: "枫", avatarTone: "orange" },
  "STR-002": { author: "成成狼兜", avatar: "成", avatarTone: "teal" },
  "STR-003": { author: "量化小王子", avatar: "量", avatarTone: "violet" },
  "STR-005": { author: "七月流火", avatar: "七", avatarTone: "blue" },
  "STR-007": { author: "阿尔法研究所", avatar: "阿", avatarTone: "orange" },
  "STR-008": { author: "南山有鹿", avatar: "南", avatarTone: "rose" },
  "STR-009": { author: "均衡之道", avatar: "均", avatarTone: "teal" },
  "STR-010": { author: "中性先生", avatar: "中", avatarTone: "orange" },
  "STR-011": { author: "链上观察员", avatar: "链", avatarTone: "violet" },
};

// The marketplace cards use curated follower limits that are distinct from the
// generic strategy fixtures used by other pages.
export const marketplaceFollowerLimits: Record<string, { subscribers: number; capacity: number }> = {
  "STR-001": { subscribers: 200, capacity: 200 },
  "STR-002": { subscribers: 147, capacity: 200 },
  "STR-003": { subscribers: 88, capacity: 120 },
  "STR-005": { subscribers: 200, capacity: 200 },
  "STR-007": { subscribers: 64, capacity: 100 },
  "STR-008": { subscribers: 169, capacity: 200 },
  "STR-009": { subscribers: 112, capacity: 150 },
  "STR-010": { subscribers: 200, capacity: 200 },
  "STR-011": { subscribers: 93, capacity: 120 },
};

export const marketplaceTradeSource: Record<string, string> = {
  "STR-001": "TRD-101",
  "STR-002": "TRD-102",
  "STR-003": "TRD-201",
  "STR-005": "TRD-202",
  "STR-007": "TRD-202",
  "STR-008": "TRD-103",
  "STR-009": "TRD-201",
  "STR-010": "TRD-102",
  "STR-011": "TRD-101",
};

// ============================================================
// Otter Mock Data - Indigo/Sky + Slate Theme
// All data is simulated for demo purposes
// ============================================================

// --- Time Series Generator ---
function generateTimeSeries(
  startDate: string,
  days: number,
  generator: (i: number, total: number) => number
): { date: string; value: number }[] {
  const result: { date: string; value: number }[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    result.push({
      date: d.toISOString().split("T")[0],
      value: generator(i, days),
    });
  }
  return result;
}

// Seeded random for consistency
let seed = 42;
function seededRandom() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}

// --- PnL Data ---
export function generatePnLData() {
  let cumPnl = 0;
  const trainDays = 1200;
  const testDays = 300;
  seed = 42;
  const train = generateTimeSeries("2019-01-01", trainDays, (i) => {
    cumPnl += (seededRandom() - 0.47) * 50000;
    return Math.round(cumPnl);
  });
  const test = generateTimeSeries("2022-04-15", testDays, (i) => {
    cumPnl += (seededRandom() - 0.45) * 40000;
    return Math.round(cumPnl);
  });
  return { train, test };
}

// --- Sharpe Data ---
export function generateSharpeData() {
  seed = 123;
  let sharpe = 0;
  const train = generateTimeSeries("2019-01-01", 1200, (i) => {
    sharpe += (seededRandom() - 0.498) * 0.02;
    sharpe = Math.max(-2, Math.min(2, sharpe));
    return parseFloat(sharpe.toFixed(3));
  });
  const test = generateTimeSeries("2022-04-15", 300, (i) => {
    sharpe += (seededRandom() - 0.5) * 0.005;
    sharpe = Math.max(-2, Math.min(2, sharpe));
    return parseFloat(sharpe.toFixed(3));
  });
  return { train, test };
}

// --- Turnover Data ---
export function generateTurnoverData() {
  seed = 456;
  const train = generateTimeSeries("2019-01-01", 1200, () => {
    return parseFloat((35 + seededRandom() * 35).toFixed(2));
  });
  const test = generateTimeSeries("2022-04-15", 300, () => {
    return parseFloat((35 + seededRandom() * 30).toFixed(2));
  });
  return { train, test };
}

// --- Returns Data ---
export function generateReturnsData() {
  seed = 789;
  let cumReturn = 0;
  const train = generateTimeSeries("2019-01-01", 1200, () => {
    cumReturn += (seededRandom() - 0.48) * 0.5;
    return parseFloat(cumReturn.toFixed(3));
  });
  const test = generateTimeSeries("2022-04-15", 300, () => {
    cumReturn += (seededRandom() - 0.47) * 0.4;
    return parseFloat(cumReturn.toFixed(3));
  });
  return { train, test };
}

// --- Drawdown Data ---
export function generateDrawdownData() {
  seed = 321;
  const train = generateTimeSeries("2019-01-01", 1200, () => {
    return parseFloat((-seededRandom() * 25).toFixed(2));
  });
  const test = generateTimeSeries("2022-04-15", 300, () => {
    return parseFloat((-seededRandom() * 15).toFixed(2));
  });
  return { train, test };
}

// --- IS Summary ---
export interface YearlySummary {
  year: number;
  sharpe: number;
  turnover: string;
  fitness: number;
  returns: string;
  drawdown: string;
  margin: string;
  longCount: number;
  shortCount: number;
}

export const aggregateData = {
  sharpe: 0.21,
  turnover: "41.96%",
  fitness: 0.04,
  returns: "1.88%",
  drawdown: "8.28%",
  margin: "0.90‰",
};

export const yearlySummary: YearlySummary[] = [
  { year: 2019, sharpe: 0.63, turnover: "42.40%", fitness: 0.16, returns: "2.82%", drawdown: "5.50%", margin: "1.33‰", longCount: 1508, shortCount: 1528 },
  { year: 2020, sharpe: 1.26, turnover: "43.06%", fitness: 0.75, returns: "15.18%", drawdown: "7.96%", margin: "7.05‰", longCount: 1521, shortCount: 1513 },
  { year: 2021, sharpe: 0.01, turnover: "42.07%", fitness: 0.00, returns: "0.25%", drawdown: "24.90%", margin: "0.12‰", longCount: 1540, shortCount: 1548 },
  { year: 2022, sharpe: 1.63, turnover: "42.33%", fitness: 1.13, returns: "20.50%", drawdown: "7.97%", margin: "9.69‰", longCount: 1537, shortCount: 1550 },
  { year: 2023, sharpe: 0.15, turnover: "41.96%", fitness: 0.03, returns: "1.30%", drawdown: "8.28%", margin: "0.62‰", longCount: 1556, shortCount: 1547 },
];

// --- OS Summary (for ranking) ---
export const osAggregateData = {
  sharpe: 0.57,
  turnover: "42.35%",
  fitness: 0.25,
  returns: "8.12%",
  drawdown: "12.50%",
  margin: "3.80‰",
};

export const osYearlySummary: YearlySummary[] = [
  { year: 2024, sharpe: 0.72, turnover: "41.80%", fitness: 0.38, returns: "10.25%", drawdown: "9.80%", margin: "4.85‰", longCount: 1560, shortCount: 1555 },
  { year: 2025, sharpe: 0.43, turnover: "42.90%", fitness: 0.15, returns: "5.98%", drawdown: "15.20%", margin: "2.75‰", longCount: 1548, shortCount: 1562 },
];

// --- Testing Status ---
export interface TestItem {
  text: string;
  status: "pass" | "fail" | "pending";
  detail?: string;
}

export const testingStatus: TestItem[] = [
  { text: "Turnover of 42.35% is above cutoff of 1%.", status: "pass" },
  { text: "Turnover of 42.35% is below cutoff of 70%.", status: "pass" },
  { text: "Competition Challenge matches.", status: "pass" },
  { text: "Sharpe of 0.57 is below cutoff of 1.25.", status: "fail" },
  { text: "Fitness of 0.25 is below cutoff of 1.", status: "fail" },
  { text: "Weight concentration 16.70% is above cutoff of 10% on 12/20/2022.", status: "fail" },
  { text: "Sub-universe Sharpe of 0.11 is below cutoff of 0.25.", status: "fail" },
  { text: "Self-correlation check pending.", status: "pending" },
];

// --- Alpha List ---
export interface Factor {
  id: string;
  name: string;
  expression: string;
  market: "CEX" | "DEX";
  status: "active" | "testing" | "archived";
  sharpe: number;
  fitness: number;
  returns: string;
  turnover: string;
  drawdown: string;
  createdAt: string;
  testsPassed: number;
  testsFailed: number;
  testsPending: number;
  osSharpe: number;
}

export const factors: Factor[] = [
  { id: "AF-001", name: "BTC Momentum RSI Cross", expression: "ts_rank(close/delay(close,14), 252) * ts_std(volume, 20)", market: "CEX", status: "active", sharpe: 1.42, fitness: 0.89, returns: "18.5%", turnover: "38.2%", drawdown: "6.8%", createdAt: "2025-12-15", testsPassed: 5, testsFailed: 1, testsPending: 0, osSharpe: 1.15 },
  { id: "AF-002", name: "ETH Volume Divergence", expression: "rank(ts_corr(close, volume, 10)) - rank(ts_delta(close, 5))", market: "CEX", status: "active", sharpe: 1.18, fitness: 0.72, returns: "14.2%", turnover: "42.1%", drawdown: "9.3%", createdAt: "2025-12-20", testsPassed: 4, testsFailed: 2, testsPending: 0, osSharpe: 0.95 },
  { id: "AF-003", name: "DeFi TVL Alpha", expression: "ts_regression(tvl_change, price_return, 30, 'residual')", market: "DEX", status: "testing", sharpe: 0.87, fitness: 0.45, returns: "8.9%", turnover: "55.3%", drawdown: "15.2%", createdAt: "2026-01-05", testsPassed: 3, testsFailed: 3, testsPending: 1, osSharpe: 0.62 },
  { id: "AF-004", name: "Cross-Exchange Spread", expression: "rank(spread_binance_okx) * ts_decay(volume_imbalance, 5)", market: "CEX", status: "active", sharpe: 2.15, fitness: 1.35, returns: "25.8%", turnover: "31.5%", drawdown: "4.2%", createdAt: "2025-11-28", testsPassed: 6, testsFailed: 0, testsPending: 0, osSharpe: 1.85 },
  { id: "AF-005", name: "Funding Rate Mean Rev", expression: "ts_zscore(funding_rate, 168) * -1 * rank(open_interest_change)", market: "CEX", status: "active", sharpe: 1.65, fitness: 1.02, returns: "21.3%", turnover: "28.7%", drawdown: "7.5%", createdAt: "2025-12-01", testsPassed: 5, testsFailed: 1, testsPending: 0, osSharpe: 1.42 },
  { id: "AF-006", name: "Uniswap LP Flow", expression: "rank(net_lp_flow_7d) * ts_rank(pool_volume, 30)", market: "DEX", status: "testing", sharpe: 0.55, fitness: 0.22, returns: "5.2%", turnover: "62.8%", drawdown: "18.5%", createdAt: "2026-01-10", testsPassed: 2, testsFailed: 4, testsPending: 1, osSharpe: 0.38 },
  { id: "AF-007", name: "Whale Wallet Tracker", expression: "ts_sum(whale_net_transfer, 3) * rank(market_cap)", market: "CEX", status: "active", sharpe: 1.33, fitness: 0.81, returns: "16.7%", turnover: "35.4%", drawdown: "8.1%", createdAt: "2025-12-08", testsPassed: 5, testsFailed: 1, testsPending: 0, osSharpe: 1.08 },
  { id: "AF-008", name: "Gas Fee Sentiment", expression: "ts_corr(gas_price_gwei, eth_return, 24) * rank(tx_count)", market: "DEX", status: "archived", sharpe: 0.32, fitness: 0.08, returns: "2.1%", turnover: "48.9%", drawdown: "22.3%", createdAt: "2025-10-15", testsPassed: 1, testsFailed: 5, testsPending: 0, osSharpe: 0.15 },
  { id: "AF-009", name: "OI Delta Momentum", expression: "ts_delta(open_interest, 4) / ts_std(open_interest, 20) * sign(return_1h)", market: "CEX", status: "active", sharpe: 1.78, fitness: 1.15, returns: "22.9%", turnover: "33.2%", drawdown: "5.8%", createdAt: "2025-11-20", testsPassed: 6, testsFailed: 0, testsPending: 0, osSharpe: 1.55 },
  { id: "AF-010", name: "MEV Sandwich Detect", expression: "rank(sandwich_attack_freq) * ts_decay(price_impact, 10) * -1", market: "DEX", status: "testing", sharpe: 0.95, fitness: 0.52, returns: "10.8%", turnover: "58.1%", drawdown: "13.7%", createdAt: "2026-01-15", testsPassed: 3, testsFailed: 2, testsPending: 2, osSharpe: 0.72 },
];

// --- Strategy Marketplace ---
export interface Strategy {
  id: string;
  name: string;
  description: string;
  factorCount: number;
  market: "CEX" | "DEX" | "Mixed";
  annualReturn: string;
  sharpe: number;
  maxDrawdown: string;
  winRate: string;
  status: "live" | "backtested" | "new";
  subscribers: number;
  author: string;
  updatedAt: string;
  tags: string[];
}

export const strategies: Strategy[] = [
  { id: "STR-001", name: "BTC Alpha Composite", description: "Multi-factor momentum strategy combining RSI cross, volume divergence, and funding rate signals for BTC perpetual futures.", factorCount: 5, market: "CEX", annualReturn: "45.2%", sharpe: 2.31, maxDrawdown: "8.5%", winRate: "62.3%", status: "live", subscribers: 342, author: "Otter Lab", updatedAt: "2026-03-14", tags: ["BTC", "Momentum", "Perpetual"] },
  { id: "STR-002", name: "DeFi Yield Hunter", description: "Captures alpha from TVL flows, LP dynamics, and gas fee patterns across major DeFi protocols.", factorCount: 4, market: "DEX", annualReturn: "32.8%", sharpe: 1.85, maxDrawdown: "12.3%", winRate: "58.7%", status: "live", subscribers: 189, author: "Otter Lab", updatedAt: "2026-03-12", tags: ["DeFi", "Yield", "LP"] },
  { id: "STR-003", name: "Cross-Exchange Arb Pro", description: "Exploits price discrepancies between major CEX platforms using spread analysis and order book depth.", factorCount: 3, market: "CEX", annualReturn: "28.5%", sharpe: 3.12, maxDrawdown: "3.2%", winRate: "71.5%", status: "live", subscribers: 567, author: "Otter Lab", updatedAt: "2026-03-15", tags: ["Arbitrage", "Low Risk", "HFT"] },
  { id: "STR-004", name: "Altcoin Rotation", description: "Systematic rotation between top 50 altcoins based on momentum, whale tracking, and on-chain metrics.", factorCount: 6, market: "Mixed", annualReturn: "68.3%", sharpe: 1.52, maxDrawdown: "22.5%", winRate: "55.2%", status: "backtested", subscribers: 98, author: "Community", updatedAt: "2026-03-10", tags: ["Altcoin", "Rotation", "High Vol"] },
  { id: "STR-005", name: "Stable Yield Optimizer", description: "Low-risk strategy focusing on funding rate arbitrage and basis trading with controlled exposure.", factorCount: 2, market: "CEX", annualReturn: "15.8%", sharpe: 4.25, maxDrawdown: "1.8%", winRate: "78.9%", status: "live", subscribers: 891, author: "Otter Lab", updatedAt: "2026-03-15", tags: ["Low Risk", "Stable", "Funding"] },
  { id: "STR-006", name: "MEV Protection Alpha", description: "Generates alpha by detecting and avoiding MEV attacks while capturing sandwich-resistant opportunities.", factorCount: 3, market: "DEX", annualReturn: "22.1%", sharpe: 1.68, maxDrawdown: "10.5%", winRate: "60.1%", status: "new", subscribers: 45, author: "Community", updatedAt: "2026-03-08", tags: ["MEV", "Protection", "DEX"] },
];

// --- Alpha Arena ---
export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  factorId: string;
  factorName: string;
  osSharpe: number;
  osFitness: number;
  osReturns: string;
  compositeScore: number;
  reward: string;
  market: "CEX" | "DEX";
}

export const currentEpoch = {
  id: "Round 4",
  startDate: "2026-03-15",
  endDate: "2026-03-18",
  totalPool: "5,000 USDT",
  qualifiedFactors: 23,
  totalSubmissions: 156,
  timeRemaining: "1d 14h 32m",
};

export interface EpochInfo {
  id: string;
  startDate: string;
  endDate: string;
  totalPool: string;
  qualifiedFactors: number;
  totalSubmissions: number;
  timeRemaining?: string;
  distributed?: boolean;
  winners?: number;
}

export const allEpochs: EpochInfo[] = [
  { id: "Round 4", startDate: "2026-03-18", endDate: "2026-03-22", totalPool: "5,000 USDT", qualifiedFactors: 23, totalSubmissions: 156, timeRemaining: "1d 14h 32m" },
  { id: "Round 3", startDate: "2026-03-12", endDate: "2026-03-15", totalPool: "5,000 USDT", qualifiedFactors: 20, totalSubmissions: 142, distributed: true, winners: 18 },
  { id: "Round 2", startDate: "2026-03-09", endDate: "2026-03-12", totalPool: "5,000 USDT", qualifiedFactors: 25, totalSubmissions: 168, distributed: true, winners: 21 },
  { id: "Round 1", startDate: "2026-03-06", endDate: "2026-03-09", totalPool: "5,000 USDT", qualifiedFactors: 17, totalSubmissions: 131, distributed: true, winners: 15 },
];

export const previousEpochs = allEpochs.filter(e => e.distributed);

// Alpha Arena data keyed by epoch ID
export const leaderboardByFactorByEpoch: Record<string, LeaderboardEntry[]> = {
  "Round 4": [
    { rank: 1, userId: "U-001", username: "CryptoQuant_Pro", avatar: "CQ", factorId: "AF-004", factorName: "Cross-Exchange Spread", osSharpe: 1.85, osFitness: 1.35, osReturns: "25.8%", compositeScore: 95.2, reward: "1,250 USDT", market: "CEX" },
    { rank: 2, userId: "U-002", username: "DeepAlpha", avatar: "DA", factorId: "AF-009", factorName: "OI Delta Momentum", osSharpe: 1.55, osFitness: 1.15, osReturns: "22.9%", compositeScore: 88.7, reward: "950 USDT", market: "CEX" },
    { rank: 3, userId: "U-003", username: "NeuralTrader", avatar: "NT", factorId: "AF-005", factorName: "Funding Rate Mean Rev", osSharpe: 1.42, osFitness: 1.02, osReturns: "21.3%", compositeScore: 82.3, reward: "720 USDT", market: "CEX" },
    { rank: 4, userId: "U-004", username: "AlphaSeeker_88", avatar: "AS", factorId: "AF-001", factorName: "BTC Momentum RSI Cross", osSharpe: 1.15, osFitness: 0.89, osReturns: "18.5%", compositeScore: 75.1, reward: "540 USDT", market: "CEX" },
    { rank: 5, userId: "U-005", username: "OnChainWiz", avatar: "OW", factorId: "AF-007", factorName: "Whale Wallet Tracker", osSharpe: 1.08, osFitness: 0.81, osReturns: "16.7%", compositeScore: 69.8, reward: "410 USDT", market: "CEX" },
    { rank: 6, userId: "U-006", username: "DeFi_Miner", avatar: "DM", factorId: "AF-002", factorName: "ETH Volume Divergence", osSharpe: 0.95, osFitness: 0.72, osReturns: "14.2%", compositeScore: 63.5, reward: "320 USDT", market: "CEX" },
    { rank: 7, userId: "U-007", username: "QuantBot_v3", avatar: "QB", factorId: "AF-010", factorName: "MEV Sandwich Detect", osSharpe: 0.72, osFitness: 0.52, osReturns: "10.8%", compositeScore: 52.1, reward: "250 USDT", market: "DEX" },
    { rank: 8, userId: "U-008", username: "SatoshiAlpha", avatar: "SA", factorId: "AF-003", factorName: "DeFi TVL Alpha", osSharpe: 0.62, osFitness: 0.45, osReturns: "8.9%", compositeScore: 45.8, reward: "190 USDT", market: "DEX" },
    { rank: 9, userId: "U-009", username: "BlockResearch", avatar: "BR", factorId: "AF-006", factorName: "Uniswap LP Flow", osSharpe: 0.38, osFitness: 0.22, osReturns: "5.2%", compositeScore: 32.4, reward: "150 USDT", market: "DEX" },
    { rank: 10, userId: "U-010", username: "ChainAnalyst", avatar: "CA", factorId: "AF-008", factorName: "Gas Fee Sentiment", osSharpe: 0.15, osFitness: 0.08, osReturns: "2.1%", compositeScore: 18.9, reward: "120 USDT", market: "DEX" },
  ],
  "Round 3": [
    { rank: 1, userId: "U-003", username: "NeuralTrader", avatar: "NT", factorId: "AF-005", factorName: "Funding Rate Mean Rev", osSharpe: 1.78, osFitness: 1.42, osReturns: "27.1%", compositeScore: 96.5, reward: "1,250 USDT", market: "CEX" },
    { rank: 2, userId: "U-001", username: "CryptoQuant_Pro", avatar: "CQ", factorId: "AF-004", factorName: "Cross-Exchange Spread", osSharpe: 1.62, osFitness: 1.28, osReturns: "24.3%", compositeScore: 90.1, reward: "950 USDT", market: "CEX" },
    { rank: 3, userId: "U-005", username: "OnChainWiz", avatar: "OW", factorId: "AF-007", factorName: "Whale Wallet Tracker", osSharpe: 1.35, osFitness: 0.98, osReturns: "19.8%", compositeScore: 81.4, reward: "720 USDT", market: "CEX" },
    { rank: 4, userId: "U-002", username: "DeepAlpha", avatar: "DA", factorId: "AF-009", factorName: "OI Delta Momentum", osSharpe: 1.22, osFitness: 0.91, osReturns: "17.6%", compositeScore: 74.8, reward: "540 USDT", market: "CEX" },
    { rank: 5, userId: "U-006", username: "DeFi_Miner", avatar: "DM", factorId: "AF-002", factorName: "ETH Volume Divergence", osSharpe: 1.05, osFitness: 0.78, osReturns: "15.2%", compositeScore: 68.2, reward: "410 USDT", market: "CEX" },
    { rank: 6, userId: "U-004", username: "AlphaSeeker_88", avatar: "AS", factorId: "AF-001", factorName: "BTC Momentum RSI Cross", osSharpe: 0.88, osFitness: 0.65, osReturns: "12.8%", compositeScore: 58.9, reward: "320 USDT", market: "CEX" },
    { rank: 7, userId: "U-008", username: "SatoshiAlpha", avatar: "SA", factorId: "AF-003", factorName: "DeFi TVL Alpha", osSharpe: 0.75, osFitness: 0.55, osReturns: "9.5%", compositeScore: 48.3, reward: "250 USDT", market: "DEX" },
    { rank: 8, userId: "U-007", username: "QuantBot_v3", avatar: "QB", factorId: "AF-010", factorName: "MEV Sandwich Detect", osSharpe: 0.58, osFitness: 0.42, osReturns: "7.8%", compositeScore: 39.7, reward: "190 USDT", market: "DEX" },
  ],
  "Round 2": [
    { rank: 1, userId: "U-002", username: "DeepAlpha", avatar: "DA", factorId: "AF-009", factorName: "OI Delta Momentum", osSharpe: 1.92, osFitness: 1.48, osReturns: "28.5%", compositeScore: 97.8, reward: "1,250 USDT", market: "CEX" },
    { rank: 2, userId: "U-001", username: "CryptoQuant_Pro", avatar: "CQ", factorId: "AF-004", factorName: "Cross-Exchange Spread", osSharpe: 1.71, osFitness: 1.32, osReturns: "25.1%", compositeScore: 91.3, reward: "950 USDT", market: "CEX" },
    { rank: 3, userId: "U-004", username: "AlphaSeeker_88", avatar: "AS", factorId: "AF-001", factorName: "BTC Momentum RSI Cross", osSharpe: 1.45, osFitness: 1.08, osReturns: "22.0%", compositeScore: 84.6, reward: "720 USDT", market: "CEX" },
    { rank: 4, userId: "U-003", username: "NeuralTrader", avatar: "NT", factorId: "AF-005", factorName: "Funding Rate Mean Rev", osSharpe: 1.28, osFitness: 0.95, osReturns: "18.9%", compositeScore: 76.2, reward: "540 USDT", market: "CEX" },
    { rank: 5, userId: "U-007", username: "QuantBot_v3", avatar: "QB", factorId: "AF-010", factorName: "MEV Sandwich Detect", osSharpe: 1.12, osFitness: 0.82, osReturns: "16.1%", compositeScore: 70.5, reward: "410 USDT", market: "DEX" },
    { rank: 6, userId: "U-005", username: "OnChainWiz", avatar: "OW", factorId: "AF-007", factorName: "Whale Wallet Tracker", osSharpe: 0.98, osFitness: 0.71, osReturns: "13.5%", compositeScore: 62.1, reward: "320 USDT", market: "CEX" },
    { rank: 7, userId: "U-009", username: "BlockResearch", avatar: "BR", factorId: "AF-006", factorName: "Uniswap LP Flow", osSharpe: 0.82, osFitness: 0.58, osReturns: "10.2%", compositeScore: 51.8, reward: "250 USDT", market: "DEX" },
    { rank: 8, userId: "U-006", username: "DeFi_Miner", avatar: "DM", factorId: "AF-002", factorName: "ETH Volume Divergence", osSharpe: 0.65, osFitness: 0.48, osReturns: "8.4%", compositeScore: 43.2, reward: "190 USDT", market: "CEX" },
    { rank: 9, userId: "U-008", username: "SatoshiAlpha", avatar: "SA", factorId: "AF-003", factorName: "DeFi TVL Alpha", osSharpe: 0.45, osFitness: 0.32, osReturns: "5.8%", compositeScore: 34.5, reward: "150 USDT", market: "DEX" },
  ],
  "Round 1": [
    { rank: 1, userId: "U-005", username: "OnChainWiz", avatar: "OW", factorId: "AF-007", factorName: "Whale Wallet Tracker", osSharpe: 1.88, osFitness: 1.40, osReturns: "26.9%", compositeScore: 94.8, reward: "1,250 USDT", market: "CEX" },
    { rank: 2, userId: "U-003", username: "NeuralTrader", avatar: "NT", factorId: "AF-005", factorName: "Funding Rate Mean Rev", osSharpe: 1.65, osFitness: 1.22, osReturns: "23.5%", compositeScore: 88.2, reward: "950 USDT", market: "CEX" },
    { rank: 3, userId: "U-001", username: "CryptoQuant_Pro", avatar: "CQ", factorId: "AF-004", factorName: "Cross-Exchange Spread", osSharpe: 1.48, osFitness: 1.05, osReturns: "20.8%", compositeScore: 82.7, reward: "720 USDT", market: "CEX" },
    { rank: 4, userId: "U-006", username: "DeFi_Miner", avatar: "DM", factorId: "AF-002", factorName: "ETH Volume Divergence", osSharpe: 1.18, osFitness: 0.88, osReturns: "17.2%", compositeScore: 73.5, reward: "540 USDT", market: "CEX" },
    { rank: 5, userId: "U-002", username: "DeepAlpha", avatar: "DA", factorId: "AF-009", factorName: "OI Delta Momentum", osSharpe: 0.95, osFitness: 0.72, osReturns: "14.1%", compositeScore: 65.8, reward: "410 USDT", market: "CEX" },
    { rank: 6, userId: "U-004", username: "AlphaSeeker_88", avatar: "AS", factorId: "AF-001", factorName: "BTC Momentum RSI Cross", osSharpe: 0.78, osFitness: 0.58, osReturns: "11.5%", compositeScore: 55.2, reward: "320 USDT", market: "CEX" },
    { rank: 7, userId: "U-010", username: "ChainAnalyst", avatar: "CA", factorId: "AF-008", factorName: "Gas Fee Sentiment", osSharpe: 0.52, osFitness: 0.38, osReturns: "6.8%", compositeScore: 42.1, reward: "250 USDT", market: "DEX" },
  ],
};

// Backward-compatible aliases
export const leaderboardByFactor = leaderboardByFactorByEpoch["Round 4"];

export interface LeaderboardUserEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  totalFactors: number;
  qualifiedFactors: number;
  avgOsSharpe: number;
  totalReward: string;
  topFactor: string;
}

export const leaderboardByUserByEpoch: Record<string, LeaderboardUserEntry[]> = {
  "Round 4": [
    { rank: 1, userId: "U-001", username: "CryptoQuant_Pro", avatar: "CQ", totalFactors: 12, qualifiedFactors: 8, avgOsSharpe: 1.52, totalReward: "3,850 USDT", topFactor: "Cross-Exchange Spread" },
    { rank: 2, userId: "U-002", username: "DeepAlpha", avatar: "DA", totalFactors: 9, qualifiedFactors: 6, avgOsSharpe: 1.35, totalReward: "2,920 USDT", topFactor: "OI Delta Momentum" },
    { rank: 3, userId: "U-003", username: "NeuralTrader", avatar: "NT", totalFactors: 15, qualifiedFactors: 7, avgOsSharpe: 1.18, totalReward: "2,450 USDT", topFactor: "Funding Rate Mean Rev" },
    { rank: 4, userId: "U-004", username: "AlphaSeeker_88", avatar: "AS", totalFactors: 6, qualifiedFactors: 4, avgOsSharpe: 1.05, totalReward: "1,780 USDT", topFactor: "BTC Momentum RSI Cross" },
    { rank: 5, userId: "U-005", username: "OnChainWiz", avatar: "OW", totalFactors: 8, qualifiedFactors: 5, avgOsSharpe: 0.92, totalReward: "1,350 USDT", topFactor: "Whale Wallet Tracker" },
    { rank: 6, userId: "U-006", username: "DeFi_Miner", avatar: "DM", totalFactors: 11, qualifiedFactors: 5, avgOsSharpe: 0.85, totalReward: "1,120 USDT", topFactor: "ETH Volume Divergence" },
    { rank: 7, userId: "U-007", username: "QuantBot_v3", avatar: "QB", totalFactors: 4, qualifiedFactors: 3, avgOsSharpe: 0.68, totalReward: "780 USDT", topFactor: "MEV Sandwich Detect" },
    { rank: 8, userId: "U-008", username: "SatoshiAlpha", avatar: "SA", totalFactors: 7, qualifiedFactors: 3, avgOsSharpe: 0.55, totalReward: "520 USDT", topFactor: "DeFi TVL Alpha" },
  ],
  "Round 3": [
    { rank: 1, userId: "U-003", username: "NeuralTrader", avatar: "NT", totalFactors: 14, qualifiedFactors: 7, avgOsSharpe: 1.48, totalReward: "3,620 USDT", topFactor: "Funding Rate Mean Rev" },
    { rank: 2, userId: "U-001", username: "CryptoQuant_Pro", avatar: "CQ", totalFactors: 11, qualifiedFactors: 7, avgOsSharpe: 1.38, totalReward: "3,150 USDT", topFactor: "Cross-Exchange Spread" },
    { rank: 3, userId: "U-005", username: "OnChainWiz", avatar: "OW", totalFactors: 7, qualifiedFactors: 5, avgOsSharpe: 1.12, totalReward: "2,080 USDT", topFactor: "Whale Wallet Tracker" },
    { rank: 4, userId: "U-002", username: "DeepAlpha", avatar: "DA", totalFactors: 8, qualifiedFactors: 5, avgOsSharpe: 1.02, totalReward: "1,850 USDT", topFactor: "OI Delta Momentum" },
    { rank: 5, userId: "U-006", username: "DeFi_Miner", avatar: "DM", totalFactors: 10, qualifiedFactors: 4, avgOsSharpe: 0.88, totalReward: "1,280 USDT", topFactor: "ETH Volume Divergence" },
    { rank: 6, userId: "U-004", username: "AlphaSeeker_88", avatar: "AS", totalFactors: 5, qualifiedFactors: 3, avgOsSharpe: 0.72, totalReward: "920 USDT", topFactor: "BTC Momentum RSI Cross" },
  ],
  "Round 2": [
    { rank: 1, userId: "U-002", username: "DeepAlpha", avatar: "DA", totalFactors: 9, qualifiedFactors: 7, avgOsSharpe: 1.58, totalReward: "4,120 USDT", topFactor: "OI Delta Momentum" },
    { rank: 2, userId: "U-001", username: "CryptoQuant_Pro", avatar: "CQ", totalFactors: 10, qualifiedFactors: 7, avgOsSharpe: 1.42, totalReward: "3,480 USDT", topFactor: "Cross-Exchange Spread" },
    { rank: 3, userId: "U-004", username: "AlphaSeeker_88", avatar: "AS", totalFactors: 6, qualifiedFactors: 5, avgOsSharpe: 1.25, totalReward: "2,650 USDT", topFactor: "BTC Momentum RSI Cross" },
    { rank: 4, userId: "U-003", username: "NeuralTrader", avatar: "NT", totalFactors: 13, qualifiedFactors: 6, avgOsSharpe: 1.08, totalReward: "2,180 USDT", topFactor: "Funding Rate Mean Rev" },
    { rank: 5, userId: "U-007", username: "QuantBot_v3", avatar: "QB", totalFactors: 4, qualifiedFactors: 3, avgOsSharpe: 0.92, totalReward: "1,450 USDT", topFactor: "MEV Sandwich Detect" },
    { rank: 6, userId: "U-005", username: "OnChainWiz", avatar: "OW", totalFactors: 7, qualifiedFactors: 4, avgOsSharpe: 0.78, totalReward: "1,080 USDT", topFactor: "Whale Wallet Tracker" },
    { rank: 7, userId: "U-009", username: "BlockResearch", avatar: "BR", totalFactors: 5, qualifiedFactors: 3, avgOsSharpe: 0.65, totalReward: "780 USDT", topFactor: "Uniswap LP Flow" },
  ],
  "Round 1": [
    { rank: 1, userId: "U-005", username: "OnChainWiz", avatar: "OW", totalFactors: 7, qualifiedFactors: 6, avgOsSharpe: 1.55, totalReward: "3,920 USDT", topFactor: "Whale Wallet Tracker" },
    { rank: 2, userId: "U-003", username: "NeuralTrader", avatar: "NT", totalFactors: 12, qualifiedFactors: 6, avgOsSharpe: 1.32, totalReward: "3,050 USDT", topFactor: "Funding Rate Mean Rev" },
    { rank: 3, userId: "U-001", username: "CryptoQuant_Pro", avatar: "CQ", totalFactors: 10, qualifiedFactors: 6, avgOsSharpe: 1.18, totalReward: "2,520 USDT", topFactor: "Cross-Exchange Spread" },
    { rank: 4, userId: "U-006", username: "DeFi_Miner", avatar: "DM", totalFactors: 9, qualifiedFactors: 4, avgOsSharpe: 0.95, totalReward: "1,680 USDT", topFactor: "ETH Volume Divergence" },
    { rank: 5, userId: "U-002", username: "DeepAlpha", avatar: "DA", totalFactors: 7, qualifiedFactors: 4, avgOsSharpe: 0.78, totalReward: "1,250 USDT", topFactor: "OI Delta Momentum" },
  ],
};

export const leaderboardByUser: LeaderboardUserEntry[] = leaderboardByUserByEpoch["Round 4"];

// --- Exchange Connections ---
export interface Exchange {
  id: string;
  name: string;
  type: "CEX" | "DEX";
  logo: string;
  status: "connected" | "disconnected" | "error";
  supportedPairs: number;
  description: string;
}

export const exchanges: Exchange[] = [
  { id: "binance", name: "Binance", type: "CEX", logo: "BN", status: "connected", supportedPairs: 350, description: "World's largest crypto exchange by volume" },
  { id: "okx", name: "OKX", type: "CEX", logo: "OK", status: "disconnected", supportedPairs: 280, description: "Leading crypto derivatives exchange" },
  { id: "bybit", name: "Bybit", type: "CEX", logo: "BB", status: "disconnected", supportedPairs: 220, description: "Top derivatives and spot trading platform" },
  { id: "bitget", name: "Bitget", type: "CEX", logo: "BG", status: "disconnected", supportedPairs: 190, description: "Social trading and copy trading platform" },
  { id: "gate", name: "Gate.io", type: "CEX", logo: "GT", status: "disconnected", supportedPairs: 400, description: "Comprehensive crypto exchange with wide token selection" },
  { id: "dydx", name: "dYdX", type: "DEX", logo: "DX", status: "disconnected", supportedPairs: 45, description: "Decentralized perpetual futures exchange" },
  { id: "gmx", name: "GMX", type: "DEX", logo: "GX", status: "disconnected", supportedPairs: 25, description: "Decentralized perpetual exchange on Arbitrum" },
  { id: "uniswap", name: "Uniswap", type: "DEX", logo: "UN", status: "disconnected", supportedPairs: 1200, description: "Leading decentralized spot exchange" },
  { id: "hyperliquid", name: "Hyperliquid", type: "DEX", logo: "HL", status: "disconnected", supportedPairs: 80, description: "High-performance L1 perpetual DEX" },
  { id: "jupiter", name: "Jupiter", type: "DEX", logo: "JP", status: "disconnected", supportedPairs: 500, description: "Solana's leading DEX aggregator" },
];

// --- Dashboard Stats ---
export const dashboardStats = {
  totalFactors: 156,
  activeFactors: 89,
  avgSharpe: 1.12,
  totalPnL: "+$2,847,320",
  passRate: "57.1%",
  activeTrades: 23,
  monthlyReward: "12,500 USDT",
  subscriberCount: 2134,
};

// --- Recent Activity ---
export const recentActivity = [
  { id: 1, type: "submit_success", message: "Alpha 'BTC Momentum RSI Cross' submitted successfully", time: "2 min ago", icon: "check" },
  { id: 2, type: "submit_success", message: "Alpha 'ETH Volatility Breakout' submitted successfully", time: "15 min ago", icon: "check" },
  { id: 3, type: "submit_failed", message: "Alpha 'SOL Arb Signal' submission failed — expression syntax error", time: "1 hour ago", icon: "x" },
  { id: 4, type: "submit_success", message: "Alpha 'BNB Mean Reversion' submitted successfully", time: "2 hours ago", icon: "check" },
  { id: 5, type: "submit_failed", message: "Alpha 'DOGE Sentiment Alpha' submission failed — insufficient backtest data", time: "3 hours ago", icon: "x" },
  { id: 6, type: "submit_success", message: "Alpha 'ARB Funding Rate Spread' submitted successfully", time: "4 hours ago", icon: "check" },
  { id: 7, type: "submit_success", message: "Alpha 'MEV Sandwich Detect' submitted successfully", time: "5 hours ago", icon: "check" },
  { id: 8, type: "submit_failed", message: "Alpha 'XRP Whale Tracker' submission failed — correlation too high (0.92)", time: "6 hours ago", icon: "x" },
];

// --- Correlation Data ---
export const correlationData = {
  selfCorrelation: { maximum: 0.85, minimum: -0.12 },
  lastRun: "2026-03-15 14:30 UTC",
};

// --- Submission Status Management ---
export type SubmissionStatus = "queued" | "backtesting" | "is_testing" | "os_testing" | "passed" | "failed" | "rejected";

export interface Submission {
  id: string;
  factorId: string;
  factorName: string;
  expression: string;
  market: "CEX" | "DEX";
  submittedAt: string;
  status: SubmissionStatus;
  currentStep: number; // 0-5 pipeline step
  totalSteps: number;
  progress: number; // 0-100
  estimatedTime?: string;
  // Results (populated as pipeline progresses)
  isSharpe?: number;
  osSharpe?: number;
  fitness?: number;
  returns?: string;
  turnover?: string;
  drawdown?: string;
  // Testing details
  testsPassed?: number;
  testsFailed?: number;
  testsPending?: number;
  failReasons?: string[];
  // Epoch info
  epochId?: string;
  epochQualified?: boolean;
}

export const submissionPipeline = [
  { step: 0, label: "Queued", description: "Waiting in submission queue" },
  { step: 1, label: "Data Validation", description: "Validating expression syntax and data availability" },
  { step: 2, label: "Backtesting", description: "Running historical backtest simulation" },
  { step: 3, label: "IS Testing", description: "In-Sample statistical tests and quality checks" },
  { step: 4, label: "OS Testing", description: "Out-of-Sample performance evaluation" },
  { step: 5, label: "Complete", description: "All tests completed, results available" },
];

export const submissions: Submission[] = [
  {
    id: "SUB-001", factorId: "AF-004", factorName: "Cross-Exchange Spread",
    expression: "rank(spread_binance_okx) * ts_decay(volume_imbalance, 5)",
    market: "CEX", submittedAt: "2026-03-15 09:32:15", status: "passed",
    currentStep: 5, totalSteps: 5, progress: 100,
    isSharpe: 2.15, osSharpe: 1.85, fitness: 1.35, returns: "25.8%", turnover: "31.5%", drawdown: "4.2%",
    testsPassed: 6, testsFailed: 0, testsPending: 0,
    epochId: "Round 4", epochQualified: true,
  },
  {
    id: "SUB-002", factorId: "AF-009", factorName: "OI Delta Momentum",
    expression: "ts_delta(open_interest, 4) / ts_std(open_interest, 20) * sign(return_1h)",
    market: "CEX", submittedAt: "2026-03-15 10:15:42", status: "passed",
    currentStep: 5, totalSteps: 5, progress: 100,
    isSharpe: 1.78, osSharpe: 1.55, fitness: 1.15, returns: "22.9%", turnover: "33.2%", drawdown: "5.8%",
    testsPassed: 6, testsFailed: 0, testsPending: 0,
    epochId: "Round 4", epochQualified: true,
  },
  {
    id: "SUB-003", factorId: "AF-005", factorName: "Funding Rate Mean Rev",
    expression: "ts_zscore(funding_rate, 168) * -1 * rank(open_interest_change)",
    market: "CEX", submittedAt: "2026-03-15 11:08:33", status: "passed",
    currentStep: 5, totalSteps: 5, progress: 100,
    isSharpe: 1.65, osSharpe: 1.42, fitness: 1.02, returns: "21.3%", turnover: "28.7%", drawdown: "7.5%",
    testsPassed: 5, testsFailed: 1, testsPending: 0,
    epochId: "Round 4", epochQualified: true,
  },
  {
    id: "SUB-004", factorId: "AF-001", factorName: "BTC Momentum RSI Cross",
    expression: "ts_rank(close/delay(close,14), 252) * ts_std(volume, 20)",
    market: "CEX", submittedAt: "2026-03-15 12:45:10", status: "passed",
    currentStep: 5, totalSteps: 5, progress: 100,
    isSharpe: 1.42, osSharpe: 1.15, fitness: 0.89, returns: "18.5%", turnover: "38.2%", drawdown: "6.8%",
    testsPassed: 5, testsFailed: 1, testsPending: 0,
    epochId: "Round 4", epochQualified: true,
  },
  {
    id: "SUB-005", factorId: "AF-003", factorName: "DeFi TVL Alpha",
    expression: "ts_regression(tvl_change, price_return, 30, 'residual')",
    market: "DEX", submittedAt: "2026-03-15 14:22:08", status: "os_testing",
    currentStep: 4, totalSteps: 5, progress: 78,
    estimatedTime: "~12 min",
    isSharpe: 0.87, fitness: 0.45, returns: "8.9%", turnover: "55.3%", drawdown: "15.2%",
    testsPassed: 3, testsFailed: 3, testsPending: 1,
  },
  {
    id: "SUB-006", factorId: "AF-010", factorName: "MEV Sandwich Detect",
    expression: "rank(sandwich_attack_freq) * ts_decay(price_impact, 10) * -1",
    market: "DEX", submittedAt: "2026-03-15 15:10:55", status: "is_testing",
    currentStep: 3, totalSteps: 5, progress: 55,
    estimatedTime: "~25 min",
    isSharpe: 0.95,
    testsPassed: 3, testsFailed: 2, testsPending: 2,
  },
  {
    id: "SUB-007", factorId: "AF-011", factorName: "Liquidation Cascade",
    expression: "ts_rank(liquidation_volume, 24) * rank(oi_change) * sign(funding_rate)",
    market: "CEX", submittedAt: "2026-03-15 16:30:22", status: "backtesting",
    currentStep: 2, totalSteps: 5, progress: 35,
    estimatedTime: "~40 min",
  },
  {
    id: "SUB-008", factorId: "AF-012", factorName: "NFT Floor Price Signal",
    expression: "ts_corr(nft_floor_price_change, eth_return, 14) * rank(nft_volume)",
    market: "DEX", submittedAt: "2026-03-15 17:05:48", status: "queued",
    currentStep: 0, totalSteps: 5, progress: 0,
    estimatedTime: "~55 min",
  },
  {
    id: "SUB-009", factorId: "AF-006", factorName: "Uniswap LP Flow",
    expression: "rank(net_lp_flow_7d) * ts_rank(pool_volume, 30)",
    market: "DEX", submittedAt: "2026-03-14 08:12:33", status: "failed",
    currentStep: 5, totalSteps: 5, progress: 100,
    isSharpe: 0.55, osSharpe: 0.38, fitness: 0.22, returns: "5.2%", turnover: "62.8%", drawdown: "18.5%",
    testsPassed: 2, testsFailed: 4, testsPending: 0,
    failReasons: [
      "IS Sharpe of 0.55 is below cutoff of 1.25",
      "Fitness of 0.22 is below cutoff of 1.0",
      "Max drawdown of 18.5% exceeds cutoff of 15%",
      "Turnover of 62.8% exceeds optimal range (20%-55%)",
    ],
  },
  {
    id: "SUB-010", factorId: "AF-008", factorName: "Gas Fee Sentiment",
    expression: "ts_corr(gas_price_gwei, eth_return, 24) * rank(tx_count)",
    market: "DEX", submittedAt: "2026-03-13 11:45:20", status: "rejected",
    currentStep: 1, totalSteps: 5, progress: 100,
    failReasons: [
      "Expression contains unsupported function: gas_price_gwei (data source deprecated)",
      "Insufficient historical data coverage (< 2 years required)",
    ],
  },
  {
    id: "SUB-011", factorId: "AF-013", factorName: "Stablecoin Flow Indicator",
    expression: "ts_delta(usdt_supply, 7) / ts_std(usdt_supply, 30) * rank(btc_volume)",
    market: "CEX", submittedAt: "2026-03-14 14:30:00", status: "failed",
    currentStep: 5, totalSteps: 5, progress: 100,
    isSharpe: 0.32, osSharpe: -0.15, fitness: 0.05, returns: "-2.1%", turnover: "48.5%", drawdown: "25.3%",
    testsPassed: 1, testsFailed: 5, testsPending: 0,
    failReasons: [
      "OS Sharpe of -0.15 is negative (minimum: 0)",
      "IS Sharpe of 0.32 is below cutoff of 1.25",
      "Fitness of 0.05 is below cutoff of 1.0",
      "Max drawdown of 25.3% exceeds cutoff of 15%",
      "Negative OS returns indicate overfitting",
    ],
  },
  {
    id: "SUB-012", factorId: "AF-002", factorName: "ETH Volume Divergence",
    expression: "rank(ts_corr(close, volume, 10)) - rank(ts_delta(close, 5))",
    market: "CEX", submittedAt: "2026-03-14 16:20:45", status: "passed",
    currentStep: 5, totalSteps: 5, progress: 100,
    isSharpe: 1.18, osSharpe: 0.95, fitness: 0.72, returns: "14.2%", turnover: "42.1%", drawdown: "9.3%",
    testsPassed: 4, testsFailed: 2, testsPending: 0,
    epochId: "Round 4", epochQualified: true,
  },
];

// Submission stats
export const submissionStats = {
  total: 12,
  passed: 5,
  failed: 2,
  rejected: 1,
  starred: 2,
  passRate: "41.7%",
};

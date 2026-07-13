export type PortfolioNavDatum = {
  date: string;
  net: number;
  gross: number;
  drawdown: number;
};

export const portfolioPeakIndex = 123;
export const portfolioTroughIndex = 129;

export function buildPortfolioNavData(count = 220): PortfolioNavDatum[] {
  const start = Date.UTC(2021, 0, 1);
  const end = Date.UTC(2022, 5, 1);
  const span = end - start;

  return Array.from({ length: count }, (_, index) => {
    const progress = index / Math.max(1, count - 1);
    const date = new Date(start + span * progress);
    const saturation = (amount: number) => (1 - Math.exp(-amount * progress)) / (1 - Math.exp(-amount));
    const jagged = Math.sin(index * 0.61) * 0.028 + Math.sin(index * 0.17) * 0.045;
    const net = 0.86 + saturation(2.45) * 1.72 + jagged + Math.sin(index * 0.09) * 0.035;
    const gross = 0.88 + saturation(2.8) * 2.62 + jagged * 1.35 + Math.cos(index * 0.07) * 0.04;
    const localStress = Math.abs(Math.sin(index * 0.18) * 0.06 + Math.cos(index * 0.47) * 0.035);
    const earlyShock = Math.exp(-Math.pow((progress - 0.06) / 0.05, 2)) * 0.12;
    const maxDrawdownShock = Math.exp(-Math.pow((index - portfolioTroughIndex) / 5, 2)) * 0.18;
    const lateShock = Math.exp(-Math.pow((progress - 0.86) / 0.045, 2)) * 0.15;
    let drawdown = -Math.min(0.2099, localStress + earlyShock + maxDrawdownShock + lateShock);

    if (index === portfolioPeakIndex) drawdown = 0;
    if (index === portfolioTroughIndex) drawdown = -0.2099;

    return { date: date.toISOString().slice(0, 10), net, gross, drawdown };
  });
}

export const portfolioNavData = buildPortfolioNavData();
export const portfolioGrossNavValues = portfolioNavData.map((point) => point.gross);

export const denseRepresentativeSymbol = "LTCUSDT";

export const decileReturnDomain = { min: -3.63, max: 5.38 };
export const decileReturnTicks = [-3.63, -1.37, 0.88, 3.13, 5.38];
export const decileReturnDateTicks = ["2021-01", "2021-05", "2021-10", "2022-02", "2022-06"];
export const decileReturnLabels = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10", "Long-Short 1x"];
export const barraStyleReturnDomain = { min: -4.01, max: 3.57 };
export const barraStyleReturnTicks = [-4.01, -2.11, -0.22, 1.67, 3.57];
export const barraStyleReturnDateTicks = ["2021-01", "2021-05", "2021-10", "2022-02", "2022-06"];
export const barraStyleReturnLabels = ["beta", "carry", "liquidity", "momentum", "reversal", "size", "volatility"];
const barraStyleReturnTargets = [-1.02, 0.52, 0.42, -1.36, 3.46, 0.7, -3.83];
const barraStyleReturnColors = ["#2a6fdb", "#ff7a1a", "#1f8a5b", "#d64550", "#8f5fd6", "#9b6254", "#d75bb7"];
export const barraCorrelationDomain = { min: -0.74, max: 0.8 };
export const barraCorrelationTicks = [-0.74, -0.36, 0.03, 0.42, 0.8];
export const barraCorrelationDateTicks = ["2021-01", "2021-05", "2021-10", "2022-02", "2022-06"];
const barraCorrelationAnchors = [-0.08, 0.028, -0.004, -0.163, 0.326, 0.007, -0.253];
const barraCorrelationStarts = [0.12, 0.04, -0.09, 0.1, 0.04, -0.02, -0.3];
const barraCorrelationEnds = [-0.12, -0.01, 0.0, -0.24, 0.39, 0.01, -0.25];
export const turnoverRateDomain = { min: 0, max: 2.2 };
export const turnoverRateTicks = [0, 0.55, 1.1, 1.65, 2.2];
export const turnoverRateDateTicks = ["2021-01", "2021-05", "2021-10", "2022-02", "2022-06"];
export const turnoverRateLabels = ["Daily turnover", "EMA30"];
const turnoverRateColors = ["#2f9cf4", "#f2c84b"];
export const autocorrDecayDomain = { min: -1, max: 1 };
export const autocorrDecayTicks = [-1, -0.5, 0, 0.5, 1];
export const autocorrDecayLagLabels = [1, 3, 5, 7, 10, 30, 60];
export const autocorrDecayLabels = ["Q1", "Q10", "Long-Short"];
export const autocorrDecayValues = [
  [-0.042, 0.032, -0.118, 0.0011, -0.015, 0.026, 0.006],
  [-0.086, 0.058, -0.071, 0.0504, 0.025, 0.014, -0.052],
  [-0.026, -0.012, 0.071, 0.0947, 0.048, 0.02, 0.009],
];
const autocorrDecayColors = ["#2a6fdb", "#17b6c7", "var(--report-text-soft)"];

export function makeDecileReturnSeries(count: number, seed: number): number[] {
  if (seed === 10) {
    const low = makeDecileReturnSeries(count, 0);
    const high = makeDecileReturnSeries(count, 9);
    return high.map((value, index) => (value - low[index]) / 2);
  }
  const tier = seed / 9;
  const terminal = -3.2 + tier * 8.05;
  const speed = 1.55 + tier * 0.55;
  const raw = Array.from({ length: count }, (_, index) => {
    const p = index / Math.max(1, count - 1);
    const curve = (1 - Math.exp(-p * speed)) / (1 - Math.exp(-speed));
    const shock = Math.exp(-Math.pow((p - 0.52) / 0.11, 2)) * (tier - 0.42) * 0.55;
    const dip = Math.exp(-Math.pow((p - 0.1) / 0.07, 2)) * (0.32 - tier * 0.18);
    const wave = Math.sin(index * (0.09 + seed * 0.006)) * 0.16 + Math.cos(index * (0.17 + seed * 0.004)) * 0.08;
    return terminal * curve + shock + wave - dip * (seed < 5 ? 1 : -0.35);
  });
  const first = raw[0] ?? 0;
  return raw.map(value => Math.max(decileReturnDomain.min, Math.min(decileReturnDomain.max, value - first)));
}

export function getDecileReturnColor(index: number) {
  if (index === decileReturnLabels.length - 1) return "var(--report-text-soft)";
  const tint = index < 5 ? 86 - index * 9 : 48 + (index - 5) * 9;
  return `color-mix(in srgb, var(${index < 5 ? "--report-red" : "--report-green"}) ${tint}%, var(--report-muted))`;
}

export function makeBarraStyleReturnSeries(count: number, seed: number): number[] {
  const start = -0.22;
  const target = barraStyleReturnTargets[seed] ?? 0;
  const direction = target >= start ? 1 : -1;
  const speed = 0.86 + seed * 0.045;
  const raw = Array.from({ length: count }, (_, index) => {
    const p = index / Math.max(1, count - 1);
    const trend = start + (target - start) * Math.pow(p, speed);
    const regime =
      direction *
      (Math.exp(-Math.pow((p - 0.38) / 0.06, 2)) * (0.18 + seed * 0.025) +
        Math.exp(-Math.pow((p - 0.73) / 0.08, 2)) * (0.12 + (seed % 3) * 0.05));
    const chop =
      Math.sin(index * (0.16 + seed * 0.011)) * (0.08 + seed * 0.012) +
      Math.cos(index * (0.39 + seed * 0.009)) * 0.035;
    return trend + regime * (seed === 4 || seed === 6 ? 1.18 : 0.58) + chop;
  });
  const last = raw.at(-1) ?? target;
  return raw.map((value, index) => {
    const p = index / Math.max(1, count - 1);
    return Math.max(barraStyleReturnDomain.min, Math.min(barraStyleReturnDomain.max, value + (target - last) * p));
  });
}

export function makeBarraCorrelationSeries(count: number, seed: number): number[] {
  const start = barraCorrelationStarts[seed] ?? 0;
  const end = barraCorrelationEnds[seed] ?? 0;
  const target = barraCorrelationAnchors[seed] ?? 0;
  const anchorIndex = Math.round((count - 1) * 0.546);
  const raw = Array.from({ length: count }, (_, index) => {
    const p = index / Math.max(1, count - 1);
    const drift = start + (end - start) * p;
    const wave =
      Math.sin(index * (0.11 + seed * 0.018)) * (0.025 + seed * 0.004) +
      Math.cos(index * (0.31 + seed * 0.009)) * 0.012;
    const regime = Math.exp(-Math.pow((p - 0.64) / 0.14, 2)) * (seed === 4 ? 0.12 : seed === 6 ? -0.06 : 0.025 - seed * 0.006);
    return drift + wave + regime;
  });
  const delta = target - (raw[anchorIndex] ?? target);
  return raw.map((value, index) =>
    Math.max(
      barraCorrelationDomain.min,
      Math.min(barraCorrelationDomain.max, value + delta * Math.exp(-Math.pow((index - anchorIndex) / 12, 2)))
    )
  );
}

export function makeTurnoverRateSeries(count: number, seed: number): number[] {
  const anchorIndex = Math.round((count - 1) * 0.955);
  const raw = Array.from({ length: count }, (_, index) => {
    const p = index / Math.max(1, count - 1);
    const base = 1.5 * (1 - Math.exp(-p * 32));
    const wave = Math.sin(index * 1.7) * 0.18 + Math.cos(index * 0.53) * 0.11 + Math.sin(index * 3.1) * 0.08;
    const earlyLift = Math.exp(-Math.pow((p - 0.18) / 0.1, 2)) * 0.2;
    const late = Math.exp(-Math.pow((p - 0.86) / 0.09, 2)) * 0.1;
    return Math.max(0, Math.min(turnoverRateDomain.max, base + wave + earlyLift + late - p * 0.05));
  });
  const delta = 1.556 - (raw[anchorIndex] ?? 1.556);
  const daily = raw.map((value, index) =>
    Math.max(0, Math.min(turnoverRateDomain.max, value + delta * Math.exp(-Math.pow((index - anchorIndex) / 8, 2))))
  );
  if (seed !== 1) return daily;

  const alpha = 2 / (30 + 1);
  let ema = daily[0] ?? 0;
  return daily.map(value => {
    ema = ema + alpha * (value - ema);
    return Math.max(0, Math.min(turnoverRateDomain.max, ema));
  });
}

export function getBarraStyleReturnColor(index: number) {
  return barraStyleReturnColors[index % barraStyleReturnColors.length];
}

export function getTurnoverRateColor(index: number) {
  return turnoverRateColors[index % turnoverRateColors.length];
}

export function getAutocorrDecayColor(index: number) {
  return autocorrDecayColors[index % autocorrDecayColors.length];
}

export const denseSymbolUniverse = [
  denseRepresentativeSymbol,
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "ADAUSDT",
  "MATICUSDT",
  "DOTUSDT",
  "FILUSDT",
  "ICPUSDT",
  "ATOMUSDT",
  "NEARUSDT",
  "OPUSDT",
  "ARBUSDT",
  "APTUSDT",
  "SUIUSDT",
  "INJUSDT",
  "TIAUSDT",
  "SEIUSDT",
  "ETCUSDT",
  "LDOUSDT",
  "AAVEUSDT",
  "UNIUSDT",
  "SANDUSDT",
  "MANAUSDT",
  "GALAUSDT",
  "AXSUSDT",
  "GMTUSDT",
  "RUNEUSDT",
  "DYDXUSDT",
  "GMXUSDT",
  "WLDUSDT",
  "FETUSDT",
  "RNDRUSDT",
  "ARUSDT",
  "STXUSDT",
  "ORDIUSDT",
  "PEPEUSDT",
  "SHIBUSDT",
  "BONKUSDT",
  "FLOKIUSDT",
  "WIFUSDT",
  "JUPUSDT",
  "PYTHUSDT",
  "ENAUSDT",
  "STRKUSDT",
  "IMXUSDT",
  "BLURUSDT",
  "ENSUSDT",
  "CRVUSDT",
  "SNXUSDT",
  "COMPUSDT",
  "MKRUSDT",
  "SUSHIUSDT",
  "YFIUSDT",
  "ZRXUSDT",
  "1INCHUSDT",
  "CAKEUSDT",
  "FTMUSDT",
  "ROSEUSDT",
  "ALGOUSDT",
  "HBARUSDT",
  "VETUSDT",
  "THETAUSDT",
  "KAVAUSDT",
  "KSMUSDT",
  "MINAUSDT",
  "EGLDUSDT",
  "FLOWUSDT",
  "CHZUSDT",
  "ENJUSDT",
  "MASKUSDT",
  "LRCUSDT",
  "BATUSDT",
  "ZILUSDT",
  "IOTAUSDT",
  "QTUMUSDT",
  "DASHUSDT",
  "ZECUSDT",
  "XMRUSDT",
  "LPTUSDT",
  "BANDUSDT",
  "API3USDT",
  "CELOUSDT",
  "ONEUSDT",
  "ANKRUSDT",
  "SKLUSDT",
  "OCEANUSDT",
  "AGIXUSDT",
  "BALUSDT",
  "CVXUSDT",
  "FXSUSDT",
  "LINAUSDT",
  "MAGICUSDT",
  "PERPUSDT",
];

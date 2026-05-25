import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Select } from "animal-island-ui";
import "animal-island-ui/style";
import type { SelectOption } from "animal-island-ui";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  Heart,
  MoreHorizontal,
  PieChart,
  Search,
  Star,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { factors, getAlphaGrade, strategies, type AlphaGrade, type Factor } from "@/lib/mockData";
import { useAppLanguage } from "@/contexts/AppLanguageContext";

const filterOptions = ["all", "official", "graduated"] as const;
type FilterKey = (typeof filterOptions)[number];
type StrategySortKey = "roi" | "winRate" | "sharpe" | "maxDrawdown";
type SortDir = "asc" | "desc" | null;
const curveRanges = ["7D", "30D", "90D", "365D"] as const;
type CurveRange = (typeof curveRanges)[number];
const factorFilterOptions = ["all", "passed", "starred", "failed"] as const;
type FactorFilterKey = (typeof factorFilterOptions)[number];
type FactorSortKey =
  | "createdAt"
  | "grade"
  | "rewardAmount"
  | "sharpe"
  | "osSharpe"
  | "returns"
  | "drawdown"
  | "turnover"
  | "fitness";
type FactorRow = Factor & {
  submissionStatus: "passed" | "failed";
  grade: AlphaGrade;
  rewardAmount: number;
};

function parseMetricValue(value: string | number) {
  if (typeof value === "number") return value;
  const parsed = Number(value.replace(/[%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDefaultStrategySortDir(key: StrategySortKey): Exclude<SortDir, null> {
  return key === "maxDrawdown" ? "asc" : "desc";
}

function getStrategyTier(strategy: (typeof strategies)[number]): Exclude<FilterKey, "all"> {
  return strategy.author.toLowerCase().includes("quandora") ? "official" : "graduated";
}

const factorGradeOrder: Record<AlphaGrade, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };
const factorRewardByGrade: Record<AlphaGrade, number> = {
  S: 1,
  A: 0.5,
  B: 0.3,
  C: 0.2,
  D: 0.1,
  F: 0,
};

function getFactorSubmissionStatus(factor: Factor): FactorRow["submissionStatus"] {
  return factor.status === "archived" ? "failed" : "passed";
}

function getFactorDefaultSortDir(key: FactorSortKey): Exclude<SortDir, null> {
  return key === "drawdown" || key === "grade" ? "asc" : "desc";
}

function buildFactorCurve(factor: Factor) {
  const returns = parseMetricValue(factor.returns);
  const fitness = Math.max(factor.fitness, 0.05);
  const base = 42 + returns * 1.4;
  const values = Array.from({ length: 20 }, (_, index) => {
    const progress = index / 19;
    const wave = Math.sin(index * 0.82 + factor.id.length) * (6 + fitness * 7);
    const wobble = Math.cos(index * 0.37 + factor.osSharpe) * 4;
    return base + progress * returns * 2.6 + wave + wobble;
  });
  return buildLinePath(values, 180, 58, 6);
}

function fmtSigned(value: number, fractionDigits = 2) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

function buildDetailSeries(points: number, start: number, slope: number, volatility: number) {
  return Array.from({ length: points }, (_, index) => {
    const wave = Math.sin(index * 0.42) * volatility;
    const wobble = Math.cos(index * 0.18) * volatility * 0.45;
    return Number((start + index * slope + wave + wobble).toFixed(2));
  });
}

function buildLinePath(values: number[], width: number, height: number, padding = 16) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export default function Landing() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [factorQuery, setFactorQuery] = useState("");
  const [factorFilter, setFactorFilter] = useState<FactorFilterKey>("all");
  const [factorSortKey, setFactorSortKey] = useState<FactorSortKey | null>("createdAt");
  const [factorSortDir, setFactorSortDir] = useState<SortDir>("desc");
  const [starredFactors, setStarredFactors] = useState<Set<string>>(() => new Set(["AF-004", "AF-009"]));
  const [shopOpen, setShopOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<StrategySortKey | null>("roi");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [starredStrategies, setStarredStrategies] = useState<Set<string>>(() => new Set());
  const [selectedStrategy, setSelectedStrategy] = useState<(typeof strategies)[number] | null>(null);
  const [curveRange, setCurveRange] = useState<CurveRange>("365D");

  const filterLabels: Record<FilterKey, string> = {
    all: tr("All", "全部"),
    official: tr("Official", "官方"),
    graduated: tr("Graduated", "三方"),
  };

  const filterSelectOptions: SelectOption[] = filterOptions.map((option) => ({
    key: option,
    label: filterLabels[option],
  }));

  const sortLabels: Record<StrategySortKey, string> = {
    roi: "ROI",
    winRate: tr("Win Rate", "胜率"),
    sharpe: tr("Sharpe Ratio", "夏普比率"),
    maxDrawdown: tr("Max Drawdown", "最大回撤"),
  };

  const sortSelectOptions: SelectOption[] = [
    { key: "default", label: tr("Default", "默认") },
    ...(Object.keys(sortLabels) as StrategySortKey[]).map((key) => ({
      key,
      label: sortLabels[key],
    })),
  ];

  const factorFilterLabels: Record<FactorFilterKey, string> = {
    all: tr("All", "全部"),
    passed: tr("Passed", "通过"),
    starred: tr("My Favorites", "我的收藏"),
    failed: tr("Failed", "失败"),
  };

  const factorFilterSelectOptions: SelectOption[] = factorFilterOptions.map((option) => ({
    key: option,
    label: factorFilterLabels[option],
  }));

  const factorSortLabels: Record<FactorSortKey, string> = {
    createdAt: tr("Date Created", "创建日期"),
    grade: tr("Grade", "等级"),
    rewardAmount: tr("Bonus (USD)", "奖金(USD)"),
    sharpe: tr("IS Sharpe", "IS 夏普"),
    osSharpe: tr("OS Sharpe", "OS 夏普"),
    returns: tr("Returns", "收益率"),
    drawdown: tr("Drawdown", "回撤"),
    turnover: tr("Turnover", "换手率"),
    fitness: tr("Fitness", "适应度"),
  };

  const factorSortSelectOptions: SelectOption[] = [
    { key: "default", label: tr("Default", "默认") },
    ...(Object.keys(factorSortLabels) as FactorSortKey[]).map((key) => ({
      key,
      label: factorSortLabels[key],
    })),
  ];

  const factorRows = useMemo<FactorRow[]>(() => {
    return factors.map((factor) => {
      const submissionStatus = getFactorSubmissionStatus(factor);
      const grade = submissionStatus === "passed" ? getAlphaGrade(factor.osSharpe) : "F";
      return {
        ...factor,
        submissionStatus,
        grade,
        rewardAmount: factorRewardByGrade[grade],
      };
    });
  }, []);

  const filteredFactors = useMemo(() => {
    const q = factorQuery.trim().toLowerCase();
    const sortValue = (factor: FactorRow) => {
      switch (factorSortKey) {
        case "createdAt":
          return new Date(factor.createdAt).getTime();
        case "grade":
          return factorGradeOrder[factor.grade];
        case "rewardAmount":
          return factor.rewardAmount;
        case "sharpe":
          return factor.sharpe;
        case "osSharpe":
          return factor.osSharpe;
        case "returns":
          return parseMetricValue(factor.returns);
        case "drawdown":
          return parseMetricValue(factor.drawdown);
        case "turnover":
          return parseMetricValue(factor.turnover);
        case "fitness":
          return factor.fitness;
        default:
          return 0;
      }
    };

    const filtered = factorRows.filter((factor) => {
      const matchQuery =
        !q ||
        factor.name.toLowerCase().includes(q) ||
        factor.id.toLowerCase().includes(q) ||
        factor.expression.toLowerCase().includes(q) ||
        factor.market.toLowerCase().includes(q) ||
        factor.tag?.toLowerCase().includes(q) ||
        factor.description?.toLowerCase().includes(q);
      const matchFilter =
        factorFilter === "all" ||
        (factorFilter === "starred" ? starredFactors.has(factor.id) : factor.submissionStatus === factorFilter);
      return matchQuery && matchFilter;
    });

    if (!factorSortKey || !factorSortDir) return filtered;

    const direction = factorSortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (sortValue(a) - sortValue(b)) * direction);
  }, [factorFilter, factorQuery, factorRows, factorSortDir, factorSortKey, starredFactors]);

  const toggleFactorStar = (id: string) => {
    setStarredFactors((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFactorSortChange = (key: string) => {
    if (key === "default") {
      setFactorSortKey(null);
      setFactorSortDir(null);
      return;
    }
    const nextKey = key as FactorSortKey;
    setFactorSortKey(nextKey);
    setFactorSortDir(getFactorDefaultSortDir(nextKey));
  };

  const translateDescription = (strategy: (typeof strategies)[number]) => {
    if (uiLang !== "zh") return strategy.description;
    switch (strategy.id) {
      case "STR-001":
        return "结合 RSI 交叉、成交量背离与资金费率信号的多因子动量策略，适用于 BTC 永续合约。";
      case "STR-002":
        return "从 TVL 资金流、LP 行为和 Gas 费模式中提取信号，覆盖主要 DeFi 协议。";
      case "STR-003":
        return "利用主流 CEX 平台间的价格偏差，结合价差分析与订单簿深度进行套利。";
      case "STR-004":
        return "基于动量、巨鲸跟踪与链上指标，在前 50 大山寨币之间进行系统化轮动。";
      case "STR-005":
        return "聚焦资金费率套利与基差交易的低风险策略，并通过受控敞口提升收益稳定性。";
      case "STR-006":
        return "通过识别并规避 MEV 攻击，同时捕捉具备抗 Sandwich 特征的机会来生成 Alpha。";
      default:
        return strategy.description;
    }
  };

  const filteredStrategies = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sortValue = (strategy: (typeof strategies)[number]) => {
      switch (sortKey) {
        case "roi":
          return parseMetricValue(strategy.annualReturn);
        case "winRate":
          return parseMetricValue(strategy.winRate);
        case "sharpe":
          return strategy.sharpe;
        case "maxDrawdown":
          return parseMetricValue(strategy.maxDrawdown);
        default:
          return 0;
      }
    };

    const filtered = strategies.filter((strategy) => {
      const matchQuery =
        !q ||
        strategy.name.toLowerCase().includes(q) ||
        strategy.id.toLowerCase().includes(q) ||
        strategy.description.toLowerCase().includes(q) ||
        strategy.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        strategy.author.toLowerCase().includes(q);
      const tier = getStrategyTier(strategy);
      const matchFilter = filter === "all" ? true : tier === filter;
      return matchQuery && matchFilter;
    });

    if (!sortKey || !sortDir) return filtered;

    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => (sortValue(a) - sortValue(b)) * direction);
  }, [filter, query, sortDir, sortKey]);

  const toggleStar = (id: string) => {
    setStarredStrategies((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSortChange = (key: string) => {
    if (key === "default") {
      setSortKey(null);
      setSortDir(null);
      return;
    }
    const nextKey = key as StrategySortKey;
    setSortKey(nextKey);
    setSortDir(getDefaultStrategySortDir(nextKey));
  };

  const openStrategyDetail = (strategy: (typeof strategies)[number]) => {
    setSelectedStrategy(strategy);
    setCurveRange("365D");
  };

  const detailModel = useMemo(() => {
    if (!selectedStrategy) return null;
    const roi = parseMetricValue(selectedStrategy.annualReturn);
    const drawdown = parseMetricValue(selectedStrategy.maxDrawdown);
    const winRate = parseMetricValue(selectedStrategy.winRate);
    const initialEquity = 438000;
    const totalReturn = (initialEquity * roi) / 100;
    const currentEquity = initialEquity + totalReturn;
    const realizedPnl = totalReturn * 0.995;
    const unrealizedPnl = totalReturn - realizedPnl;
    const calmar = selectedStrategy.sharpe > 0 ? selectedStrategy.sharpe * 1.89 : 0;
    const profitLossRatio = winRate > 0 ? (winRate / Math.max(100 - winRate, 1)) * 2.1 : 0;
    const totalFees = Math.abs(totalReturn) * 0.1268;
    const pointsByRange: Record<CurveRange, number> = { "7D": 18, "30D": 30, "90D": 45, "365D": 64 };
    const series = buildDetailSeries(pointsByRange[curveRange], 99100, roi * 2.1, Math.max(46, Math.abs(roi) * 3.2));
    const benchmark = buildDetailSeries(pointsByRange[curveRange], 98980, Math.max(12, roi * 0.45), 52);

    return {
      roi,
      drawdown,
      winRate,
      currentEquity,
      totalReturn,
      realizedPnl,
      unrealizedPnl,
      calmar,
      profitLossRatio,
      totalFees,
      equityPath: buildLinePath(series, 640, 210),
      benchmarkPath: buildLinePath(benchmark, 640, 210),
      fundRows: [
        [tr("Peak Equity", "最高权益"), `${(currentEquity * 1.11).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`],
        [tr("Min Equity", "最低权益"), `${Math.max(initialEquity * (1 - drawdown / 100), initialEquity * 0.5).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`],
        [tr("Realized PnL", "已实现盈亏"), `${fmtSigned(realizedPnl)} USDT`],
        [tr("Unrealized PnL", "未实现盈亏"), `${fmtSigned(unrealizedPnl)} USDT`],
      ],
      perfRows: [
        [tr("Sharpe Ratio", "夏普比率"), selectedStrategy.sharpe.toFixed(2)],
        [tr("Calmar Ratio", "Calmar比率"), calmar.toFixed(2)],
        [tr("Win Rate", "胜率"), `${winRate.toFixed(2)}%`],
        [tr("Profit/Loss Ratio", "盈亏比"), profitLossRatio.toFixed(2)],
      ],
      tradeRows: [
        [tr("Trading Days", "交易天数"), "1097"],
        [tr("Total Trades", "总交易次数"), "286"],
        [tr("Max Exposure", "最大敞口"), "99.73%"],
        [tr("Total Fees", "总手续费"), `${totalFees.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`],
      ],
      configRows: [
        [tr("Strategy ID", "策略 ID"), selectedStrategy.id],
        [tr("Created Date", "创建时间"), `${selectedStrategy.updatedAt} 00:00`],
        [tr("Strategy Type", "策略类型"), selectedStrategy.market === "Mixed" ? tr("Cross Section", "截面策略") : tr("Time Series", "时序策略")],
        [tr("Symbol", "交易对"), selectedStrategy.tags.includes("BTC") ? "BTCUSDT" : selectedStrategy.market === "DEX" ? "ETHUSDT, DeFi Basket" : "Top 50 Crypto"],
        [tr("Signal", "因子"), selectedStrategy.tags.join(", ")],
        [tr("Factor Weights", "因子权重"), tr("Equal Weight", "等权")],
        [tr("Stop Loss", "止损"), `${Math.max(3, Math.min(18, drawdown * 0.65)).toFixed(1)}%`],
        [tr("Cooldown", "冷却时间"), tr("6 hours", "6 小时")],
        [tr("Strategy Side", "策略方向"), selectedStrategy.market === "DEX" ? tr("Long-Only", "仅做多") : tr("Market-Neutral", "市场中性")],
        [tr("Top/Tail Rule", "头尾分层规则"), selectedStrategy.market === "Mixed" ? tr("Top/Tail 20%", "头部/尾部 20%") : tr("N/A", "未设置")],
      ],
    };
  }, [curveRange, selectedStrategy, tr]);

  return (
    <main className="game-landing" aria-label="Pixel lakeside game landing">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Noto+Sans+SC:wght@500;700&family=Zen+Maru+Gothic:wght@500;700&display=swap');

        .game-landing {
          --ink: #5a321d;
          --ink-dark: #2f1a12;
          --ac-primary: #19c8b9;
          --ac-primary-bg: #e6f9f6;
          --ac-text: #794f27;
          --ac-text-body: #725d42;
          --ac-border: #c4b89e;
          --ac-border-hover: #a89878;
          --ac-cream: rgb(247, 243, 223);
          --ac-cream-light: #f8f8f0;
          --ac-shadow: #bdaea0;
          --ac-shadow-input: #d4c9b4;
          --ac-focus-yellow: #ffcc00;
          --radius-xs: 4px;
          --radius-sm: 6px;
          --radius-md: 8px;
          --radius-lg: 10px;
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          background: #55baf3;
          font-family: Nunito, "Noto Sans SC", "Zen Maru Gothic", -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
          image-rendering: pixelated;
          isolation: isolate;
        }

        .game-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
          image-rendering: auto;
          user-select: none;
          pointer-events: none;
        }

        .game-landing::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(43, 144, 222, .08), transparent 18%, transparent 76%, rgba(43, 144, 222, .08)),
            radial-gradient(circle at 50% 12%, rgba(255, 255, 255, .12), transparent 28%);
          pointer-events: none;
          z-index: 1;
        }

        .ui-left {
          position: absolute;
          left: clamp(18px, 2.55vw, 52px);
          top: clamp(34px, 4vh, 58px);
          display: grid;
          gap: clamp(18px, 1.55vw, 28px);
          z-index: 5;
        }

        .menu-tile {
          appearance: none;
          padding: 0;
          margin: 0;
          background: transparent;
          border: 0;
          color: inherit;
          font: inherit;
          text-decoration: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          width: clamp(82px, 5.75vw, 120px);
          transition: transform .22s cubic-bezier(.23,1,.32,1);
          position: relative; /* establish stacking context for label */
        }

        .menu-tile__icon {
          position: relative;
          z-index: 1;
        }

        .menu-tile:hover {
          transform: translateY(-3px);
        }

        .menu-tile:active {
          transform: translateY(1px);
        }

        .menu-tile:focus-visible {
          outline: 2px solid var(--ac-focus-yellow);
          outline-offset: 4px;
          border-radius: 8px;
        }

        .menu-tile__icon {
          width: 100%;
          aspect-ratio: 1;
          object-fit: contain;
          image-rendering: auto;
          filter: drop-shadow(0 4px 0 rgba(62, 48, 37, .28))
                  drop-shadow(0 8px 14px rgba(62, 48, 37, .18));
          pointer-events: none;
          user-select: none;
          transition: filter .22s ease;
        }

        .menu-tile:hover .menu-tile__icon {
          filter: drop-shadow(0 6px 0 rgba(62, 48, 37, .32))
                  drop-shadow(0 10px 18px rgba(62, 48, 37, .22))
                  drop-shadow(0 0 8px rgba(255, 220, 130, .55));
        }

        .menu-tile__name {
          /* Match Figma: pixel Chinese label overlaps icon's lower body, sits on TOP layer */
          font-family: 'Zpix', 'Press Start 2P', 'Courier New', monospace;
          font-size: clamp(20px, 1.6vw, 28px);
          line-height: 1;
          letter-spacing: .06em;
          color: #ffffff;
          background: transparent;
          border: 0;
          padding: 0;
          box-shadow: none;
          text-shadow:
            -2px 0 0 #1a0d05, 2px 0 0 #1a0d05,
            0 -2px 0 #1a0d05, 0 2px 0 #1a0d05,
            -2px -2px 0 #1a0d05, 2px -2px 0 #1a0d05,
            -2px 2px 0 #1a0d05, 2px 2px 0 #1a0d05,
            0 4px 0 rgba(0, 0, 0, .35);
          white-space: nowrap;
          margin-top: -26px; /* overlap with icon's lower band, per Figma */
          z-index: 2;        /* keep label above the icon image */
          position: relative;
          pointer-events: none;
          -webkit-font-smoothing: none;
          font-smooth: never;
          image-rendering: pixelated;
        }

        .pixel-button {
          appearance: none;
          width: clamp(82px, 5.75vw, 120px);
          aspect-ratio: 1;
          position: relative;
          display: grid;
          place-items: center;
          background:
            radial-gradient(circle at 28% 23%, rgba(255,255,255,.72) 0 10%, transparent 11%),
            linear-gradient(180deg, #fffdf4 0%, var(--ac-cream) 100%);
          border: 2.5px solid var(--ac-border);
          border-radius: var(--radius-md);
          padding: 0;
          box-shadow:
            0 5px 0 0 var(--ac-shadow),
            0 8px 18px rgba(61, 52, 40, .12);
          cursor: pointer;
          font: inherit;
          transition: all .25s cubic-bezier(.4, 0, .2, 1);
        }

        .pixel-button:hover {
          transform: translateY(-1px);
          border-color: var(--ac-border-hover);
          box-shadow:
            0 6px 0 0 var(--ac-shadow),
            0 10px 22px rgba(61, 52, 40, .15);
        }

        .pixel-button:active {
          transform: translateY(2px);
          box-shadow:
            0 1px 0 0 var(--ac-shadow),
            0 4px 12px rgba(61, 52, 40, .12);
        }

        .pixel-button:focus-visible,
        .shop:focus-visible {
          outline: 2px solid var(--ac-focus-yellow);
          outline-offset: 3px;
        }

        .pixel-button::after {
          content: "";
          position: absolute;
          inset: 9px;
          border: 2px solid rgba(196, 184, 158, .55);
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, .13);
        }

        .pixel-button--image::after {
          content: none;
        }

        .ui-left .pixel-button--image {
          box-shadow: none;
        }

        .ui-left .pixel-button--image:hover,
        .ui-left .pixel-button--image:active {
          box-shadow: none;
        }

        .icon-bag,
        .icon-trophy,
        .icon-case {
          position: relative;
          z-index: 1;
          width: 56%;
          height: 48%;
        }

        .menu-icon-img {
          position: relative;
          z-index: 2;
          width: 86%;
          height: 86%;
          display: block;
          object-fit: contain;
          image-rendering: auto;
          filter: drop-shadow(0 3px 0 rgba(62, 48, 37, .22));
          pointer-events: none;
          user-select: none;
        }

        .icon-bag {
          width: 61%;
          height: 58%;
          margin-top: 6%;
          background:
            radial-gradient(circle at 49% 43%, #f3c16f 0 4%, transparent 5%),
            linear-gradient(90deg, transparent 0 13%, #6e3f28 14% 23%, transparent 24% 76%, #6e3f28 77% 86%, transparent 87%),
            linear-gradient(180deg, #d99046 0 24%, #af6534 25% 100%);
          border: 5px solid var(--ink-dark);
          border-radius: var(--radius-md);
          box-shadow:
            inset 8px 0 0 rgba(255, 201, 105, .34),
            inset -8px 0 0 rgba(86, 41, 24, .22),
            0 5px 0 rgba(80, 44, 27, .22);
        }

        .icon-bag::before {
          content: "";
          position: absolute;
          left: 22%;
          top: -23%;
          width: 56%;
          height: 38%;
          border: 5px solid var(--ink-dark);
          border-bottom: 0;
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          background: #bf763c;
          box-shadow:
            inset 0 6px 0 rgba(255, 211, 125, .32),
            0 19px 0 -6px #6d3a22;
        }

        .icon-bag::after {
          content: "";
          position: absolute;
          left: 18%;
          right: 18%;
          bottom: 11%;
          height: 36%;
          background:
            radial-gradient(circle at 50% 36%, #f0bb5e 0 6%, transparent 7%),
            linear-gradient(180deg, #c9793d 0 38%, #9d552f 39% 100%);
          border: 5px solid var(--ink-dark);
          border-radius: var(--radius-md) var(--radius-md) var(--radius-sm) var(--radius-sm);
          box-shadow:
            inset 6px 0 0 rgba(255, 198, 99, .24),
            inset -5px 0 0 rgba(82, 38, 23, .22);
        }

        .icon-trophy {
          width: 64%;
          height: 62%;
          margin-top: 4%;
        }

        .icon-trophy::before {
          content: "";
          position: absolute;
          left: 25%;
          top: 1%;
          width: 50%;
          height: 48%;
          background:
            linear-gradient(90deg, rgba(255, 244, 160, .6) 0 18%, transparent 19% 100%),
            linear-gradient(90deg, #d8891d 0%, #ffd962 44%, #f4a329 65%, #a95a18 100%);
          border: 5px solid var(--ink-dark);
          border-radius: var(--radius-xs) var(--radius-xs) var(--radius-sm) var(--radius-sm);
          box-shadow:
            inset 0 7px 0 rgba(255, 242, 139, .7),
            inset -7px 0 0 rgba(126, 60, 18, .25);
        }

        .icon-trophy::after {
          content: "";
          position: absolute;
          left: 20%;
          bottom: 0;
          width: 60%;
          height: 18%;
          background: linear-gradient(90deg, #a85b1d, #f0aa35 42%, #8c4619);
          border: 5px solid var(--ink-dark);
          border-radius: 4px;
          box-shadow:
            0 -13px 0 -2px #ce7920,
            0 -13px 0 2px var(--ink-dark),
            22px -36px 0 -12px #f7c348,
            24px -36px 0 -7px var(--ink-dark),
            -22px -36px 0 -12px #f7c348,
            -24px -36px 0 -7px var(--ink-dark);
        }

        .icon-trophy .cup-stem {
          position: absolute;
          left: 42%;
          bottom: 18%;
          width: 16%;
          height: 25%;
          background: linear-gradient(90deg, #a65a1c, #f0a735 55%, #8b4418);
          border-left: 5px solid var(--ink-dark);
          border-right: 5px solid var(--ink-dark);
          z-index: 1;
        }

        .icon-trophy .cup-handles {
          position: absolute;
          left: 4%;
          right: 4%;
          top: 14%;
          height: 32%;
          border-left: 5px solid var(--ink-dark);
          border-right: 5px solid var(--ink-dark);
          border-radius: var(--radius-sm);
        }

        .icon-case {
          width: 64%;
          height: 51%;
          margin-top: 12%;
          background:
            linear-gradient(180deg, #c77737 0 33%, #8e4628 34% 100%);
          border: 5px solid var(--ink-dark);
          border-radius: var(--radius-sm);
          box-shadow:
            inset 8px 0 0 rgba(255, 198, 99, .22),
            inset -8px 0 0 rgba(73, 33, 21, .24),
            0 5px 0 rgba(76, 42, 29, .22);
        }

        .icon-case::before {
          content: "";
          position: absolute;
          left: 28%;
          top: -27%;
          width: 44%;
          height: 34%;
          border: 5px solid var(--ink-dark);
          border-bottom: 0;
          border-radius: var(--radius-sm) var(--radius-sm) 0 0;
          background: #d89443;
          box-shadow:
            0 21px 0 -7px #f0be5a,
            0 21px 0 -2px var(--ink-dark);
        }

        .icon-case::after {
          content: "";
          position: absolute;
          right: -17%;
          bottom: -17%;
          width: 40%;
          aspect-ratio: 1;
          background:
            radial-gradient(circle at 36% 32%, rgba(255, 242, 159, .9) 0 16%, transparent 17%),
            radial-gradient(circle at 50% 50%, #ffd761 0 43%, #d58a22 44% 100%);
          border: 5px solid var(--ink-dark);
          border-radius: 50%;
          box-shadow:
            inset -4px -5px 0 rgba(130, 65, 18, .24),
            0 3px 0 rgba(76, 42, 29, .22);
        }

        .icon-case .case-flap {
          position: absolute;
          left: 14%;
          right: 14%;
          top: 9%;
          height: 34%;
          background: #9b532d;
          border: 4px solid var(--ink-dark);
          border-top: 0;
          border-radius: 0 0 var(--radius-sm) var(--radius-sm);
        }

        .icon-case .case-lock {
          position: absolute;
          left: 43%;
          top: 23%;
          width: 14%;
          aspect-ratio: 1;
          background: #ffd15a;
          border: 4px solid var(--ink-dark);
          border-radius: 50%;
          z-index: 2;
        }

        .shop {
          position: absolute;
          right: clamp(28px, 2.8vw, 58px);
          top: clamp(34px, 4vh, 58px);
          width: clamp(98px, 7.35vw, 152px);
          height: clamp(91px, 7.05vw, 145px);
          z-index: 5;
          filter: drop-shadow(0 5px 0 var(--ac-shadow)) drop-shadow(0 8px 18px rgba(61, 52, 40, .12));
          transition: all .25s cubic-bezier(.4, 0, .2, 1);
        }

        .shop:hover {
          transform: translateY(-1px);
          filter: drop-shadow(0 6px 0 var(--ac-shadow)) drop-shadow(0 10px 22px rgba(61, 52, 40, .15));
        }

        .shop:active {
          transform: translateY(2px);
          filter: drop-shadow(0 1px 0 var(--ac-shadow)) drop-shadow(0 4px 12px rgba(61, 52, 40, .12));
        }

        .shop .awning {
          position: absolute;
          left: 2%;
          right: 2%;
          top: 0;
          height: 34%;
          background:
            linear-gradient(180deg, rgba(255,255,255,.35), transparent 42%),
            repeating-linear-gradient(90deg, #2e7ec2 0 17%, #ecf7ff 17% 32%, #438fd0 32% 49%);
          border: 3px solid var(--ac-text);
          border-radius: var(--radius-md) var(--radius-md) var(--radius-xs) var(--radius-xs);
          box-shadow:
            inset 0 -7px 0 rgba(65, 39, 27, .2),
            0 4px 0 rgba(70, 38, 25, .22);
          z-index: 2;
        }

        .shop .base {
          position: absolute;
          left: 13%;
          right: 13%;
          bottom: 0;
          height: 73%;
          background:
            radial-gradient(circle at 18% 65%, rgba(151, 98, 54, .22) 0 4%, transparent 5%),
            radial-gradient(circle at 78% 56%, rgba(151, 98, 54, .18) 0 4%, transparent 5%),
            linear-gradient(90deg, #e8cf9b 0 23%, #f7dfae 24% 73%, #d5b986 74% 100%);
          border: 3px solid var(--ac-text);
          border-radius: var(--radius-xs) var(--radius-xs) var(--radius-sm) var(--radius-sm);
          box-shadow: inset 0 32px 0 #a84e20;
        }

        .shop .label {
          position: absolute;
          left: 18%;
          right: 18%;
          top: 35%;
          height: 31%;
          display: grid;
          place-items: center;
          color: #ffe184;
          font-weight: 950;
          font-size: clamp(23px, 2vw, 43px);
          line-height: 1;
          letter-spacing: .03em;
          text-shadow:
            3px 0 var(--ac-text),
            0 3px var(--ac-text),
            -3px 0 var(--ac-text),
            0 -3px var(--ac-text),
            4px 4px 0 rgba(44, 20, 13, .24);
          z-index: 3;
        }

        .shop .door {
          position: absolute;
          width: 23%;
          height: 27%;
          left: 38.5%;
          bottom: 2%;
          background:
            linear-gradient(90deg, rgba(255, 187, 78, .2), transparent 45%),
            #b55f24;
          border: 3px solid var(--ac-text);
          border-radius: 8px 8px 0 0;
          z-index: 3;
        }

        .shop .door::after {
          content: "";
          position: absolute;
          right: 18%;
          top: 44%;
          width: 5px;
          height: 5px;
          background: #ffd15a;
          border-radius: 50%;
          box-shadow: 0 0 0 2px #63301a;
        }

        .shop .stone {
          position: absolute;
          left: 18%;
          right: 18%;
          bottom: 10%;
          height: 27%;
          background:
            linear-gradient(90deg, transparent 0 20%, rgba(113, 74, 43, .2) 21% 25%, transparent 26% 52%, rgba(113, 74, 43, .18) 53% 58%, transparent 59%),
            linear-gradient(0deg, transparent 0 44%, rgba(113, 74, 43, .18) 45% 50%, transparent 51%);
          z-index: 2;
        }

        .shop-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: grid;
          place-items: center;
          padding: clamp(18px, 3vw, 44px);
          background: rgba(52, 119, 166, .34);
          backdrop-filter: blur(5px);
        }

        .shop-modal {
          width: min(1120px, 94vw);
          max-height: min(820px, 88svh);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: var(--ac-text);
          background:
            radial-gradient(circle at 10% 4%, rgba(255,255,255,.75) 0 8%, transparent 9%),
            linear-gradient(180deg, #fffdf4 0%, var(--ac-cream) 100%);
          border: 3px solid var(--ac-border);
          border-radius: var(--radius-lg);
          box-shadow:
            0 7px 0 var(--ac-shadow),
            0 22px 60px rgba(66, 48, 31, .22);
        }

        .shop-modal__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: clamp(18px, 2.2vw, 28px) clamp(18px, 2.6vw, 34px) 16px;
          border-bottom: 2px dashed rgba(196, 184, 158, .65);
        }

        .shop-modal__title {
          margin: 0;
          font-size: clamp(28px, 3vw, 42px);
          line-height: 1;
          font-weight: 900;
          letter-spacing: .02em;
          color: var(--ac-text);
        }

        .shop-modal__subtitle {
          margin: 8px 0 0;
          color: var(--ac-text-body);
          font-size: 13px;
          font-weight: 700;
        }

        .shop-modal__close {
          width: 44px;
          height: 44px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 2px solid var(--ac-border);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 0 var(--ac-shadow-input);
          transition: all .2s ease;
        }

        .shop-modal__close:hover {
          transform: translateY(-1px);
          border-color: var(--ac-border-hover);
        }

        .shop-modal__toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px clamp(18px, 2.6vw, 34px);
        }

        .shop-search {
          position: relative;
          width: min(320px, 100%);
        }

        .shop-search svg {
          position: absolute;
          left: 13px;
          top: 50%;
          width: 16px;
          height: 16px;
          transform: translateY(-50%);
          color: var(--ac-text-body);
        }

        .shop-input,
        .shop-select {
          height: 40px;
          color: var(--ac-text);
          background: rgba(248, 248, 240, .72);
          border: 2px solid transparent;
          border-radius: var(--radius-md);
          box-shadow: none;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          outline: none;
        }

        .shop-input {
          width: 100%;
          padding: 0 14px 0 38px;
        }

        .shop-select {
          padding: 0 12px;
        }

        .shop-input:focus,
        .shop-select:focus,
        .shop-chip:focus-visible,
        .shop-card__icon-btn:focus-visible,
        .shop-card__action:focus-visible {
          border-color: var(--ac-primary);
          outline: 2px solid rgba(25, 200, 185, .28);
          outline-offset: 2px;
        }

        .shop-controls {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }

        .shop-select-aisland {
          width: 132px;
          height: 40px;
        }

        .shop-select-aisland--sort {
          width: 162px;
        }

        .shop-select-aisland [class*="animal-wrapper-"] {
          width: 100%;
          min-width: 0;
          height: 100%;
        }

        .shop-select-aisland [class*="animal-trigger-"] {
          height: 40px;
          padding: 0 14px 0 18px;
          color: var(--ac-text);
          background: rgba(248, 248, 240, .72);
          border: 2px solid transparent;
          border-radius: var(--radius-md);
          box-shadow: none;
        }

        .shop-select-aisland [class*="animal-trigger-"]:hover {
          border-color: transparent;
          background: #fffdf4;
        }

        .shop-select-aisland [class*="animal-value-"],
        .shop-select-aisland [class*="animal-placeholder-"] {
          color: var(--ac-text);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
        }

        .shop-select-aisland [class*="animal-dropdown-"] {
          /* animal-island-ui defaults its dropdown to a right-side popout (inline inset 50%/auto/auto/100%
             with transform translateY(-50%) and margin-left 6px), which positions the panel to the right
             of the trigger and vertically-centered. Override every dimension so the panel drops straight
             down beneath the trigger. */
          inset: 100% auto auto 0 !important;
          left: 0 !important;
          right: auto !important;
          top: calc(100% + 6px) !important;
          bottom: auto !important;
          margin: 0 !important;
          transform: none !important;
          min-width: 100% !important;
          background: #fff3d3;
          border: 2px solid var(--ac-border);
          border-radius: var(--radius-md);
          box-shadow: 0 6px 0 var(--ac-shadow-input), 0 12px 26px rgba(61, 52, 40, .14);
        }

        .shop-select-aisland [class*="animal-option-"] {
          color: var(--ac-text);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
        }

        .game-landing .shop-modal .shop-select-aisland [class*="animal-option-"]::before,
        .game-landing .shop-modal .shop-select-aisland [class*="animal-hovered-"]::before {
          content: none !important;
          display: none !important;
          background: none !important;
          width: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
          animation: none !important;
        }

        .shop-chip {
          height: 40px;
          padding: 0 14px;
          color: var(--ac-text);
          background: rgba(255, 249, 232, .72);
          border: 2px solid transparent;
          border-radius: var(--radius-md);
          box-shadow: none;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
        }

        .shop-chip:hover {
          border-color: transparent;
          background: #fffdf4;
        }

        .shop-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          overflow: auto;
          padding: 0 clamp(18px, 2.6vw, 34px) clamp(18px, 2.6vw, 34px);
        }

        .shop-card {
          min-width: 0;
          display: flex;
          flex-direction: column;
          background: rgba(255, 255, 248, .86);
          border: 2px solid transparent;
          border-radius: var(--radius-md);
          box-shadow: none;
          cursor: pointer;
          overflow: hidden;
          transition: transform .18s ease, background .18s ease;
        }

        .shop-card:hover,
        .shop-card:focus-visible {
          background: rgba(255, 255, 248, .96);
          transform: translateY(-1px);
        }

        .shop-card:focus-visible {
          outline: 2px solid rgba(25, 200, 185, .35);
          outline-offset: 3px;
        }

        .shop-card__body {
          padding: 15px;
        }

        .shop-card__title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }

        .shop-card__title {
          margin: 0;
          color: var(--ac-text);
          font-size: 17px;
          line-height: 1.25;
          font-weight: 900;
        }

        .shop-card__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 9px;
        }

        .shop-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          min-height: 25px;
          padding: 4px 9px;
          color: var(--ac-text-body);
          background: #fff3d3;
          border: 1.5px solid rgba(196, 184, 158, .72);
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 900;
        }

        .shop-badge--primary {
          color: #08766e;
          background: var(--ac-primary-bg);
          border-color: rgba(25, 200, 185, .35);
        }

        .shop-card__desc {
          display: -webkit-box;
          min-height: 42px;
          margin: 12px 0 0;
          overflow: hidden;
          color: var(--ac-text-body);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.75;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .shop-curve {
          height: 62px;
          margin-top: 12px;
          padding-top: 9px;
          border-top: 2px dashed rgba(196, 184, 158, .55);
        }

        .shop-curve__label {
          margin-bottom: 4px;
          color: rgba(114, 93, 66, .72);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .shop-curve svg {
          width: 100%;
          height: 40px;
          overflow: visible;
        }

        .shop-metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .shop-metric {
          min-width: 0;
        }

        .shop-metric__label {
          color: rgba(114, 93, 66, .72);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .shop-metric__value {
          margin-top: 3px;
          color: var(--ac-text);
          font-size: 14px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }

        .shop-metric__value--up {
          color: #0b9f73;
        }

        .shop-metric__value--down {
          color: #d85d48;
        }

        .shop-card__actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: auto;
          padding: 13px 15px 15px;
          border-top: 2px dashed rgba(196, 184, 158, .55);
        }

        .shop-card__icon-btn,
        .shop-card__action {
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 2px solid var(--ac-border);
          border-radius: var(--radius-md);
          box-shadow: 0 3px 0 var(--ac-shadow-input);
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
          transition: all .18s ease;
        }

        .shop-card__icon-btn {
          width: 36px;
          padding: 0;
          color: #c78320;
        }

        .shop-card__icon-btn.is-starred {
          color: #a86b12;
          background: #ffe6a9;
          border-color: #e5b243;
        }

        .shop-card__action {
          gap: 6px;
          padding: 0 13px;
        }

        .shop-card__action--primary {
          color: #075b55;
          background: var(--ac-primary-bg);
          border-color: rgba(25, 200, 185, .46);
        }

        .shop-card__icon-btn:hover,
        .shop-card__action:hover {
          transform: translateY(-1px);
          border-color: var(--ac-border-hover);
        }

        .shop-empty {
          grid-column: 1 / -1;
          padding: 44px 20px;
          color: var(--ac-text-body);
          background: rgba(255, 255, 248, .82);
          border: 2px dashed var(--ac-border);
          border-radius: var(--radius-md);
          text-align: center;
          font-weight: 900;
        }

        .inventory-modal {
          --inventory-pixel-edge: color-mix(in srgb, var(--ac-border) 82%, var(--ac-text));
          --inventory-pixel-shadow: color-mix(in srgb, var(--ac-shadow) 76%, var(--ac-text));
          width: min(1180px, 95vw);
          background: linear-gradient(180deg, #fffdf4 0%, var(--ac-cream) 100%);
          border: 2px solid var(--inventory-pixel-edge);
          border-radius: var(--radius-xs);
          box-shadow:
            0 0 0 2px rgba(255, 253, 244, .88),
            5px 5px 0 rgba(189, 174, 160, .72),
            0 20px 48px rgba(66, 48, 31, .18);
          image-rendering: pixelated;
        }

        .inventory-modal .shop-modal__header {
          align-items: center;
          background: rgba(255, 249, 232, .88);
          border-bottom: 2px solid rgba(196, 184, 158, .62);
        }

        .inventory-modal .shop-modal__title {
          color: var(--ac-text);
          text-shadow: 2px 2px 0 rgba(196, 184, 158, .46);
        }

        .inventory-modal .shop-modal__toolbar {
          background: rgba(255, 249, 232, .58);
          border-bottom: 0;
        }

        .inventory-modal .shop-modal__close,
        .inventory-modal .shop-input,
        .inventory-modal .shop-chip,
        .inventory-modal .shop-select-aisland [class*="animal-trigger-"] {
          background: var(--ac-cream-light);
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: var(--radius-xs);
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
        }

        .inventory-modal .shop-modal__close:hover,
        .inventory-modal .shop-chip:hover,
        .inventory-modal .shop-select-aisland [class*="animal-trigger-"]:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 rgba(189, 174, 160, .58);
        }

        .inventory-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          padding: 14px clamp(18px, 2.6vw, 34px) 0;
        }

        .inventory-stat {
          min-width: 0;
          padding: 13px 14px;
          background: rgba(255,255,248,.72);
          border: 2px solid transparent;
          border-radius: var(--radius-md);
        }

        .inventory-stat__label {
          color: rgba(114, 93, 66, .72);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .1em;
          text-transform: uppercase;
        }

        .inventory-stat__value {
          margin-top: 5px;
          color: var(--ac-text);
          font-size: 22px;
          font-weight: 950;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }

        .inventory-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(245px, 1fr));
          align-items: start;
          gap: 14px;
          overflow: auto;
          padding: 16px clamp(18px, 2.6vw, 34px) clamp(18px, 2.6vw, 34px);
          background: transparent;
        }

        /* ========================================================== */
        /* INVENTORY CARD — Figma nodes 299-1168 / 304-2406 / 304-2573 */
        /*  /304-2761 / 304-2944.  Each tier defines its own palette.   */
        /* ========================================================== */
        /* =========== Inventory card (Figma 299-1168/304-2406/2573/2761/2944) =========== */
        .inventory-card {
          --tier-bg: #fdf8ec;
          --tier-bg-inner: #ffffff;
          --tier-edge: #f4d36c;
          --tier-edge-soft: #fbe7a8;
          --tier-accent: #f5c84a;
          --tier-accent-deep: #c98a14;
          --tier-ray: rgba(244, 196, 75, .28);
          --tier-star: #fbcf3a;
          --tier-cta-text: #1a1a1a;

          position: relative;
          min-width: 0;
          align-self: start;
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding: 16px 18px 18px;
          background: var(--tier-bg);
          border: 1.5px solid var(--tier-edge);
          border-radius: 20px;
          box-shadow: 0 6px 18px rgba(20, 20, 20, .08);
          color: #1a1a1a;
          overflow: visible;
          transition: transform .25s cubic-bezier(.23,1,.32,1), box-shadow .25s ease;
        }
        .inventory-card::before,
        .inventory-card::after { content: none; }
        .inventory-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 28px rgba(20, 20, 20, .14);
        }

        /* ---- Header: NO. on the left, medal floats top-right ---- */
        .inv-head {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          min-height: 44px;
          padding: 4px 4px 0 4px;
        }
        .inv-no {
          font-family: "Inter", "PingFang SC", "Helvetica Neue", system-ui, sans-serif;
          font-weight: 800;
          font-size: clamp(26px, 2.2vw, 36px);
          color: #1a1a1a;
          letter-spacing: .01em;
          line-height: 1;
        }

        /* ---- Medal: 12-petal flower with red ribbon, floats top-right ---- */
        .inv-medal {
          position: absolute;
          top: -10px;
          right: -6px;
          width: 96px;
          height: 120px;
          z-index: 3;
          pointer-events: none;
        }
        .inv-medal__ribbon {
          fill: #e23b3b;
          stroke: #a01818;
          stroke-width: 1.3;
          stroke-linejoin: round;
        }
        .inv-medal__gear {
          fill: var(--tier-accent);
          stroke: var(--tier-accent-deep);
          stroke-width: 1.6;
          stroke-linejoin: round;
          filter: drop-shadow(0 2px 0 rgba(0,0,0,.10));
        }
        .inv-medal__disc {
          fill: #ffffff;
          stroke: var(--tier-accent-deep);
          stroke-width: 1.6;
        }
        .inv-medal__letter {
          font-family: "Inter", "Helvetica Neue", system-ui, sans-serif;
          font-weight: 900;
          font-size: 22px;
          fill: var(--tier-accent-deep);
          letter-spacing: 0;
        }

        /* ---- Art panel: white rounded box, subtle radial rays + stars + name tag ---- */
        .inv-art {
          position: relative;
          display: grid;
          place-items: center;
          height: clamp(190px, 18vw, 230px);
          margin: 0;
          background: #ffffff;
          border: 1px solid var(--tier-edge-soft);
          border-radius: 14px;
          overflow: hidden;
        }
        .inv-art::before,
        .inv-art::after { content: none; }
        .inv-art__rays {
          position: absolute;
          inset: 0;
          background:
            repeating-conic-gradient(
              from 0deg at 50% 62%,
              var(--tier-ray) 0deg 5deg,
              transparent 5deg 20deg
            );
          opacity: .85;
          pointer-events: none;
        }
        .inv-art__star {
          position: absolute;
          background: var(--tier-star);
          clip-path: polygon(
            50% 0%, 60% 35%, 98% 35%, 68% 57%,
            80% 95%, 50% 73%, 20% 95%, 32% 57%,
            2% 35%, 40% 35%
          );
          opacity: .9;
          pointer-events: none;
        }
        .inv-art__star--1 { top: 14%; left: 12%; width: 13px; height: 13px; }
        .inv-art__star--2 { top: 8%;  left: 50%; width: 10px; height: 10px; }
        .inv-art__star--3 { top: 36%; right: 8%; width: 12px; height: 12px; }
        .inv-art__star--4 { bottom: 30%; left: 6%; width: 10px; height: 10px; }
        .inv-art__star--5 { bottom: 14%; left: 36%; width: 8px;  height: 8px; }
        .inv-art__star--6 { bottom: 22%; right: 16%; width: 14px; height: 14px; }
        .inv-art__img {
          position: relative;
          z-index: 1;
          width: min(74%, 220px);
          height: 72%;
          object-fit: contain;
          image-rendering: pixelated;
          transition: transform .25s cubic-bezier(.23,1,.32,1);
        }
        .inventory-card:hover .inv-art__img {
          transform: translateY(-3px) scale(1.04);
        }
        .inv-art__tag {
          position: absolute;
          right: 10px;
          bottom: 10px;
          z-index: 2;
          padding: 4px 10px;
          background: #fff5d4;
          border: 1px solid #d8a649;
          border-radius: 7px;
          color: #6b4413;
          font-family: "Inter", "PingFang SC", system-ui, sans-serif;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: .04em;
          box-shadow: 0 1px 0 rgba(0,0,0,.06);
        }

        /* ---- Stats row: plain text on card body (no capsule) ---- */
        .inv-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 24px;
          padding: 8px 8px 6px;
          background: transparent;
          border-radius: 0;
          box-shadow: none;
          min-height: 70px;
        }
        .inv-stat {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          min-width: 0;
          line-height: 1;
        }
        .inv-stat__label {
          font-family: "Inter", "PingFang SC", system-ui, sans-serif;
          font-weight: 500;
          font-size: 14px;
          color: #8a8a8a;
          letter-spacing: .02em;
          line-height: 1.2;
        }
        .inv-stat__value {
          font-family: "Inter", "Helvetica Neue", system-ui, sans-serif;
          font-weight: 800;
          font-size: clamp(22px, 2vw, 30px);
          color: #1a1a1a;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .inv-stat__value--pos { color: #e23b3b; }  /* Chinese convention: positive = red */
        .inv-stat__value--neg { color: #1f8a5a; }

        /* ---- Action row: 2 ghost squares + 1 colored CTA ---- */
        .inv-actions {
          display: grid;
          grid-template-columns: 56px 56px 1fr;
          gap: 10px;
          padding: 0 6px;
          margin-top: 4px;
        }
        .inv-btn {
          appearance: none;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          font: inherit;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
          border-radius: 12px;
          transition: transform .14s cubic-bezier(.23,1,.32,1), box-shadow .14s ease, background-color .14s ease;
        }
        .inv-btn:active { transform: translateY(1px) scale(.98); }
        .inv-btn--ghost {
          background: #ffffff;
          color: #1a1a1a;
          border: 1.5px solid var(--tier-edge);
          box-shadow: 0 1px 0 rgba(0, 0, 0, .04);
        }
        .inv-btn--ghost:hover { transform: translateY(-1px); }
        .inv-btn--star.is-on { background: #fff7df; color: #b8862e; }
        .inv-btn--cta {
          background: var(--tier-accent);
          color: var(--tier-cta-text);
          border: 1.5px solid var(--tier-accent-deep);
          font-family: "Inter", "PingFang SC", system-ui, sans-serif;
          font-size: clamp(17px, 1.3vw, 21px);
          font-weight: 900;
          letter-spacing: .06em;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, .35),
            0 2px 0 var(--tier-accent-deep);
        }
        .inv-btn--cta:hover { transform: translateY(-2px); }
        .inv-btn--cta:active {
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .35), 0 1px 0 var(--tier-accent-deep);
        }

        /* =========== Tier palettes (precise Figma colors) =========== */
        /* S — soft lavender */
        .inventory-card--S {
          --tier-bg: #f4ecff;
          --tier-edge: #b59be8;
          --tier-edge-soft: #d8c7f3;
          --tier-accent: #b59be8;
          --tier-accent-deep: #6b4eb3;
          --tier-ray: rgba(149, 116, 220, .28);
          --tier-star: #8d6dd6;
          --tier-cta-text: #ffffff;
        }
        /* A — cream yellow (default-like) */
        .inventory-card--A {
          --tier-bg: #fdf8ec;
          --tier-edge: #f4d36c;
          --tier-edge-soft: #fbe7a8;
          --tier-accent: #f5c84a;
          --tier-accent-deep: #b07a10;
          --tier-ray: rgba(244, 196, 75, .28);
          --tier-star: #fbcf3a;
          --tier-cta-text: #1a1a1a;
        }
        /* B — soft blue */
        .inventory-card--B {
          --tier-bg: #e9f2ff;
          --tier-edge: #6f9fe2;
          --tier-edge-soft: #c4daf5;
          --tier-accent: #4f86d6;
          --tier-accent-deep: #2b558f;
          --tier-ray: rgba(91, 142, 216, .25);
          --tier-star: #4d8acc;
          --tier-cta-text: #ffffff;
        }
        /* C — fresh green */
        .inventory-card--C {
          --tier-bg: #ebf6dd;
          --tier-edge: #91c860;
          --tier-edge-soft: #cce9a8;
          --tier-accent: #7bc24e;
          --tier-accent-deep: #487a26;
          --tier-ray: rgba(130, 194, 90, .25);
          --tier-star: #6db142;
          --tier-cta-text: #ffffff;
        }
        /* D — muted gray */
        .inventory-card--D {
          --tier-bg: #efeeec;
          --tier-edge: #b8b4ad;
          --tier-edge-soft: #d8d5d0;
          --tier-accent: #a8a39c;
          --tier-accent-deep: #5c5852;
          --tier-ray: rgba(168, 163, 156, .22);
          --tier-star: #9a948c;
          --tier-cta-text: #ffffff;
        }
        /* F — deeper grayscale (failed) */
        .inventory-card--F {
          --tier-bg: #e8e7e4;
          --tier-edge: #9a958d;
          --tier-edge-soft: #c4c0b8;
          --tier-accent: #8a857d;
          --tier-accent-deep: #4a463f;
          --tier-ray: rgba(138, 133, 125, .22);
          --tier-star: #7d7770;
          --tier-cta-text: #ffffff;
        }
        .inventory-card--F .inv-art__img { filter: grayscale(.5); }

        @keyframes cardLegendaryGlow {
          0%, 100% {
            box-shadow:
              inset 0 0 0 2px #fff5cf,
              inset 0 0 0 4px #b56a0a,
              inset 0 26px 0 -18px rgba(255, 255, 255, .7),
              0 8px 0 rgba(150, 86, 14, .55),
              0 14px 28px rgba(241, 165, 28, .45),
              0 0 0 1px rgba(255, 220, 120, .55),
              0 0 22px rgba(255, 195, 80, .45);
          }
          50% {
            box-shadow:
              inset 0 0 0 2px #fff5cf,
              inset 0 0 0 4px #b56a0a,
              inset 0 26px 0 -18px rgba(255, 255, 255, .85),
              0 8px 0 rgba(150, 86, 14, .55),
              0 16px 32px rgba(241, 165, 28, .55),
              0 0 0 1px rgba(255, 235, 160, .8),
              0 0 36px rgba(255, 195, 80, .8);
          }
        }

        @keyframes cardSunburst {
          to { transform: rotate(360deg); }
        }

        .inventory-card__main {
          min-width: 0;
          display: contents;
        }

        .inventory-card__top {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 6px 8px 8px;
          margin: -2px -2px 0;
          border-bottom: 2px solid rgba(199, 154, 61, .35);
        }

        .inventory-card__title {
          margin: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          color: #fffdf4;
          background: linear-gradient(180deg, #6a4a30 0%, #4a311e 100%);
          border: 2px solid #2f1d0f;
          border-radius: 6px;
          box-shadow: inset 0 2px 0 rgba(255,255,255,.22), 0 2px 0 rgba(0,0,0,.18);
          font-size: 13px;
          letter-spacing: .08em;
          line-height: 1.1;
          font-weight: 950;
          text-shadow: 0 1px 0 rgba(0,0,0,.35);
        }

        .inventory-card__expression {
          display: -webkit-box;
          min-height: 37px;
          margin: 10px 0 0;
          overflow: hidden;
          color: rgba(114, 93, 66, .86);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.7;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .inventory-card__metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: auto;
        }

        .inventory-card__side {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 2px;
          border-left: 0;
        }

        .inventory-grade {
          position: relative;
          min-width: 40px;
          height: 40px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          color: #fffdf4;
          background: radial-gradient(circle at 30% 30%, #6dd4c8 0%, #2f8c83 75%);
          border: 2.5px solid #1d5b55;
          border-radius: 50%;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.45),
            inset 0 -3px 0 rgba(0,0,0,.18),
            0 3px 0 rgba(0, 0, 0, .25),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #1d5b55;
          font-size: 17px;
          font-weight: 950;
          text-shadow: 0 1px 0 rgba(0,0,0,.35);
          transform: translateY(-2px);
        }

        .inventory-grade--S {
          background: radial-gradient(circle at 30% 30%, #fff2a3 0%, #e1932a 80%);
          border-color: #8a5912;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.55),
            inset 0 -3px 0 rgba(0,0,0,.22),
            0 3px 0 rgba(0, 0, 0, .3),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #8a5912,
            0 0 14px rgba(241, 191, 76, .9);
        }

        .inventory-grade--A {
          background: radial-gradient(circle at 30% 30%, #8ee6d9 0%, #2f8c83 80%);
          border-color: #1d5b55;
        }

        .inventory-grade--B {
          background: radial-gradient(circle at 30% 30%, #9ec3ff 0%, #3a6dc6 80%);
          border-color: #20407c;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.45),
            inset 0 -3px 0 rgba(0,0,0,.18),
            0 3px 0 rgba(0, 0, 0, .25),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #20407c;
        }

        .inventory-grade--C {
          background: radial-gradient(circle at 30% 30%, #c3a7e4 0%, #6f4aa1 80%);
          border-color: #41296b;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.4),
            inset 0 -3px 0 rgba(0,0,0,.18),
            0 3px 0 rgba(0, 0, 0, .25),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #41296b;
        }

        .inventory-grade--D {
          background: radial-gradient(circle at 30% 30%, #f0a98c 0%, #b85b3a 80%);
          border-color: #6f3522;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.4),
            inset 0 -3px 0 rgba(0,0,0,.18),
            0 3px 0 rgba(0, 0, 0, .25),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #6f3522;
        }

        .inventory-grade--F {
          background: radial-gradient(circle at 30% 30%, #d8d2c4 0%, #7a6e60 85%);
          border-color: #4a3f33;
          box-shadow:
            inset 0 3px 0 rgba(255,255,255,.4),
            inset 0 -3px 0 rgba(0,0,0,.18),
            0 3px 0 rgba(0, 0, 0, .25),
            0 0 0 3px rgba(255, 247, 223, .85),
            0 0 0 5px #4a3f33;
        }

        .inventory-art {
          position: relative;
          min-height: 150px;
          display: grid;
          place-items: center;
          margin: 6px 0 2px;
          padding: 10px 0;
          background:
            radial-gradient(70% 90% at 50% 55%, rgba(255, 244, 200, .9) 0%, rgba(245, 215, 140, .35) 60%, rgba(245, 215, 140, 0) 100%),
            linear-gradient(180deg, #fff2cb 0%, #f3d997 100%);
          border: 2px solid #b8862e;
          border-radius: 10px;
          box-shadow:
            inset 0 0 0 2px #fff8e2,
            inset 0 -6px 12px rgba(184, 134, 46, .25);
          overflow: hidden;
        }

        .inventory-art::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(45deg, rgba(255, 255, 255, .12) 0 6px, transparent 6px 14px);
          pointer-events: none;
          mix-blend-mode: overlay;
          opacity: .55;
        }

        .inventory-avatar {
          position: relative;
          z-index: 1;
          width: min(78%, 200px);
          height: 150px;
          object-fit: contain;
          image-rendering: pixelated;
          filter: drop-shadow(0 6px 0 rgba(120, 86, 28, .35));
          transition: transform .25s cubic-bezier(.23,1,.32,1);
        }

        .inventory-card:hover .inventory-avatar {
          transform: translateY(-3px) scale(1.04);
        }

        .inventory-card__metrics {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: auto;
        }

        .inventory-metric-card {
          min-width: 0;
          min-height: 54px;
          display: block;
          padding: 8px 6px;
          text-align: center;
          color: #4a311e;
          background: linear-gradient(180deg, #fffaec 0%, #f3d997 100%);
          border: 2px solid #b8862e;
          border-radius: 8px;
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, .65),
            inset 0 -2px 0 rgba(184, 134, 46, .25),
            0 2px 0 rgba(120, 86, 28, .25);
        }

        .inventory-metric-card__label {
          color: rgba(74, 49, 30, .8);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .inventory-metric-card__value {
          margin-top: 4px;
          color: #1d5b55;
          font-size: 17px;
          line-height: 1;
          font-weight: 950;
          font-variant-numeric: tabular-nums;
          text-shadow: 0 1px 0 rgba(255, 255, 255, .55);
        }

        .inventory-action {
          height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #6f5a50;
          background: transparent;
          border: 0;
          border-radius: var(--radius-xs);
          box-shadow: none;
          font: inherit;
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
          transition: transform .16s ease, border-color .16s ease;
        }

        .inventory-action:hover {
          transform: translate(-1px, -1px);
          color: var(--ac-text);
        }

        .inventory-action--square {
          width: 32px;
          padding: 0;
        }

        .inventory-action--favorite {
          color: #e06354;
        }

        .inventory-action--primary {
          min-width: 132px;
          flex: 1 1 auto;
          gap: 6px;
          padding: 0 10px;
          color: #fffdf4;
          background: linear-gradient(180deg, #58c2b8 0%, #2f8c83 100%);
          border: 2.5px solid #1d5b55;
          border-radius: 8px;
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, .45),
            inset 0 -2px 0 rgba(0, 0, 0, .18),
            0 3px 0 rgba(29, 91, 85, .8),
            0 0 0 1.5px rgba(255, 247, 223, .55);
          font-size: 14px;
          letter-spacing: .06em;
          text-shadow: 0 1px 0 rgba(0, 0, 0, .35);
        }

        .inventory-action--primary:hover {
          color: #fffdf4;
          transform: translateY(-2px);
          box-shadow:
            inset 0 2px 0 rgba(255, 255, 255, .55),
            inset 0 -2px 0 rgba(0, 0, 0, .18),
            0 5px 0 rgba(29, 91, 85, .8),
            0 0 0 1.5px rgba(255, 247, 223, .65);
        }

        .inventory-status {
          display: inline-flex;
          align-items: center;
          width: max-content;
          min-height: 25px;
          padding: 4px 9px;
          color: #0b725c;
          background: #e6f9f0;
          border: 1.5px solid rgba(31, 163, 116, .28);
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 950;
        }

        .inventory-status--failed {
          color: #a54635;
          background: #ffe4d9;
          border-color: rgba(216, 93, 72, .28);
        }

        .inventory-side-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: var(--ac-text-body);
          font-size: 12px;
          font-weight: 900;
        }

        .inventory-side-row strong {
          color: var(--ac-text);
          font-variant-numeric: tabular-nums;
        }

        .inventory-curve {
          height: 58px;
          margin-top: auto;
        }

        .inventory-curve svg {
          width: 100%;
          height: 58px;
          overflow: visible;
        }

        .inventory-actions {
          width: 100%;
          display: flex;
          flex-wrap: nowrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 2px;
        }

        .inventory-empty {
          grid-column: 1 / -1;
        }

        .strategy-detail-backdrop {
          position: fixed;
          inset: 0;
          z-index: 55;
          display: grid;
          place-items: center;
          padding: clamp(14px, 2vw, 34px);
          background: rgba(39, 93, 131, .28);
          backdrop-filter: blur(7px);
        }

        .strategy-detail-modal {
          width: min(1240px, 96vw);
          max-height: min(900px, 91svh);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: var(--ac-text);
          background:
            radial-gradient(circle at 8% 5%, rgba(255,255,255,.72) 0 8%, transparent 9%),
            linear-gradient(180deg, #fffdf4 0%, var(--ac-cream) 100%);
          border: 3px solid var(--ac-border);
          border-radius: var(--radius-lg);
          box-shadow: 0 7px 0 var(--ac-shadow), 0 24px 70px rgba(66, 48, 31, .25);
        }

        .strategy-detail__header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          padding: clamp(18px, 2vw, 28px) clamp(18px, 2.5vw, 34px) 14px;
          border-bottom: 2px dashed rgba(196, 184, 158, .65);
        }

        .strategy-detail__back,
        .strategy-detail__close,
        .strategy-detail__button,
        .strategy-detail__range {
          color: var(--ac-text);
          background: var(--ac-cream-light);
          border: 2px solid var(--ac-border);
          box-shadow: 0 3px 0 var(--ac-shadow-input);
          font: inherit;
          font-weight: 900;
          transition: all .18s ease;
        }

        .strategy-detail__back,
        .strategy-detail__close {
          width: 42px;
          height: 42px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: var(--radius-md);
        }

        .strategy-detail__back:hover,
        .strategy-detail__close:hover,
        .strategy-detail__button:hover,
        .strategy-detail__range:hover {
          transform: translateY(-1px);
          border-color: var(--ac-border-hover);
        }

        .strategy-detail__title {
          margin: 0;
          color: var(--ac-text);
          font-size: clamp(25px, 2.6vw, 38px);
          line-height: 1.05;
          font-weight: 900;
        }

        .strategy-detail__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .strategy-detail__actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 9px;
        }

        .strategy-detail__button {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 14px;
          border-radius: var(--radius-md);
          text-decoration: none;
          font-size: 12px;
        }

        .strategy-detail__button--primary {
          color: #075b55;
          background: var(--ac-primary-bg);
          border-color: rgba(25, 200, 185, .46);
        }

        .strategy-detail__content {
          overflow: auto;
          padding: 18px clamp(18px, 2.5vw, 34px) clamp(18px, 2.5vw, 34px);
        }

        .detail-metric-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }

        .detail-metric-card,
        .detail-panel {
          background: rgba(255,255,248,.86);
          border: 2px solid rgba(196, 184, 158, .78);
          border-radius: var(--radius-md);
          box-shadow: 0 4px 0 rgba(189, 174, 160, .68);
        }

        .detail-metric-card {
          min-width: 0;
          padding: 12px;
        }

        .detail-label {
          color: rgba(114, 93, 66, .72);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .detail-value {
          margin-top: 7px;
          color: var(--ac-text);
          font-size: 18px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }

        .detail-value--up {
          color: #0b9f73;
        }

        .detail-value--down {
          color: #d85d48;
        }

        .detail-panel-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .detail-panel {
          min-width: 0;
          padding: 15px;
        }

        .detail-panel--wide {
          grid-column: span 2;
        }

        .detail-panel__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          color: var(--ac-text);
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .detail-panel__title {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .detail-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 7px 0;
          border-top: 1px dashed rgba(196, 184, 158, .55);
          color: var(--ac-text-body);
          font-size: 12px;
          font-weight: 800;
        }

        .detail-row strong {
          color: var(--ac-text);
          text-align: right;
          font-weight: 900;
        }

        .detail-chart {
          width: 100%;
          height: 230px;
          margin-top: 8px;
          overflow: visible;
        }

        .strategy-detail__ranges {
          display: flex;
          gap: 6px;
        }

        .strategy-detail__range {
          min-width: 46px;
          height: 30px;
          border-radius: var(--radius-sm);
          font-size: 10px;
        }

        .strategy-detail__range.is-active {
          color: #075b55;
          background: var(--ac-primary-bg);
          border-color: rgba(25, 200, 185, .46);
        }

        .detail-config {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px 14px;
        }

        .detail-preferences {
          display: grid;
          gap: 7px;
        }

        .detail-pref-row {
          display: grid;
          grid-template-columns: 72px 1fr 48px;
          align-items: center;
          gap: 8px;
          color: var(--ac-text-body);
          font-size: 12px;
          font-weight: 900;
        }

        .detail-pref-bar {
          height: 10px;
          overflow: hidden;
          background: #efe4c8;
          border: 1px solid rgba(196, 184, 158, .78);
          border-radius: var(--radius-xs);
        }

        .detail-pref-bar span {
          display: block;
          height: 100%;
          background: var(--ac-primary);
          border-radius: inherit;
        }

        .detail-position-table {
          width: 100%;
          border-collapse: collapse;
          color: var(--ac-text-body);
          font-size: 12px;
          font-weight: 800;
        }

        .detail-position-table th,
        .detail-position-table td {
          padding: 8px 6px;
          border-top: 1px dashed rgba(196, 184, 158, .55);
          text-align: left;
          white-space: nowrap;
        }

        .detail-position-table th {
          color: rgba(114, 93, 66, .72);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        @media (max-width: 1100px) {
          .detail-metric-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .detail-panel-grid {
            grid-template-columns: 1fr;
          }

          .detail-panel--wide {
            grid-column: auto;
          }
        }

        @media (max-width: 900px) {
          .game-landing {
            min-width: 760px;
          }

          .shop-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .inventory-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 680px) {
          .shop-modal {
            width: 96vw;
          }

          .shop-grid {
            grid-template-columns: 1fr;
          }

          .inventory-summary {
            grid-template-columns: 1fr;
          }

          .inventory-card {
            grid-template-columns: 1fr;
          }

          .inventory-card__side {
            padding-left: 0;
            border-left: 0;
            border-top: 2px dashed rgba(196, 184, 158, .55);
            padding-top: 12px;
          }
        }
      `}</style>

      <img
        className="game-bg"
        src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663325188422/nBmPCFQrIvRMyCWh.png"
        alt=""
        aria-hidden="true"
      />

      <nav className="ui-left" aria-label="Game menu">
        <button className="menu-tile" type="button" aria-label="Inventory" onClick={() => setInventoryOpen(true)}>
          <img className="menu-tile__icon" src="/assets/inventory-menu-icon.svg" alt="" />
          <span className="menu-tile__name">背包</span>
        </button>
        <a className="menu-tile" href="/landing" aria-label="Achievements">
          <img className="menu-tile__icon" src="/assets/leaderboard-menu-icon.svg" alt="" />
          <span className="menu-tile__name">成就</span>
        </a>
        <a className="menu-tile" href="/landing" aria-label="Quests">
          <img className="menu-tile__icon" src="/assets/wallet-menu-icon.svg" alt="" />
          <span className="menu-tile__name">钱包</span>
        </a>
      </nav>

      <button className="shop" type="button" aria-label="Shop" onClick={() => setShopOpen(true)}>
        <span className="base" />
        <span className="awning" />
        <span className="label">SHOP</span>
        <span className="stone" />
        <span className="door" />
      </button>

      {inventoryOpen && (
        <div className="shop-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setInventoryOpen(false);
        }}>
          <section className="shop-modal inventory-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-modal-title">
            <header className="shop-modal__header">
              <div>
                <h2 className="shop-modal__title" id="inventory-modal-title">背包</h2>
              </div>
              <button className="shop-modal__close" type="button" aria-label={tr("Close inventory", "关闭背包")} onClick={() => setInventoryOpen(false)}>
                <X size={22} strokeWidth={3} />
              </button>
            </header>

            <div className="shop-modal__toolbar">
              <label className="shop-search">
                <Search aria-hidden="true" />
                <input
                  className="shop-input"
                  value={factorQuery}
                  onChange={(event) => setFactorQuery(event.target.value)}
                  placeholder={tr("Search by name, ID, expression...", "按名称、ID、表达式搜索...")}
                />
              </label>

              <div className="shop-controls">
                <div className="shop-select-aisland" aria-label={tr("Factor filter", "因子筛选")}>
                  <Select
                    value={factorFilter}
                    onChange={(key) => setFactorFilter(key as FactorFilterKey)}
                    options={factorFilterSelectOptions}
                    placeholder={tr("Choose filter", "选择筛选")}
                  />
                </div>
                <div className="shop-select-aisland shop-select-aisland--sort" aria-label={tr("Factor sort", "因子排序")}>
                  <Select
                    value={factorSortKey ?? "default"}
                    onChange={handleFactorSortChange}
                    options={factorSortSelectOptions}
                    placeholder={tr("Choose sort", "选择排序")}
                  />
                </div>
              </div>
            </div>

            <div className="inventory-grid">
              {filteredFactors.map((factor, index) => {
                const isStarred = starredFactors.has(factor.id);
                const returns = parseMetricValue(factor.returns);

                return (
                  <article className={`inventory-card inventory-card--${factor.grade}`} key={factor.id}>
                    <header className="inv-head">
                      <span className="inv-no">NO.{String(index + 1).padStart(2, "0")}</span>
                      {/* Figma: gear-shaped medal floats on top-right with red ribbons */}
                      <div className={`inv-medal inv-medal--${factor.grade}`} aria-hidden="true">
                        <svg viewBox="0 0 100 124" width="100%" height="100%" shapeRendering="geometricPrecision" aria-hidden="true">
                          {/* Red ribbon tails (two angular pennants below medal) */}
                          <g>
                            <polygon className="inv-medal__ribbon" points="30,72 18,118 32,108 38,118 40,82" />
                            <polygon className="inv-medal__ribbon" points="70,72 82,118 68,108 62,118 60,82" />
                          </g>
                          {/* Soft shadow under medal */}
                          <ellipse cx="50" cy="86" rx="34" ry="4" fill="rgba(0,0,0,.10)" />
                          {/* 12-petal flower medal (uses CSS color) */}
                          <path className="inv-medal__gear"
                            d="M50 6
                               C 56 6, 60 12, 60 18
                               C 64 14, 72 14, 76 18
                               C 80 22, 80 30, 76 34
                               C 82 36, 86 42, 86 48
                               C 86 54, 82 60, 76 62
                               C 80 66, 80 74, 76 78
                               C 72 82, 64 82, 60 78
                               C 60 84, 56 90, 50 90
                               C 44 90, 40 84, 40 78
                               C 36 82, 28 82, 24 78
                               C 20 74, 20 66, 24 62
                               C 18 60, 14 54, 14 48
                               C 14 42, 18 36, 24 34
                               C 20 30, 20 22, 24 18
                               C 28 14, 36 14, 40 18
                               C 40 12, 44 6, 50 6 Z" />
                          {/* Inner disc */}
                          <circle cx="50" cy="48" r="22" className="inv-medal__disc" />
                          {/* Letter */}
                          <text x="50" y="58" textAnchor="middle" className="inv-medal__letter">{factor.grade}</text>
                        </svg>
                      </div>
                    </header>

                    <div className="inv-art" aria-hidden="true">
                      <div className="inv-art__rays" />
                      <span className="inv-art__star inv-art__star--1" />
                      <span className="inv-art__star inv-art__star--2" />
                      <span className="inv-art__star inv-art__star--3" />
                      <span className="inv-art__star inv-art__star--4" />
                      <span className="inv-art__star inv-art__star--5" />
                      <span className="inv-art__star inv-art__star--6" />
                      <img className="inv-art__img" src="/assets/pixel-whale-avatar.png" alt="" />
                      <span className="inv-art__tag">{tr("Sunfish", "翻车鱼")}</span>
                    </div>

                    <div className="inv-stats">
                      <div className="inv-stat">
                        <span className="inv-stat__label">{tr("Sharpe", "Sharpe")}</span>
                        <span className="inv-stat__value">{factor.sharpe.toFixed(2)}</span>
                      </div>
                      <div className="inv-stat">
                        <span className="inv-stat__label">{tr("ROI", "ROI")}</span>
                        <span className={`inv-stat__value inv-stat__value--${returns >= 0 ? "pos" : "neg"}`}>{returns >= 0 ? "+" : ""}{factor.returns}</span>
                      </div>
                    </div>

                    <div className="inv-actions">
                      <button
                        className="inv-btn inv-btn--ghost"
                        type="button"
                        aria-label={tr("More actions", "更多操作")}
                      >
                        <MoreHorizontal size={20} strokeWidth={3} />
                      </button>
                      <button
                        className={`inv-btn inv-btn--ghost inv-btn--star${isStarred ? " is-on" : ""}`}
                        type="button"
                        aria-pressed={isStarred}
                        aria-label={isStarred ? tr("Unfavorite factor", "取消收藏因子") : tr("Favorite factor", "收藏因子")}
                        onClick={() => toggleFactorStar(factor.id)}
                      >
                        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                          <path d="M12 3 14.5 9 21 9.5 16 14 17.5 20.5 12 17 6.5 20.5 8 14 3 9.5 9.5 9z"
                                fill={isStarred ? "#f6c63a" : "none"} stroke="#1d0f06" strokeWidth="1.6" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <Link className="inv-btn inv-btn--cta" href={`/alphas/${factor.id}`}>
                        {tr("View", "查看")}
                      </Link>
                    </div>
                  </article>
                );
              })}

              {filteredFactors.length === 0 && (
                <div className="shop-empty inventory-empty">{tr("No factors match your filters.", "没有符合当前筛选条件的因子。")}</div>
              )}
            </div>
          </section>
        </div>
      )}

      {shopOpen && (
        <div className="shop-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShopOpen(false);
        }}>
          <section className="shop-modal" role="dialog" aria-modal="true" aria-labelledby="shop-modal-title">
            <header className="shop-modal__header">
              <div>
                <h2 className="shop-modal__title" id="shop-modal-title">商店</h2>
              </div>
              <button className="shop-modal__close" type="button" aria-label={tr("Close shop", "关闭商店")} onClick={() => setShopOpen(false)}>
                <X size={22} strokeWidth={3} />
              </button>
            </header>

            <div className="shop-modal__toolbar">
              <label className="shop-search">
                <Search aria-hidden="true" />
                <input
                  className="shop-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={tr("Search by name or ID...", "按名称或 ID 搜索...")}
                />
              </label>

              <div className="shop-controls">
                <div className="shop-select-aisland" aria-label={tr("Category filter", "分类筛选")}>
                  <Select
                    value={filter}
                    onChange={(key) => setFilter(key as FilterKey)}
                    options={filterSelectOptions}
                    placeholder={tr("Choose category", "选择分类")}
                  />
                </div>
                <div className="shop-select-aisland shop-select-aisland--sort" aria-label={tr("Sort", "排序")}>
                  <Select
                    value={sortKey ?? "default"}
                    onChange={handleSortChange}
                    options={sortSelectOptions}
                    placeholder={tr("Choose sort", "选择排序")}
                  />
                </div>
                <button
                  className="shop-chip"
                  type="button"
                  disabled={!sortKey}
                  onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                >
                  {sortDir === "asc" ? tr("Ascending", "升序") : sortDir === "desc" ? tr("Descending", "降序") : tr("Default", "默认")}
                </button>
                {sortKey && (
                  <button className="shop-chip" type="button" onClick={() => {
                    setSortKey(null);
                    setSortDir(null);
                  }}>
                    {tr("Clear", "清除")}
                  </button>
                )}
              </div>
            </div>

            <div className="shop-grid">
              {filteredStrategies.map((strategy) => {
                const tier = getStrategyTier(strategy);
                const statusLabel = tier === "official" ? tr("Official", "官方") : tr("Graduated", "三方");
                const isStarred = starredStrategies.has(strategy.id);
                const roi = parseMetricValue(strategy.annualReturn);
                const drawdown = parseMetricValue(strategy.maxDrawdown);

                return (
                  <article
                    className="shop-card"
                    key={strategy.id}
                    role="button"
                    tabIndex={0}
                    aria-label={tr(`Open strategy detail for ${strategy.name}`, `查看策略详情：${strategy.name}`)}
                    onClick={() => openStrategyDetail(strategy)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openStrategyDetail(strategy);
                      }
                    }}
                  >
                    <div className="shop-card__body">
                      <div className="shop-card__title-row">
                        <h3 className="shop-card__title">{strategy.name}</h3>
                      </div>
                      <div className="shop-card__meta">
                        <span className="shop-badge">{strategy.updatedAt}</span>
                        <span className="shop-badge">ID {strategy.id}</span>
                        <span className="shop-badge"><Users size={14} />{uiLang === "zh" ? `已使用${strategy.subscribers ?? 0}次` : `Used ${strategy.subscribers ?? 0} times`}</span>
                        <span className="shop-badge shop-badge--primary">{statusLabel}</span>
                      </div>
                      <p className="shop-card__desc">{translateDescription(strategy)}</p>

                      <div className="shop-curve">
                        <div className="shop-curve__label">{tr("Asset Curve", "资产曲线")}</div>
                        <svg viewBox="0 0 240 48" aria-hidden="true">
                          <path d="M4 38 C 34 30, 42 42, 66 28 S 104 20, 130 24 S 166 36, 196 17 S 221 15, 236 10" fill="none" stroke={roi >= 0 ? "#0b9f73" : "#d85d48"} strokeWidth="5" strokeLinecap="round" />
                          <path d="M4 38 C 34 30, 42 42, 66 28 S 104 20, 130 24 S 166 36, 196 17 S 221 15, 236 10 L236 48 L4 48 Z" fill={roi >= 0 ? "rgba(25,200,185,.18)" : "rgba(216,93,72,.16)"} />
                        </svg>
                      </div>

                      <div className="shop-metrics">
                        <div className="shop-metric">
                          <div className="shop-metric__label">ROI</div>
                          <div className={`shop-metric__value ${roi < 0 ? "shop-metric__value--down" : "shop-metric__value--up"}`}>{strategy.annualReturn}</div>
                        </div>
                        <div className="shop-metric">
                          <div className="shop-metric__label">{tr("Win Rate", "胜率")}</div>
                          <div className="shop-metric__value">{strategy.winRate}</div>
                        </div>
                        <div className="shop-metric">
                          <div className="shop-metric__label">{tr("Sharpe", "夏普")}</div>
                          <div className="shop-metric__value">{strategy.sharpe.toFixed(2)}</div>
                        </div>
                        <div className="shop-metric">
                          <div className="shop-metric__label">{tr("Max DD", "最大回撤")}</div>
                          <div className={`shop-metric__value ${drawdown === 0 ? "" : "shop-metric__value--down"}`}>{strategy.maxDrawdown}</div>
                        </div>
                      </div>
                    </div>

                    <div className="shop-card__actions">
                      <button
                        className={`shop-card__icon-btn${isStarred ? " is-starred" : ""}`}
                        type="button"
                        aria-pressed={isStarred}
                        aria-label={isStarred ? tr("Unfavorite strategy", "取消收藏策略") : tr("Favorite strategy", "收藏策略")}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleStar(strategy.id);
                        }}
                      >
                        <Star size={15} fill={isStarred ? "currentColor" : "none"} />
                      </button>
                      <Link
                        className="shop-card__action"
                        href={`/strategies/new?template=${strategy.id}&creationMode=platform&scale=single&inputMethod=form`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {tr("Copy", "复制")}
                      </Link>
                      <Link
                        className="shop-card__action shop-card__action--primary"
                        href={`/strategies/${strategy.id}?source=official&tier=${tier}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {tr("View", "查看")} <ArrowUpRight size={15} />
                      </Link>
                    </div>
                  </article>
                );
              })}

              {filteredStrategies.length === 0 && (
                <div className="shop-empty">{tr("No strategies match your filters.", "没有符合当前筛选条件的策略。")}</div>
              )}
            </div>
          </section>
        </div>
      )}

      {selectedStrategy && detailModel && (
        <div className="strategy-detail-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedStrategy(null);
        }}>
          <section className="strategy-detail-modal" role="dialog" aria-modal="true" aria-labelledby="strategy-detail-title">
            <header className="strategy-detail__header">
              <button className="strategy-detail__back" type="button" aria-label={tr("Back to shop", "返回商店")} onClick={() => setSelectedStrategy(null)}>
                <ArrowLeft size={20} strokeWidth={3} />
              </button>

              <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                <h2 className="strategy-detail__title" id="strategy-detail-title">{selectedStrategy.name}</h2>
                <div className="strategy-detail__meta">
                  <span className="shop-badge">ID {selectedStrategy.id}</span>
                  <span className="shop-badge">{selectedStrategy.updatedAt}</span>
                  <span className="shop-badge"><Users size={14} />{uiLang === "zh" ? `已使用${selectedStrategy.subscribers ?? 0}次` : `Used ${selectedStrategy.subscribers ?? 0} times`}</span>
                  <span className="shop-badge shop-badge--primary">
                    {getStrategyTier(selectedStrategy) === "official" ? tr("Official", "官方") : tr("Graduated", "三方")}
                  </span>
                </div>
              </div>

              <div className="strategy-detail__actions">
                <button
                  className={`strategy-detail__button${starredStrategies.has(selectedStrategy.id) ? " strategy-detail__button--primary" : ""}`}
                  type="button"
                  aria-pressed={starredStrategies.has(selectedStrategy.id)}
                  onClick={() => toggleStar(selectedStrategy.id)}
                >
                  <Star size={15} fill={starredStrategies.has(selectedStrategy.id) ? "currentColor" : "none"} />
                  {starredStrategies.has(selectedStrategy.id) ? tr("Favorited", "已收藏") : tr("Favorite", "收藏")}
                </button>
                <Link className="strategy-detail__button strategy-detail__button--primary" href={`/strategies/new?template=${selectedStrategy.id}&creationMode=platform&scale=single&inputMethod=form`}>
                  <ClipboardList size={15} />
                  {tr("Copy", "复制")}
                </Link>
                <button className="strategy-detail__close" type="button" aria-label={tr("Close detail", "关闭详情")} onClick={() => setSelectedStrategy(null)}>
                  <X size={21} strokeWidth={3} />
                </button>
              </div>
            </header>

            <div className="strategy-detail__content">
              <div className="detail-metric-grid">
                {[
                  [tr("Total Equity", "总权益"), `${detailModel.currentEquity.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`, ""],
                  [tr("PnL", "盈亏"), `${fmtSigned(detailModel.totalReturn)} USDT`, detailModel.totalReturn >= 0 ? "detail-value--up" : "detail-value--down"],
                  ["ROI", selectedStrategy.annualReturn, detailModel.roi >= 0 ? "detail-value--up" : "detail-value--down"],
                  [tr("Win Rate", "胜率"), selectedStrategy.winRate, ""],
                  [tr("Sharpe", "夏普"), selectedStrategy.sharpe.toFixed(2), ""],
                  [tr("Max Drawdown", "最大回撤"), selectedStrategy.maxDrawdown, "detail-value--down"],
                ].map(([label, value, tone]) => (
                  <div className="detail-metric-card" key={label}>
                    <div className="detail-label">{label}</div>
                    <div className={`detail-value ${tone}`}>{value}</div>
                  </div>
                ))}
              </div>

              <div className="detail-panel-grid">
                <section className="detail-panel">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><Wallet size={16} />{tr("Fund Statistics", "资金统计")}</span>
                  </div>
                  {detailModel.fundRows.map(([label, value]) => (
                    <div className="detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>
                  ))}
                </section>

                <section className="detail-panel">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><TrendingUp size={16} />{tr("Performance", "表现指标")}</span>
                  </div>
                  {detailModel.perfRows.map(([label, value]) => (
                    <div className="detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>
                  ))}
                </section>

                <section className="detail-panel">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><BarChart3 size={16} />{tr("Trading Stats", "交易统计")}</span>
                  </div>
                  {detailModel.tradeRows.map(([label, value]) => (
                    <div className="detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>
                  ))}
                </section>

                <section className="detail-panel detail-panel--wide">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><TrendingUp size={16} />{tr("Asset Curve", "资产曲线")}</span>
                    <div className="strategy-detail__ranges" aria-label={tr("Curve range", "曲线区间")}>
                      {curveRanges.map((range) => (
                        <button
                          className={`strategy-detail__range${curveRange === range ? " is-active" : ""}`}
                          type="button"
                          key={range}
                          onClick={() => setCurveRange(range)}
                        >
                          {range}
                        </button>
                      ))}
                    </div>
                  </div>
                  <svg className="detail-chart" viewBox="0 0 640 230" aria-label={tr("Strategy asset curve", "策略资产曲线")}>
                    <defs>
                      <linearGradient id="strategyCurveFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#19c8b9" stopOpacity=".26" />
                        <stop offset="100%" stopColor="#19c8b9" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M16 30 H624 M16 80 H624 M16 130 H624 M16 180 H624" stroke="rgba(196,184,158,.42)" strokeWidth="1.5" strokeDasharray="7 7" />
                    <path d={`${detailModel.equityPath} L624 214 L16 214 Z`} fill="url(#strategyCurveFill)" />
                    <path d={detailModel.benchmarkPath} fill="none" stroke="#d69b48" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 9" />
                    <path d={detailModel.equityPath} fill="none" stroke="#19c8b9" strokeWidth="6" strokeLinecap="round" />
                  </svg>
                </section>

                <section className="detail-panel">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><PieChart size={16} />{tr("Position Preference", "持仓偏好")}</span>
                  </div>
                  <div className="detail-preferences">
                    {[
                      ["BTC", "42%"],
                      ["ETH", "28%"],
                      [selectedStrategy.market === "DEX" ? "DeFi" : "ALT", "18%"],
                      [tr("Other", "其他"), "12%"],
                    ].map(([label, value]) => (
                      <div className="detail-pref-row" key={label}>
                        <span>{label}</span>
                        <div className="detail-pref-bar"><span style={{ width: value }} /></div>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="detail-panel detail-panel--wide">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><ClipboardList size={16} />{tr("Strategy Configuration", "策略配置")}</span>
                  </div>
                  <div className="detail-config">
                    {detailModel.configRows.map(([label, value]) => (
                      <div className="detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>
                    ))}
                  </div>
                </section>

                <section className="detail-panel">
                  <div className="detail-panel__head">
                    <span className="detail-panel__title"><Wallet size={16} />{tr("Position History", "持仓历史")}</span>
                  </div>
                  <table className="detail-position-table">
                    <thead>
                      <tr>
                        <th>{tr("Asset", "资产")}</th>
                        <th>{tr("Side", "方向")}</th>
                        <th>{tr("Weight", "权重")}</th>
                        <th>{tr("PnL", "盈亏")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["BTCUSDT", tr("Long", "做多"), "42%", "+12.46%"],
                        ["ETHUSDT", tr("Long", "做多"), "28%", "+8.13%"],
                        [selectedStrategy.market === "DEX" ? "UNIUSDT" : "SOLUSDT", tr("Long", "做多"), "18%", "+5.92%"],
                        ["USDT", tr("Cash", "现金"), "12%", "0.00%"],
                      ].map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell) => <td key={cell}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

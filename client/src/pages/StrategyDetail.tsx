import { useEffect, useMemo, useState } from "react";
import { useParams, useSearch } from "wouter";
import { strategies } from "@/lib/mockData";
import { parsePercent } from "@/lib/strategyUtils";
import {
  getExchangeVenueMeta,
  readExchangeApiConnections,
  type ExchangeApiConnection,
} from "@/lib/exchangeApiConnections";
import { deployStrategyToTrade, getStrategyDeployment } from "@/lib/tradeDeployments";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { toast } from "sonner";
import {
  positionHistory,
  type StrategyConfigRow,
} from "./StrategyDetailParts";
import { LiveDeployDialog, StrategyConfigDialog } from "./StrategyDetailDialogs";
import {
  StrategyFigmaReport,
  type ReportMetric,
  type ReportPositionRecord,
} from "./StrategyFigmaReport";
import {
  Star,
} from "lucide-react";

export default function StrategyDetail() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const source = searchParams.get("source");
  const isOfficialLibraryView = source === "official";
  const customName = searchParams.get("name");
  const strategyFromStore = strategies.find((item) => item.id === params.id);
  const strategyFromGeneratedId = (() => {
    const match = params.id?.match(/^STR-(\d+)$/);
    if (!match) return undefined;
    const index = Number(match[1]) - 463;
    return index >= 0 ? { ...strategies[index % strategies.length], id: params.id } : undefined;
  })();
  const strategy = strategyFromStore ?? strategyFromGeneratedId ?? {
    id: params.id,
    name: customName || tr("Strategy", "策略"),
    description: "Draft strategy generated from the guided creation flow.",
    factorCount: Number(searchParams.get("signals") || "5"),
    market: "Mixed" as const,
    annualReturn: "29.22%",
    sharpe: 1.92,
    maxDrawdown: "12.8%",
    winRate: "64.5%",
    status: "new" as const,
    subscribers: 0,
    author: "You",
    updatedAt: "2026-04-17",
    tags: ["Draft"],
  };
  const [starred, setStarred] = useState(false);
  const [deploymentVersion, setDeploymentVersion] = useState(0);
  const [isStrategyConfigOpen, setIsStrategyConfigOpen] = useState(false);
  const [isLiveDeployOpen, setIsLiveDeployOpen] = useState(false);
  const [connectedExchangeApis, setConnectedExchangeApis] = useState<ExchangeApiConnection[]>(() =>
    readExchangeApiConnections()
  );
  const [selectedExchangeApiId, setSelectedExchangeApiId] = useState<string>("");
  const [liveCapitalInput, setLiveCapitalInput] = useState("1000");

  const strategyName = customName || strategy.name;
  const strategyHeading = strategyName;
  const strategyId = strategy.id;
  const createdAt = searchParams.get("createdAt") || strategy.updatedAt;
  const paperDeployment = useMemo(
    () => getStrategyDeployment(strategyId, "paper"),
    [deploymentVersion, strategyId]
  );
  const liveDeployment = useMemo(
    () => getStrategyDeployment(strategyId, "live"),
    [deploymentVersion, strategyId]
  );
  const selectedExchange = useMemo(
    () => connectedExchangeApis.find((item) => item.id === selectedExchangeApiId) ?? null,
    [connectedExchangeApis, selectedExchangeApiId]
  );
  useEffect(() => {
    if (connectedExchangeApis.length === 0) {
      setSelectedExchangeApiId("");
      return;
    }
    if (!selectedExchangeApiId || !connectedExchangeApis.some((item) => item.id === selectedExchangeApiId)) {
      setSelectedExchangeApiId(connectedExchangeApis[0].id);
    }
  }, [connectedExchangeApis, selectedExchangeApiId]);
  const minLiveCapital = 100;
  const parsedLiveCapital = Number(liveCapitalInput);
  const isLiveCapitalNumeric = Number.isFinite(parsedLiveCapital);
  const isCapitalBelowMinimum =
    isLiveCapitalNumeric &&
    parsedLiveCapital > 0 &&
    parsedLiveCapital < minLiveCapital;
  const canSubmitLiveDeploy =
    selectedExchange !== null &&
    isLiveCapitalNumeric &&
    parsedLiveCapital >= minLiveCapital;
  const normalizeConfigValue = (value: string | null | undefined) => {
    if (!value) return null;
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (!cleaned) return null;
    const lowered = cleaned.toLowerCase();
    if (
      lowered === "n/a" ||
      lowered === "na" ||
      lowered === "none" ||
      lowered === "not specified" ||
      lowered === "null" ||
      lowered === "undefined"
    ) {
      return null;
    }
    return cleaned;
  };
  const toReadableList = (value: string | null | undefined, splitter: RegExp) => {
    const normalized = normalizeConfigValue(value);
    if (!normalized) return null;
    const items = normalized
      .split(splitter)
      .map((item) => item.trim())
      .filter(Boolean);
    return items.length > 0 ? items.join(", ") : null;
  };
  const toReadableItems = (value: string | null | undefined, splitter: RegExp) => {
    const normalized = normalizeConfigValue(value);
    if (!normalized) return [];
    return normalized
      .split(splitter)
      .map((item) => item.trim())
      .filter(Boolean);
  };
  const formatConfigDate = (value: string) => {
    const normalized = value.replace("T", " ").replace(/\.\d+Z?$/, "").replace(/Z$/, "").trim();
    const match = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}):(\d{2}))?/);
    if (!match) return normalized;
    return `${match[1]} ${match[2] ?? "00"}:${match[3] ?? "00"}`;
  };
  const formatDecimalWeight = (value: number) => Number(value.toFixed(2)).toString();
  const formatCooldown = (value: string | null) => {
    if (!value) return null;
    const hours = value.match(/[\d.]+/)?.[0];
    if (!hours) return value;
    if (uiLang === "zh") return `${hours} 小时`;
    return `${hours} ${Number(hours) === 1 ? "hour" : "hours"}`;
  };
  const inferSymbolFromName = (value: string) => {
    const upperName = value.toUpperCase();
    if (upperName.includes("BTC")) return "BTCUSDT";
    if (upperName.includes("ETH")) return "ETHUSDT";
    return null;
  };

  const strategyTypeRaw = normalizeConfigValue(
    searchParams.get("strategyType") ?? searchParams.get("type")
  );
  const weightingModeRaw = normalizeConfigValue(
    searchParams.get("weightMode") ?? searchParams.get("weights")
  );
  const executionSideRaw = normalizeConfigValue(
    searchParams.get("crossDirection") ?? searchParams.get("direction")
  );
  const rankValueRaw = normalizeConfigValue(searchParams.get("rankValue"));
  const rankModeRaw = normalizeConfigValue(searchParams.get("rankMode"));
  const sortingRuleRaw = normalizeConfigValue(searchParams.get("sorting"));
  const stopLossRaw = normalizeConfigValue(
    searchParams.get("stopLoss") ?? searchParams.get("risk")
  );
  const cooldownRaw = normalizeConfigValue(searchParams.get("cooldown"));
  const symbolScopeRaw = toReadableList(
    searchParams.get("symbols") ??
      searchParams.get("symbolGroup") ??
      searchParams.get("symbol"),
    /,/
  );
  const signalItems = toReadableItems(searchParams.get("factors"), /\|/);
  const signalSelectionRaw = signalItems.length > 0 ? signalItems.join(", ") : null;
  const strategyTypeKey = strategyTypeRaw?.toLowerCase().replace(/\s+/g, "-");
  const isCrossSectionStrategy =
    strategyTypeKey === "cross-sectional" || strategyTypeKey === "cross-section";
  const strategyTypeLabel =
    strategyTypeKey === "time-series"
      ? tr("Time Series", "时序策略")
      : strategyTypeKey === "cross-sectional" || strategyTypeKey === "cross-section"
        ? tr("Cross Section", "截面策略")
        : strategyTypeRaw;
  const factorWeightItems = (() => {
    const explicitWeights = normalizeConfigValue(searchParams.get("weights"));
    if (explicitWeights) {
      const parsed = explicitWeights
        .split("|")
        .map((item) => {
          const [label, weight] = item.split(":");
          const parsedWeight = Number(weight);
          if (!label?.trim() || !Number.isFinite(parsedWeight)) return null;
          return {
            label: label.trim(),
            value: parsedWeight,
          };
        })
        .filter((item): item is { label: string; value: number } => item !== null);
      if (parsed.length > 0) return parsed;
    }

    if (weightingModeRaw?.toLowerCase() === "equal" && signalItems.length > 0) {
      const equalWeight = 1 / signalItems.length;
      return signalItems.map((label) => ({ label, value: equalWeight }));
    }

    return [];
  })();
  const factorWeightSummary =
    factorWeightItems.length > 0
      ? factorWeightItems
          .map((item) => `${item.label} ${formatDecimalWeight(item.value)}`)
          .join(" | ")
      : null;
  const factorWeightTotal = factorWeightItems.reduce((sum, item) => sum + item.value, 0);
  const factorWeightColors = ["#ebbc47", "#479ef5", "#29d668", "#f4ae34", "#e44444"];
  const strategySideValue =
    executionSideRaw === "long"
      ? tr("Long-Only", "仅做多")
      : executionSideRaw === "short"
        ? tr("Short-Only", "仅做空")
        : executionSideRaw === "neutral"
          ? tr("Market-Neutral", "市场中性")
          : executionSideRaw;
  const topTailRuleValue =
    rankValueRaw && isCrossSectionStrategy
      ? uiLang === "zh"
        ? `头部/尾部 ${rankValueRaw}${rankModeRaw === "percent" ? "%" : " 个交易对"}`
        : `Top/Tail ${rankValueRaw}${rankModeRaw === "percent" ? "%" : " instruments"}`
      : sortingRuleRaw;
  const stopLossValue = stopLossRaw ? (stopLossRaw.includes("%") ? stopLossRaw : `${stopLossRaw}%`) : null;
  const cooldownValue = formatCooldown(cooldownRaw);
  const unsetConfigValue = tr("N/A", "未设置");
  const factorWeightValue =
    factorWeightSummary ??
    (weightingModeRaw?.toLowerCase() === "equal" ? tr("Equal Weight", "等权") : null);
  const strategyConfigRows: StrategyConfigRow[] = [
    { key: "strategy-id", label: tr("Strategy ID", "策略 ID"), value: strategyId },
    { key: "created-date", label: tr("Created Date", "创建时间"), value: formatConfigDate(createdAt) },
    { key: "strategy-type", label: tr("Strategy Type", "策略类型"), value: strategyTypeLabel ?? unsetConfigValue },
    {
      key: "symbol",
      label: tr("Symbol", "交易对"),
      value: symbolScopeRaw ?? inferSymbolFromName(strategyName) ?? unsetConfigValue,
    },
    { key: "signal", label: tr("Signal", "因子"), value: signalSelectionRaw ?? unsetConfigValue },
    { key: "factor-weights", label: tr("Factor Weights", "因子权重"), value: factorWeightValue ?? unsetConfigValue },
    { key: "stop-loss", label: tr("Stop Loss", "止损"), value: stopLossValue ?? unsetConfigValue },
    { key: "cooldown", label: tr("Cooldown", "冷却时间"), value: cooldownValue ?? unsetConfigValue },
    { key: "strategy-side", label: tr("Strategy Side", "策略方向"), value: strategySideValue ?? unsetConfigValue },
    { key: "top-tail-rule", label: tr("Top/Tail Rule", "头尾分层规则"), value: topTailRuleValue ?? unsetConfigValue },
  ];
  const getStrategyConfigRow = (key: string) => strategyConfigRows.find((row) => row.key === key);
  const strategyConfigGroups = [
    {
      title: tr("Basic Info", "基础信息"),
      rows: ["strategy-id", "created-date", "strategy-type"]
        .map(getStrategyConfigRow)
        .filter((row): row is StrategyConfigRow => Boolean(row)),
    },
    {
      title: tr("Inputs", "策略输入"),
      rows: ["symbol", "signal", "factor-weights"]
        .map(getStrategyConfigRow)
        .filter((row): row is StrategyConfigRow => Boolean(row)),
    },
    {
      title: tr("Risk & Execution", "风控与执行"),
      rows: ["stop-loss", "cooldown", "strategy-side", "top-tail-rule"]
        .map(getStrategyConfigRow)
        .filter((row): row is StrategyConfigRow => Boolean(row)),
    },
  ].filter((group) => group.rows.length > 0);

  const returnRate = parsePercent(strategy.annualReturn);
  const drawdownPct = parsePercent(strategy.maxDrawdown);
  const calmar = strategy.sharpe > 0 ? strategy.sharpe * 1.89 : 0;
  const winRate = parsePercent(strategy.winRate);
  const tradingDays = 1097;

  const openTradePage = (environment: "paper" | "live", focusTradeId?: string) => {
    const query = new URLSearchParams({
      env: environment,
      focusStrategy: strategyId,
    });
    if (focusTradeId) query.set("focusTradeId", focusTradeId);
    window.location.assign(`/trade?${query.toString()}`);
  };

  const deployStrategy = (
    environment: "paper" | "live",
    options?: { exchangeLabel?: string; capitalUsdt?: number }
  ) => {
    deployStrategyToTrade({
      strategyId,
      strategyName,
      market: strategy.market,
      annualReturn: strategy.annualReturn,
      winRate: strategy.winRate,
      environment,
    });
    setDeploymentVersion((prev) => prev + 1);
    if (environment === "paper") {
      toast.success(tr("Deployed to paper trading.", "已部署到模拟交易。"));
      return;
    }
    if (options?.exchangeLabel && options.capitalUsdt) {
      toast.success(
        uiLang === "zh"
          ? `已提交至 ${options.exchangeLabel} 的实盘部署，基础资金 ${options.capitalUsdt.toLocaleString()} USDT。`
          : `Live deployment submitted to ${options.exchangeLabel} with ${options.capitalUsdt.toLocaleString()} USDT base capital.`
      );
      return;
    }
    toast.success(tr("Deployed to live trading.", "已部署到实盘交易。"));
  };

  const openLiveDeployModal = () => {
    const latestExchangeApis = readExchangeApiConnections();
    setConnectedExchangeApis(latestExchangeApis);
    if (latestExchangeApis.length > 0) {
      setSelectedExchangeApiId((current) =>
        latestExchangeApis.some((item) => item.id === current) ? current : latestExchangeApis[0].id
      );
    } else {
      setSelectedExchangeApiId("");
    }
    setIsLiveDeployOpen(true);
  };

  const goToExchangeApi = () => {
    setIsLiveDeployOpen(false);
    window.location.assign("/account?tab=exchangeApi");
  };

  const submitLiveDeployment = () => {
    if (!selectedExchange) {
      toast.error(tr("Select an exchange account before submitting live deployment.", "提交实盘部署前请先选择交易所账户。"));
      return;
    }
    if (!isLiveCapitalNumeric || parsedLiveCapital <= 0) {
      toast.error(tr("Enter a valid base capital amount in USDT.", "请输入有效的 USDT 基础资金金额。"));
      return;
    }
    if (parsedLiveCapital < minLiveCapital) {
      toast.error(
        uiLang === "zh"
          ? `最低启用资金为 ${minLiveCapital} USDT，低于该阈值无法发起部署。`
          : `Minimum activation capital is ${minLiveCapital} USDT. Deployment cannot be initiated below this threshold.`
      );
      return;
    }
    const venue = getExchangeVenueMeta(selectedExchange.venue);
    deployStrategy("live", {
      exchangeLabel: `${selectedExchange.accountName} (${venue.label})`,
      capitalUsdt: parsedLiveCapital,
    });
    setIsLiveDeployOpen(false);
  };

  const reportHeaderMetrics: ReportMetric[] = [
    {
      label: tr("Sharpe", "夏普"),
      value: strategy.sharpe.toFixed(3),
      tone: strategy.sharpe >= 1.5 ? "good" : "muted",
    },
    { label: "IC", value: "—", tone: "muted" },
    {
      label: tr("Max DD", "最大回撤"),
      value: `${Math.abs(drawdownPct).toFixed(1)}%`,
      tone: Math.abs(drawdownPct) >= 15 ? "warn" : "good",
    },
    { label: "Calmar", value: calmar.toFixed(3), tone: calmar >= 3 ? "good" : "muted" },
    { label: tr("Hit Rate", "命中率"), value: `${winRate.toFixed(1)}%`, tone: winRate >= 55 ? "good" : "muted" },
    { label: "Turnover", value: "1.231", tone: "muted" },
  ];
  const reportMetricRows: Array<[string, string]> = [
    ["fee_rate (backtest param)", "0.0005"],
    ["Annual (net)", (returnRate / 100).toFixed(6)],
    ["Sharpe (net)", strategy.sharpe.toFixed(5)],
    ["MDD", (Math.abs(drawdownPct) / 100).toFixed(6)],
    ["Annual (gross)", ((returnRate * 1.65) / 100).toFixed(5)],
    ["Sharpe (gross)", (strategy.sharpe * 1.66).toFixed(5)],
    ["Turnover (avg/bar)", "1.23103"],
    ["Turnover cost (cum, ret)", "1.00082"],
    ["total_funding_ret", "0"],
    ["n_periods", `${tradingDays + 529}`],
  ];
  const reportPositions: ReportPositionRecord[] = positionHistory.map((position) => ({
    symbol: position.symbol,
    side: position.side,
    entry: position.entryPrice,
    interest: position.maxOpenInterest,
    opened: position.openedAt,
    closed: position.closedAt,
    pnl: position.pnl,
  }));
  const reportActions = (
    <>
      <button
        type="button"
        className="oq-report-action"
        onClick={() => {
          setStarred((prev) => !prev);
          toast.success(starred ? tr("Removed from favorites", "已取消收藏") : tr("Added to favorites", "已加入收藏"));
        }}
      >
        <Star className={`h-3 w-3 ${starred ? "fill-current" : ""}`} />
        {starred ? tr("Starred", "已收藏") : tr("Favorite", "收藏")}
      </button>
      {isOfficialLibraryView ? (
        <button
          type="button"
          className="oq-report-action is-primary"
          onClick={() =>
            window.location.assign(
              `/strategies/new?template=${encodeURIComponent(strategyId)}&creationMode=platform&scale=single`
            )
          }
        >
          {tr("Use Template", "使用模板")}
        </button>
      ) : (
        <>
          <button
            type="button"
            className="oq-report-action is-primary"
            onClick={() => {
              if (paperDeployment) {
                openTradePage("paper", paperDeployment.id);
                return;
              }
              deployStrategy("paper");
            }}
          >
            {paperDeployment ? tr("View Paper", "查看模拟") : tr("Paper Deploy", "模拟部署")}
          </button>
          <button
            type="button"
            className="oq-report-action is-live"
            onClick={() => {
              if (liveDeployment) {
                openTradePage("live", liveDeployment.id);
                return;
              }
              openLiveDeployModal();
            }}
          >
            {liveDeployment ? tr("View Live", "查看实盘") : tr("Live Deploy", "实盘部署")}
          </button>
        </>
      )}
    </>
  );
  const reportTitle = strategyId === "STR-465" ? "Overnight VRP" : strategyHeading;
  const reportSubtitle = strategyId === "STR-465"
    ? "Volatility"
    : `${strategyName} · ${strategyId} · ${formatConfigDate(createdAt)}`;

  return (
    <>
      <StrategyFigmaReport
        title={reportTitle}
        subtitle={reportSubtitle}
        headerMetrics={reportHeaderMetrics}
        dateLabel="2020-01-01_2020-12-31"
        dateOptions={[
          "2020-01-01_2020-12-31",
          "2021-01-01_2021-12-31",
          "2022-01-01_2022-12-31",
          "2023-01-01_2023-12-31",
        ]}
        actions={reportActions}
        metricRows={reportMetricRows}
        positions={reportPositions}
      />

      <LiveDeployDialog
        open={isLiveDeployOpen}
        onOpenChange={setIsLiveDeployOpen}
        tr={tr}
        connectedExchangeApis={connectedExchangeApis}
        selectedExchangeApiId={selectedExchangeApiId}
        setSelectedExchangeApiId={setSelectedExchangeApiId}
        goToExchangeApi={goToExchangeApi}
        liveCapitalInput={liveCapitalInput}
        setLiveCapitalInput={setLiveCapitalInput}
        isCapitalBelowMinimum={isCapitalBelowMinimum}
        canSubmitLiveDeploy={canSubmitLiveDeploy}
        submitLiveDeployment={submitLiveDeployment}
      />

      <StrategyConfigDialog
        open={isStrategyConfigOpen}
        onOpenChange={setIsStrategyConfigOpen}
        strategyName={strategyName}
        strategyId={strategyId}
        tr={tr}
        strategyConfigGroups={strategyConfigGroups}
        factorWeightItems={factorWeightItems}
        factorWeightTotal={factorWeightTotal}
        factorWeightColors={factorWeightColors}
        formatDecimalWeight={formatDecimalWeight}
      />
    </>
  );

}

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { strategies } from "@/lib/mockData";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import {
  tradeBots,
  tradePositionRows,
  formatSigned,
  type TradeEnvironment,
  type BotStatus,
} from "@/lib/tradeData";
import { getTradeBotsWithDeployments } from "@/lib/tradeDeployments";
import {
  ArrowUpRight,
  CircleStop,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import "./Trade.css";

type PendingAction =
  | { type: "stop"; botId: string }
  | { type: "delete"; botId: string }
  | null;

type BotStatusFilter = "all" | "running" | "stop";
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";
const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";

function readChartColorMode(): ChartColorMode {
  if (typeof window === "undefined") return "greenUpRedDown";
  const stored = window.localStorage.getItem(CHART_COLOR_MODE_STORAGE_KEY);
  return stored === "redUpGreenDown" || stored === "greenUpRedDown" ? stored : "greenUpRedDown";
}

function getTrendClass(value: number, mode: ChartColorMode) {
  if (value === 0) return "oq-trend-neutral";
  const upClass = mode === "redUpGreenDown" ? "oq-trend-risk" : "oq-trend-positive";
  const downClass = mode === "redUpGreenDown" ? "oq-trend-positive" : "oq-trend-risk";
  return value > 0 ? upClass : downClass;
}

function readPlainExplanationEnabled() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(PLAIN_EXPLANATION_STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return true;
}

function MaybeExplainTooltip({
  enabled,
  explanation,
  children,
}: {
  enabled: boolean;
  explanation: string;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-5">
        {explanation}
      </TooltipContent>
    </Tooltip>
  );
}

export default function Trade() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const search = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const envFromQuery = searchParams.get("env");
  const focusStrategyId = searchParams.get("focusStrategy");
  const focusTradeId = searchParams.get("focusTradeId");

  const [environment, setEnvironment] = useState<TradeEnvironment>(
    envFromQuery === "live" ? "live" : "paper"
  );
  const [focusedBotId, setFocusedBotId] = useState<string | null>(null);
  const [hiddenBotIds, setHiddenBotIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [statusFilter, setStatusFilter] = useState<BotStatusFilter>("all");
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(() => readChartColorMode());
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() => readPlainExplanationEnabled());
  const allTradeBots = useMemo(() => getTradeBotsWithDeployments(tradeBots), []);
  const [statusById, setStatusById] = useState<Record<string, BotStatus>>(() =>
    Object.fromEntries(allTradeBots.map((bot, index) => [bot.id, index % 4 === 1 ? "paused" : "running"]))
  );

  useEffect(() => {
    if (envFromQuery === "paper" || envFromQuery === "live") {
      setEnvironment(envFromQuery);
    }
  }, [envFromQuery]);

  useEffect(() => {
    const syncChartColorMode = () => setChartColorMode(readChartColorMode());
    window.addEventListener("storage", syncChartColorMode);
    window.addEventListener("focus", syncChartColorMode);
    return () => {
      window.removeEventListener("storage", syncChartColorMode);
      window.removeEventListener("focus", syncChartColorMode);
    };
  }, []);

  useEffect(() => {
    const syncPlainExplanation = () => setPlainExplainEnabled(readPlainExplanationEnabled());
    window.addEventListener("storage", syncPlainExplanation);
    window.addEventListener("focus", syncPlainExplanation);
    return () => {
      window.removeEventListener("storage", syncPlainExplanation);
      window.removeEventListener("focus", syncPlainExplanation);
    };
  }, []);

  const visibleBots = useMemo(
    () =>
      allTradeBots
        .filter((bot) => bot.environment === environment)
        .filter((bot) => !hiddenBotIds.has(bot.id))
        .map((bot) => ({ ...bot, status: statusById[bot.id] ?? "running" })),
    [allTradeBots, environment, hiddenBotIds, statusById]
  );
  const filteredVisibleBots = useMemo(() => {
    if (statusFilter === "all") return visibleBots;
    return visibleBots.filter((bot) =>
      statusFilter === "running" ? bot.status === "running" : bot.status !== "running"
    );
  }, [statusFilter, visibleBots]);
  const visiblePositions = useMemo(
    () => tradePositionRows.filter((row) => row.environment === environment),
    [environment]
  );
  const summary = useMemo(() => {
    const activeBots = visibleBots.filter((bot) => bot.status === "running").length;
    const totalEquity = visibleBots.reduce((acc, bot) => acc + bot.equity, 0);
    const totalUnrealized = visiblePositions.reduce((acc, row) => acc + row.pnl, 0);
    const avgWinRate =
      visibleBots.length > 0
        ? visibleBots.reduce((acc, bot) => acc + bot.winRate, 0) / visibleBots.length
        : 0;

    return { activeBots, totalEquity, totalUnrealized, avgWinRate };
  }, [visibleBots, visiblePositions]);

  const stopBot = (botId: string) => {
    setStatusById((prev) => ({ ...prev, [botId]: "paused" }));
    toast.success(tr("Trading bot stopped", "交易机器人已停止"));
  };

  const deleteBot = (botId: string) => {
    setHiddenBotIds((prev) => {
      const next = new Set(prev);
      next.add(botId);
      return next;
    });
    toast.success(tr("Trading bot deleted", "交易机器人已删除"));
  };

  const resolveStrategyHref = (bot: (typeof visibleBots)[number]) => {
    if (bot.strategyId) return `/strategies/${bot.strategyId}`;
    const matched = strategies.find((item) => item.name === bot.name);
    if (matched) return `/strategies/${matched.id}`;
    return `/strategies/${bot.id}?name=${encodeURIComponent(bot.name)}`;
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "stop") {
      stopBot(pendingAction.botId);
    } else {
      deleteBot(pendingAction.botId);
    }
    setPendingAction(null);
  };

  const marketLabel = (market: string) => {
    if (market === "Perp") return tr("Perp", "永续");
    if (market === "Spot") return tr("Spot", "现货");
    return market;
  };
  const formatMetricNumber = (value: number, digits = 2) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  const formatBotRoi = (bot: (typeof visibleBots)[number]) =>
    ((bot.unrealizedPnl / Math.max(bot.equity, 1)) * 100).toFixed(1);
  const metricExplanations = {
    activeBots: tr(
      "Number of strategies currently running automated trading. Running strategies = count of strategies in running status.",
      "当前处于自动交易状态的策略数量，进行中的策略 = 运行中策略数量。"
    ),
    totalEquity: tr(
      "Current total equity across all strategies. Total equity = sum of each strategy's account equity.",
      "当前所有策略的账户权益总额，总权益 = 各策略账户权益之和。"
    ),
    unrealizedPnl: tr(
      "Current floating profit or loss of open positions. Unrealized PnL = current position value - entry cost.",
      "当前未平仓仓位的浮动盈亏，未实现盈亏 = 当前持仓价值 - 开仓成本。"
    ),
    avgWinRate: tr(
      "Average profitability ratio across visible strategies. Average win rate = sum of strategy win rates / number of strategies.",
      "当前可见策略盈利交易占比的平均水平，平均胜率 = 各策略胜率之和 / 策略数量。"
    ),
  };
  const botMetricExplanations = () => ({
    equity: tr(
      "Current total account equity. Equity = balance + unrealized PnL.",
      "当前账户权益总额，权益总额 = 账户余额 + 未实现盈亏。"
    ),
    upnl: tr(
      "Current floating profit or loss. UPNL = current position value - entry cost.",
      "当前未平仓浮动盈亏，UPNL = 当前持仓价值 - 开仓成本。"
    ),
    roi: tr(
      "Current return ratio. ROI = UPNL / equity.",
      "当前收益率，ROI = UPNL / 权益总额。"
    ),
  });

  useEffect(() => {
    if (!focusStrategyId && !focusTradeId) return;
    const target = visibleBots.find((bot) => {
      if (focusTradeId) return bot.id === focusTradeId;
      return bot.strategyId === focusStrategyId;
    });
    if (!target) return;
    const element = document.getElementById(`trade-bot-${target.id}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setFocusedBotId(target.id);
    const timer = window.setTimeout(() => setFocusedBotId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [focusStrategyId, focusTradeId, visibleBots]);

  return (
    <div className={`oq-trade ${environment === "live" ? "is-live" : "is-paper"}`}>
      <div className="oq-trade-tabs" aria-label={tr("Trading environment", "交易环境")}>
        <button
          type="button"
          onClick={() => setEnvironment("paper")}
          className={`oq-trade-tab ${environment === "paper" ? "is-active" : ""}`}
          aria-pressed={environment === "paper"}
        >
          {tr("Paper Trading", "模拟交易")}
        </button>
        <button
          type="button"
          onClick={() => setEnvironment("live")}
          className={`oq-trade-tab ${environment === "live" ? "is-active" : ""}`}
          aria-pressed={environment === "live"}
        >
          {tr("Live Trading", "实盘交易")}
        </button>
      </div>

      <div className="oq-trade-summary-grid">
        <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={metricExplanations.activeBots}>
          <div className="oq-trade-metric-card">
            <div className="oq-trade-metric-label">
              <ShieldCheck className="h-3.5 w-3.5" />
              {tr("Running Strategies", "进行中的策略")}
            </div>
            <p className="oq-trade-metric-value">{summary.activeBots}</p>
            <p className="oq-trade-metric-note">{environment === "live" ? tr("Live execution", "实盘执行") : tr("Paper workspace", "模拟工作区")}</p>
          </div>
        </MaybeExplainTooltip>

        <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={metricExplanations.totalEquity}>
          <div className="oq-trade-metric-card">
            <div className="oq-trade-metric-label">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {tr("Total Equity", "总权益")}
            </div>
            <p className="oq-trade-metric-value">
              {summary.totalEquity.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="oq-trade-metric-note">USDT</p>
          </div>
        </MaybeExplainTooltip>

        <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={metricExplanations.unrealizedPnl}>
          <div className="oq-trade-metric-card">
            <div className="oq-trade-metric-label">
              <ArrowUpRight className={`h-3.5 w-3.5 ${getTrendClass(summary.totalUnrealized, chartColorMode)}`} />
              {tr("Unrealized PnL", "未实现盈亏")}
            </div>
            <p
              className={`oq-trade-metric-value ${getTrendClass(summary.totalUnrealized, chartColorMode)}`}
            >
              {formatSigned(summary.totalUnrealized)}
            </p>
            <p className="oq-trade-metric-note">{tr("Open positions", "当前持仓")}</p>
          </div>
        </MaybeExplainTooltip>

        <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={metricExplanations.avgWinRate}>
          <div className="oq-trade-metric-card">
            <div className="oq-trade-metric-label">
              <ShieldCheck className="h-3.5 w-3.5" />
              {tr("Avg Win Rate", "平均胜率")}
            </div>
            <p className="oq-trade-metric-value">
              {summary.avgWinRate.toFixed(1)}%
            </p>
            <p className="oq-trade-metric-note">{tr("Visible strategies", "可见策略")}</p>
          </div>
        </MaybeExplainTooltip>
      </div>

      <div className="oq-trade-section">
        <div className="oq-trade-section-header">
          <div className="oq-trade-section-title">
            <ShieldCheck className="h-4 w-4" />
            <span>{tr("Strategy List", "策略列表")}</span>
          </div>
          <div className="oq-trade-filter" aria-label={tr("Filter strategy status", "筛选策略状态")}>
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`oq-trade-filter-button ${statusFilter === "all" ? "is-active" : ""}`}
                aria-pressed={statusFilter === "all"}
              >
                {tr("All", "全部")}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("running")}
                className={`oq-trade-filter-button ${statusFilter === "running" ? "is-active" : ""}`}
                aria-pressed={statusFilter === "running"}
              >
                {tr("Running", "运行中")}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("stop")}
                className={`oq-trade-filter-button ${statusFilter === "stop" ? "is-active" : ""}`}
                aria-pressed={statusFilter === "stop"}
              >
                {tr("Stopped", "已停止")}
              </button>
          </div>
        </div>

        <div className="oq-trade-bot-list">
          {filteredVisibleBots.length === 0 ? (
            <div className="oq-trade-empty">
              <p className="oq-trade-empty-title">
                {tr("No trading bots match the selected status.", "没有符合当前状态筛选条件的交易机器人。")}
              </p>
              <p className="oq-trade-empty-copy">
                {tr("Try switching status filter or create/deploy a strategy in Strategy workspace.", "请尝试切换状态筛选，或前往策略工作区创建/部署策略。")}
              </p>
              <div className="oq-trade-empty-action">
                <Link href="/strategies">
                  <Button variant="outline" className="oq-trade-button">
                    {tr("Go to Strategy", "前往策略")}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            filteredVisibleBots.map((bot) => {
              const explanations = botMetricExplanations();

              return (
              <div
                key={bot.id}
                id={`trade-bot-${bot.id}`}
                className={`oq-trade-bot-row ${
                  focusedBotId === bot.id
                    ? "is-focused"
                    : ""
                }`}
              >
                <div className="oq-trade-bot-main">
                  <div className="oq-trade-bot-identity">
                    <div className="oq-trade-bot-heading">
                    <Link href={resolveStrategyHref(bot)}>
                      <div className="oq-trade-bot-title">
                        {bot.name}
                      </div>
                    </Link>
                    <span
                      className={`oq-trade-status ${bot.status === "running" ? "is-running" : "is-paused"}`}
                    >
                      {bot.status === "running" ? tr("running", "运行中") : tr("stopped", "已停止")}
                    </span>
                    </div>
                    <div className="oq-trade-bot-meta">
                      {bot.id} · {bot.symbol} · {marketLabel(bot.market)} · {bot.leverage}
                    </div>
                    <div className="oq-trade-bot-updated">{tr("Updated", "更新于")} {bot.updatedAt}</div>
                  </div>

                  <div className="oq-trade-bot-metrics">
                    <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={explanations.equity}>
                      <div className="oq-trade-bot-metric">
                        <div className="oq-trade-bot-metric-label">
                          {tr("Equity", "权益")}
                        </div>
                        <div className="oq-trade-bot-metric-value">
                          {bot.equity.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </MaybeExplainTooltip>
                    <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={explanations.upnl}>
                      <div className="oq-trade-bot-metric">
                        <div className="oq-trade-bot-metric-label">
                          UPNL
                        </div>
                        <div
                          className={`oq-trade-bot-metric-value ${getTrendClass(bot.unrealizedPnl, chartColorMode)}`}
                        >
                          {formatSigned(bot.unrealizedPnl)}
                        </div>
                      </div>
                    </MaybeExplainTooltip>
                    <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={explanations.roi}>
                      <div className="oq-trade-bot-metric">
                        <div className="oq-trade-bot-metric-label">
                          ROI
                        </div>
                        <div className="oq-trade-bot-metric-value">
                          {((bot.unrealizedPnl / Math.max(bot.equity, 1)) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </MaybeExplainTooltip>
                  </div>
                  <div className="oq-trade-actions">
                    <Link href={`/trade/${bot.id}?env=${bot.environment}&status=${bot.status}`}>
                      <Button
                        variant="outline"
                        className="oq-trade-button"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {tr("Details", "详情")}
                      </Button>
                    </Link>
                    {bot.status === "running" ? (
                      <Button
                        variant="outline"
                        className="oq-trade-button"
                        onClick={() => setPendingAction({ type: "stop", botId: bot.id })}
                      >
                        <CircleStop className="h-3.5 w-3.5" />
                        {tr("Stop", "停止")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="oq-trade-button is-risk"
                        onClick={() => setPendingAction({ type: "delete", botId: bot.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {tr("Delete", "删除")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>

      <AlertDialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="oq-trade-dialog">
          <AlertDialogHeader className="oq-trade-dialog-header">
            <AlertDialogTitle className="oq-trade-dialog-title">
              {pendingAction?.type === "stop" ? tr("Stop Trading Bot", "停止交易机器人") : tr("Delete Trading Bot", "删除交易机器人")}
            </AlertDialogTitle>
            <AlertDialogDescription className="oq-trade-dialog-description">
              {pendingAction?.type === "stop"
                ? tr("Are you sure you want to stop this bot? Open positions and bot settings will be kept for future resume.", "确认要停止这个机器人吗？当前持仓与机器人配置会被保留，后续可继续恢复。")
                : tr("Are you sure you want to delete this stopped bot from the workspace? This action cannot be undone.", "确认要将这个已停止的机器人从工作区中删除吗？此操作不可撤销。")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="oq-trade-dialog-footer">
            <AlertDialogCancel className="oq-trade-dialog-button">{tr("Cancel", "取消")}</AlertDialogCancel>
            <AlertDialogAction className="oq-trade-dialog-button is-primary" onClick={confirmPendingAction}>
              {pendingAction?.type === "stop" ? tr("Confirm Stop", "确认停止") : tr("Confirm Delete", "确认删除")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

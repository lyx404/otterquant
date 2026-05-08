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
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

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
  if (value === 0) return "text-foreground";
  const upClass = mode === "redUpGreenDown" ? "text-rose-400" : "text-emerald-400";
  const downClass = mode === "redUpGreenDown" ? "text-emerald-400" : "text-rose-400";
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

  const syncNow = () => {
    toast.success(tr("Trade state synced", "交易状态已同步"));
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
    <div className="space-y-6 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-foreground">{tr("Trade", "交易")}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {tr("Manage paper trading and live trading bots in one workspace.", "在同一工作区中管理模拟交易与实盘交易机器人。")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 rounded-full border-border bg-card px-3 text-xs"
            onClick={syncNow}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            {tr("Sync", "同步")}
          </Button>
        </div>
      </div>

      <div className="inline-flex h-9 items-center rounded-xl border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setEnvironment("paper")}
          className={`inline-flex h-7 items-center rounded-lg px-3 text-xs font-medium transition-colors ${
            environment === "paper"
              ? "bg-primary/12 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tr("Paper Trading", "模拟交易")}
        </button>
        <button
          type="button"
          onClick={() => setEnvironment("live")}
          className={`ml-1 inline-flex h-7 items-center rounded-lg px-3 text-xs font-medium transition-colors ${
            environment === "live"
              ? "bg-primary/12 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tr("Live Trading", "实盘交易")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={metricExplanations.activeBots}>
          <div className="surface-card h-[105px] border border-border px-6 py-5">
            <div className="mb-2 flex items-center gap-2 label-upper text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              {tr("Running Strategies", "进行中的策略")}
            </div>
            <p className="stat-value text-2xl font-bold text-foreground">{summary.activeBots}</p>
          </div>
        </MaybeExplainTooltip>

        <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={metricExplanations.totalEquity}>
          <div className="surface-card h-[105px] border border-border px-6 py-5">
            <div className="mb-2 flex items-center gap-2 label-upper text-muted-foreground">
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              {tr("Total Equity", "总权益")}
            </div>
            <p className="stat-value text-2xl font-bold text-foreground">
              {summary.totalEquity.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </MaybeExplainTooltip>

        <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={metricExplanations.unrealizedPnl}>
          <div className="surface-card h-[105px] border border-border px-6 py-5">
            <div className="mb-2 flex items-center gap-2 label-upper text-muted-foreground">
              <ArrowUpRight className={`h-3.5 w-3.5 ${getTrendClass(summary.totalUnrealized, chartColorMode)}`} />
              {tr("Unrealized PnL", "未实现盈亏")}
            </div>
            <p
              className={`stat-value text-2xl font-bold ${getTrendClass(summary.totalUnrealized, chartColorMode)}`}
            >
              {formatSigned(summary.totalUnrealized)}
            </p>
          </div>
        </MaybeExplainTooltip>

        <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={metricExplanations.avgWinRate}>
          <div className="surface-card h-[105px] border border-border px-6 py-5">
            <div className="mb-2 flex items-center gap-2 label-upper text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
              {tr("Avg Win Rate", "平均胜率")}
            </div>
            <p className="stat-value text-2xl font-bold text-foreground">
              {summary.avgWinRate.toFixed(1)}%
            </p>
          </div>
        </MaybeExplainTooltip>
      </div>

      <div className="surface-card overflow-hidden border border-border/70">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-3">
          <div className="text-sm font-semibold text-foreground">{tr("Strategy List", "策略列表")}</div>
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 items-center rounded-lg border border-border bg-card p-1">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`inline-flex h-6 items-center rounded-md px-2.5 text-[11px] font-medium transition-colors ${
                  statusFilter === "all"
                    ? "bg-primary/12 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tr("All", "全部")}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("running")}
                className={`ml-1 inline-flex h-6 items-center rounded-md px-2.5 text-[11px] font-medium transition-colors ${
                  statusFilter === "running"
                    ? "bg-primary/12 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tr("Running", "运行中")}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("stop")}
                className={`ml-1 inline-flex h-6 items-center rounded-md px-2.5 text-[11px] font-medium transition-colors ${
                  statusFilter === "stop"
                    ? "bg-primary/12 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tr("Stopped", "已停止")}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {filteredVisibleBots.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">
                {tr("No trading bots match the selected status.", "没有符合当前状态筛选条件的交易机器人。")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {tr("Try switching status filter or create/deploy a strategy in Strategy workspace.", "请尝试切换状态筛选，或前往策略工作区创建/部署策略。")}
              </p>
              <div className="mt-4 flex justify-center">
                <Link href="/strategies">
                  <Button variant="outline" className="h-8 rounded-full border-border bg-card px-3 text-xs">
                    {tr("Go to Strategy", "前往策略")}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            filteredVisibleBots.map((bot) => {
              const explanations = botMetricExplanations(bot);

              return (
              <div
                key={bot.id}
                id={`trade-bot-${bot.id}`}
                className={`rounded-2xl border bg-background/25 px-4 py-4 transition-all ${
                  focusedBotId === bot.id
                    ? "border-primary/55 bg-primary/5 ring-1 ring-primary/35"
                    : "border-border/55"
                }`}
              >
                <div className="grid gap-4 lg:grid-cols-[minmax(230px,1fr)_minmax(360px,1.8fr)_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                    <Link href={resolveStrategyHref(bot)}>
                      <div className="text-sm font-semibold text-foreground transition-colors hover:text-primary cursor-pointer">
                        {bot.name}
                      </div>
                    </Link>
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        bot.status === "running"
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {bot.status === "running" ? tr("running", "运行中") : tr("stopped", "已停止")}
                    </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {bot.id} · {bot.symbol} · {marketLabel(bot.market)} · {bot.leverage}
                    </div>
                    <div className="mt-3 text-[11px] text-muted-foreground">{tr("Updated", "更新于")} {bot.updatedAt}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-x-6 gap-y-4 border-t border-border/50 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                    <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={explanations.equity}>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          {tr("Equity", "权益")}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-foreground">
                          {bot.equity.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </MaybeExplainTooltip>
                    <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={explanations.upnl}>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          UPNL
                        </div>
                        <div
                          className={`mt-1 text-xs font-semibold ${getTrendClass(bot.unrealizedPnl, chartColorMode)}`}
                        >
                          {formatSigned(bot.unrealizedPnl)}
                        </div>
                      </div>
                    </MaybeExplainTooltip>
                    <MaybeExplainTooltip enabled={plainExplainEnabled} explanation={explanations.roi}>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          ROI
                        </div>
                        <div className="mt-1 text-xs font-semibold text-foreground">
                          {((bot.unrealizedPnl / Math.max(bot.equity, 1)) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </MaybeExplainTooltip>
                  </div>
                  <div className="flex items-center gap-2 border-t border-border/50 pt-4 lg:justify-end lg:border-t-0 lg:pt-0">
                    <Link href={`/trade/${bot.id}?env=${bot.environment}&status=${bot.status}`}>
                      <Button
                        variant="outline"
                        className="h-8 rounded-full border-border bg-card px-3 text-xs"
                      >
                        {tr("Details", "详情")}
                      </Button>
                    </Link>
                    {bot.status === "running" ? (
                      <Button
                        variant="outline"
                        className="h-8 rounded-full border-border bg-card px-3 text-xs"
                        onClick={() => setPendingAction({ type: "stop", botId: bot.id })}
                      >
                        {tr("Stop", "停止")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="h-8 rounded-full border-border bg-card px-3 text-xs text-destructive hover:text-destructive"
                        onClick={() => setPendingAction({ type: "delete", botId: bot.id })}
                      >
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "stop" ? tr("Stop Trading Bot", "停止交易机器人") : tr("Delete Trading Bot", "删除交易机器人")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "stop"
                ? tr("Are you sure you want to stop this bot? Open positions and bot settings will be kept for future resume.", "确认要停止这个机器人吗？当前持仓与机器人配置会被保留，后续可继续恢复。")
                : tr("Are you sure you want to delete this stopped bot from the workspace? This action cannot be undone.", "确认要将这个已停止的机器人从工作区中删除吗？此操作不可撤销。")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr("Cancel", "取消")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingAction}>
              {pendingAction?.type === "stop" ? tr("Confirm Stop", "确认停止") : tr("Confirm Delete", "确认删除")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import {
  tradeBots,
  tradePositionRows,
  formatSigned,
  type TradeEnvironment,
  type BotStatus,
} from "@/lib/tradeData";
import { getTradeBotsWithDeployments } from "@/lib/tradeDeployments";
import { ArrowDown, ArrowUp, ArrowUpDown, CircleStop, Play, RefreshCw } from "lucide-react";
import "./Trade.css";

type PendingAction =
  | { type: "stop"; botId: string }
  | null;

type BotStatusFilter = "all" | "running" | "stop";
type BotSortKey = "equity" | "unrealizedPnl" | "roi";
type BotSortDirection = "default" | "desc" | "asc";
type ChartColorMode = "redUpGreenDown" | "greenUpRedDown";
const CHART_COLOR_MODE_STORAGE_KEY = "otterquant:chart-color-mode";
const PLAIN_EXPLANATION_STORAGE_KEY = "otterquant:plain-explanations";

function readChartColorMode(): ChartColorMode {
  if (typeof window === "undefined") return "greenUpRedDown";
  const stored = window.localStorage.getItem(CHART_COLOR_MODE_STORAGE_KEY);
  return stored === "redUpGreenDown" || stored === "greenUpRedDown"
    ? stored
    : "greenUpRedDown";
}

function getTrendClass(value: number, mode: ChartColorMode) {
  if (value === 0) return "oq-trend-neutral";
  const upClass =
    mode === "redUpGreenDown" ? "oq-trend-risk" : "oq-trend-positive";
  const downClass =
    mode === "redUpGreenDown" ? "oq-trend-positive" : "oq-trend-risk";
  return value > 0 ? upClass : downClass;
}

function readPlainExplanationEnabled() {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(PLAIN_EXPLANATION_STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return true;
}

function formatRefreshTimestamp(date: Date) {
  const datePart = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
  const timePart = [date.getHours(), date.getMinutes()]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
  return `${datePart} ${timePart}`;
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
      <TooltipContent side="top" className="oq-plain-explanation-tooltip">
        {explanation}
      </TooltipContent>
    </Tooltip>
  );
}

const SHOW_WORKBENCH_260712 = true;

export default function Trade() {
  return SHOW_WORKBENCH_260712 ? <TradeWorkbench260712 /> : null;
}

function TradeWorkbench260712() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const search = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const envFromQuery = searchParams.get("env");
  const focusStrategyId = searchParams.get("focusStrategy");
  const focusTradeId = searchParams.get("focusTradeId");
  const tradeSearchQuery = (searchParams.get("q") ?? "").trim().toLowerCase();

  const [environment, setEnvironment] = useState<TradeEnvironment>(
    envFromQuery === "live" ? "live" : "paper"
  );
  const [focusedBotId, setFocusedBotId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [statusFilter, setStatusFilter] = useState<BotStatusFilter>("all");
  const [botSort, setBotSort] = useState<{ key: BotSortKey | null; direction: BotSortDirection }>({
    key: null,
    direction: "default",
  });
  const [chartColorMode, setChartColorMode] = useState<ChartColorMode>(() =>
    readChartColorMode()
  );
  const [plainExplainEnabled, setPlainExplainEnabled] = useState(() =>
    readPlainExplanationEnabled()
  );
  const allTradeBots = useMemo(
    () => getTradeBotsWithDeployments(tradeBots),
    []
  );
  const [statusById, setStatusById] = useState<Record<string, BotStatus>>(() =>
    Object.fromEntries(
      allTradeBots.map((bot, index) => [
        bot.id,
        index % 4 === 1 ? "paused" : "running",
      ])
    )
  );
  const [refreshedAtById, setRefreshedAtById] = useState<Record<string, string>>({});

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
    const syncPlainExplanation = () =>
      setPlainExplainEnabled(readPlainExplanationEnabled());
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
        .filter(bot => bot.environment === environment)
        .map(bot => ({
          ...bot,
          status: statusById[bot.id] ?? "running",
          updatedAt: refreshedAtById[bot.id] ?? bot.updatedAt,
        })),
    [allTradeBots, environment, refreshedAtById, statusById]
  );
  const searchFilteredBots = useMemo(() => {
    if (!tradeSearchQuery) return visibleBots;

    return visibleBots.filter(bot =>
      [bot.name, bot.id, bot.strategyId, bot.symbol, bot.market, bot.leverage]
        .filter(value => value !== undefined && value !== null)
        .some(value => String(value).toLowerCase().includes(tradeSearchQuery))
    );
  }, [tradeSearchQuery, visibleBots]);
  const filteredVisibleBots = useMemo(() => {
    if (statusFilter === "all") return searchFilteredBots;
    return searchFilteredBots.filter(bot =>
      statusFilter === "running"
        ? bot.status === "running"
        : bot.status !== "running"
    );
  }, [searchFilteredBots, statusFilter]);
  const sortedVisibleBots = useMemo(() => {
    if (!botSort.key || botSort.direction === "default") return filteredVisibleBots;

    const sortValue = (bot: (typeof filteredVisibleBots)[number]) => {
      if (botSort.key === "equity") return bot.equity;
      if (botSort.key === "unrealizedPnl") return bot.unrealizedPnl;
      return (bot.unrealizedPnl / Math.max(bot.equity, 1)) * 100;
    };
    const multiplier = botSort.direction === "desc" ? -1 : 1;

    return filteredVisibleBots
      .map((bot, index) => ({ bot, index }))
      .sort((left, right) => {
        const difference = sortValue(left.bot) - sortValue(right.bot);
        return difference === 0 ? left.index - right.index : difference * multiplier;
      })
      .map(({ bot }) => bot);
  }, [botSort, filteredVisibleBots]);
  const visiblePositions = useMemo(
    () => tradePositionRows.filter(row => row.environment === environment),
    [environment]
  );
  const summary = useMemo(() => {
    const activeBots = visibleBots.filter(
      bot => bot.status === "running"
    ).length;
    const totalEquity = visibleBots.reduce((acc, bot) => acc + bot.equity, 0);
    const totalUnrealized = visiblePositions.reduce(
      (acc, row) => acc + row.pnl,
      0
    );
    const avgRoi =
      visibleBots.length > 0
        ? visibleBots.reduce(
            (acc, bot) =>
              acc + (bot.unrealizedPnl / Math.max(bot.equity, 1)) * 100,
            0
          ) /
          visibleBots.length
        : 0;

    return { activeBots, totalEquity, totalUnrealized, avgRoi };
  }, [visibleBots, visiblePositions]);

  const stopBot = (botId: string) => {
    setStatusById(prev => ({ ...prev, [botId]: "paused" }));
    toast.success(tr("Paper trading stopped", "模拟盘已停止"));
  };

  const restartBot = (botId: string) => {
    setStatusById(prev => ({ ...prev, [botId]: "running" }));
    toast.success(tr("Paper trading restarted", "模拟盘已重新启动"));
  };

  const refreshBot = (botId: string) => {
    setRefreshedAtById(prev => ({
      ...prev,
      [botId]: formatRefreshTimestamp(new Date()),
    }));
    toast.success(tr("Paper trading data refreshed", "模拟盘数据已刷新"));
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    stopBot(pendingAction.botId);
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
  const cycleBotSort = (key: BotSortKey) => {
    setBotSort(current => {
      if (current.key !== key || current.direction === "default") {
        return { key, direction: "desc" };
      }
      if (current.direction === "desc") return { key, direction: "asc" };
      return { key: null, direction: "default" };
    });
  };
  const sortDirectionFor = (key: BotSortKey): BotSortDirection =>
    botSort.key === key ? botSort.direction : "default";
  const ariaSortFor = (key: BotSortKey): "none" | "ascending" | "descending" => {
    const direction = sortDirectionFor(key);
    if (direction === "desc") return "descending";
    if (direction === "asc") return "ascending";
    return "none";
  };
  const sortButtonLabel = (key: BotSortKey, enLabel: string, zhLabel: string) => {
    const direction = sortDirectionFor(key);
    if (direction === "default") return tr(`Sort ${enLabel} descending`, `${zhLabel}按降序排列`);
    if (direction === "desc") return tr(`Sort ${enLabel} ascending`, `${zhLabel}按升序排列`);
    return tr(`Restore default ${enLabel} order`, `恢复${zhLabel}默认顺序`);
  };
  const sortIconFor = (key: BotSortKey) => {
    const direction = sortDirectionFor(key);
    if (direction === "desc") return <ArrowDown aria-hidden="true" />;
    if (direction === "asc") return <ArrowUp aria-hidden="true" />;
    return <ArrowUpDown aria-hidden="true" />;
  };
  const metricExplanations = {
    activeBots: tr(
      "Number of strategies currently trading automatically.",
      "当前正在自动交易的策略数量。"
    ),
    totalEquity: tr(
      "Combined account assets of all visible strategies.",
      "所有可见策略的账户资产合计。"
    ),
    unrealizedPnl: tr(
      "Combined PnL across all visible strategies.",
      "当前可见策略的盈亏金额合计。"
    ),
    avgRoi: tr(
      "Average return across visible strategies.",
      "当前可见策略收益率的平均值。"
    ),
  };

  useEffect(() => {
    if (!focusStrategyId && !focusTradeId) return;
    const target = visibleBots.find(bot => {
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
    <div
      className={`oq-trade ${environment === "live" ? "is-live" : "is-paper"}`}
    >
      <div className="oq-trade-summary-grid">
        <MaybeExplainTooltip
          enabled={plainExplainEnabled}
          explanation={metricExplanations.activeBots}
        >
          <div className="oq-trade-metric-card">
            <p className="oq-trade-metric-value">{summary.activeBots}</p>
            <div className="oq-trade-metric-label">
              {tr("Running Strategies", "进行中的策略")}
            </div>
          </div>
        </MaybeExplainTooltip>

        <MaybeExplainTooltip
          enabled={plainExplainEnabled}
          explanation={metricExplanations.totalEquity}
        >
          <div className="oq-trade-metric-card">
            <p className="oq-trade-metric-value">
              {summary.totalEquity.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <div className="oq-trade-metric-label">
              {tr("Total Assets (USDT)", "总资产（USDT）")}
            </div>
          </div>
        </MaybeExplainTooltip>

        <MaybeExplainTooltip
          enabled={plainExplainEnabled}
          explanation={metricExplanations.unrealizedPnl}
        >
          <div className="oq-trade-metric-card">
            <p
              className={`oq-trade-metric-value ${getTrendClass(summary.totalUnrealized, chartColorMode)}`}
            >
              {formatSigned(summary.totalUnrealized)}
            </p>
            <div className="oq-trade-metric-label">
              {tr("PnL (USDT)", "盈亏（USDT）")}
            </div>
          </div>
        </MaybeExplainTooltip>

        <MaybeExplainTooltip
          enabled={plainExplainEnabled}
          explanation={metricExplanations.avgRoi}
        >
          <div className="oq-trade-metric-card">
            <p className="oq-trade-metric-value">
              {summary.avgRoi.toFixed(1)}%
            </p>
            <div className="oq-trade-metric-label">
              {tr("Average ROI", "平均ROI")}
            </div>
          </div>
        </MaybeExplainTooltip>
      </div>

      <div className="oq-trade-filter-row">
        <div
          className="oq-trade-filter"
          role="group"
          aria-label={tr("Filter strategy status", "筛选策略状态")}
        >
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`oq-trade-filter-button ${statusFilter === "all" ? "is-active" : ""}`}
            aria-pressed={statusFilter === "all"}
          >
            <span>{tr("All", "全部")}</span>
            <span className="oq-trade-filter-count">{visibleBots.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("running")}
            className={`oq-trade-filter-button ${statusFilter === "running" ? "is-active" : ""}`}
            aria-pressed={statusFilter === "running"}
          >
            <span>{tr("Running", "运行中")}</span>
            <span className="oq-trade-filter-count">{summary.activeBots}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("stop")}
            className={`oq-trade-filter-button ${statusFilter === "stop" ? "is-active" : ""}`}
            aria-pressed={statusFilter === "stop"}
          >
            <span>{tr("Stopped", "已停止")}</span>
            <span className="oq-trade-filter-count">
              {visibleBots.length - summary.activeBots}
            </span>
          </button>
        </div>
      </div>

      <div className="oq-trade-section">
        <div
          className="oq-trade-table-scroll"
          role="table"
          aria-label={tr("Trading strategies", "交易策略")}
        >
          <div className="oq-trade-table-head oq-trade-table-grid" role="row">
            <div role="columnheader">{tr("Strategy", "策略")}</div>
            <div role="columnheader" aria-sort={ariaSortFor("equity")}>
              <button
                type="button"
                className={`oq-trade-sort-button ${sortDirectionFor("equity") !== "default" ? "is-active" : ""}`}
                onClick={() => cycleBotSort("equity")}
                aria-label={sortButtonLabel("equity", "assets", "资产")}
              >
                <span>{tr("Assets", "资产")}</span>
                {sortIconFor("equity")}
              </button>
            </div>
            <div role="columnheader" aria-sort={ariaSortFor("unrealizedPnl")}>
              <button
                type="button"
                className={`oq-trade-sort-button ${sortDirectionFor("unrealizedPnl") !== "default" ? "is-active" : ""}`}
                onClick={() => cycleBotSort("unrealizedPnl")}
                aria-label={sortButtonLabel("unrealizedPnl", "PnL", "盈亏")}
              >
                <span>{tr("PnL", "盈亏")}</span>
                {sortIconFor("unrealizedPnl")}
              </button>
            </div>
            <div role="columnheader" aria-sort={ariaSortFor("roi")}>
              <button
                type="button"
                className={`oq-trade-sort-button ${sortDirectionFor("roi") !== "default" ? "is-active" : ""}`}
                onClick={() => cycleBotSort("roi")}
                aria-label={sortButtonLabel("roi", "return", "收益率")}
              >
                <span>{tr("Return", "收益率")}</span>
                {sortIconFor("roi")}
              </button>
            </div>
            <div role="columnheader">{tr("Paper Status", "模拟盘状态")}</div>
            <div role="columnheader">{tr("Updated", "更新时间")}</div>
            <div role="columnheader">{tr("Actions", "操作")}</div>
          </div>

          <div className="oq-trade-bot-list" role="rowgroup">
            {sortedVisibleBots.length === 0 ? (
              <div className="oq-trade-empty">
                <p className="oq-trade-empty-title">
                  {tr(
                    tradeSearchQuery
                      ? "No matching paper-trading deployments"
                      : "No paper-trading deployments in this status",
                    tradeSearchQuery
                      ? "未找到匹配的模拟盘"
                      : "当前状态下没有模拟盘"
                  )}
                </p>
                <p className="oq-trade-empty-copy">
                  {tr(
                    tradeSearchQuery
                      ? "Adjust the keyword or status filter."
                      : "Switch the status filter.",
                    tradeSearchQuery
                      ? "请调整关键词或状态筛选。"
                      : "请切换状态筛选。"
                  )}
                </p>
              </div>
            ) : (
              sortedVisibleBots.map(bot => (
                <div
                  key={bot.id}
                  id={`trade-bot-${bot.id}`}
                  className={`oq-trade-bot-row ${focusedBotId === bot.id ? "is-focused" : ""}`}
                  role="row"
                >
                  <Link
                    href={`/trade/${bot.id}?env=${bot.environment}&status=${bot.status}`}
                    className="oq-trade-row-link"
                    aria-label={tr(
                      `Open ${bot.name} details`,
                      `打开 ${bot.name} 详情`
                    )}
                  >
                    <div className="oq-trade-bot-identity" role="cell">
                      <div className="oq-trade-bot-title">{bot.name}</div>
                      <div className="oq-trade-bot-meta">
                        {bot.id} · {bot.symbol} · {marketLabel(bot.market)} ·{" "}
                        {bot.leverage}
                      </div>
                    </div>

                    <div className="oq-trade-bot-metric-value" role="cell">
                      {bot.equity.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} USDT
                    </div>
                    <div
                      className={`oq-trade-bot-metric-value ${getTrendClass(bot.unrealizedPnl, chartColorMode)}`}
                      role="cell"
                    >
                      {formatSigned(bot.unrealizedPnl)} USDT
                    </div>
                    <div className="oq-trade-bot-metric-value" role="cell">
                      {formatBotRoi(bot)}%
                    </div>

                    <span
                      className={`oq-trade-status ${bot.status === "running" ? "is-running" : "is-paused"}`}
                      role="cell"
                    >
                      <span aria-hidden="true" />
                      {bot.status === "running"
                        ? tr("Running", "运行中")
                        : tr("Stopped", "已停止")}
                    </span>
                    <time className="oq-trade-bot-updated" role="cell">
                      {bot.updatedAt}
                    </time>
                  </Link>

                  <div className="oq-trade-actions" role="cell">
                    {bot.status === "running" ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="oq-trade-icon-button"
                              aria-label={tr("Refresh", "刷新")}
                              onClick={() => refreshBot(bot.id)}
                            >
                              <RefreshCw aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{tr("Refresh", "刷新")}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="oq-trade-icon-button is-stop"
                              aria-label={tr("Stop", "停止")}
                              onClick={() =>
                                setPendingAction({ type: "stop", botId: bot.id })
                              }
                            >
                              <CircleStop aria-hidden="true" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">{tr("Stop", "停止")}</TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="oq-trade-icon-button"
                            aria-label={tr("Restart", "重新启动")}
                            onClick={() => restartBot(bot.id)}
                          >
                            <Play aria-hidden="true" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">{tr("Restart", "重新启动")}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={open => !open && setPendingAction(null)}
      >
        <AlertDialogContent className="oq-trade-dialog">
          <AlertDialogHeader className="oq-trade-dialog-header">
            <AlertDialogTitle className="oq-trade-dialog-title">
              {tr("Stop Paper Trading", "停止模拟盘")}
            </AlertDialogTitle>
            <AlertDialogDescription className="oq-trade-dialog-description">
              {tr(
                "Are you sure you want to stop this paper-trading deployment? Open positions and its configuration will be kept so you can restart it later.",
                "确认要停止该模拟盘吗？当前持仓与模拟盘配置将保留，之后可以重新启动。"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="oq-trade-dialog-footer">
            <AlertDialogCancel className="oq-trade-dialog-button">
              {tr("Cancel", "取消")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="oq-trade-dialog-button is-primary"
              onClick={confirmPendingAction}
            >
              {tr("Confirm Stop", "确认停止")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

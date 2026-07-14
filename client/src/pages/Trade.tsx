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
import { CircleStop, Trash2 } from "lucide-react";
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

  const [environment, setEnvironment] = useState<TradeEnvironment>(
    envFromQuery === "live" ? "live" : "paper"
  );
  const [focusedBotId, setFocusedBotId] = useState<string | null>(null);
  const [hiddenBotIds, setHiddenBotIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [statusFilter, setStatusFilter] = useState<BotStatusFilter>("all");
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
        .filter(bot => !hiddenBotIds.has(bot.id))
        .map(bot => ({ ...bot, status: statusById[bot.id] ?? "running" })),
    [allTradeBots, environment, hiddenBotIds, statusById]
  );
  const filteredVisibleBots = useMemo(() => {
    if (statusFilter === "all") return visibleBots;
    return visibleBots.filter(bot =>
      statusFilter === "running"
        ? bot.status === "running"
        : bot.status !== "running"
    );
  }, [statusFilter, visibleBots]);
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
    toast.success(tr("Trading bot stopped", "交易机器人已停止"));
  };

  const deleteBot = (botId: string) => {
    setHiddenBotIds(prev => {
      const next = new Set(prev);
      next.add(botId);
      return next;
    });
    toast.success(tr("Trading bot deleted", "交易机器人已删除"));
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
    avgRoi: tr(
      "Average return across visible strategies. Average ROI = sum of strategy ROI / number of strategies.",
      "当前可见策略收益率的平均水平，平均ROI = 各策略ROI之和 / 策略数量。"
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
              {tr("Total Equity", "总权益")}
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
              {tr("Unrealized PnL", "未实现盈亏")}
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
            <div role="columnheader">{tr("Equity", "权益")}</div>
            <div role="columnheader">{tr("Unrealized PnL", "未实现盈亏")}</div>
            <div role="columnheader">ROI</div>
            <div role="columnheader">{tr("Status", "状态")}</div>
            <div role="columnheader">{tr("Updated", "更新时间")}</div>
            <div role="columnheader">{tr("Actions", "操作")}</div>
          </div>

          <div className="oq-trade-bot-list" role="rowgroup">
            {filteredVisibleBots.length === 0 ? (
              <div className="oq-trade-empty">
                <p className="oq-trade-empty-title">
                  {tr(
                    "No trading bots match the selected status.",
                    "没有符合当前状态筛选条件的交易机器人。"
                  )}
                </p>
                <p className="oq-trade-empty-copy">
                  {tr(
                    "Try switching status filter or create/deploy a strategy in Strategy workspace.",
                    "请尝试切换状态筛选，或前往策略工作区创建/部署策略。"
                  )}
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
              filteredVisibleBots.map(bot => {
                const explanations = botMetricExplanations();

                return (
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

                      <MaybeExplainTooltip
                        enabled={plainExplainEnabled}
                        explanation={explanations.equity}
                      >
                        <div className="oq-trade-bot-metric-value" role="cell">
                          {bot.equity.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </MaybeExplainTooltip>
                      <MaybeExplainTooltip
                        enabled={plainExplainEnabled}
                        explanation={explanations.upnl}
                      >
                        <div
                          className={`oq-trade-bot-metric-value ${getTrendClass(bot.unrealizedPnl, chartColorMode)}`}
                          role="cell"
                        >
                          {formatSigned(bot.unrealizedPnl)}
                        </div>
                      </MaybeExplainTooltip>
                      <MaybeExplainTooltip
                        enabled={plainExplainEnabled}
                        explanation={explanations.roi}
                      >
                        <div className="oq-trade-bot-metric-value" role="cell">
                          {formatBotRoi(bot)}%
                        </div>
                      </MaybeExplainTooltip>

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
                        <Button
                          variant="outline"
                          className="oq-trade-button"
                          onClick={() =>
                            setPendingAction({ type: "stop", botId: bot.id })
                          }
                        >
                          <CircleStop className="h-3.5 w-3.5" />
                          {tr("Stop", "停止")}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="oq-trade-button is-risk"
                          onClick={() =>
                            setPendingAction({ type: "delete", botId: bot.id })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {tr("Delete", "删除")}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
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
              {pendingAction?.type === "stop"
                ? tr("Stop Trading Bot", "停止交易机器人")
                : tr("Delete Trading Bot", "删除交易机器人")}
            </AlertDialogTitle>
            <AlertDialogDescription className="oq-trade-dialog-description">
              {pendingAction?.type === "stop"
                ? tr(
                    "Are you sure you want to stop this bot? Open positions and bot settings will be kept for future resume.",
                    "确认要停止这个机器人吗？当前持仓与机器人配置会被保留，后续可继续恢复。"
                  )
                : tr(
                    "Are you sure you want to delete this stopped bot from the workspace? This action cannot be undone.",
                    "确认要将这个已停止的机器人从工作区中删除吗？此操作不可撤销。"
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
              {pendingAction?.type === "stop"
                ? tr("Confirm Stop", "确认停止")
                : tr("Confirm Delete", "确认删除")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

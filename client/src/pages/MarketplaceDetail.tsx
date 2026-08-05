import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, UserRoundPlus } from "lucide-react";
import { useLocation, useParams } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { translateUi, useAppLanguage, type UiLang } from "@/contexts/AppLanguageContext";
import {
  marketplaceCardDetails,
  marketplaceStrategies,
  marketplaceTradeSource,
} from "@/lib/marketplaceData";
import {
  formatSigned,
  tradeBots,
  tradeFillRows,
  tradeHistoryRows,
  tradePositionRows,
} from "@/lib/tradeData";
import {
  buildTradeTrendData,
  TradeTrendChart,
  type TradeTrendMetric,
} from "@/components/TradeTrendChart";
import { CopyTradeDialog } from "@/components/CopyTradeDialog";
import "./MarketplaceDetail.css";
import "./TradeDetail.css";

type Follower = {
  name: string;
  amount: string;
  pnl: string;
  days: string;
  tone: string;
};

type MarketplaceTimeRange = "today" | "7d" | "30d";

const followers: Follower[] = [
  { name: "一海人", amount: "60,000", pnl: "+38,977.91", days: "49天", tone: "sunset" },
  { name: "静心·语", amount: "100,000", pnl: "+31,497.94", days: "37天", tone: "ink" },
  { name: "Ne*****X", amount: "50,000", pnl: "+19,290.74", days: "32天", tone: "mist" },
  { name: "寂静**者", amount: "30,000", pnl: "+17,552.73", days: "48天", tone: "sky" },
  { name: "chi******n", amount: "1,000", pnl: "+13,104.27", days: "38天", tone: "violet" },
  { name: "找我·事", amount: "11,011", pnl: "+5,006.77", days: "30天", tone: "rose" },
];

function formatMoney(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function metricNumber(value: string) {
  return Number(value.replace(/[^\d.-]/g, ""));
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "positive" | "risk" }) {
  return (
    <div className="oq-marketplace-detail-metric">
      <span>{label}</span>
      <strong className={`is-${tone}`}>{value}</strong>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="oq-marketplace-detail-empty">{label}</div>;
}

function TimeRangeSelector({
  value,
  onChange,
  tr,
}: {
  value: MarketplaceTimeRange;
  onChange: (value: MarketplaceTimeRange) => void;
  tr: (en: string, zh: string) => string;
}) {
  const options = [
    ["today", "Today", "今天"],
    ["7d", "Past 7 days", "近 7 天"],
    ["30d", "Past 30 days", "近 30 天"],
  ] as const;
  const activeOption = options.find(([key]) => key === value) ?? options[2];

  return (
    <div
      className="oq-marketplace-detail-time-range"
      role="group"
      aria-label={tr("Time range", "时间范围")}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="oq-marketplace-detail-time-range-trigger">
            <span>{tr(activeOption[1], activeOption[2])}</span>
            <ChevronDown aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="oq-marketplace-detail-time-range-menu">
          {options.map(([key, en, zh]) => (
            <DropdownMenuItem
              key={key}
              className={`oq-marketplace-detail-time-range-item${value === key ? " is-active" : ""}`}
              onSelect={() => onChange(key)}
            >
              <span>{tr(en, zh)}</span>
              {value === key ? <Check aria-hidden="true" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function MarketplaceDetail() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => translateUi(uiLang, en, zh);
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [isFollowing, setIsFollowing] = useState(false);
  const [copyTarget, setCopyTarget] = useState<typeof marketplaceStrategies[number] | null>(null);
  const [chartMetric, setChartMetric] = useState<TradeTrendMetric>("return");
  const [timeRange, setTimeRange] = useState<MarketplaceTimeRange>("30d");
  const strategyId = params?.id ?? "";
  const strategy = marketplaceStrategies.find((item) => item.id === strategyId);
  const details = strategy ? marketplaceCardDetails[strategy.id] : undefined;
  const sourceTradeId = strategy ? marketplaceTradeSource[strategy.id] : undefined;
  const trade = tradeBots.find((item) => item.id === sourceTradeId);

  useEffect(() => {
    document.documentElement.classList.add("oq-marketplace-detail-active");
    window.scrollTo(0, 0);
    return () => document.documentElement.classList.remove("oq-marketplace-detail-active");
  }, [strategyId]);

  const currentPositions = useMemo(
    () => tradePositionRows.filter((row) => row.environment === trade?.environment),
    [trade?.environment],
  );
  const historyPositions = useMemo(
    () => tradeHistoryRows.filter((row) => row.environment === trade?.environment),
    [trade?.environment],
  );
  const activityRows = useMemo(
    () => tradeFillRows.filter((row) => row.environment === trade?.environment),
    [trade?.environment],
  );
  const currentPositionRows = useMemo(
    () => currentPositions.map((row) => {
      const margin = metricNumber(row.margin);
      return {
        ...row,
        roi: margin > 0 ? (row.pnl / margin) * 100 : 0,
        signedSize: row.side === "short" && !row.size.startsWith("-") ? `-${row.size}` : row.size,
      };
    }),
    [currentPositions],
  );

  if (!strategy || !details || !trade) {
    return (
      <div className="oq-marketplace-detail oq-marketplace-detail-not-found">
        <p>{tr("Strategy not found", "未找到策略")}</p>
        <button type="button" onClick={() => navigate("/marketplace")}>{tr("Back to Explore", "返回探索")}</button>
      </div>
    );
  }

  const totalPnl = Number((trade.unrealizedPnl * 3.65).toFixed(2));
  const baseEquity = Math.max(trade.equity - totalPnl, 1);
  const roi = (totalPnl / baseEquity) * 100;
  const winRate = Number(strategy.winRate.replace("%", ""));
  const sharpe = 0.45 + winRate / 32;
  const drawdown = Number(strategy.maxDrawdown.replace("%", "")) + 1.06;
  const assetsUnderManagement = followers.reduce((total, follower) => total + metricNumber(follower.amount), 0);
  const strategyStartTimestamp = Date.parse(`${strategy.updatedAt}T00:00:00Z`);
  const latestTradeTimestamp = Date.parse(`${trade.updatedAt.replace(" ", "T")}Z`);
  const strategyAgeDays = Number.isFinite(strategyStartTimestamp) && Number.isFinite(latestTradeTimestamp)
    ? Math.max(1, Math.round((latestTradeTimestamp - strategyStartTimestamp) / 86_400_000))
    : 1;
  const followerCount = strategy.capacity
    ? `${strategy.subscribers.toLocaleString("en-US")}/${strategy.capacity.toLocaleString("en-US")}`
    : strategy.subscribers.toLocaleString("en-US");
  const heroIdentity = strategy.id === "STR-008"
    ? { author: "南山有鹿", avatar: "南", strategyName: "SOL 动量趋势", usesEntryAvatar: true }
    : { author: strategy.author, avatar: strategy.author.slice(0, 1), strategyName: strategy.name, usesEntryAvatar: false };
  const trendData = useMemo(
    () => buildTradeTrendData({ returnRate: roi, pnl: totalPnl, updatedAt: trade.updatedAt }),
    [roi, totalPnl, trade.updatedAt],
  );
  const visibleTrendData = useMemo(() => {
    const pointCount = timeRange === "today" ? 2 : timeRange === "7d" ? 7 : 30;
    return trendData.slice(-pointCount);
  }, [timeRange, trendData]);

  return (
    <div className="oq-marketplace-detail">
      <section className="oq-marketplace-detail-topbar" aria-label={tr("Strategy heading", "策略顶部信息")}>
        <header className="oq-marketplace-detail-hero">
          <div className="oq-marketplace-detail-hero-inner">
            <div className="oq-marketplace-detail-hero-copy">
              <div className={`oq-marketplace-detail-avatar${heroIdentity.usesEntryAvatar ? " is-entry" : ""}`} aria-hidden="true">{heroIdentity.avatar}</div>
              <div className="oq-marketplace-detail-hero-details">
                <h1>{heroIdentity.author}</h1>
                <div className="oq-marketplace-detail-hero-stats" aria-label={tr("Strategy activity", "策略数据")}>
                  <div className="oq-marketplace-detail-hero-stat">
                    <span>{tr("Followers", "跟单人数")}</span>
                    <strong>{followerCount}</strong>
                  </div>
                  <div className="oq-marketplace-detail-hero-stat">
                    <span>{tr("Lead days", "带单天数")}</span>
                    <strong>{strategyAgeDays}</strong>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              className={`oq-marketplace-detail-follow${isFollowing ? " is-following" : ""}`}
              aria-pressed={isFollowing}
              onClick={() => {
                if (!isFollowing) setCopyTarget(strategy);
              }}
            >
              <UserRoundPlus aria-hidden="true" />
              {isFollowing ? tr("Following", "已跟单") : tr("Follow", "跟单")}
            </button>
          </div>
        </header>
      </section>

      <div className="oq-marketplace-detail-shell">
        <div className="oq-marketplace-detail-content">
          <section className="oq-marketplace-detail-intro" aria-label={tr("Strategy thesis", "策略思路")}>
            <article className="oq-marketplace-detail-insights">
              <h2 className="oq-marketplace-detail-insights-title">{heroIdentity.strategyName}</h2>
              <Insight title={tr("Strategy thesis", "策略思路")} text={tr(strategy.description, details.descriptionZh)} />
              <Insight title={tr("When to enter", "何时入场")} text={tr("Enter when SOL flow and momentum confirm the same direction across the active cycle.", "当 SOL 资金流与动量在当前周期确认同向时入场。")} />
              <Insight title={tr("When to exit", "何时离场")} text={tr("Reduce exposure when momentum fades or the position reaches its risk budget.", "当动量减弱或仓位触及风险预算时逐步减仓。")} />
              <Insight title={tr("Risk controls", "如何控制风险")} text={tr("Exposure is sized around volatility and liquidity so the strategy stays within its drawdown guardrail.", "根据波动率与流动性配置仓位，将策略控制在回撤边界内。")} />
            </article>
          </section>

          <div className="oq-marketplace-detail-analytics-grid">
            <article className="oq-marketplace-detail-summary" aria-labelledby="marketplace-detail-summary-title">
              <div className="oq-marketplace-detail-section-header">
                <h2 id="marketplace-detail-summary-title">{tr("Performance overview", "数据总览")}</h2>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} tr={tr} />
              </div>
              <div className="oq-marketplace-detail-summary-grid">
                <div className="oq-marketplace-detail-summary-featured">
                  <Metric label={tr("Return rate", "收益率")} value={`${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`} tone="positive" />
                  <Metric label={tr("P&L (USDT)", "盈亏(USDT)")} value={`${totalPnl >= 0 ? "+" : ""}${formatMoney(totalPnl)}`} tone="positive" />
                </div>
                <div className="oq-marketplace-detail-summary-list">
                  <Metric label={tr("Max drawdown", "最大回撤")} value={`-${drawdown.toFixed(2)}%`} tone="risk" />
                  <Metric label={tr("Sharpe ratio", "夏普比率")} value={sharpe.toFixed(2)} />
                  <Metric label={tr("Win rate", "胜率")} value={strategy.winRate} />
                  <Metric label={tr("Assets under management", "资产管理规模")} value={`$${assetsUnderManagement.toLocaleString("en-US")}`} />
                </div>
              </div>
            </article>

            <section className="oq-marketplace-detail-chart-section" aria-labelledby="marketplace-detail-chart-title">
              <div className="oq-marketplace-detail-section-header">
                <div className="oq-marketplace-detail-chart-heading">
                  <h2 id="marketplace-detail-chart-title">{tr("Performance", "收益走势")}</h2>
                  <TimeRangeSelector value={timeRange} onChange={setTimeRange} tr={tr} />
                </div>
                <div className="oq-marketplace-detail-chart-actions">
                  <div className="oq-trade-trend-selector" role="group" aria-label={tr("Chart metric", "图表指标")}>
                    <button
                      type="button"
                      className={chartMetric === "return" ? "is-active" : ""}
                      aria-pressed={chartMetric === "return"}
                      onClick={() => setChartMetric("return")}
                    >
                      {tr("Return rate", "收益率")}
                    </button>
                    <button
                      type="button"
                      className={chartMetric === "pnl" ? "is-active" : ""}
                      aria-pressed={chartMetric === "pnl"}
                      onClick={() => setChartMetric("pnl")}
                    >
                      {tr("P&L", "盈亏")}
                    </button>
                  </div>
                </div>
              </div>
              <TradeTrendChart
                data={visibleTrendData}
                metric={chartMetric}
                metricLabel={chartMetric === "return" ? tr("Return rate", "收益率") : tr("P&L", "盈亏")}
                year={trade.updatedAt.slice(0, 4)}
                ariaLabel={
                  chartMetric === "return"
                    ? tr(`${strategy.name} performance curve`, `${strategy.name} 收益曲线`)
                    : tr(`${strategy.name} P&L curve`, `${strategy.name} 盈亏曲线`)
                }
              />
            </section>
          </div>

          <section className="oq-marketplace-detail-records oq-trade-workspace" aria-label={tr("Positions and activity", "仓位与交易记录")}>
            <Tabs defaultValue="current" className="oq-trade-workspace-tabs">
              <div className="oq-trade-workspace-tabs-header">
                <TabsList className="oq-trade-workspace-tabs-list" aria-label={tr("Position views", "仓位视图")}>
                  <TabsTrigger value="current">{tr("Current positions", "当前持仓")}</TabsTrigger>
                  <TabsTrigger value="history">{tr("Historical positions", "历史持仓")}</TabsTrigger>
                  <TabsTrigger value="activity">{tr("Activity log", "操作记录")}</TabsTrigger>
                  <TabsTrigger value="followers">{tr("Followers", "跟单用户")}</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="current" className="oq-trade-workspace-tab-panel">
                <CurrentPositions rows={currentPositionRows} tr={tr} />
              </TabsContent>
              <TabsContent value="history" className="oq-trade-workspace-tab-panel">
                <HistoricalPositions rows={historyPositions} tr={tr} />
              </TabsContent>
              <TabsContent value="activity" className="oq-trade-workspace-tab-panel">
                <ActivityRows rows={activityRows} tr={tr} uiLang={uiLang} />
              </TabsContent>
              <TabsContent value="followers" className="oq-trade-workspace-tab-panel">
                <FollowersTable rows={followers} tr={tr} />
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </div>
      <CopyTradeDialog
        strategy={copyTarget}
        tr={tr}
        onOpenChange={(open) => {
          if (!open) setCopyTarget(null);
        }}
        onConfirm={() => {
          setIsFollowing(true);
          setCopyTarget(null);
        }}
      />
    </div>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="oq-marketplace-detail-insight">
      <span aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

type CurrentPositionRow = (typeof tradePositionRows)[number] & {
  roi: number;
  signedSize: string;
};

function TradeWorkspaceTable({
  label,
  className,
  headers,
  isEmpty,
  emptyMessage,
  children,
}: {
  label: string;
  className?: string;
  headers: string[];
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  if (isEmpty) return <div className="oq-trade-workspace-empty">{emptyMessage}</div>;

  return (
    <div className="oq-trade-workspace-table-scroll">
      <table className={`oq-trade-workspace-table${className ? ` ${className}` : ""}`} aria-label={label}>
        <thead>
          <tr>{headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function CurrentPositions({ rows, tr }: { rows: CurrentPositionRow[]; tr: (en: string, zh: string) => string }) {
  return (
    <TradeWorkspaceTable
      label={tr("Current positions", "当前持仓")}
      className="is-current-positions"
      headers={[
        tr("Symbol", "交易对"),
        tr("Size", "数量"),
        tr("Entry", "开仓均价"),
        tr("Mark", "标记价格"),
        tr("Margin", "保证金"),
        tr("Unrealized PnL (USDT)", "未实现盈亏（USDT）"),
        tr("Return", "收益率"),
      ]}
      isEmpty={rows.length === 0}
      emptyMessage={tr("No current positions", "暂无当前持仓")}
    >
      {rows.map((row) => (
        <tr key={row.id}>
          <td className="oq-trade-position-symbol">
            <div className="oq-trade-position-symbol-line"><strong>{row.symbol}</strong></div>
            <div className="oq-trade-position-meta">
              <span className={`oq-trade-position-direction is-${row.side}`}>
                {row.side === "long" ? tr("Long", "做多") : tr("Short", "做空")}
              </span>
              <span>{tr("Perp", "永续")}</span>
              <span>{row.leverage}</span>
            </div>
          </td>
          <td className={`oq-trade-position-size is-${row.side}`}>{row.signedSize}</td>
          <td className="oq-trade-position-number">{row.entry}</td>
          <td className="oq-trade-position-number">{row.mark}</td>
          <td className="oq-trade-position-stack">
            <strong>{row.margin}</strong>
            <span className="oq-trade-position-margin-mode">
              {row.marginMode === "cross" ? tr("Cross", "全仓") : tr("Isolated", "逐仓")}
            </span>
          </td>
          <td className={`oq-trade-workspace-value ${row.pnl >= 0 ? "is-positive" : "is-negative"}`}>
            <strong>{formatSigned(row.pnl)} USDT</strong>
          </td>
          <td className={`oq-trade-workspace-value ${row.roi >= 0 ? "is-positive" : "is-negative"}`}>
            <strong>{formatSigned(row.roi)}%</strong>
          </td>
        </tr>
      ))}
    </TradeWorkspaceTable>
  );
}

function FollowersTable({ rows, tr }: { rows: Follower[]; tr: (en: string, zh: string) => string }) {
  return (
    <TradeWorkspaceTable
      label={tr("Followers", "跟单用户")}
      className="is-followers"
      headers={[
        tr("Follower", "跟单用户"),
        tr("Cumulative amount (USDT)", "累计金额 (USDT)"),
        tr("Cumulative P&L (USDT)", "累计盈亏 (USDT)"),
        tr("Days following", "跟单天数"),
      ]}
      isEmpty={rows.length === 0}
      emptyMessage={tr("No followers", "暂无跟单用户")}
    >
      {rows.map((follower) => (
        <tr key={follower.name}>
          <td>
            <div className="oq-marketplace-detail-follower-cell">
              <span className={`oq-marketplace-detail-follower-avatar is-${follower.tone}`} aria-hidden="true">{follower.name.slice(0, 1)}</span>
              <strong>{follower.name}</strong>
            </div>
          </td>
          <td>{follower.amount}</td>
          <td className="oq-trade-workspace-value is-positive"><strong>{follower.pnl}</strong></td>
          <td>{follower.days}</td>
        </tr>
      ))}
    </TradeWorkspaceTable>
  );
}

function HistoricalPositions({ rows, tr }: { rows: typeof tradeHistoryRows; tr: (en: string, zh: string) => string }) {
  return (
    <TradeWorkspaceTable
      label={tr("Position history", "历史持仓")}
      className="is-history-positions"
      headers={[
        tr("Symbol", "交易对"),
        tr("Opened At", "开仓时间"),
        tr("Entry Price", "开仓价格"),
        tr("Closed At", "全部平仓"),
        tr("Maximum Position Size", "最大持仓量"),
        tr("Exit Average", "平仓均价"),
        tr("Realized PnL", "平仓盈亏"),
      ]}
      isEmpty={rows.length === 0}
      emptyMessage={tr("No position history", "暂无历史持仓")}
    >
      {rows.map((row) => {
        const [openedDate, openedTime] = row.openedAt.split(" ");
        const [closedDate, closedTime] = row.closedAt.split(" ");
        return (
          <tr key={row.id}>
            <td className="oq-trade-position-symbol">
              <div className="oq-trade-position-symbol-line"><strong>{row.symbol}</strong></div>
              <div className="oq-trade-position-meta">
                <span className={`oq-trade-position-direction is-${row.side}`}>
                  {row.side === "long" ? tr("Long", "做多") : tr("Short", "做空")}
                </span>
                <span>{row.marginMode === "cross" ? tr("Cross", "全仓") : tr("Isolated", "逐仓")}</span>
                <span>{row.market === "Perp" ? tr("Perp", "永续") : tr("Spot", "现货")}</span>
                <span>{row.leverage}</span>
              </div>
            </td>
            <td className="oq-trade-history-time"><strong>{openedDate}</strong><span>{openedTime}</span></td>
            <td className="oq-trade-position-number">{row.entryPrice}</td>
            <td className="oq-trade-history-time"><strong>{closedDate}</strong><span>{closedTime}</span></td>
            <td className="oq-trade-position-stack">
              <strong>{row.maxSize}</strong>
              <div className="oq-trade-history-closed-line"><span>{tr("Closed", "已平仓")}</span><strong>{row.closedSize}</strong></div>
            </td>
            <td className="oq-trade-position-number">{row.exitPrice}</td>
            <td className={`oq-trade-workspace-value ${row.realizedPnl >= 0 ? "is-positive" : "is-negative"}`}>
              {formatSigned(row.realizedPnl)} USDT
            </td>
          </tr>
        );
      })}
    </TradeWorkspaceTable>
  );
}

function translateFillAction(action: string, tr: (en: string, zh: string) => string) {
  switch (action) {
    case "Open Long": return tr("Open Long", "开多");
    case "Close Long": return tr("Close Long", "平多");
    case "Open Short": return tr("Open Short", "开空");
    case "Close Short": return tr("Close Short", "平空");
    default: return action;
  }
}

function renderFillSummary(row: (typeof tradeFillRows)[number], uiLang: UiLang, tr: (en: string, zh: string) => string) {
  if (uiLang === "zh") {
    return <>以均价 <strong>{row.price} USDT</strong> 成交，数量 <strong>{row.qty}</strong>，成交额 <strong>{row.value}</strong></>;
  }
  return <>{tr("Filled at an average price of", "以均价")} <strong>{row.price} USDT</strong>, {tr("quantity", "数量")} <strong>{row.qty}</strong>, {tr("value", "成交额")} <strong>{row.value}</strong></>;
}

function ActivityRows({ rows, tr, uiLang }: { rows: typeof tradeFillRows; tr: (en: string, zh: string) => string; uiLang: UiLang }) {
  return (
    <div className="oq-trade-activity-panel">
      {rows.length ? (
        <ol className="oq-trade-activity-list" aria-label={tr("Activity log", "操作记录")}>
          {rows.map((row) => {
            const [date, clock] = row.time.split(" ");
            const isOpen = row.action.startsWith("Open");
            const directionClass = row.action.endsWith("Long") ? "is-long" : "is-short";
            return (
              <li key={row.id} className={`oq-trade-activity-item ${isOpen ? "is-open" : "is-close"}`}>
                <time className="oq-trade-activity-time" dateTime={`2026-${row.time.replace(" ", "T")}`}><span>{date},</span><strong>{clock}</strong></time>
                <div className="oq-trade-activity-marker" aria-hidden="true"><span /></div>
                <div className="oq-trade-activity-content">
                  <header className="oq-trade-activity-header">
                    <div className="oq-trade-activity-identity">
                      <strong>{row.symbol}</strong>
                      <span className={`oq-trade-position-direction ${directionClass}`}>{translateFillAction(row.action, tr)}</span>
                      <span className="oq-trade-activity-market">{row.market === "Perp" ? tr("Perp", "永续") : tr("Spot", "现货")}</span>
                    </div>
                  </header>
                  <p className="oq-trade-activity-summary">
                    <span className="oq-trade-activity-fill-detail">{renderFillSummary(row, uiLang, tr)}</span>
                    {row.realizedPnl !== undefined ? (
                      <span className={`oq-trade-activity-pnl ${row.realizedPnl >= 0 ? "is-positive" : "is-negative"}`}>
                        <span>{tr("Realized PnL", "，已实现盈亏")}</span>
                        <strong>{formatSigned(row.realizedPnl)} USDT</strong>
                      </span>
                    ) : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : <div className="oq-trade-workspace-empty">{tr("No activity records", "暂无操作记录")}</div>}
    </div>
  );
}

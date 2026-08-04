import { useEffect, useId, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, UserRoundPlus } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { translateUi, useAppLanguage } from "@/contexts/AppLanguageContext";
import {
  marketplaceCardDetails,
  marketplaceStrategies,
  marketplaceTradeSource,
} from "@/lib/marketplaceData";
import {
  tradeBots,
  tradeFillRows,
  tradeHistoryRows,
  tradePositionRows,
} from "@/lib/tradeData";
import "./MarketplaceDetail.css";

type DetailTab = "current" | "history" | "activity";

type Follower = {
  name: string;
  amount: string;
  pnl: string;
  days: string;
  tone: string;
};

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

function buildChartPath(values: number[], width: number, height: number, min: number, max: number) {
  const left = 12;
  const right = width - 12;
  const top = 14;
  const bottom = height - 22;
  const range = max - min || 1;

  return values.map((value, index) => {
    const x = left + (index / Math.max(1, values.length - 1)) * (right - left);
    const y = bottom - ((value - min) / range) * (bottom - top);
    return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

function DetailPerformanceChart({ values, label }: { values: number[]; label: string }) {
  const gradientId = useId().replace(/:/g, "");
  const min = Math.min(0, ...values) - 1;
  const max = Math.max(0, ...values) + 1;
  const path = buildChartPath(values, 820, 330, min, max);
  const area = `${path} L 808 308 L 12 308 Z`;
  const baseline = 308 - ((0 - min) / (max - min || 1)) * (308 - 14);

  return (
    <div className="oq-marketplace-detail-chart-wrap">
      <svg className="oq-marketplace-detail-chart" viewBox="0 0 820 330" role="img" aria-label={label}>
        <title>{label}</title>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--md-success)" stopOpacity="0.16" />
            <stop offset="48%" stopColor="var(--md-success)" stopOpacity="0.03" />
            <stop offset="52%" stopColor="var(--md-risk)" stopOpacity="0.03" />
            <stop offset="100%" stopColor="var(--md-risk)" stopOpacity="0.14" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((step) => {
          const y = 14 + step * ((308 - 14) / 4);
          return <line key={`h-${step}`} className="oq-marketplace-detail-chart-grid" x1="12" x2="808" y1={y} y2={y} />;
        })}
        {[0, 1, 2, 3, 4, 5].map((step) => {
          const x = 12 + step * ((808 - 12) / 5);
          return <line key={`v-${step}`} className="oq-marketplace-detail-chart-grid" x1={x} x2={x} y1="14" y2="308" />;
        })}
        <line className="oq-marketplace-detail-chart-baseline" x1="12" x2="808" y1={baseline} y2={baseline} />
        <path className="oq-marketplace-detail-chart-area" d={area} fill={`url(#${gradientId})`} />
        <path className="oq-marketplace-detail-chart-line" d={path} />
      </svg>
      <div className="oq-marketplace-detail-chart-axis" aria-hidden="true">
        <span>03-20</span><span>03-26</span><span>04-01</span><span>04-07</span><span>04-13</span>
      </div>
    </div>
  );
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

export default function MarketplaceDetail() {
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => translateUi(uiLang, en, zh);
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<DetailTab>("current");
  const [isFollowing, setIsFollowing] = useState(false);
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
    () => tradePositionRows.filter((row) => row.environment === trade?.environment).slice(0, 3),
    [trade?.environment],
  );
  const historyPositions = useMemo(
    () => tradeHistoryRows.filter((row) => row.environment === trade?.environment).slice(0, 3),
    [trade?.environment],
  );
  const activityRows = useMemo(
    () => tradeFillRows.filter((row) => row.environment === trade?.environment).slice(0, 5),
    [trade?.environment],
  );

  if (!strategy || !details || !trade) {
    return (
      <div className="oq-marketplace-detail oq-marketplace-detail-not-found">
        <p>{tr("Strategy not found", "未找到策略")}</p>
        <button type="button" onClick={() => navigate("/marketplace")}>{tr("Back to Marketplace", "返回广场")}</button>
      </div>
    );
  }

  const totalPnl = Number((trade.unrealizedPnl * 3.65).toFixed(2));
  const baseEquity = Math.max(trade.equity - totalPnl, 1);
  const roi = (totalPnl / baseEquity) * 100;
  const winRate = Number(strategy.winRate.replace("%", ""));
  const sharpe = 0.45 + winRate / 32;
  const avgTradePnl = totalPnl / Math.max(currentPositions.length + 3, 1);
  const drawdown = Number(strategy.maxDrawdown.replace("%", "")) + 1.06;
  const chartValues = details.strategySeries.map((value, index) => Number((value - (index < 8 ? 3.8 : 0)).toFixed(2)));

  return (
    <div className="oq-marketplace-detail">
      <div className="oq-marketplace-detail-shell">
        <Link href="/marketplace" className="oq-marketplace-detail-back">
          <ArrowLeft aria-hidden="true" />
          <span>{tr("Back to Marketplace", "返回广场")}</span>
        </Link>

        <header className="oq-marketplace-detail-hero">
          <div className="oq-marketplace-detail-hero-copy">
            <div className="oq-marketplace-detail-avatar" aria-hidden="true">{strategy.author.slice(0, 1)}</div>
            <div>
              <h1>{strategy.name}</h1>
              <p>
                {tr("by", "作者")} {strategy.author} <span aria-hidden="true">·</span> {strategy.tags[0]} <span aria-hidden="true">·</span> {tr("Updated", "更新于")} {strategy.updatedAt}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`oq-marketplace-detail-follow${isFollowing ? " is-following" : ""}`}
            aria-pressed={isFollowing}
            onClick={() => setIsFollowing((current) => !current)}
          >
            <UserRoundPlus aria-hidden="true" />
            {isFollowing ? tr("Following", "已跟单") : tr("Follow", "跟单")}
          </button>
        </header>

        <div className="oq-marketplace-detail-content">
          <section className="oq-marketplace-detail-intro-grid" aria-label={tr("Strategy thesis", "策略思路")}>
            <article className="oq-marketplace-detail-insights">
              <Insight title={tr("Strategy thesis", "策略思路")} text={tr(strategy.description, details.descriptionZh)} />
              <Insight title={tr("When to enter", "何时入场")} text={tr("Enter when SOL flow and momentum confirm the same direction across the active cycle.", "当 SOL 资金流与动量在当前周期确认同向时入场。")} />
              <Insight title={tr("When to exit", "何时离场")} text={tr("Reduce exposure when momentum fades or the position reaches its risk budget.", "当动量减弱或仓位触及风险预算时逐步减仓。")} />
              <Insight title={tr("Risk controls", "如何控制风险")} text={tr("Exposure is sized around volatility and liquidity so the strategy stays within its drawdown guardrail.", "根据波动率与流动性配置仓位，将策略控制在回撤边界内。")} />
            </article>
            <article className="oq-marketplace-detail-summary" aria-labelledby="marketplace-detail-summary-title">
              <h2 id="marketplace-detail-summary-title">{tr("Performance overview", "数据总览")}</h2>
              <div className="oq-marketplace-detail-summary-grid">
                <Metric label={tr("Return rate", "收益率")} value={`${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%`} tone="positive" />
                <Metric label={tr("P&L", "盈亏")} value={`${totalPnl >= 0 ? "+" : ""}${formatMoney(totalPnl)}`} tone="positive" />
                <Metric label={tr("Max drawdown", "最大回撤")} value={`-${drawdown.toFixed(2)}%`} tone="risk" />
                <Metric label={tr("Win rate", "胜率")} value={strategy.winRate} />
                <Metric label={tr("Sharpe ratio", "夏普比率")} value={sharpe.toFixed(2)} />
                <Metric label={tr("Avg. trade P&L", "平均单笔盈亏")} value={`+$${avgTradePnl.toFixed(2)}`} tone="positive" />
              </div>
            </article>
          </section>

          <section className="oq-marketplace-detail-chart-section" aria-labelledby="marketplace-detail-chart-title">
            <div className="oq-marketplace-detail-section-header">
              <h2 id="marketplace-detail-chart-title">{tr("Performance", "收益走势")}</h2>
              <div className="oq-marketplace-detail-chart-switcher" role="group" aria-label={tr("Chart metric", "图表指标")}>
                <button type="button" className="is-active">{tr("Return rate", "收益率")}</button>
                <button type="button">{tr("P&L", "盈亏")}</button>
              </div>
            </div>
            <DetailPerformanceChart values={chartValues} label={tr(`${strategy.name} performance curve`, `${strategy.name} 收益曲线`)} />
          </section>

          <section className="oq-marketplace-detail-records" aria-labelledby="marketplace-detail-records-title">
            <div className="oq-marketplace-detail-section-header">
              <div>
                <h2 id="marketplace-detail-records-title">{tr("Positions & activity", "仓位与交易记录")}</h2>
                <p>{tr("Only the latest strategy activity is shown.", "仅展示策略最近的执行记录。")}</p>
              </div>
              <div className="oq-marketplace-detail-period" aria-label={tr("Period", "时间范围")}>
                {tr("Today", "今天")} <ChevronDown aria-hidden="true" />
              </div>
            </div>
            <div className="oq-marketplace-detail-tabs" role="tablist" aria-label={tr("Position views", "仓位视图")}>
              {([
                ["current", tr("Current positions", "当前持仓")],
                ["history", tr("Historical positions", "历史持仓")],
                ["activity", tr("Activity log", "操作记录")],
              ] as const).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={activeTab === tab ? "is-active" : ""}
                  onClick={() => setActiveTab(tab)}
                >
                  {label}
                </button>
              ))}
            </div>
            {activeTab === "current" ? (
              <CurrentPositions rows={currentPositions} tr={tr} />
            ) : activeTab === "history" ? (
              <HistoricalPositions rows={historyPositions} tr={tr} />
            ) : (
              <ActivityRows rows={activityRows} tr={tr} />
            )}
          </section>

          <section className="oq-marketplace-detail-followers" aria-labelledby="marketplace-detail-followers-title">
            <div className="oq-marketplace-detail-section-header">
              <div>
                <h2 id="marketplace-detail-followers-title">{tr("Followers", "跟单用户")}</h2>
                <p>{tr("Only followers who are currently copying this strategy.", "仅显示当前跟单用户。")}</p>
              </div>
            </div>
            <div className="oq-marketplace-detail-table-wrap">
              <table className="oq-marketplace-detail-table">
                <thead>
                  <tr>
                    <th scope="col">{tr("Follower", "跟单用户")}</th>
                    <th scope="col">{tr("Cumulative amount (USDT)", "累计金额 (USDT)")}</th>
                    <th scope="col">{tr("Cumulative P&L (USDT)", "累计盈亏 (USDT)")}</th>
                    <th scope="col">{tr("Days following", "跟单天数")}</th>
                  </tr>
                </thead>
                <tbody>
                  {followers.map((follower) => (
                    <tr key={follower.name}>
                      <td>
                        <span className={`oq-marketplace-detail-follower-avatar is-${follower.tone}`} aria-hidden="true">{follower.name.slice(0, 1)}</span>
                        <strong>{follower.name}</strong>
                      </td>
                      <td>{follower.amount}</td>
                      <td className="is-positive">{follower.pnl}</td>
                      <td>{follower.days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
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

function CurrentPositions({ rows, tr }: { rows: typeof tradePositionRows; tr: (en: string, zh: string) => string }) {
  if (!rows.length) return <EmptyState label={tr("No current positions.", "暂无当前持仓。")} />;
  return (
    <div className="oq-marketplace-detail-table-wrap">
      <table className="oq-marketplace-detail-table oq-marketplace-detail-positions-table">
        <thead><tr><th>{tr("Trading pair", "交易对")}</th><th>{tr("Quantity", "数量")}</th><th>{tr("Entry price", "开仓均价")}</th><th>{tr("Mark price", "标记价格")}</th><th>{tr("Margin", "保证金")}</th><th>{tr("Unrealized P&L", "未实现盈亏")}</th><th>{tr("Return rate", "收益率")}</th></tr></thead>
        <tbody>{rows.map((row) => {
          const margin = metricNumber(row.margin);
          const roi = margin ? (row.pnl / margin) * 100 : 0;
          return <tr key={row.id}><td><strong>{row.symbol}</strong><small>{row.side === "long" ? tr("Long", "做多") : tr("Short", "做空")} · {row.leverage}</small></td><td>{row.size}</td><td>{row.entry}</td><td>{row.mark}</td><td>{row.margin}</td><td className={row.pnl >= 0 ? "is-positive" : "is-negative"}>{row.pnl >= 0 ? "+" : ""}{row.pnl.toFixed(2)} USDT</td><td className={roi >= 0 ? "is-positive" : "is-negative"}>{roi >= 0 ? "+" : ""}{roi.toFixed(2)}%</td></tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function HistoricalPositions({ rows, tr }: { rows: typeof tradeHistoryRows; tr: (en: string, zh: string) => string }) {
  if (!rows.length) return <EmptyState label={tr("No historical positions.", "暂无历史持仓。")} />;
  return (
    <div className="oq-marketplace-detail-table-wrap"><table className="oq-marketplace-detail-table"><thead><tr><th>{tr("Trading pair", "交易对")}</th><th>{tr("Side", "方向")}</th><th>{tr("Opened", "开仓时间")}</th><th>{tr("Closed", "平仓时间")}</th><th>{tr("Entry price", "开仓均价")}</th><th>{tr("Exit price", "平仓价格")}</th><th>{tr("Realized P&L", "已实现盈亏")}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong>{row.symbol}</strong><small>{row.market} · {row.leverage}</small></td><td>{row.side === "long" ? tr("Long", "做多") : tr("Short", "做空")}</td><td>{row.openedAt}</td><td>{row.closedAt}</td><td>{row.entryPrice}</td><td>{row.exitPrice}</td><td className={row.realizedPnl >= 0 ? "is-positive" : "is-negative"}>{row.realizedPnl >= 0 ? "+" : ""}{row.realizedPnl.toFixed(2)} USDT</td></tr>)}</tbody></table></div>
  );
}

function ActivityRows({ rows, tr }: { rows: typeof tradeFillRows; tr: (en: string, zh: string) => string }) {
  if (!rows.length) return <EmptyState label={tr("No activity yet.", "暂无操作记录。")} />;
  return (
    <div className="oq-marketplace-detail-table-wrap"><table className="oq-marketplace-detail-table"><thead><tr><th>{tr("Time", "时间")}</th><th>{tr("Trading pair", "交易对")}</th><th>{tr("Action", "操作")}</th><th>{tr("Price", "价格")}</th><th>{tr("Quantity", "数量")}</th><th>{tr("Value", "成交额")}</th><th>{tr("Realized P&L", "已实现盈亏")}</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.time}</td><td><strong>{row.symbol}</strong><small>{row.market}</small></td><td>{row.action === "Open Long" ? tr("Open long", "开多") : row.action === "Close Long" ? tr("Close long", "平多") : row.action === "Open Short" ? tr("Open short", "开空") : tr("Close short", "平空")}</td><td>{row.price}</td><td>{row.qty}</td><td>{row.value}</td><td className={row.realizedPnl && row.realizedPnl < 0 ? "is-negative" : "is-positive"}>{row.realizedPnl ? `${row.realizedPnl >= 0 ? "+" : ""}${row.realizedPnl.toFixed(2)} USDT` : "--"}</td></tr>)}</tbody></table></div>
  );
}

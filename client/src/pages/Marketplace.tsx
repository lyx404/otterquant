import { useEffect, useId, useMemo } from "react";
import { Link, useSearch } from "wouter";
import { ClipboardList, ListChecks, Users } from "lucide-react";
import {
  translateUi,
  useAppLanguage,
} from "@/contexts/AppLanguageContext";
import type { Strategy } from "@/lib/mockData";
import {
  marketplaceCardDetails,
  marketplaceStrategies,
  type MarketplaceCardDetails,
} from "@/lib/marketplaceData";
import "./Trade.css";
import "./Marketplace.css";

// 260804 snapshot: keep the strategy marketplace implementation in place for a later restore.
const SHOW_MARKETPLACE_CONTENT = false;

type MarketplaceCardView = {
  author: string;
  avatar: string;
  subscribers: number;
  capacity: number;
  status: "满员" | "跟单";
  title: string;
  return30d: string;
  pnl30d: string;
  maxDrawdown: string;
  sharpe: string;
  winRate: string;
  avatarTone: "orange" | "teal" | "violet" | "blue" | "green" | "rose";
};

const marketplaceCardViews: Record<string, MarketplaceCardView> = {
  "STR-001": { author: "枫1008", avatar: "枫", subscribers: 200, capacity: 200, status: "满员", title: "基金名称基金名称", return30d: "+18.06%", pnl30d: "+902.89 USDT", maxDrawdown: "-0.2%", sharpe: "9.16", winRate: "35%", avatarTone: "orange" },
  "STR-002": { author: "成成狼兜", avatar: "成", subscribers: 147, capacity: 200, status: "跟单", title: "BTCETH 趋势反转", return30d: "+12.84%", pnl30d: "+640.20 USDT", maxDrawdown: "-1.8%", sharpe: "4.82", winRate: "48%", avatarTone: "teal" },
  "STR-003": { author: "量化小王子", avatar: "量", subscribers: 88, capacity: 120, status: "跟单", title: "多因子稳健策略", return30d: "+9.42%", pnl30d: "+471.00 USDT", maxDrawdown: "-0.9%", sharpe: "5.74", winRate: "52%", avatarTone: "violet" },
  "STR-005": { author: "七月流火", avatar: "七", subscribers: 200, capacity: 200, status: "满员", title: "稳健套利增强", return30d: "+7.18%", pnl30d: "+358.90 USDT", maxDrawdown: "-0.4%", sharpe: "7.31", winRate: "61%", avatarTone: "blue" },
  "STR-007": { author: "阿尔法研究所", avatar: "阿", subscribers: 64, capacity: 100, status: "跟单", title: "ETH 波动率捕获", return30d: "+15.63%", pnl30d: "+781.50 USDT", maxDrawdown: "-2.6%", sharpe: "3.88", winRate: "47%", avatarTone: "green" },
  "STR-008": { author: "南山有鹿", avatar: "南", subscribers: 176, capacity: 200, status: "跟单", title: "SOL 动量趋势", return30d: "+20.40%", pnl30d: "+1,020.00 USDT", maxDrawdown: "-3.1%", sharpe: "3.45", winRate: "55%", avatarTone: "rose" },
  "STR-009": { author: "均衡之道", avatar: "均", subscribers: 112, capacity: 150, status: "跟单", title: "多资产风险平价", return30d: "+10.80%", pnl30d: "+540.00 USDT", maxDrawdown: "-1.1%", sharpe: "6.02", winRate: "58%", avatarTone: "teal" },
  "STR-010": { author: "中性先生", avatar: "中", subscribers: 200, capacity: 200, status: "满员", title: "资金费率中性套利", return30d: "+8.90%", pnl30d: "+445.00 USDT", maxDrawdown: "-0.3%", sharpe: "8.12", winRate: "68%", avatarTone: "orange" },
  "STR-011": { author: "链上观察员", avatar: "链", subscribers: 93, capacity: 120, status: "跟单", title: "链上流动性脉冲", return30d: "+17.10%", pnl30d: "+855.00 USDT", maxDrawdown: "-2.4%", sharpe: "4.26", winRate: "51%", avatarTone: "violet" },
};

function buildChartPath(values: number[], min: number, max: number) {
  const width = 520;
  const top = 14;
  const bottom = 116;
  const left = 12;
  const right = 508;
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = left + (index / Math.max(1, values.length - 1)) * (right - left);
      const y = bottom - ((value - min) / range) * (bottom - top);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function PerformanceChart({
  details,
  label,
}: {
  details: MarketplaceCardDetails;
  label: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  const values = details.strategySeries;
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const strategyPath = buildChartPath(details.strategySeries, min, max);
  const areaPath = `${strategyPath} L 508 124 L 12 124 Z`;

  return (
    <div className="oq-marketplace-chart-block">
      <svg viewBox="0 0 520 140" role="img" aria-label={label}>
        <title>{label}</title>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={strategyPath} className="oq-marketplace-chart-strategy" />
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--oq-market-positive)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--oq-market-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "risk" }) {
  return (
    <div className="oq-marketplace-metric">
      <span>{label}</span>
      <strong className={tone ? `is-${tone}` : undefined}>{value}</strong>
    </div>
  );
}

function MarketplaceSummary({ tr }: { tr: (en: string, zh: string) => string }) {
  return (
    <section className="oq-marketplace-summary" aria-label={tr("Account overview", "资产概览")}>
      <div className="oq-marketplace-summary-values">
        <div className="oq-marketplace-summary-item">
          <span>{tr("Assets (USDT)", "资产 (USDT)")}</span>
          <strong>438,473.00</strong>
        </div>
        <div className="oq-marketplace-summary-divider" aria-hidden="true" />
        <div className="oq-marketplace-summary-item">
          <span>{tr("Unrealized PnL (USDT)", "未实现总盈亏 (USDT)")}</span>
          <strong className="is-muted">--</strong>
        </div>
      </div>
      <div className="oq-marketplace-summary-actions">
        <button type="button" className="oq-marketplace-action-button">
          <ListChecks aria-hidden="true" />
          {tr("Lead management", "带单管理")}
        </button>
        <button type="button" className="oq-marketplace-action-button">
          <ClipboardList aria-hidden="true" />
          {tr("Copy management", "跟单管理")}
        </button>
      </div>
    </section>
  );
}

function TradingCard({
  strategy,
  details,
  tr,
}: {
  strategy: Strategy;
  details: MarketplaceCardDetails;
  tr: (en: string, zh: string) => string;
}) {
  const description = tr(strategy.description, details.descriptionZh);
  const view = marketplaceCardViews[strategy.id];
  if (!view) return null;

  return (
    <Link
      href={`/marketplace/${strategy.id}`}
      className="oq-marketplace-card-link"
      aria-labelledby={`marketplace-card-title-${strategy.id}`}
    >
      <article className="oq-marketplace-card">
        <div className="oq-marketplace-card-header">
          <div className="oq-marketplace-card-title-row">
            <div className="oq-marketplace-author">
              <span className={`oq-marketplace-avatar is-${view.avatarTone}`} aria-hidden="true">{view.avatar}</span>
              <div>
                <h3 id={`marketplace-card-title-${strategy.id}`}>{view.author}</h3>
                <span className="oq-marketplace-subscribers" aria-label={tr(`${view.subscribers} of ${view.capacity} subscribers`, `${view.subscribers}/${view.capacity} 人订阅`)}>
                  <Users aria-hidden="true" />
                  {view.subscribers}/{view.capacity}
                </span>
              </div>
            </div>
            <span className={`oq-marketplace-status is-${view.status === "满员" ? "full" : "open"}`}>
              {view.status}
            </span>
          </div>
          <p className="oq-marketplace-card-description" title={description}>{view.title}</p>
        </div>

        <div className="oq-marketplace-performance-panel">
          <div className="oq-marketplace-performance">
            <div className="oq-marketplace-return">
              <span>{tr("30-day return", "近30天收益率")}</span>
              <strong>{view.return30d}</strong>
              <small>{view.pnl30d}</small>
            </div>
            <PerformanceChart
              details={details}
              label={tr(`${view.title} return curve`, `${view.title} 收益曲线`)}
            />
          </div>
          <div className="oq-marketplace-metrics">
            <Metric label={tr("Max drawdown", "最大回撤")} value={view.maxDrawdown} tone="risk" />
            <Metric label={tr("Sharpe ratio", "夏普比率")} value={view.sharpe} />
            <Metric label={tr("30-day win rate", "近30天胜率")} value={view.winRate} tone="positive" />
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function Marketplace() {
  const { uiLang } = useAppLanguage();
  const search = useSearch();
  const tr = (en: string, zh: string) =>
    translateUi(uiLang, en, zh);
  const query = new URLSearchParams(search).get("q")?.trim().toLowerCase() ?? "";
  const activeTab = new URLSearchParams(search).get("tab") ?? "marketplace";
  const visibleStrategies = useMemo(() => {
    if (!query) return marketplaceStrategies;
    return marketplaceStrategies.filter((strategy) => {
      const details = marketplaceCardDetails[strategy.id];
      const searchable = [strategy.name, strategy.id, strategy.description, details.descriptionZh, ...strategy.tags]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [query]);

  useEffect(() => {
    document.documentElement.classList.add("oq-trade-active");
    return () => document.documentElement.classList.remove("oq-trade-active");
  }, []);

  if (!SHOW_MARKETPLACE_CONTENT || activeTab !== "marketplace") {
    return null;
  }

  return (
    <div className="oq-trade oq-marketplace">
      <MarketplaceSummary tr={tr} />
      {visibleStrategies.length > 0 ? (
        <section className="oq-marketplace-grid" aria-label={tr("Official trading strategies", "官方交易策略")}>
          {visibleStrategies.map((strategy) => (
            <TradingCard
              key={strategy.id}
              strategy={strategy}
              details={marketplaceCardDetails[strategy.id]}
              tr={tr}
            />
          ))}
        </section>
      ) : (
        <p className="oq-marketplace-empty">{tr("No official strategies match your search.", "没有匹配搜索条件的官方交易策略。")}</p>
      )}
    </div>
  );
}

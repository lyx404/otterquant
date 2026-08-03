import { useEffect, useId, useMemo } from "react";
import { Link, useSearch } from "wouter";
import { Users } from "lucide-react";
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

const SHOW_MARKETPLACE_CONTENT = false;

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
      <strong className={tone ? `is-${tone}` : undefined}>{value}</strong>
      <span>{label}</span>
    </div>
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

  return (
    <Link
      href={`/marketplace/${strategy.id}`}
      className="oq-marketplace-card-link"
      aria-labelledby={`marketplace-card-title-${strategy.id}`}
    >
      <article className="oq-marketplace-card">
        <div className="oq-marketplace-card-header">
          <div className="oq-marketplace-card-title-row">
            <h3 id={`marketplace-card-title-${strategy.id}`}>{strategy.name}</h3>
            <span
              className="oq-marketplace-subscribers"
              aria-label={tr(`${strategy.subscribers} subscribers`, `${strategy.subscribers} 人订阅`)}
            >
              <Users aria-hidden="true" />
              {tr(`${strategy.subscribers} subscribers`, `${strategy.subscribers} 人订阅`)}
            </span>
          </div>
          <p>{strategy.id} · {tr("Updated", "更新于")} {strategy.updatedAt}</p>
          <p className="oq-marketplace-card-description">{description}</p>
        </div>

        <div className="oq-marketplace-performance">
          <div className="oq-marketplace-return">
            <span>{tr("Cumulative return", "累计收益")}</span>
            <strong>+{details.cumulativeReturn.replace(/^\+/, "")}</strong>
            <small>{tr("Annualized", "年化")} +{strategy.annualReturn.replace(/^\+/, "")}</small>
          </div>
          <PerformanceChart
            details={details}
            label={tr(`${strategy.name} cumulative return curve`, `${strategy.name} 累计收益曲线`)}
          />
        </div>

        <div className="oq-marketplace-metrics">
          <Metric label={tr("Max drawdown", "最大回撤")} value={`-${strategy.maxDrawdown.replace(/^-/, "")}`} tone="risk" />
          <Metric label={tr("Sharpe ratio", "夏普比率")} value={strategy.sharpe.toFixed(2)} />
          <Metric label={tr("Win rate", "胜率")} value={strategy.winRate} tone="positive" />
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

  if (!SHOW_MARKETPLACE_CONTENT) {
    return null;
  }

  return (
    <div className="oq-trade oq-marketplace">
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

import { useEffect, useId, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { toast } from "sonner";
import { ArrowUpRight, Check, Send, ShieldCheck } from "lucide-react";
import {
  translateUi,
  useAppLanguage,
} from "@/contexts/AppLanguageContext";
import { strategies, type Strategy } from "@/lib/mockData";
import "./Trade.css";
import "./Marketplace.css";

type CardDetails = {
  cumulativeReturn: string;
  descriptionZh: string;
  strategySeries: number[];
  benchmarkSeries: number[];
};

function buildPerformanceSeries(target: number, phase: number, volatility: number) {
  return Array.from({ length: 48 }, (_, index) => {
    const progress = index / 47;
    const wave = Math.sin(progress * Math.PI * 5 + phase) * volatility;
    const pulse = Math.cos(progress * Math.PI * 11 + phase * 0.6) * volatility * 0.34;
    const earlyDip = -Math.exp(-Math.pow((progress - 0.16) * 8, 2)) * volatility * 1.3;
    return Number((target * progress + wave + pulse + earlyDip).toFixed(2));
  });
}

const cardDetails: Record<string, CardDetails> = {
  "STR-001": {
    cumulativeReturn: "18.7%",
    descriptionZh: "融合 RSI 交叉、成交量背离与资金费率信号，捕捉 BTC 永续合约的中短周期趋势。",
    strategySeries: buildPerformanceSeries(18.7, 0.2, 2.4),
    benchmarkSeries: buildPerformanceSeries(6.1, 1.2, 1.4),
  },
  "STR-002": {
    cumulativeReturn: "15.4%",
    descriptionZh: "追踪主要 DeFi 协议的 TVL 资金流、LP 行为与 Gas 成本变化，动态调整收益仓位。",
    strategySeries: buildPerformanceSeries(15.4, 0.8, 2),
    benchmarkSeries: buildPerformanceSeries(4.8, 1.7, 1.2),
  },
  "STR-003": {
    cumulativeReturn: "12.6%",
    descriptionZh: "利用主流中心化交易所之间的价差和订单簿深度，执行低敞口跨所套利。",
    strategySeries: buildPerformanceSeries(12.6, 1.4, 1.35),
    benchmarkSeries: buildPerformanceSeries(5.3, 0.5, 1.1),
  },
  "STR-005": {
    cumulativeReturn: "8.9%",
    descriptionZh: "聚焦资金费率套利与基差交易，在控制回撤的前提下提供稳定的收益曲线。",
    strategySeries: buildPerformanceSeries(8.9, 2, 0.75),
    benchmarkSeries: buildPerformanceSeries(4.2, 1.1, 0.9),
  },
};

const officialStrategies = strategies.filter(
  (strategy) => strategy.author === "Quandora Lab" && cardDetails[strategy.id]
);

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
  title,
  strategyLabel,
  benchmarkLabel,
}: {
  details: CardDetails;
  title: string;
  strategyLabel: string;
  benchmarkLabel: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  const values = [...details.strategySeries, ...details.benchmarkSeries, 0];
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const strategyPath = buildChartPath(details.strategySeries, min, max);
  const benchmarkPath = buildChartPath(details.benchmarkSeries, min, max);
  const zeroY = 116 - ((0 - min) / (max - min || 1)) * 102;
  const areaPath = `${strategyPath} L 508 ${zeroY.toFixed(2)} L 12 ${zeroY.toFixed(2)} Z`;

  return (
    <div className="oq-marketplace-chart-block">
      <div className="oq-marketplace-chart-heading">
        <span>{title}</span>
        <span className="oq-marketplace-chart-legend">
          <span><i className="is-strategy" />{strategyLabel}</span>
          <span><i className="is-benchmark" />{benchmarkLabel}</span>
        </span>
      </div>
      <svg viewBox="0 0 520 140" role="img" aria-label={`${title}: ${strategyLabel} / ${benchmarkLabel}`}>
        <title>{title}</title>
        {[22, 54, 86, 118].map((y) => (
          <line key={y} x1="12" x2="508" y1={y} y2={y} className="oq-marketplace-chart-grid" />
        ))}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={benchmarkPath} className="oq-marketplace-chart-benchmark" />
        <path d={strategyPath} className="oq-marketplace-chart-strategy" />
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--oq-market-primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--oq-market-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <text x="12" y="136">09:00</text>
        <text x="176" y="136">12:00</text>
        <text x="342" y="136">15:00</text>
        <text x="482" y="136">现在</text>
      </svg>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "accent" | "risk" }) {
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
  subscribed,
  onToggleSubscription,
  tr,
}: {
  strategy: Strategy;
  details: CardDetails;
  subscribed: boolean;
  onToggleSubscription: () => void;
  tr: (en: string, zh: string) => string;
}) {
  const description = tr(strategy.description, details.descriptionZh);

  return (
    <article className="oq-marketplace-card">
      <div className="oq-marketplace-card-header">
        <div className="oq-marketplace-card-title-row">
          <h3>{strategy.name}</h3>
          <span className="oq-marketplace-official"><ShieldCheck aria-hidden="true" />{tr("Official", "官方")}</span>
        </div>
        <p>{tr("Updated", "最近更新")} {strategy.updatedAt} · {strategy.id}</p>
      </div>

      <p className="oq-marketplace-description">{description}</p>

      <div className="oq-marketplace-metrics">
        <Metric label={tr("Annual return", "年化收益")} value={strategy.annualReturn} tone="accent" />
        <Metric label={tr("Cumulative return", "累计收益")} value={details.cumulativeReturn} tone="accent" />
        <Metric label={tr("Max drawdown", "最大回撤")} value={`-${strategy.maxDrawdown.replace(/^-/, "")}`} tone="risk" />
        <Metric label={tr("Sharpe ratio", "夏普比率")} value={strategy.sharpe.toFixed(2)} />
      </div>

      <PerformanceChart
        details={details}
        title={tr("Cumulative return", "累计收益")}
        strategyLabel={tr("Strategy", "策略")}
        benchmarkLabel={tr("BTC benchmark", "BTC 基准")}
      />

      <footer className="oq-marketplace-card-actions">
        <span>{tr(`${strategy.subscribers} subscribers`, `${strategy.subscribers} 人订阅动态`)}</span>
        <div>
          <Link href={`/marketplace/${strategy.id}`}>
            <button type="button" className="oq-marketplace-view-button">
              {tr("View", "查看")}<ArrowUpRight aria-hidden="true" />
            </button>
          </Link>
          <button
            type="button"
            className={`oq-marketplace-subscribe-button${subscribed ? " is-subscribed" : ""}`}
            aria-pressed={subscribed}
            onClick={onToggleSubscription}
          >
            {subscribed ? <Check aria-hidden="true" /> : <Send aria-hidden="true" />}
            {subscribed ? tr("Subscribed", "已订阅") : tr("Subscribe on Telegram", "Telegram 订阅")}
          </button>
        </div>
      </footer>
    </article>
  );
}

export default function Marketplace() {
  const { uiLang } = useAppLanguage();
  const search = useSearch();
  const tr = (en: string, zh: string) =>
    translateUi(uiLang, en, zh);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(() => new Set());
  const query = new URLSearchParams(search).get("q")?.trim().toLowerCase() ?? "";
  const visibleStrategies = useMemo(() => {
    if (!query) return officialStrategies;
    return officialStrategies.filter((strategy) => {
      const details = cardDetails[strategy.id];
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

  const toggleSubscription = (strategy: Strategy) => {
    const willSubscribe = !subscribedIds.has(strategy.id);
    setSubscribedIds((current) => {
      const next = new Set(current);
      if (willSubscribe) next.add(strategy.id);
      else next.delete(strategy.id);
      return next;
    });
    toast.success(
      willSubscribe
        ? tr(`Telegram updates enabled for ${strategy.name}.`, `已通过 Telegram 订阅「${strategy.name}」交易动态。`)
        : tr(`Telegram updates disabled for ${strategy.name}.`, `已取消「${strategy.name}」的 Telegram 交易动态。`)
    );
  };

  return (
    <div className="oq-trade oq-marketplace">
      {visibleStrategies.length > 0 ? (
        <section className="oq-marketplace-grid" aria-label={tr("Official trading strategies", "官方交易策略")}>
          {visibleStrategies.map((strategy) => (
            <TradingCard
              key={strategy.id}
              strategy={strategy}
              details={cardDetails[strategy.id]}
              subscribed={subscribedIds.has(strategy.id)}
              onToggleSubscription={() => toggleSubscription(strategy)}
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

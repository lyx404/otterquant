import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { CopyTradeDialog } from "@/components/CopyTradeDialog";
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

const SHOW_MARKETPLACE_CONTENT = true;

type AvatarTone = "orange" | "teal" | "violet" | "blue" | "green" | "rose";

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
  avatarTone: AvatarTone;
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

type RankingRow = {
  rank: number;
  name: string;
  profileId: string;
  country: string;
  avatar: string;
  avatarSrc?: string;
  avatarTone: AvatarTone;
  returnValue: string;
  returnRate: string;
  drawdown: string;
  assets: string;
  strategyId: string;
  series: number[];
  tone: "positive" | "risk";
};

const countryFlags: Record<string, string> = {
  CN: "🇨🇳",
  FR: "🇫🇷",
  JP: "🇯🇵",
  KR: "🇰🇷",
  SG: "🇸🇬",
  US: "🇺🇸",
};

const rankingRows: RankingRow[] = [
  { rank: 1, name: "Evan Lim", profileId: "evan-lim", country: "SG", avatar: "E", avatarSrc: "/marketplace-avatar.png", avatarTone: "teal", returnValue: "+10,000.00 USDT", returnRate: "+10.2%", drawdown: "-1.8%", assets: "130,000.00 USDT", strategyId: "STR-002", series: [2, 2, 2, 5, 4, 9, 9, 12], tone: "positive" },
  { rank: 2, name: "AlphaAgent", profileId: "alpha-agent", country: "US", avatar: "A", avatarTone: "orange", returnValue: "+9,000.00 USDT", returnRate: "+8.2%", drawdown: "-3.3%", assets: "32,600.00 USDT", strategyId: "STR-001", series: [3, 3, 3, 3, 2, 2, 8, 10], tone: "positive" },
  { rank: 3, name: "林岚", profileId: "lin-lan", country: "CN", avatar: "林", avatarTone: "blue", returnValue: "+9,000.00 USDT", returnRate: "+8.2%", drawdown: "-3.3%", assets: "32,600.00 USDT", strategyId: "STR-009", series: [5, 6, 4, 5, 7, 4, 3, 5], tone: "positive" },
  { rank: 4, name: "Kaito Mori", profileId: "kaito-mori", country: "JP", avatar: "K", avatarTone: "violet", returnValue: "+9,000.00 USDT", returnRate: "+8.2%", drawdown: "-3.3%", assets: "32,600.00 USDT", strategyId: "STR-005", series: [3, 5, 3, 4, 5, 6, 5, 9], tone: "positive" },
  { rank: 5, name: "Minseo Park", profileId: "minseo-park", country: "KR", avatar: "M", avatarTone: "green", returnValue: "+9,000.00 USDT", returnRate: "+8.2%", drawdown: "-3.3%", assets: "32,600.00 USDT", strategyId: "STR-007", series: [6, 4, 5, 3, 4, 6, 7, 8], tone: "positive" },
  { rank: 6, name: "Camille Laurent", profileId: "camille-laurent", country: "FR", avatar: "C", avatarTone: "teal", returnValue: "+9,000.00 USDT", returnRate: "+8.2%", drawdown: "-3.3%", assets: "32,600.00 USDT", strategyId: "STR-008", series: [3, 4, 2, 3, 5, 6, 6, 8], tone: "positive" },
  { rank: 7, name: "Theo Martin", profileId: "theo-martin", country: "FR", avatar: "T", avatarTone: "blue", returnValue: "+9,000.00 USDT", returnRate: "+8.2%", drawdown: "-3.3%", assets: "32,600.00 USDT", strategyId: "STR-010", series: [2, 3, 8, 3, 3, 3, 3, 3], tone: "positive" },
  { rank: 8, name: "Jules Bernard", profileId: "jules-bernard", country: "FR", avatar: "J", avatarTone: "orange", returnValue: "+9,000.00 USDT", returnRate: "+8.2%", drawdown: "-3.3%", assets: "32,600.00 USDT", strategyId: "STR-011", series: [2, 2, 2, 3, 3, 7, 7, 7], tone: "positive" },
  { rank: 9, name: "Sofia Rossi", profileId: "sofia-rossi", country: "US", avatar: "S", avatarTone: "rose", returnValue: "+8,420.00 USDT", returnRate: "+7.6%", drawdown: "-2.1%", assets: "28,400.00 USDT", strategyId: "STR-003", series: [2, 2, 4, 4, 5, 6, 8, 9], tone: "positive" },
  { rank: 10, name: "Noah Williams", profileId: "noah-williams", country: "US", avatar: "N", avatarTone: "green", returnValue: "+7,860.00 USDT", returnRate: "+7.1%", drawdown: "-2.8%", assets: "25,900.00 USDT", strategyId: "STR-007", series: [2, 3, 3, 5, 4, 6, 7, 8], tone: "positive" },
];

function buildChartPath(values: number[], min: number, max: number) {
  const top = 12;
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
  const strategyPath = buildChartPath(values, min, max);
  const areaPath = `${strategyPath} L 508 124 L 12 124 Z`;

  return (
    <div className="oq-marketplace-chart-block">
      <svg viewBox="0 0 520 140" role="img" aria-label={label}>
        <title>{label}</title>
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={strategyPath} className="oq-marketplace-chart-strategy" />
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--oq-market-positive)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--oq-market-positive)" stopOpacity="0" />
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
        <div className="oq-marketplace-copy-summary">
          <div className="oq-marketplace-copy-summary-metrics">
            <div>
              <strong>323,827.08</strong>
              <span>{tr("Copy P&L (USDT)", "跟单盈亏(USDT)")}</span>
            </div>
            <div>
              <strong>2</strong>
              <span>{tr("Copy count", "跟单数量")}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="oq-marketplace-summary-actions">
        <Link href="/marketplace?tab=mine" className="oq-marketplace-action-button">
          <ClipboardList aria-hidden="true" />
          {tr("Copy management", "我的跟单")}
        </Link>
      </div>
    </section>
  );
}

function TradingCard({
  strategy,
  details,
  tr,
  isFollowing,
  onFollow,
}: {
  strategy: Strategy;
  details: MarketplaceCardDetails;
  tr: (en: string, zh: string) => string;
  isFollowing: boolean;
  onFollow: () => void;
}) {
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
          <div className="oq-marketplace-card-author-row">
            <div className="oq-marketplace-author">
              <span className={`oq-marketplace-avatar is-${view.avatarTone}`} aria-hidden="true">{view.avatar}</span>
              <div>
                <h3 id={`marketplace-card-title-${strategy.id}`}>{view.author}</h3>
                <p className="oq-marketplace-author-strategy" title={view.title}>{view.title}</p>
              </div>
            </div>
            {view.status === "满员" ? (
              <span className="oq-marketplace-status is-full">{view.status}</span>
            ) : (
              <button
                type="button"
                className="oq-marketplace-status is-open"
                aria-pressed={isFollowing}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onFollow();
                }}
              >
                {isFollowing ? tr("Following", "已跟单") : tr("Copy", "跟单")}
              </button>
            )}
          </div>
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

type StrategyCarouselProps = {
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  strategies: Strategy[];
  tr: (en: string, zh: string) => string;
  isFollowing: (strategyId: string) => boolean;
  onFollow: (strategy: Strategy) => void;
};

function StrategyCarousel({
  title,
  titleZh,
  description,
  descriptionZh,
  strategies,
  tr,
  isFollowing,
  onFollow,
}: StrategyCarouselProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const showControls = strategies.length > 4;

  const scrollStrategies = (direction: number) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({ left: direction * Math.max(280, list.clientWidth * 0.82), behavior: "smooth" });
  };

  return (
    <section className="oq-marketplace-strategy-group" aria-labelledby={`marketplace-strategy-group-${title}`}>
      <header className="oq-marketplace-ranking-board-heading oq-marketplace-strategy-group-heading">
        <div>
          <h3 id={`marketplace-strategy-group-${title}`}>{tr(title, titleZh)}</h3>
          <p>{tr(description, descriptionZh)}</p>
        </div>
      </header>
      <div
        className={`oq-marketplace-carousel-controls${showControls ? " has-controls" : ""}`}
        aria-label={showControls ? tr("Strategy carousel controls", "策略横向浏览") : undefined}
      >
        {showControls && (
          <button
            type="button"
            aria-label={tr(`Previous ${title}`, `查看上一组${titleZh}`)}
            title={tr("Previous", "向左")}
            onClick={() => scrollStrategies(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
        )}
        <div className="oq-marketplace-carousel-viewport">
          <div ref={listRef} className="oq-marketplace-carousel-list">
            {strategies.map((strategy) => (
              <TradingCard
                key={strategy.id}
                strategy={strategy}
                details={marketplaceCardDetails[strategy.id]}
                tr={tr}
                isFollowing={isFollowing(strategy.id)}
                onFollow={() => onFollow(strategy)}
              />
            ))}
          </div>
        </div>
        {showControls && (
          <button
            type="button"
            aria-label={tr(`Next ${title}`, `查看下一组${titleZh}`)}
            title={tr("Next", "向右")}
            onClick={() => scrollStrategies(1)}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

type RankingMetric = "returnRate" | "assets" | "returnValue";

type RankingBoardDefinition = {
  id: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  metric: RankingMetric;
  metricLabel: string;
  metricLabelZh: string;
  rows: RankingRow[];
};

function metricNumber(value: string) {
  return Number(value.replace(/[^\d.-]/g, ""));
}

const rankingBoards: RankingBoardDefinition[] = [
  {
    id: "managers",
    title: "Best fund managers",
    titleZh: "最佳基金管理员",
    description: "Fund managers ranked by 30-day lead return",
    descriptionZh: "按近30天带单收益率排名的基金管理员",
    metric: "returnRate",
    metricLabel: "30-day lead return",
    metricLabelZh: "近30天带单收益率",
    rows: [...rankingRows].sort((a, b) => metricNumber(b.returnRate) - metricNumber(a.returnRate)),
  },
  {
    id: "investors",
    title: "Best investors",
    titleZh: "最佳投资者",
    description: "Investors ranked by 30-day copy return",
    descriptionZh: "按近30天跟单收益率排名的投资者",
    metric: "returnRate",
    metricLabel: "30-day copy return",
    metricLabelZh: "近30天跟单收益率",
    rows: [...rankingRows].sort((a, b) => metricNumber(b.returnRate) - metricNumber(a.returnRate)),
  },
  {
    id: "returns",
    title: "Highest returns",
    titleZh: "最高收益",
    description: "Total 30-day copy and lead P&L",
    descriptionZh: "近30天跟单与带单总收益排行",
    metric: "returnValue",
    metricLabel: "30-day P&L",
    metricLabelZh: "近30天盈亏",
    rows: [...rankingRows].sort((a, b) => metricNumber(b.returnValue) - metricNumber(a.returnValue)),
  },
];

function rankingMetricValue(row: RankingRow, metric: RankingMetric) {
  return row[metric];
}

function RankingBoards({ tr }: { tr: (en: string, zh: string) => string }) {
  const [showAll, setShowAll] = useState(false);
  const visibleCount = showAll ? rankingRows.length : 5;

  return (
    <>
      <div className="oq-marketplace-ranking-boards">
        {rankingBoards.map((board) => (
          <section key={board.id} className="oq-marketplace-ranking-board" aria-labelledby={`marketplace-ranking-board-${board.id}`}>
            <header className="oq-marketplace-ranking-board-heading">
              <div>
                <h3 id={`marketplace-ranking-board-${board.id}`}>{tr(board.title, board.titleZh)}</h3>
                <p>{tr(board.description, board.descriptionZh)}</p>
              </div>
            </header>
            <div className="oq-marketplace-ranking-list">
              {board.rows.slice(0, visibleCount).map((row, index) => (
                <Link
                  key={`${board.id}-${row.profileId}`}
                  href={`/marketplace/users/${row.profileId}`}
                  className="oq-marketplace-ranking-item"
                  aria-label={tr(`View ${row.name}'s profile`, `查看 ${row.name} 的主页`)}
                >
                  <span className={`oq-marketplace-avatar is-${row.avatarTone}`} aria-hidden="true">
                    {row.avatarSrc ? <img src={row.avatarSrc} alt="" /> : row.avatar}
                  </span>
                  <span className="oq-marketplace-ranking-item-copy">
                    <span className="oq-marketplace-ranking-item-name">
                      <strong>{row.name}</strong>
                      <span className="oq-marketplace-country-flag" aria-label={tr(`Region: ${row.country}`, `所在地区：${row.country}`)}>
                        <span aria-hidden="true">{countryFlags[row.country]}</span>
                      </span>
                    </span>
                    <small
                      className="oq-marketplace-ranking-rank"
                      aria-label={tr(`Rank ${index + 1}`, `排名 ${index + 1}`)}
                    >
                      {tr("Rank", "排名")} {index + 1}
                    </small>
                  </span>
                  <span className="oq-marketplace-ranking-item-stat">
                    <strong>{rankingMetricValue(row, board.metric)}</strong>
                    <small className="oq-marketplace-ranking-item-metric-label">
                      {tr(board.metricLabel, board.metricLabelZh)}
                    </small>
                  </span>
                  <ChevronRight aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <button
        type="button"
        className="oq-marketplace-ranking-more"
        aria-expanded={showAll}
        onClick={() => setShowAll((current) => !current)}
      >
        {showAll ? tr("Show less", "收起") : tr("More", "更多")}
      </button>
    </>
  );
}

export default function Marketplace() {
  const { uiLang } = useAppLanguage();
  const search = useSearch();
  const tr = (en: string, zh: string) => translateUi(uiLang, en, zh);
  const [copyTarget, setCopyTarget] = useState<Strategy | null>(null);
  const [followingStrategyIds, setFollowingStrategyIds] = useState<Set<string>>(() => new Set());
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
  const carouselStrategies = useMemo(() => {
    const available = visibleStrategies.filter((strategy) => marketplaceCardViews[strategy.id]);
    return available.length > 8 && !query ? available.slice(0, 8) : available;
  }, [query, visibleStrategies]);
  const strategyGroups = useMemo(() => [
    {
      id: "highest-return",
      title: "Highest returns",
      titleZh: "最高收益率",
      description: "The strongest 30-day return",
      descriptionZh: "近30天收益率最高的策略",
      strategies: [...carouselStrategies].sort((a, b) => (
        metricNumber(marketplaceCardViews[b.id].return30d) - metricNumber(marketplaceCardViews[a.id].return30d)
      )),
    },
    {
      id: "lowest-drawdown",
      title: "Lowest drawdown",
      titleZh: "最低回撤",
      description: "The most stable risk profile",
      descriptionZh: "风险控制最稳健的策略",
      strategies: [...carouselStrategies].sort((a, b) => (
        Math.abs(metricNumber(marketplaceCardViews[a.id].maxDrawdown)) - Math.abs(metricNumber(marketplaceCardViews[b.id].maxDrawdown))
      )),
    },
  ], [carouselStrategies]);

  useEffect(() => {
    document.documentElement.classList.add("oq-marketplace-active");
    return () => {
      document.documentElement.classList.remove("oq-marketplace-active");
    };
  }, []);

  if (!SHOW_MARKETPLACE_CONTENT || activeTab !== "marketplace") return null;

  return (
    <div className="oq-trade oq-marketplace">
      <section className="oq-marketplace-hero" aria-labelledby="oq-marketplace-hero-title">
        <div className="oq-marketplace-hero-inner">
          <header className="oq-marketplace-hero-heading">
            <h1 id="oq-marketplace-hero-title">{tr("Follow fund managers, trade with clarity", "跟随基金管理员，轻松进行交易")}</h1>
          </header>
          <MarketplaceSummary tr={tr} />
          <section className="oq-marketplace-strategy-groups" aria-label={tr("Official trading strategies", "官方交易策略")}>
            {strategyGroups.map((group) => (
              <StrategyCarousel
                key={group.id}
                title={group.title}
                titleZh={group.titleZh}
                description={group.description}
                descriptionZh={group.descriptionZh}
                strategies={group.strategies}
                tr={tr}
                isFollowing={(strategyId) => followingStrategyIds.has(strategyId)}
                onFollow={setCopyTarget}
              />
            ))}
          </section>
        </div>
      </section>

      <section className="oq-marketplace-rankings" aria-labelledby="oq-marketplace-ranking-title">
        <div className="oq-marketplace-ranking-inner">
          <header className="oq-marketplace-section-heading">
            <div>
              <h2 id="oq-marketplace-ranking-title">{tr("Fund manager performance rankings", "基金管理员表现排名")}</h2>
            </div>
          </header>
          <RankingBoards tr={tr} />
        </div>
      </section>

      <section className="oq-marketplace-cta" aria-labelledby="oq-marketplace-cta-title">
        <div className="oq-marketplace-cta-inner">
          <div>
            <h2 id="oq-marketplace-cta-title">{tr("Become a fund manager and earn copy trading income", "成为基金管理员，赚取带单收入")}</h2>
            <p>{tr("Earn up to 31% in lead trading income.", "赚取最高 31% 带单收入")}</p>
          </div>
          <Link href="/strategies/new" className="oq-marketplace-cta-button">
            {tr("Create fund", "创建基金")}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <CopyTradeDialog
        strategy={copyTarget}
        tr={tr}
        onOpenChange={(open) => {
          if (!open) setCopyTarget(null);
        }}
        onConfirm={() => {
          if (!copyTarget) return;
          setFollowingStrategyIds((current) => {
            const next = new Set(current);
            next.add(copyTarget.id);
            return next;
          });
          setCopyTarget(null);
        }}
      />
    </div>
  );
}

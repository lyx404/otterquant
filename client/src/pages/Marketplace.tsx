import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { CopyTradeDialog } from "@/components/CopyTradeDialog";
import { MarketplaceAvatar } from "@/components/MarketplaceAvatar";
import {
  translateUi,
  useAppLanguage,
} from "@/contexts/AppLanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Strategy } from "@/lib/mockData";
import {
  marketplaceCardDetails,
  marketplaceAvatarImages,
  marketplaceFollowerLimits,
  marketplaceFundNames,
  marketplaceOwnedPortfolioStrategyIds,
  marketplaceStrategies,
  marketplaceUserProfiles,
  type MarketplaceAvatarTone,
  type MarketplaceCardDetails,
} from "@/lib/marketplaceData";
import { useFollowingStrategyIds } from "@/lib/marketplaceState";
import { toast } from "sonner";
import "./Trade.css";
import "./Marketplace.css";

const SHOW_MARKETPLACE_CONTENT = true;
type AvatarTone = MarketplaceAvatarTone;

type MarketplaceCardView = {
  author: string;
  avatar: string;
  subscribers: number;
  capacity: number;
  title: string;
  return30d: string;
  pnl30d: string;
  maxDrawdown: string;
  sharpe: string;
  winRate: string;
  avatarTone: AvatarTone;
};

const marketplaceCardViews: Record<string, MarketplaceCardView> = {
  "STR-001": { ...marketplaceUserProfiles["STR-001"], subscribers: 200, capacity: 200, title: marketplaceFundNames["STR-001"], return30d: "+18.06%", pnl30d: "+902.89 USDT", maxDrawdown: "-0.2%", sharpe: "9.16", winRate: "35%" },
  "STR-002": { ...marketplaceUserProfiles["STR-002"], subscribers: 147, capacity: 200, title: marketplaceFundNames["STR-002"], return30d: "+12.84%", pnl30d: "+640.20 USDT", maxDrawdown: "-1.8%", sharpe: "4.82", winRate: "48%" },
  "STR-003": { ...marketplaceUserProfiles["STR-003"], subscribers: 88, capacity: 120, title: marketplaceFundNames["STR-003"], return30d: "+9.42%", pnl30d: "+471.00 USDT", maxDrawdown: "-0.9%", sharpe: "5.74", winRate: "52%" },
  "STR-005": { ...marketplaceUserProfiles["STR-005"], subscribers: 200, capacity: 200, title: marketplaceFundNames["STR-005"], return30d: "+7.18%", pnl30d: "+358.90 USDT", maxDrawdown: "-0.4%", sharpe: "7.31", winRate: "61%" },
  "STR-007": { ...marketplaceUserProfiles["STR-007"], subscribers: 64, capacity: 100, title: marketplaceFundNames["STR-007"], return30d: "+15.63%", pnl30d: "+781.50 USDT", maxDrawdown: "-2.6%", sharpe: "3.88", winRate: "47%" },
  "STR-008": { ...marketplaceUserProfiles["STR-008"], subscribers: 176, capacity: 200, title: marketplaceFundNames["STR-008"], return30d: "+20.40%", pnl30d: "+1,020.00 USDT", maxDrawdown: "-3.1%", sharpe: "3.45", winRate: "55%" },
  "STR-009": { ...marketplaceUserProfiles["STR-009"], subscribers: 112, capacity: 150, title: marketplaceFundNames["STR-009"], return30d: "+10.80%", pnl30d: "+540.00 USDT", maxDrawdown: "-1.1%", sharpe: "6.02", winRate: "58%" },
  "STR-010": { ...marketplaceUserProfiles["STR-010"], subscribers: 200, capacity: 200, title: marketplaceFundNames["STR-010"], return30d: "+8.90%", pnl30d: "+445.00 USDT", maxDrawdown: "-0.3%", sharpe: "8.12", winRate: "68%" },
  "STR-011": { ...marketplaceUserProfiles["STR-011"], subscribers: 93, capacity: 120, title: marketplaceFundNames["STR-011"], return30d: "+17.10%", pnl30d: "+855.00 USDT", maxDrawdown: "-2.4%", sharpe: "4.26", winRate: "51%" },
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
  { rank: 2, name: "AlphaAgent", profileId: "alpha-agent", country: "US", avatar: "A", avatarSrc: marketplaceAvatarImages.notion, avatarTone: "orange", returnValue: "+9,000.00 USDT", returnRate: "+8.2%", drawdown: "-3.3%", assets: "32,600.00 USDT", strategyId: "STR-001", series: [3, 3, 3, 3, 2, 2, 8, 10], tone: "positive" },
  { rank: 3, name: "林岚", profileId: "lin-lan", country: "CN", avatar: "林", avatarSrc: marketplaceAvatarImages.toon10, avatarTone: "blue", returnValue: "+9,000.00 USDT", returnRate: "+8.2%", drawdown: "-3.3%", assets: "32,600.00 USDT", strategyId: "STR-009", series: [5, 6, 4, 5, 7, 4, 3, 5], tone: "positive" },
  { rank: 4, name: "Kaito Mori", profileId: "kaito-mori", country: "JP", avatar: "K", avatarSrc: marketplaceAvatarImages.toon, avatarTone: "violet", returnValue: "+9,000.00 USDT", returnRate: "+8.2%", drawdown: "-3.3%", assets: "32,600.00 USDT", strategyId: "STR-005", series: [3, 5, 3, 4, 5, 6, 5, 9], tone: "positive" },
  { rank: 5, name: "Minseo Park", profileId: "minseo-park", country: "KR", avatar: "M", avatarSrc: marketplaceAvatarImages.memo17, avatarTone: "green", returnValue: "+9,000.00 USDT", returnRate: "+8.2%", drawdown: "-3.3%", assets: "32,600.00 USDT", strategyId: "STR-007", series: [6, 4, 5, 3, 4, 6, 7, 8], tone: "positive" },
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
  const { user } = useAuth();
  const displayName = user?.displayName || (user?.username ? `@${user.username}` : "Nicole Ong");
  const avatarInitial = (user?.displayName || user?.username || "Nicole Ong")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
  const metrics = [
    { label: tr("Available assets (USDT)", "可用资产 (USDT)"), value: "438,473.00" },
    { label: tr("Portfolio P&L (USDT)", "投资组合盈亏(USDT)"), value: "+323,827.08", tone: "positive" },
    { label: tr("Invested P&L (USDT)", "跟投盈亏(USDT)"), value: "+323,827.08", tone: "positive" },
  ];

  return (
    <div className="oq-marketplace-summary">
      <div className="oq-marketplace-summary-head">
        <Link
          href="/marketplace?tab=mine"
          className="oq-marketplace-summary-profile"
          aria-label={tr("View account", "查看个人资料")}
        >
          <span className="oq-marketplace-summary-avatar" aria-hidden="true">
            {user?.avatar ? <img src={user.avatar} alt="" /> : avatarInitial}
          </span>
          <span className="oq-marketplace-summary-name">{displayName}</span>
          <span className="oq-marketplace-summary-profile-link" aria-hidden="true">
            <ChevronRight size={16} aria-hidden="true" />
          </span>
        </Link>
        <Link href="/marketplace?tab=mine" className="oq-marketplace-summary-create">
          {tr("Create Portfolio", "创建投资组合")}
        </Link>
      </div>
      <div className="oq-marketplace-summary-metrics">
        {metrics.map((metric) => (
          <div className="oq-marketplace-summary-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong className={metric.tone === "positive" ? "is-positive" : undefined}>{metric.value}</strong>
          </div>
        ))}
      </div>
    </div>
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
  const { user } = useAuth();
  const view = marketplaceCardViews[strategy.id];
  if (!view) return null;
  const isCreator = marketplaceOwnedPortfolioStrategyIds.has(strategy.id);
  const followerLimit = marketplaceFollowerLimits[strategy.id];
  const isFull = followerLimit
    ? followerLimit.subscribers >= followerLimit.capacity
    : view.subscribers >= view.capacity;
  const status = isCreator ? "view" : isFollowing ? "following" : isFull ? "full" : "open";
  const accountName = user?.displayName || user?.username || "Nicole Ong";
  const accountInitials = accountName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "NO";
  const cardIdentity = isCreator
    ? { author: accountName, avatar: accountInitials, avatarTone: "orange" as const }
    : view;

  return (
    <Link
      href={`/marketplace/${strategy.id}${isCreator ? "?from=mine" : ""}`}
      className="oq-marketplace-card-link"
      aria-labelledby={`marketplace-card-title-${strategy.id}`}
    >
      <article className="oq-marketplace-card">
        <div className="oq-marketplace-card-header">
          <div className="oq-marketplace-card-author-row">
            <div className="oq-marketplace-author">
              {isCreator ? (
                <span className="oq-marketplace-avatar is-orange" aria-hidden="true">
                  {user?.avatar ? <img src={user.avatar} alt="" /> : cardIdentity.avatar}
                </span>
              ) : (
                <MarketplaceAvatar
                  strategyId={strategy.id}
                  name={cardIdentity.author}
                  avatar={cardIdentity.avatar}
                  avatarTone={cardIdentity.avatarTone}
                  className="oq-marketplace-avatar"
                />
              )}
              <div>
                <h3 id={`marketplace-card-title-${strategy.id}`}>{cardIdentity.author}</h3>
                <p className="oq-marketplace-author-strategy" title={view.title}>{view.title}</p>
              </div>
            </div>
            {status === "view" ? (
              <span className="oq-marketplace-status is-view">{tr("View", "查看")}</span>
            ) : status === "full" ? (
              <span className="oq-marketplace-status is-full">{tr("Full", "满员")}</span>
            ) : (
              <button
                type="button"
                className={`oq-marketplace-status ${status === "following" ? "is-following" : "is-open"}`}
                aria-pressed={isFollowing}
                onClick={(event) => {
                  if (status === "following") return;
                  event.preventDefault();
                  event.stopPropagation();
                  onFollow();
                }}
              >
                {status === "following" ? tr("Investing", "跟投中") : tr("Copy", "跟投")}
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
  const [scrollState, setScrollState] = useState({ canScrollPrev: false, canScrollNext: showControls });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(0, list.scrollWidth - list.clientWidth);
      setScrollState({
        canScrollPrev: list.scrollLeft > 1,
        canScrollNext: maxScrollLeft > 1 && list.scrollLeft < maxScrollLeft - 1,
      });
    };

    updateScrollState();
    list.addEventListener("scroll", updateScrollState, { passive: true });

    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateScrollState);
    resizeObserver?.observe(list);

    return () => {
      list.removeEventListener("scroll", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [strategies.length]);

  const scrollStrategies = (direction: number) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({ left: direction * Math.max(280, list.clientWidth * 0.82), behavior: "smooth" });
  };

  const canScrollPrev = showControls && scrollState.canScrollPrev;
  const canScrollNext = showControls && scrollState.canScrollNext;
  const controlsClassName = [
    "oq-marketplace-carousel-controls",
    showControls ? "has-controls" : "",
    canScrollPrev ? "has-prev" : "",
    canScrollNext ? "has-next" : "",
  ].filter(Boolean).join(" ");

  return (
    <section className="oq-marketplace-strategy-group" aria-labelledby={`marketplace-strategy-group-${title}`}>
      <header className="oq-marketplace-ranking-board-heading oq-marketplace-strategy-group-heading">
        <div>
          <h3 id={`marketplace-strategy-group-${title}`}>{tr(title, titleZh)}</h3>
          <p>{tr(description, descriptionZh)}</p>
        </div>
      </header>
      <div
        className={controlsClassName}
        aria-label={showControls ? tr("Strategy carousel controls", "策略横向浏览") : undefined}
      >
        {canScrollPrev && (
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
        {canScrollNext && (
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

type RankingMedalIconProps = {
  rank: 1 | 2 | 3;
  instanceId: string;
};

function RankingMedalIconThird() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M11.9158 6.45197C12.2105 6.47497 12.4413 6.50888 12.7342 6.55449C13.0347 7.04125 12.8932 11.924 12.8573 12.8144C12.8379 13.2904 12.7254 13.4109 12.3667 13.6413C11.6171 13.6118 11.3388 13.4866 11.3175 12.6422C11.308 12.2707 11.2933 11.8916 11.2784 11.5082C11.2177 9.93957 11.1541 8.29898 11.43 6.80819C11.4697 6.59268 11.629 6.54319 11.801 6.48979C11.839 6.47799 11.8777 6.46599 11.9158 6.45197Z" fill="#F1AD6C" />
      <path d="M15.4282 22.0455L15.5248 21.9283C16.1735 21.8869 17.0493 22.019 17.7348 22.0231C18.6831 22.0287 19.5638 21.9561 20.5092 21.8854C20.8981 22.819 21.1008 23.3685 21.9367 23.9819C23.2961 24.2427 24.4025 23.8412 24.0389 25.7805C26.3214 26.0025 25.8385 28.4731 25.8172 30.1757C26.0684 30.2992 26.688 30.5766 26.782 30.8043C27.2155 31.806 26.7297 32.9676 25.5234 32.9795C20.9321 33.0248 16.334 32.9786 11.7408 32.9883C10.5792 32.9908 8.46434 33.0983 9.0888 31.2434C9.32248 30.5486 9.64926 30.4106 10.2456 30.11C10.1399 28.289 9.67641 26.0458 11.9658 25.8005C11.8872 25.3188 11.8484 25.0024 12.022 24.5457C12.501 23.9563 13.2699 24.2874 13.9884 23.9734C14.8708 23.3024 15.0432 23.0691 15.4282 22.0455Z" fill="#55453D" />
      <path d="M15.4282 22.0455L15.5248 21.9283C16.1735 21.8869 17.0493 22.019 17.7348 22.0231C18.6831 22.0287 19.5638 21.9561 20.5092 21.8854C20.8981 22.819 21.1008 23.3685 21.9367 23.9819C23.2961 24.2427 24.4025 23.8412 24.0389 25.7805C23.459 25.8528 20.5677 25.8128 19.8172 25.8054C17.2389 25.7804 14.5285 25.8678 11.9658 25.8005C11.8872 25.3188 11.8484 25.0024 12.022 24.5457C12.501 23.9563 13.2699 24.2874 13.9884 23.9734C14.8708 23.3024 15.0432 23.0691 15.4282 22.0455Z" fill="#D98949" />
      <path d="M15.4282 22.0455L15.5248 21.9283C16.1735 21.8869 17.0493 22.019 17.7348 22.0231C18.6831 22.0287 19.5638 21.9561 20.5092 21.8854C20.8981 22.819 21.1008 23.3685 21.9367 23.9819C20.905 24.1221 14.579 24.2772 13.9884 23.9734C14.8708 23.3024 15.0432 23.0691 15.4282 22.0455Z" fill="#CB7B37" />
      <path d="M13.2226 27.7849C14.328 27.6957 22.0552 27.6085 22.8358 27.8999C23.2992 28.3793 23.1751 29.627 22.7834 30.1153C21.7265 30.2701 13.8801 30.3082 13.1538 30.0279C12.7252 29.5214 12.8309 28.2712 13.2226 27.7849Z" fill="#F1AD6C" />
      <path fillRule="evenodd" clipRule="evenodd" d="M26.9096 6.10315C28.8729 2.2999 24.4494 3.06114 22.2319 3.06409L12.1928 3.06995C11.1855 3.06302 9.78002 2.84473 9.00532 3.62171C8.06186 4.56975 8.5168 5.51051 9.30415 6.36292L9.36665 6.42835L9.29926 6.55042L9.0395 6.5719C6.01344 6.33035 3.25274 7.67493 3.01508 11.0416C2.90745 12.4668 3.37922 13.8747 4.32075 14.9391C5.78294 16.6183 7.98376 17.3549 10.0161 17.9987C10.4087 18.1405 10.9151 19.2569 11.395 19.7115C12.4558 20.7166 13.9272 21.3484 15.2924 21.8424C15.338 21.9101 15.3826 21.9779 15.4282 22.0455L15.5248 21.9283C16.1735 21.8869 17.0493 22.019 17.7348 22.0231C18.6831 22.0287 19.5638 21.9561 20.5092 21.8854C20.7267 21.7654 21.2249 21.6271 21.4506 21.5494C23.3772 20.8887 24.7361 19.8477 25.7358 18.0602C25.7599 18.0408 25.7839 18.0209 25.8081 18.0016C36.2335 15.5524 34.1655 5.7839 26.9594 6.5846L26.8051 6.55042L26.7397 6.43713L26.9096 6.10315ZM6.38227 9.70081C7.20541 8.94345 8.09787 8.85978 9.14106 8.90784C9.31359 9.47659 9.31507 13.7004 9.3393 14.6217C7.64341 14.4208 5.60193 13.5531 5.59223 11.4987C5.59135 10.8132 5.8791 10.1594 6.38227 9.70081ZM26.7534 9.02893C26.9666 8.82857 27.0521 8.88466 27.4125 8.83557C28.2872 9.02971 29.4695 9.30235 29.9184 10.1471C31.355 12.847 28.8043 14.4387 26.6479 14.6168C26.8156 12.9751 26.5468 10.528 26.7534 9.02893ZM18.4629 15.4725C20.1133 15.2779 21.2478 14.075 20.1317 12.471C19.7111 11.8662 19.9483 11.5557 20.2026 11.2227C20.5445 10.7749 20.9176 10.2865 19.7642 8.98718C18.4639 8.50468 17.6848 8.55228 16.322 8.63554L16.2327 8.64099C15.6665 8.88741 15.5288 9.1304 15.777 9.71899C16.2127 10.1107 16.7632 10.0437 17.2784 9.98097C17.9085 9.90426 18.4857 9.834 18.7354 10.6174C18.6037 11.287 18.2474 11.309 17.8346 11.3343C17.4663 11.357 17.0531 11.3824 16.7147 11.8735C16.6455 12.3856 17.105 12.4718 17.6159 12.5676C18.2085 12.6788 18.8699 12.8028 18.8537 13.6199C18.5234 14.1928 17.9144 14.1181 17.3094 14.0439C16.5468 13.9505 15.7905 13.8578 15.6073 15.0639C16.2366 15.5689 17.6717 15.5659 18.4629 15.4725ZM12.7342 6.55449C12.4413 6.50888 12.2105 6.47497 11.9158 6.45197C11.8777 6.46599 11.839 6.47799 11.801 6.48979C11.629 6.54319 11.4697 6.59268 11.43 6.80819C11.1541 8.29898 11.2177 9.93957 11.2784 11.5082C11.2933 11.8916 11.308 12.2707 11.3175 12.6422C11.3388 13.4866 11.6171 13.6118 12.3667 13.6413C12.7254 13.4109 12.8379 13.2909 12.8573 12.8144C12.8932 11.924 13.0347 7.04125 12.7342 6.55449Z" fill="#D98949" />
      <path fillRule="evenodd" clipRule="evenodd" d="M12.7342 6.55449C12.4413 6.50888 12.2105 6.47497 11.9158 6.45197C11.8777 6.46599 11.839 6.47799 11.801 6.48979C11.629 6.54319 11.4697 6.59268 11.43 6.80819C11.1541 8.29898 11.2177 9.93957 11.2784 11.5082C11.2933 11.8916 11.308 12.2707 11.3175 12.6422C11.3388 13.4866 11.6171 13.6118 12.3667 13.6413C12.7254 13.4109 12.8379 13.2904 12.8573 12.8144C12.8932 11.924 13.0347 7.04125 12.7342 6.55449Z" fill="#F1AD6C" />
      <path d="M20.1317 12.471C21.2478 14.075 20.1133 15.2779 18.4629 15.4725C17.6717 15.5659 16.2366 15.5689 15.6073 15.0639C15.7906 13.8578 16.5468 13.9505 17.3094 14.0439C17.9144 14.1181 18.5234 14.1928 18.8537 13.6199C18.8699 12.8028 18.2085 12.6788 17.6159 12.5676C17.1052 12.4718 16.6455 12.3856 16.7147 11.8735C17.0531 11.3824 17.4663 11.357 17.8346 11.3343C18.2474 11.309 18.6037 11.287 18.7354 10.6174C18.4857 9.834 17.9085 9.90426 17.2784 9.98097C16.7632 10.0437 16.2127 10.1107 15.777 9.71899C15.5288 9.1304 15.6665 8.88741 16.2327 8.64099L16.322 8.63554C17.6848 8.55228 18.4639 8.50468 19.7642 8.98718C20.9176 10.2865 20.5445 10.7749 20.2026 11.2227C19.9483 11.5557 19.7111 11.8662 20.1317 12.471Z" fill="#FFEDDC" />
    </svg>
  );
}

function RankingMedalIcon({ rank, instanceId }: RankingMedalIconProps) {
  if (rank === 1) {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M15.527 21.7969C15.6543 21.8068 15.7774 21.816 15.8967 21.8244C16.0502 21.8352 16.1977 21.8448 16.3401 21.8532C17.8578 21.9429 18.8064 21.9017 20.5355 21.8224C20.9703 22.8941 21.1065 23.3149 22.1588 23.9056C23.7645 24.0897 24.2129 23.9052 24.1454 25.6827C26.3438 25.7382 25.8504 28.3544 25.8223 29.9093C26.2052 30.1074 26.7341 30.2696 26.8716 30.7401C27.0901 31.217 26.824 32.5293 26.1304 32.564C21.3247 32.8015 16.4788 32.6103 11.661 32.6634C10.6013 32.6751 9.31663 32.8469 9.05675 31.5219C8.81011 30.2644 10.1153 30.0632 10.1714 29.8817C10.645 28.3474 9.22138 25.983 11.8207 25.6686C11.7269 23.6783 12.642 24.2806 13.925 23.8758C14.9379 23.1729 15.1093 22.9265 15.527 21.7969Z" fill="#55453D" />
        <path d="M15.527 21.7969C15.6543 21.8068 15.7774 21.816 15.8967 21.8244C16.0502 21.8352 16.1977 21.8448 16.3401 21.8532C17.8578 21.9429 18.8064 21.9017 20.5355 21.8224C20.9703 22.8941 21.1065 23.3149 22.1588 23.9056C23.7645 24.0897 24.2129 23.9052 24.1454 25.6827L11.8207 25.6686C11.7269 23.6783 12.642 24.2806 13.925 23.8758C14.9379 23.1729 15.1093 22.9265 15.527 21.7969Z" fill="#F4B813" />
        <path d="M15.527 21.7969C15.6543 21.8068 15.7774 21.816 15.8967 21.8244C16.0502 21.8352 16.1977 21.8448 16.3401 21.8532C17.8584 21.943 18.808 21.9022 20.5366 21.8229C20.9715 22.8946 21.1065 23.3149 22.1588 23.9056C21.4139 24.0465 14.5025 24.0897 13.925 23.8758C14.9379 23.1729 15.1093 22.9265 15.527 21.7969Z" fill="#F1AD6C" />
        <path d="M13.7635 27.4734C14.9856 27.4274 22.0506 27.2629 22.7127 27.6268C22.8963 27.7276 23.0217 27.9675 23.0819 28.1588C23.2155 28.5829 23.2094 29.2702 22.9568 29.656C22.7998 29.8956 22.6124 29.9009 22.3566 29.9531C19.6197 29.9563 16.1109 30.0401 13.3214 29.8621C12.7174 29.8235 12.8524 28.2835 13.0481 27.7867C13.3347 27.541 13.3777 27.551 13.7635 27.4734Z" fill="#F5C964" />
        <path fillRule="evenodd" clipRule="evenodd" d="M15.5288 21.7975C15.6554 21.8073 15.7779 21.816 15.8967 21.8244C16.0502 21.8352 16.1977 21.8448 16.3401 21.8532C17.8584 21.943 18.808 21.9022 20.5366 21.8229L20.5355 21.8224C18.8064 21.9017 17.8578 21.9429 16.3401 21.8532C16.1977 21.8448 16.0502 21.8352 15.8967 21.8244C15.7774 21.816 15.6543 21.8068 15.527 21.7969L15.5288 21.7975Z" fill="#F5F2E8" />
        <path fillRule="evenodd" clipRule="evenodd" d="M26.6031 3.59826C25.6847 3.21854 12.4593 3.29804 10.6734 3.3883C10.2742 3.40851 9.76741 3.42576 9.39797 3.59143C9.02178 3.7604 8.74644 4.24855 8.62551 4.62073C8.34254 5.4922 8.92504 5.97748 9.25149 6.6842C9.27135 6.72729 9.29079 6.7718 9.31008 6.81506C7.37617 6.81429 5.88008 6.72391 4.38039 8.20373C3.47944 9.1097 2.98175 10.3378 3.00051 11.6119C3.00916 13.0236 3.59031 14.3738 4.61184 15.3541C6.09048 16.7698 8.12466 17.4934 10.0611 18.0231L10.105 18.0709C10.483 18.4867 10.7692 18.962 11.147 19.3785C12.4172 20.7785 13.7085 21.2014 15.4082 21.758L15.527 21.7969C15.6543 21.8068 15.7774 21.816 15.8967 21.8244C16.0502 21.8352 16.1977 21.8448 16.3401 21.8532C17.8578 21.9429 18.8064 21.9017 20.5355 21.8224L20.5366 21.8229C20.9678 21.56 22.3545 21.1187 22.9536 20.8434C24.4341 20.1629 24.7864 19.0175 25.8648 18.1061C27.8978 17.4037 29.992 16.7538 31.5493 15.152C33.4669 13.1907 33.5356 9.87552 31.439 8.01428C29.9201 6.66635 28.546 6.77869 26.6577 6.87756C26.7039 6.61385 26.9171 6.36065 27.0474 6.12756C27.3083 5.66017 27.5506 5.00835 27.3726 4.48108C27.2533 4.12852 26.954 3.74391 26.6031 3.59826ZM16.481 9.9469C16.9376 9.26413 17.3449 8.20057 17.9536 7.73303C18.8371 8.10335 19.1163 9.03797 19.5396 9.91076C20.3286 10.1751 21.9771 10.3174 22.1499 11.1656C21.9563 11.8589 21.1099 12.5901 20.5786 13.1266C21.1935 15.9858 20.704 16.3935 18.1841 15.0563C17.7154 15.0323 16.6682 15.7282 15.8706 15.8795C14.9303 15.6406 15.4375 13.8948 15.5689 13.1383C15.0509 12.5964 13.9815 11.6749 14.0366 10.9362C14.4265 10.407 15.7725 10.1705 16.481 9.9469ZM26.605 14.7965C26.6296 14.0342 26.629 9.51623 26.8238 9.14807L27.0835 9.08557C31.6337 9.3922 31.6134 13.8324 26.605 14.7965ZM9.35207 14.7008C4.95029 14.3244 4.07003 9.81112 8.46829 9.09338C8.74163 9.10957 9.03789 9.08676 9.23391 9.25451C9.41175 10.3076 9.25631 13.3333 9.35207 14.7008Z" fill={`url(#ranking-medal-gold-${instanceId})`} />
        <path d="M17.9536 7.73303C17.3449 8.20057 16.9376 9.26413 16.481 9.9469C15.7725 10.1705 14.4265 10.407 14.0366 10.9362C13.9815 11.6749 15.0509 12.5964 15.5689 13.1383C15.4375 13.8948 14.9303 15.6406 15.8706 15.8795C16.6682 15.7282 17.7154 15.0323 18.1841 15.0563C20.704 16.3935 21.1935 15.9858 20.5786 13.1266C21.1099 12.5901 21.9563 11.8589 22.1499 11.1656C21.9771 10.3174 20.3286 10.1751 19.5396 9.91076C19.1163 9.03797 18.8371 8.10335 17.9536 7.73303Z" fill="white" />
        <defs>
          <linearGradient id={`ranking-medal-gold-${instanceId}`} x1="17.9998" y1="3.31348" x2="17.9998" y2="32.6863" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFC400" />
            <stop offset="1" stopColor="#FFD54A" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  if (rank === 2) {
    return (
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M12.0639 3.0459C14.5151 3.29431 25.5039 2.60092 26.7104 3.39258C27.0371 3.60454 27.2643 3.9425 27.3383 4.32813C27.4922 5.16666 26.9853 5.95039 26.5688 6.61035C27.9227 6.44938 28.9585 6.39505 30.2417 6.99414C31.3873 7.51859 32.2752 8.4895 32.7026 9.68652C33.4955 11.8807 32.6395 14.0852 30.9243 15.5371C29.3728 16.8503 27.5601 17.4216 25.6987 18.0967C24.0305 20.3317 23.1829 20.9629 20.5337 21.7354C18.9843 22.1345 17.0979 21.7637 15.602 21.8281C12.8056 20.9206 11.9258 20.3873 10.2456 18.0059C6.9563 17.2285 2.78952 15.0861 3.00827 11.0879C3.0696 9.82081 3.63362 8.63212 4.57174 7.79102C6.00731 6.50166 7.59821 6.45623 9.40475 6.55957C7.3628 3.71302 9.6162 2.79772 12.0639 3.0459ZM26.7495 8.90039C26.6739 10.8159 26.7263 12.7248 26.6137 14.6367C27.7185 14.3693 28.2211 14.2747 29.2182 13.6904C31.764 11.2387 29.9444 8.84442 26.7495 8.90039ZM9.12838 8.87891C8.80549 8.82679 8.76904 8.82271 8.44577 8.85254C7.48363 9.03347 6.67099 9.25958 6.06393 10.1377C5.69777 10.6701 5.55634 11.3286 5.67038 11.9668C5.80706 12.7408 6.24142 13.3373 6.88131 13.7598C7.00697 13.8423 7.13479 13.923 7.26315 14.001C7.93268 14.3003 8.64221 14.4974 9.36862 14.5869C9.34959 13.7787 9.35265 9.14776 9.12838 8.87891Z" fill="#D3D1CD" />
        <path d="M17.4529 7.8544C19.1373 7.7581 21.0689 8.38698 20.7692 10.519C20.5371 12.1697 19.1746 13.3631 17.9373 14.3217C18.3215 14.2736 18.7061 14.23 19.0912 14.191C19.7084 14.1318 20.3429 14.0785 20.842 14.4939C21.6099 15.7988 20.0108 16.0145 19.1663 15.9036C18.7537 15.8495 18.0357 15.899 17.5907 15.8956L17.4932 15.8967C16.747 15.9027 16.1465 16.0085 15.6102 15.4733C14.8349 13.7882 19.8572 11.6276 18.5899 9.83979C17.9432 8.92739 16.2513 10.8234 15.6228 9.99911C15.4321 9.74907 15.3883 9.36847 15.439 9.08104C15.9104 8.29352 16.6295 8.08467 17.4529 7.8544Z" fill="#F5F2E8" />
        <path d="M11.3409 6.58527C11.9223 6.50854 12.2763 6.54867 12.8643 6.58938C12.8856 7.84284 12.978 12.6044 12.7352 13.5228C12.2565 13.586 11.9532 13.6246 11.5542 13.3606C11.0096 12.6422 11.2771 7.70495 11.3409 6.58527Z" fill="#F5F2E8" />
        <path d="M15.602 21.8281C17.0979 21.7637 18.9843 22.1345 20.5337 21.7354C20.8055 22.7879 21.1279 23.2793 21.9268 23.9935C23.34 24.0556 24.1849 23.9646 24.2297 25.755C26.3192 26.3985 25.794 28.1746 25.7194 30.0368C25.7762 30.067 25.8323 30.0987 25.8897 30.1275C26.2364 30.3023 26.5123 30.4559 26.7619 30.7684C26.9107 30.9548 27.0207 31.1939 26.9753 31.4365C26.8979 31.85 26.7108 32.5086 26.3218 32.7203C25.6495 33.0862 10.6843 33.0908 9.79007 32.7472C9.49716 32.6346 9.20435 32.4235 9.07704 32.1242C8.94035 31.8028 9.0083 31.4481 9.13127 31.1345C9.38 30.4998 9.69871 30.3311 10.2808 30.0756C10.1487 28.4054 9.70355 26.347 11.6611 25.7846C11.821 24.037 12.5827 24.0669 14.0143 23.999C14.8515 23.2131 15.1118 22.8697 15.602 21.8281Z" fill="#55453D" />
        <path d="M15.602 21.8281C17.0979 21.7637 18.9833 22.1352 20.5327 21.736C20.8045 22.7885 21.1268 23.2793 21.9258 23.9935C23.339 24.0556 24.1838 23.9646 24.2286 25.755C20.2987 25.7273 15.5149 25.6334 11.66 25.7846C11.8199 24.037 12.5817 24.0669 14.0132 23.999C14.8504 23.2131 15.1111 22.8697 15.602 21.8281Z" fill="#D3D1CD" />
        <path d="M15.602 21.8281C17.0979 21.7637 18.9833 22.1352 20.5327 21.736C20.8045 22.7885 21.1268 23.2793 21.9258 23.9935C20.967 24.1212 14.897 24.1727 14.0132 23.999C14.8504 23.2131 15.1111 22.8697 15.602 21.8281Z" fill="#BEBAB6" />
        <path d="M13.2032 27.7266C14.4349 27.6554 22.1416 27.5673 22.8457 27.879C23.2451 28.4041 23.1168 29.6186 22.7127 30.0992C21.464 30.1707 14.0122 30.2747 13.2256 30.0013C12.6988 29.4257 12.8051 28.3452 13.2032 27.7266Z" fill="#D3D1CD" />
      </svg>
    );
  }

  if (rank === 3) return <RankingMedalIconThird />;

  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
      <path d="M16.2327 8.64099C16.2628 8.63916 16.2926 8.63734 16.322 8.63554C17.6848 8.55228 18.4639 8.50468 19.7642 8.98718C20.9176 10.2865 20.5445 10.7749 20.2026 11.2227C19.9483 11.5557 19.7111 11.8662 20.1317 12.471C21.2478 14.075 20.1133 15.2779 18.4629 15.4725C17.6717 15.5659 16.2366 15.5689 15.6073 15.0639C15.7905 13.8578 16.5468 13.9505 17.3094 14.0439C17.9144 14.1181 18.5234 14.1928 18.8537 13.6199C18.8699 12.8028 18.2085 12.6788 17.6159 12.5676C17.1052 12.4718 16.6455 12.3856 16.7147 11.8735C17.0531 11.3824 17.4663 11.357 17.8346 11.3343C18.2474 11.309 18.6037 11.287 18.7354 10.6174C18.4857 9.834 17.9085 9.90426 17.2784 9.98097C16.7632 10.0437 16.2127 10.1107 15.777 9.71899C15.5288 9.1304 15.6665 8.88741 16.2327 8.64099Z" fill="#F5F2E8" />
      <path d="M11.9158 6.45197C12.2105 6.47497 12.4413 6.50888 12.7342 6.55449C13.0347 7.04125 12.8932 11.924 12.8573 12.8144C12.8379 13.2904 12.7254 13.4109 12.3667 13.6413C11.6171 13.6118 11.3388 13.4866 11.3175 12.6422C11.308 12.2707 11.2933 11.8916 11.2784 11.5082C11.2177 9.93957 11.1541 8.29898 11.43 6.80819C11.4697 6.59268 11.629 6.54319 11.801 6.48979C11.839 6.47799 11.8777 6.46599 11.9158 6.45197Z" fill="#F1AD6C" />
      <path d="M15.4282 22.0455L15.5248 21.9283C16.1735 21.8869 17.0493 22.019 17.7348 22.0231C18.6831 22.0287 19.5638 21.9561 20.5092 21.8854C20.8981 22.819 21.1008 23.3685 21.9367 23.9819C23.2961 24.2427 24.4025 23.8412 24.0389 25.7805C26.3214 26.0025 25.8385 28.4731 25.8172 30.1757C26.0684 30.2992 26.688 30.5766 26.782 30.8043C27.2155 31.806 26.7297 32.9676 25.5234 32.9795C20.9321 33.0248 16.334 32.9786 11.7408 32.9883C10.5792 32.9908 8.46434 33.0983 9.0888 31.2434C9.32248 30.5486 9.64926 30.4106 10.2456 30.11C10.1399 28.289 9.67641 26.0458 11.9658 25.8005C11.8872 25.3188 11.8484 25.0024 12.022 24.5457C12.501 23.9563 13.2699 24.2874 13.9884 23.9734C14.8708 23.3024 15.0432 23.0691 15.4282 22.0455Z" fill="#55453D" />
      <path d="M15.4282 22.0455L15.5248 21.9283C16.1735 21.8869 17.0493 22.019 17.7348 22.0231C18.6831 22.0287 19.5638 21.9561 20.5092 21.8854C20.8981 22.819 21.1008 23.3685 21.9367 23.9819C23.2961 24.2427 24.4025 23.8412 24.0389 25.7805C23.459 25.8528 20.5677 25.8128 19.8172 25.8054C17.2389 25.7804 14.5285 25.8678 11.9658 25.8005C11.8872 25.3188 11.8484 25.0024 12.022 24.5457C12.501 23.9563 13.2699 24.2874 13.9884 23.9734C14.8708 23.3024 15.0432 23.0691 15.4282 22.0455Z" fill="#D98949" />
      <path d="M15.4282 22.0455L15.5248 21.9283C16.1735 21.8869 17.0493 22.019 17.7348 22.0231C18.6831 22.0287 19.5638 21.9561 20.5092 21.8854C20.8981 22.819 21.1008 23.3685 21.9367 23.9819C20.905 24.1221 14.579 24.2772 13.9884 23.9734C14.8708 23.3024 15.0432 23.0691 15.4282 22.0455Z" fill="#CB7B37" />
      <path d="M13.2226 27.7849C14.328 27.6957 22.0552 27.6085 22.8358 27.8999C23.2992 28.3793 23.1751 29.627 22.7834 30.1153C21.7265 30.2701 13.8801 30.3082 13.1538 30.0279C12.7252 29.5214 12.8309 28.2712 13.2226 27.7849Z" fill="#F1AD6C" />
      <path fillRule="evenodd" clipRule="evenodd" d="M16.322 8.63554C17.6848 8.55228 18.4639 8.50468 19.7642 8.98718C20.9176 10.2865 20.5445 10.7749 20.2026 11.2227C19.9483 11.5557 19.7111 11.8662 20.1317 12.471C21.2478 14.075 20.1133 15.2779 18.4629 15.4725C17.6717 15.5659 16.2366 15.5689 15.6073 15.0639C15.7905 13.8578 16.5468 13.9505 17.3094 14.0439C17.9144 14.1181 18.5234 14.1928 18.8537 13.6199C18.8699 12.8028 18.2085 12.6788 17.6159 12.5676C17.1052 12.4718 16.6455 12.3856 16.7147 11.8735C17.0531 11.3824 17.4663 11.357 17.8346 11.3343C18.2474 11.309 18.6037 11.287 18.7354 10.6174C18.4857 9.834 17.9085 9.90426 17.2784 9.98097C16.7632 10.0437 16.2127 10.1107 15.777 9.71899C15.5288 9.1304 15.6665 8.88741 16.2327 8.64099C16.2628 8.63916 16.2926 8.63734 16.322 8.63554ZM11.9158 6.45197C12.2105 6.47497 12.4413 6.50888 12.7342 6.55449C13.0347 7.04125 12.8932 11.924 12.8573 12.8144C12.8379 13.2904 12.7254 13.4109 12.3667 13.6413C11.6171 13.6118 11.3388 13.4866 11.3175 12.6422C11.308 12.2707 11.2933 11.8916 11.2784 11.5082C11.2177 9.93957 11.1541 8.29898 11.43 6.80819C11.4697 6.59268 11.629 6.54319 11.801 6.48979C11.839 6.47799 11.8777 6.46599 11.9158 6.45197Z" fill="#D98949" />
      <path fillRule="evenodd" clipRule="evenodd" d="M26.9096 6.10315C28.8729 2.2999 24.4494 3.06114 22.2319 3.06409L12.1928 3.06995C11.1855 3.06302 9.78002 2.84473 9.00532 3.62171C8.06186 4.56975 8.5168 5.51051 9.30415 6.36292L9.36665 6.42835L9.29926 6.55042L9.0395 6.5719C6.01344 6.33035 3.25274 7.67493 3.01508 11.0416C2.90745 12.4668 3.37922 13.8747 4.32075 14.9391C5.78294 16.6183 7.98376 17.3549 10.0161 17.9987C10.4087 18.1405 10.9151 19.2569 11.395 19.7115C12.4558 20.7166 13.9272 21.3484 15.2924 21.8424C15.338 21.9101 15.3826 21.9779 15.4282 22.0455L15.5248 21.9283C16.1735 21.8869 17.0493 22.019 17.7348 22.0231C18.6831 22.0287 19.5638 21.9561 20.5092 21.8854C20.7267 21.7654 21.2249 21.6271 21.4506 21.5494C23.3772 20.8887 24.7361 19.8477 25.7358 18.0602C25.7599 18.0408 25.7839 18.0209 25.8081 18.0016C36.2335 15.5524 34.1655 5.7839 26.9594 6.5846L26.8051 6.55042L26.7397 6.43713L26.9096 6.10315ZM6.38227 9.70081C7.20541 8.94345 8.09787 8.85978 9.14106 8.90784C9.31359 9.47659 9.31507 13.7004 9.3393 14.6217C7.64341 14.4208 5.60193 13.5531 5.59223 11.4987C5.59135 10.8132 5.8791 10.1594 6.38227 9.70081ZM26.7534 9.02893C26.9666 8.82857 27.0521 8.88466 27.4125 8.83557C28.2872 9.02971 29.4695 9.30235 29.9184 10.1471C31.355 12.847 28.8043 14.4387 26.6479 14.6168C26.8156 12.9751 26.5468 10.528 26.7534 9.02893ZM18.4629 15.4725C20.1133 15.2779 21.2478 14.075 20.1317 12.471C19.7111 11.8662 19.9483 11.5557 20.2026 11.2227C20.5445 10.7749 20.9176 10.2865 19.7642 8.98718C18.4639 8.50468 17.6848 8.55228 16.322 8.63554L16.2327 8.64099C15.6665 8.88741 15.5288 9.1304 15.777 9.71899C16.2127 10.1107 16.7632 10.0437 17.2784 9.98097C17.9085 9.90426 18.4857 9.834 18.7354 10.6174C18.6037 11.287 18.2474 11.309 17.8346 11.3343C17.4663 11.357 17.0531 11.3824 16.7147 11.8735C16.6455 12.3856 17.1052 12.4718 17.6159 12.5676C18.2085 12.6788 18.8699 12.8028 18.8537 13.6199C18.5234 14.1928 17.9144 14.1181 17.3094 14.0439C16.5468 13.9505 15.7905 13.8578 15.6073 15.0639C16.2366 15.5689 17.6717 15.5659 18.4629 15.4725ZM12.7342 6.55449C12.4413 6.50888 12.2105 6.47497 11.9158 6.45197C11.8777 6.46599 11.839 6.47799 11.801 6.48979C11.629 6.54319 11.4697 6.59268 11.43 6.80819C11.1541 8.29898 11.2177 9.93957 11.2784 11.5082C11.2933 11.8916 11.308 12.2707 11.3175 12.6422C11.3388 13.4866 11.6171 13.6118 12.3667 13.6413C12.7254 13.4109 12.8379 13.2904 12.8573 12.8144C12.8932 11.924 13.0347 7.04125 12.7342 6.55449Z" fill="#D98949" />
      <path fillRule="evenodd" clipRule="evenodd" d="M26.9096 6.10315C28.8729 2.2999 24.4494 3.06114 22.2319 3.06409L12.1928 3.06995C11.1855 3.06302 9.78002 2.84473 9.00532 3.62171C8.06186 4.56975 8.5168 5.51051 9.30415 6.36292L9.36665 6.42835L9.29926 6.55042L9.0395 6.5719C6.01344 6.33035 3.25274 7.67493 3.01508 11.0416C2.90745 12.4668 3.37922 13.8747 4.32075 14.9391C5.78294 16.6183 7.98376 17.3549 10.0161 17.9987C10.4087 18.1405 10.9151 19.2569 11.395 19.7115C12.4558 20.7166 13.9272 21.3484 15.2924 21.8424C15.338 21.9101 15.3826 21.9779 15.4282 22.0455L15.5248 21.9283C16.1735 21.8869 17.0493 22.019 17.7348 22.0231C18.6831 22.0287 19.5638 21.9561 20.5092 21.8854C20.7267 21.7654 21.2249 21.6271 21.4506 21.5494C23.3772 20.8887 24.7361 19.8477 25.7358 18.0602C25.7599 18.0408 25.7839 18.0209 25.8081 18.0016C36.2335 15.5524 34.1655 5.7839 26.9594 6.5846L26.8051 6.55042L26.7397 6.43713L26.9096 6.10315ZM6.38227 9.70081C7.20541 8.94345 8.09787 8.85978 9.14106 8.90784C9.31359 9.47659 9.31507 13.7004 9.3393 14.6217C7.64341 14.4208 5.60193 13.5531 5.59223 11.4987C5.59135 10.8132 5.8791 10.1594 6.38227 9.70081ZM26.7534 9.02893C26.9666 8.82857 27.0521 8.88466 27.4125 8.83557C28.2872 9.02971 29.4695 9.30235 29.9184 10.1471C31.355 12.847 28.8043 14.4387 26.6479 14.6168C26.8156 12.9751 26.5468 10.528 26.7534 9.02893ZM18.4629 15.4725C20.1133 15.2779 21.2478 14.075 20.1317 12.471C19.7111 11.8662 19.9483 11.5557 20.2026 11.2227C20.5445 10.7749 20.9176 10.2865 19.7642 8.98718C18.4639 8.50468 17.6848 8.55228 16.322 8.63554L16.2327 8.64099C15.6665 8.88741 15.5288 9.1304 15.777 9.71899C16.2127 10.1107 16.7632 10.0437 17.2784 9.98097C17.9085 9.90426 18.4857 9.834 18.7354 10.6174C18.6037 11.287 18.2474 11.309 17.8346 11.3343C17.4663 11.357 17.0531 11.3824 16.7147 11.8735C16.6455 12.3856 17.105 12.4718 17.6159 12.5676C18.2085 12.6788 18.8699 12.8028 18.8537 13.6199C18.5234 14.1928 17.9144 14.1181 17.3094 14.0439C16.5468 13.9505 15.7905 13.8578 15.6073 15.0639C16.2366 15.5689 17.6717 15.5659 18.4629 15.4725ZM12.7342 6.55449C12.4413 6.50888 12.2105 6.47497 11.9158 6.45197C11.8777 6.46599 11.839 6.47799 11.801 6.48979C11.629 6.54319 11.4697 6.59268 11.43 6.80819C11.1541 8.29898 11.2177 9.93957 11.2784 11.5082C11.2933 11.8916 11.308 12.2707 11.3175 12.6422C11.3388 13.4866 11.6171 13.6118 12.3667 13.6413C12.7254 13.4109 12.8379 13.2904 12.8573 12.8144C12.8932 11.924 13.0347 7.04125 12.7342 6.55449Z" fill="#D98949" />
    </svg>
  );
}

const rankingBoards: RankingBoardDefinition[] = [
  {
    id: "managers",
    title: "Top Portfolio Managers",
    titleZh: "最佳组合管理员",
    description: "Portfolio Managers ranked by 30-day portfolio return",
    descriptionZh: "近30天组合收益率排名的组合管理员",
    metric: "returnRate",
    metricLabel: "30-day portfolio return",
    metricLabelZh: "近30天组合收益率",
    rows: [...rankingRows].sort((a, b) => metricNumber(b.returnRate) - metricNumber(a.returnRate)),
  },
  {
    id: "investors",
    title: "Top Portfolio Investors",
    titleZh: "最佳跟投者",
    description: "Portfolio Investors ranked by 30-day copy investing return",
    descriptionZh: "近30天跟投收益率排名的跟投者",
    metric: "returnRate",
    metricLabel: "30-day copy investing return",
    metricLabelZh: "近30天跟投收益率",
    rows: [...rankingRows].sort((a, b) => metricNumber(b.returnRate) - metricNumber(a.returnRate)),
  },
  {
    id: "returns",
    title: "Highest returns",
    titleZh: "最高收益用户",
    description: "Total 30-day portfolio and copy investing P&L",
    descriptionZh: "近30天总收益最高的用户",
    metric: "returnValue",
    metricLabel: "30-day P&L",
    metricLabelZh: "近30天盈亏(USDT)",
    rows: [...rankingRows].sort((a, b) => metricNumber(b.returnValue) - metricNumber(a.returnValue)),
  },
];

function rankingMetricValue(row: RankingRow, metric: RankingMetric) {
  const value = row[metric];
  return metric === "returnValue" ? value.replace(/\s+USDT$/, "") : value;
}

function RankingBoards({ tr }: { tr: (en: string, zh: string) => string }) {
  const [showAll, setShowAll] = useState(false);
  const visibleCount = showAll ? rankingRows.length : 5;

  return (
    <>
      <div className="oq-marketplace-ranking-boards">
        {rankingBoards.map((board) => (
          <div key={board.id} className="oq-marketplace-ranking-board-group">
            <header className="oq-marketplace-ranking-board-external-heading">
              <div>
                <h3 id={`marketplace-ranking-board-${board.id}`}>{tr(board.title, board.titleZh)}</h3>
                <p>{tr(board.description, board.descriptionZh)}</p>
              </div>
            </header>
            <section className="oq-marketplace-ranking-board" aria-labelledby={`marketplace-ranking-board-${board.id}`}>
              <div className="oq-marketplace-ranking-columns">
                <span>{tr("Rank", "排名")}</span>
                <span>{tr("User", "用户昵称")}</span>
                <span>{tr(board.metricLabel, board.metricLabelZh)}</span>
                <span />
              </div>
              <div className="oq-marketplace-ranking-list">
                {board.rows.slice(0, visibleCount).map((row, index) => (
                  <Link
                    key={`${board.id}-${row.profileId}`}
                    href={`/marketplace/users/${row.profileId}`}
                    className="oq-marketplace-ranking-item"
                    aria-label={tr(`View ${row.name}'s profile`, `查看 ${row.name} 的主页`)}
                  >
                    <span
                      className={`oq-marketplace-ranking-rank${index < 3 ? ` is-top is-rank-${index + 1} is-medal` : ""}`}
                      aria-label={tr(`Rank ${index + 1}`, `排名 ${index + 1}`)}
                    >
                      {index < 3 ? (
                        <RankingMedalIcon rank={(index + 1) as 1 | 2 | 3} instanceId={`${board.id}-${index + 1}`} />
                      ) : index + 1}
                    </span>
                    <span className="oq-marketplace-ranking-user">
                      <span className={`oq-marketplace-avatar is-${row.avatarTone}`} aria-hidden="true">
                        {row.avatarSrc ? <img src={row.avatarSrc} alt="" /> : row.avatar}
                      </span>
                      <span className="oq-marketplace-ranking-item-name">
                        <span className="oq-marketplace-country-flag" aria-label={tr(`Region: ${row.country}`, `所在地区：${row.country}`)}>
                          <span aria-hidden="true">{countryFlags[row.country]}</span>
                        </span>
                        <strong>{row.name}</strong>
                      </span>
                    </span>
                    <span className="oq-marketplace-ranking-item-stat">
                      <strong>{rankingMetricValue(row, board.metric)}</strong>
                    </span>
                    <ChevronRight aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="oq-marketplace-ranking-more"
        aria-expanded={showAll}
        onClick={() => setShowAll((current) => !current)}
      >
        {showAll ? tr("Show less", "收起") : tr("More", "更多")}
        {showAll ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
      </button>
    </>
  );
}

export default function Marketplace() {
  const { uiLang } = useAppLanguage();
  const search = useSearch();
  const [, navigate] = useLocation();
  const tr = (en: string, zh: string) => translateUi(uiLang, en, zh);
  const [copyTarget, setCopyTarget] = useState<Strategy | null>(null);
  const { followingStrategyIds, addFollowing } = useFollowingStrategyIds();
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
  const strategyGroups = useMemo(() => {
    return [
      {
        id: "highest-return",
        title: "Highest returns",
        titleZh: "最高收益率",
        description: "The strongest 30-day return",
        descriptionZh: "近30天收益率最高的投资组合",
        strategies: [...carouselStrategies].sort((a, b) => metricNumber(marketplaceCardViews[b.id].return30d) - metricNumber(marketplaceCardViews[a.id].return30d)),
      },
      {
        id: "lowest-drawdown",
        title: "Lowest drawdown",
        titleZh: "最低回撤",
        description: "The most stable risk profile",
        descriptionZh: "风险控制最稳的投资组合",
        strategies: [...carouselStrategies].sort((a, b) => Math.abs(metricNumber(marketplaceCardViews[a.id].maxDrawdown)) - Math.abs(metricNumber(marketplaceCardViews[b.id].maxDrawdown))),
      },
    ];
  }, [carouselStrategies]);

  useEffect(() => {
    document.documentElement.classList.add("oq-marketplace-active");
    return () => {
      document.documentElement.classList.remove("oq-marketplace-active");
    };
  }, []);

  if (!SHOW_MARKETPLACE_CONTENT) return null;
  if (activeTab === "mine") {
    return (
      <div className="oq-trade oq-marketplace oq-marketplace-mine-demo">
        <section className="oq-marketplace-mine-demo-panel">
          <Link href="/marketplace/STR-008?from=mine" className="oq-marketplace-mine-demo-button">
            {tr("My portfolio detail page", "我的-投资组合详情页")}
            <ArrowUpRight aria-hidden="true" />
          </Link>
          <Link href="/marketplace/STR-005?from=mine" className="oq-marketplace-mine-demo-button">
            {tr("My copy investment detail page", "我的-跟投详情页")}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </section>
      </div>
    );
  }
  if (activeTab !== "marketplace") return null;

  return (
    <div className="oq-trade oq-marketplace">
      <section className="oq-marketplace-hero" aria-labelledby="oq-marketplace-hero-title">
        <div className="oq-marketplace-hero-inner">
          <header className="oq-marketplace-hero-heading">
            <h1 id="oq-marketplace-hero-title">{tr("Follow portfolios, invest with clarity", "跟随投资组合，轻松配置资产")}</h1>
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
                onFollow={(strategy) => {
                  setCopyTarget(strategy);
                }}
              />
            ))}
          </section>
        </div>
      </section>

      <section className="oq-marketplace-rankings" aria-labelledby="oq-marketplace-ranking-title">
        <div className="oq-marketplace-ranking-inner">
          <header className="oq-marketplace-section-heading">
            <div>
              <h2 id="oq-marketplace-ranking-title">
                {tr("Spot standout investors, seize market momentum", "洞察优秀投资者，把握市场先机")}
              </h2>
            </div>
          </header>
          <RankingBoards tr={tr} />
        </div>
      </section>

      <section className="oq-marketplace-cta" aria-labelledby="oq-marketplace-cta-title">
        <div className="oq-marketplace-cta-inner">
          <div>
            <h2 id="oq-marketplace-cta-title">{tr("Become a Portfolio Manager，earn Copy Investing income", "成为组合管理员，赚取跟投收入")}</h2>
            <p>{tr("Earn up to 30% in portfolio management income.", "赚取最高 30% 组合管理收入")}</p>
          </div>
          <Link href="/marketplace?tab=mine" className="oq-marketplace-cta-button">
            {tr("Create Portfolio", "创建投资组合")}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <CopyTradeDialog
        strategy={copyTarget}
        identity={copyTarget && marketplaceCardViews[copyTarget.id]
          ? {
              avatar: marketplaceCardViews[copyTarget.id].avatar,
              avatarTone: marketplaceCardViews[copyTarget.id].avatarTone,
              author: marketplaceCardViews[copyTarget.id].author,
              strategyName: marketplaceCardViews[copyTarget.id].title,
            }
          : undefined}
        tr={tr}
        onOpenChange={(open) => {
          if (!open) setCopyTarget(null);
        }}
        onConfirm={() => {
          if (!copyTarget) return;
          addFollowing(copyTarget.id);
          setCopyTarget(null);
          toast.success(tr("Copy investing started.", "已开始跟投。"));
        }}
      />
    </div>
  );
}

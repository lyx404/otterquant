import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Pause, Play, Power, RefreshCw } from "lucide-react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MarketplaceAvatar } from "@/components/MarketplaceAvatar";
import { translateUi, useAppLanguage, type UiLang } from "@/contexts/AppLanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  marketplaceCardDetails,
  marketplaceFollowerLimits,
  marketplaceFundNames,
  marketplaceOwnedPortfolioStrategyIds,
  marketplaceStrategies,
  marketplaceTradeSource,
  marketplaceUserProfiles,
} from "@/lib/marketplaceData";
import { useFollowingStrategyIds } from "@/lib/marketplaceState";
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
  TradeTrendNavigator,
  type TradeTrendMetric,
} from "@/components/TradeTrendChart";
import { localizeDateRangeLabel, StrategyReportDateControl } from "./StrategyReportDateControl";
import { CopyTradeDialog } from "@/components/CopyTradeDialog";
import { toast } from "sonner";
import "./MarketplaceDetail.css";
import "./TradeDetail.css";

type Follower = {
  name: string;
  avatarSrc?: string;
  amount: string;
  pnl: string;
  days: number;
  tone: string;
};

type MarketplaceTimeRange = "today" | "7d" | "30d" | "90d" | "180d" | "1y";

type StrategyAllocation = {
  id: string;
  name: string;
  allocation: string;
  pnl: string;
  returnRate: string;
};

function normalizeChartWindow(
  range: { startIndex: number; endIndex: number },
  dataLength: number,
) {
  const maximumIndex = Math.max(dataLength - 1, 0);
  if (maximumIndex === 0) return { startIndex: 0, endIndex: 0 };

  const startIndex = Math.min(Math.max(Math.round(range.startIndex), 0), maximumIndex - 1);
  const endIndex = Math.min(
    Math.max(Math.round(range.endIndex), startIndex + 1),
    maximumIndex,
  );
  return { startIndex, endIndex };
}

function ProfileBio({ text, tr }: { text: string; tr: (en: string, zh: string) => string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;

    const measureOverflow = () => {
      if (!expanded) setCanExpand(element.scrollWidth > element.clientWidth + 1);
    };

    measureOverflow();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, text]);

  return (
    <div className={`oq-marketplace-detail-profile-bio${expanded ? " is-expanded" : ""}`}>
      <span ref={textRef}>{text}</span>
      {canExpand ? (
        <button
          type="button"
          className="oq-marketplace-detail-profile-bio-toggle"
          aria-label={expanded ? tr("Collapse profile bio", "收起用户简介") : tr("Expand profile bio", "展开用户简介")}
          title={expanded ? tr("Collapse profile bio", "收起用户简介") : tr("Expand profile bio", "展开用户简介")}
          onClick={() => setExpanded((value) => !value)}
        >
          <ChevronDown aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

const followers: Follower[] = [
  { name: "一海人", amount: "60,000", pnl: "+38,977.91", days: 49, tone: "sunset" },
  { name: "静心·语", amount: "100,000", pnl: "+31,497.94", days: 37, tone: "ink" },
  { name: "NeuralTrader", avatarSrc: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/toon_2.png", amount: "50,000", pnl: "+19,290.74", days: 32, tone: "mist" },
  { name: "寂静行者", avatarSrc: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/toon_10.png", amount: "30,000", pnl: "+17,552.73", days: 48, tone: "sky" },
  { name: "chiyun", avatarSrc: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/upstream_13.png", amount: "1,000", pnl: "+13,104.27", days: 38, tone: "violet" },
  { name: "找我·事", avatarSrc: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/upstream_5.png", amount: "11,011", pnl: "+5,006.77", days: 30, tone: "rose" },
  { name: "Northstar", amount: "24,000", pnl: "+4,862.40", days: 42, tone: "teal" },
  { name: "Mori", amount: "18,500", pnl: "+4,201.89", days: 27, tone: "green" },
  { name: "白鲸", amount: "35,000", pnl: "+3,978.62", days: 41, tone: "blue" },
  { name: "Sora", amount: "12,000", pnl: "+3,447.15", days: 25, tone: "orange" },
  { name: "远山", avatarSrc: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/memo_2.png", amount: "28,000", pnl: "+3,188.50", days: 39, tone: "violet" },
  { name: "DeltaFox", amount: "16,000", pnl: "+2,946.70", days: 22, tone: "teal" },
  { name: "逐日", amount: "22,000", pnl: "+2,714.36", days: 34, tone: "sunset" },
  { name: "Aria", avatarSrc: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/memo_14.png", amount: "9,000", pnl: "+2,312.82", days: 19, tone: "rose" },
  { name: "小满", amount: "15,000", pnl: "+2,064.18", days: 28, tone: "green" },
  { name: "Vector", amount: "40,000", pnl: "+1,986.25", days: 46, tone: "ink" },
  { name: "云帆", avatarSrc: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/memo_17.png", amount: "20,000", pnl: "+1,758.96", days: 31, tone: "sky" },
  { name: "Orion", avatarSrc: "https://cdn.jsdelivr.net/gh/alohe/memojis/png/notion_5.png", amount: "26,000", pnl: "+1,526.44", days: 36, tone: "mist" },
  { name: "知秋", amount: "14,000", pnl: "+1,298.30", days: 24, tone: "orange" },
  { name: "Lumen", amount: "32,000", pnl: "+1,084.72", days: 44, tone: "blue" },
  { name: "澄明", amount: "10,000", pnl: "+867.50", days: 17, tone: "violet" },
  { name: "Atlas", amount: "19,000", pnl: "+642.18", days: 21, tone: "teal" },
];

const FOLLOWERS_PAGE_SIZE = 20;

const strategyAllocations: StrategyAllocation[] = [
  { id: "quantum-volatility-harvester-v3", name: "Quantum Volatility Harvester v3", allocation: "30%", pnl: "+35.20", returnRate: "+3.90%" },
  { id: "neural-cross-section-alpha", name: "Neural Cross-Section Alpha", allocation: "25%", pnl: "+22.10", returnRate: "+2.95%" },
  { id: "entropy-driven-mean-reversion", name: "Entropy-Driven Mean Reversion", allocation: "20%", pnl: "+18.50", returnRate: "+3.08%" },
  { id: "adaptive-regime-detector", name: "Adaptive Regime Detector", allocation: "15%", pnl: "+8.70", returnRate: "+1.93%" },
  { id: "deep-factor-momentum-engine", name: "Deep Factor Momentum Engine", allocation: "10%", pnl: "+5.00", returnRate: "+1.67%" },
];

const marketplaceProfileBios: Record<string, string> = {
  "STR-001": "专注趋势交易与组合风险控制，长期跟踪市场结构和流动性变化，重视策略执行的一致性。",
  "STR-002": "专注 DeFi 机会与资金效率，持续观察协议流动性和链上行为，偏好稳健的仓位管理。",
  "STR-003": "专注跨市场价差与执行效率，重视交易纪律和回撤控制，持续优化风险暴露。",
  "STR-005": "专注低波动收益与资金管理，强调稳健执行和风险边界，追求可持续的组合表现。",
  "STR-007": "专注 ETH 波动率交易与动态风险管理，结合期权和永续市场信号，持续寻找稳健的收益机会。",
  "STR-008": "专注趋势跟随与风险控制，结合现货订单流、验证者活动与生态流动性变化，严格执行结构化的跟投纪律。",
  "STR-009": "专注多资产配置与风险平衡，结合波动率和相关性变化，持续优化组合敞口。",
  "STR-010": "专注中性套利与风险对冲，保持低方向性暴露，重视流动性和资金使用效率。",
  "STR-011": "专注链上资金流与市场流动性观察，结合宏观环境调整节奏，保持纪律化执行。",
};

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

export default function MarketplaceDetail() {
  const { uiLang } = useAppLanguage();
  const { user } = useAuth();
  const tr = (en: string, zh: string) => translateUi(uiLang, en, zh);
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { followingStrategyIds, addFollowing, removeFollowing } = useFollowingStrategyIds();
  const [copyTarget, setCopyTarget] = useState<typeof marketplaceStrategies[number] | null>(null);
  const [chartMetric, setChartMetric] = useState<TradeTrendMetric>("return");
  const [visibleChartSources, setVisibleChartSources] = useState({ backtest: true, live: true });
  const [timeRange, setTimeRange] = useState<MarketplaceTimeRange>("1y");
  const [chartWindow, setChartWindow] = useState({ startIndex: 0, endIndex: 364 });
  const [timeRangeLabel, setTimeRangeLabel] = useState(tr("Past year", "近 1 年"));
  const [isStrategyOverviewExpanded, setIsStrategyOverviewExpanded] = useState(true);
  const [creatorRunState, setCreatorRunState] = useState<"running" | "paused" | "stopped">("running");
  const [isCopyInvestmentFollowing, setIsCopyInvestmentFollowing] = useState(true);
  const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
  const [isStopCopyConfirmOpen, setIsStopCopyConfirmOpen] = useState(false);
  const strategyId = params?.id ?? "";
  const isCreatorView = new URLSearchParams(search).get("from") === "mine";
  const isCopyInvestmentView = isCreatorView && strategyId === "STR-005";
  const isPortfolioOwnerView = isCreatorView && marketplaceOwnedPortfolioStrategyIds.has(strategyId);
  const strategy = marketplaceStrategies.find((item) => item.id === strategyId);
  const details = strategy ? marketplaceCardDetails[strategy.id] : undefined;
  const sourceTradeId = strategy ? marketplaceTradeSource[strategy.id] : undefined;
  const trade = tradeBots.find((item) => item.id === sourceTradeId);

  useEffect(() => {
    document.documentElement.classList.add("oq-marketplace-detail-active");
    setIsStrategyOverviewExpanded(true);
    setIsStopConfirmOpen(false);
    setIsStopCopyConfirmOpen(false);
    setVisibleChartSources({ backtest: true, live: true });
    setCreatorRunState("running");
    setIsCopyInvestmentFollowing(true);
    setTimeRange("1y");
    setTimeRangeLabel(translateUi(uiLang, "Past year", "近 1 年"));
    window.scrollTo(0, 0);
    return () => document.documentElement.classList.remove("oq-marketplace-detail-active");
  }, [isCreatorView, strategyId, uiLang]);

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
  const followerLimit = marketplaceFollowerLimits[strategy.id];
  const subscriberCount = followerLimit?.subscribers ?? strategy.subscribers;
  const capacity = followerLimit?.capacity ?? strategy.capacity;
  const followerCount = capacity
    ? `${subscriberCount.toLocaleString("en-US")}/${capacity.toLocaleString("en-US")}`
    : subscriberCount.toLocaleString("en-US");
  const isFull = capacity != null && subscriberCount >= capacity;
  const isFollowing = isCopyInvestmentView
    ? isCopyInvestmentFollowing
    : followingStrategyIds.has(strategy.id);
  const userProfile = marketplaceUserProfiles[strategy.id];
  const accountName = user?.displayName || user?.username || "Nicole Ong";
  const accountInitials = accountName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "NO";
  const heroIdentity = isCopyInvestmentView
    ? {
        author: marketplaceUserProfiles["STR-008"]?.author ?? "南山有鹿",
        avatar: marketplaceUserProfiles["STR-008"]?.avatar ?? "南",
        avatarTone: marketplaceUserProfiles["STR-008"]?.avatarTone ?? ("rose" as const),
        strategyName: marketplaceFundNames["STR-008"] ?? "SOL 动量趋势",
        bio: marketplaceProfileBios["STR-008"] ?? "",
      }
    : isPortfolioOwnerView
    ? {
        author: accountName,
        avatar: accountInitials,
        avatarTone: "orange" as const,
        strategyName: marketplaceFundNames[strategy.id] ?? strategy.name,
        bio: user?.bio?.trim() ?? "",
      }
    : {
        author: userProfile?.author ?? strategy.author,
        avatar: userProfile?.avatar ?? strategy.author.slice(0, 1),
        avatarTone: userProfile?.avatarTone,
        strategyName: marketplaceFundNames[strategy.id] ?? strategy.name,
        bio: marketplaceProfileBios[strategy.id] ?? "专注系统化交易与风险控制，持续优化执行节奏和仓位管理。",
      };
  const heroAvatarStrategyId = isCopyInvestmentView ? "STR-008" : strategy.id;
  const strategyGuidance = [
    { title: tr("When to enter", "何时入场"), text: tr("Enter when SOL flow and momentum confirm the same direction across the active cycle.", "当 SOL 资金流与动量在当前周期确认同向时入场。") },
    { title: tr("When to exit", "何时离场"), text: tr("Reduce exposure when momentum fades or the position reaches its risk budget.", "当动量减弱或仓位触及风险预算时逐步减仓。") },
    { title: tr("Risk controls", "如何控制风险"), text: tr("Exposure is sized around volatility and liquidity so the strategy stays within its drawdown guardrail.", "根据波动率与流动性配置仓位，将策略控制在回撤边界内。") },
  ];
  const trendData = useMemo(
    () => buildTradeTrendData({ returnRate: roi, pnl: totalPnl, updatedAt: trade.updatedAt }),
    [roi, totalPnl, trade.updatedAt],
  );
  useEffect(() => {
    setChartWindow({ startIndex: 0, endIndex: Math.max(trendData.length - 1, 0) });
  }, [strategyId, trendData.length]);
  const visibleTrendWindow = useMemo(
    () => normalizeChartWindow(chartWindow, trendData.length),
    [chartWindow, trendData.length],
  );
  const visibleTrendData = useMemo(
    () => trendData.slice(visibleTrendWindow.startIndex, visibleTrendWindow.endIndex + 1),
    [trendData, visibleTrendWindow],
  );
  const trendSeriesSplitIndex = Math.floor((trendData.length - 1) * 0.72);
  const selectTimeRange = (nextRange: MarketplaceTimeRange, label: string) => {
    const pointCount = { today: 2, "7d": 7, "30d": 30, "90d": 90, "180d": 180, "1y": 365 }[nextRange];
    setTimeRange(nextRange);
    setTimeRangeLabel(label);
    setChartWindow({ startIndex: Math.max(0, trendData.length - pointCount), endIndex: trendData.length - 1 });
  };
  const handleTimeRangeSelection = (label: string) => {
    const labels: Array<[MarketplaceTimeRange, string]> = [
      ["today", tr("Today", "今天")],
      ["7d", tr("Past 7 days", "近 7 天")],
      ["30d", tr("Past 30 days", "近 30 天")],
      ["90d", tr("Past 90 days", "近 90 天")],
      ["180d", tr("Past 180 days", "近 180 天")],
      ["1y", tr("Past year", "近 1 年")],
    ];
    const match = labels.find(([, optionLabel]) => optionLabel === label);
    selectTimeRange(match?.[0] ?? "30d", match?.[1] ?? tr("Past 30 days", "近 30 天"));
  };

  return (
    <div className="oq-marketplace-detail">
      <section className="oq-marketplace-detail-topbar" aria-label={tr("Strategy heading", "策略顶部信息")}>
        <header className="oq-marketplace-detail-hero">
          <div className="oq-marketplace-detail-hero-inner">
            <div className="oq-marketplace-detail-hero-copy">
              {isPortfolioOwnerView ? (
                <span className="oq-marketplace-detail-avatar is-orange" aria-hidden="true">
                  {user?.avatar ? <img src={user.avatar} alt="" /> : heroIdentity.avatar}
                </span>
              ) : (
                <MarketplaceAvatar
                  strategyId={heroAvatarStrategyId}
                  name={heroIdentity.author}
                  avatar={heroIdentity.avatar}
                  avatarTone={heroIdentity.avatarTone ?? "orange"}
                  className="oq-marketplace-detail-avatar"
                />
              )}
              <div className="oq-marketplace-detail-hero-details">
                <div className="oq-marketplace-detail-author-line">
                  <h1>{heroIdentity.author}</h1>
                  {!isPortfolioOwnerView && isFollowing ? (
                    <span className="oq-marketplace-detail-following-tag">{tr("Investing", "跟投中")}</span>
                  ) : null}
                </div>
                {heroIdentity.bio ? <ProfileBio text={heroIdentity.bio} tr={tr} /> : null}
                <div className="oq-marketplace-detail-portfolio-overview">
                  <div className="oq-marketplace-detail-portfolio-name">
                    <button
                      type="button"
                      className="oq-marketplace-detail-strategy-overview-toggle"
                      aria-expanded={isStrategyOverviewExpanded}
                      aria-controls="marketplace-detail-strategy-dimensions"
                      aria-label={isStrategyOverviewExpanded ? tr("Collapse strategy overview", "收起策略信息") : tr("Expand strategy overview", "展开策略信息")}
                      title={isStrategyOverviewExpanded ? tr("Collapse strategy overview", "收起策略信息") : tr("Expand strategy overview", "展开策略信息")}
                      onClick={() => setIsStrategyOverviewExpanded((value) => !value)}
                    >
                      <strong>{heroIdentity.strategyName}</strong>
                      <ChevronDown aria-hidden="true" />
                    </button>
                  </div>
                  {isStrategyOverviewExpanded ? (
                    <div id="marketplace-detail-strategy-dimensions" className="oq-marketplace-detail-strategy-dimensions is-expanded">
                      <div className="oq-marketplace-detail-strategy-dimension">
                        <span>{tr("Strategy thesis", "策略思路")}</span>
                        <p>{tr(strategy.description, details.descriptionZh)}</p>
                      </div>
                      {strategyGuidance.map((item) => (
                        <div className="oq-marketplace-detail-strategy-dimension" key={item.title}>
                          <span>{item.title}</span>
                          <p>{item.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            {isPortfolioOwnerView ? (
              <div className="oq-marketplace-detail-creator-actions" role="group" aria-label={tr("Portfolio controls", "投资组合控制") }>
                {creatorRunState === "stopped" ? (
                  <button
                    type="button"
                    className="oq-marketplace-detail-creator-stopped"
                    disabled
                    aria-label={tr("Portfolio terminated", "已终止")}
                  >
                    {tr("Terminated", "已终止")}
                  </button>
                ) : <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="oq-trade-detail-action"
                      aria-label={tr("Refresh portfolio", "刷新投资组合")}
                      onClick={() => toast.success(tr("Portfolio refreshed.", "投资组合已刷新。"))}
                    >
                      <RefreshCw aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{tr("Refresh", "刷新")}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="oq-trade-detail-action"
                      aria-label={creatorRunState === "paused" ? tr("Restart portfolio", "重新启动投资组合") : tr("Pause portfolio", "暂停投资组合")}
                      onClick={() => {
                        const nextState = creatorRunState === "paused" ? "running" : "paused";
                        setCreatorRunState(nextState);
                        toast.success(nextState === "running" ? tr("Portfolio restarted.", "投资组合已重新启动。") : tr("Portfolio paused.", "投资组合已暂停。"));
                      }}
                    >
                      {creatorRunState === "paused" ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{creatorRunState === "paused" ? tr("Restart", "重新启动") : tr("Pause", "暂停")}</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="oq-trade-detail-action"
                          aria-label={tr("More portfolio controls", "更多投资组合控制")}
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="top">{tr("More", "更多")}</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" sideOffset={8} className="oq-trade-detail-action-menu">
                    <DropdownMenuItem
                      className="oq-trade-detail-action-menu-item"
                      onSelect={() => navigate("/marketplace?tab=mine")}
                    >
                      <ArrowUpRight aria-hidden="true" />
                      {tr("View investment details", "查看投资详情")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="oq-trade-detail-action-menu-item is-destructive"
                      variant="destructive"
                      onSelect={() => {
                        setIsStopConfirmOpen(true);
                      }}
                    >
                      <Power aria-hidden="true" />
                      {tr("Stop portfolio", "终止投资组合")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </>}
              </div>
            ) : isFollowing ? (
              <div className="oq-marketplace-detail-following-actions" role="group" aria-label={tr("Copy investing controls", "跟投控制") }>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="oq-trade-detail-action"
                      aria-label={tr("Refresh copy investment", "刷新跟投")}
                      onClick={() => toast.success(tr("Copy investment refreshed.", "跟投数据已刷新。"))}
                    >
                      <RefreshCw aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{tr("Refresh", "刷新")}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="oq-trade-detail-action"
                      aria-label={tr("View copy investment details", "查看跟投详情")}
                      onClick={() => navigate("/marketplace?tab=mine")}
                    >
                      <ArrowUpRight aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{tr("View copy investment details", "查看跟投详情")}</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="oq-trade-detail-action"
                      aria-label={tr("Terminate copy investment", "终止跟投")}
                      onClick={() => setIsStopCopyConfirmOpen(true)}
                    >
                      <Power aria-hidden="true" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{tr("Terminate", "终止")}</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <button
                type="button"
                className={`oq-marketplace-detail-follow${isFull ? " is-full" : ""}`}
                disabled={isFull}
                onClick={() => {
                  if (!isFull) {
                    setCopyTarget(strategy);
                  }
                }}
              >
                {isFull ? tr("Full", "满员") : tr("Copy", "跟投")}
              </button>
            )}
          </div>
        </header>
      </section>

      <div className="oq-marketplace-detail-shell">
        <div className="oq-marketplace-detail-content">
          <div className="oq-marketplace-detail-fund-heading is-time-control">
            <h2 id="marketplace-detail-period-title">{localizeDateRangeLabel(timeRangeLabel, uiLang)}</h2>
            <StrategyReportDateControl
              dateLabel={tr("Past 30 days", "近 30 天")}
              dateOptions={[
                tr("Today", "今天"),
                tr("Past 7 days", "近 7 天"),
                tr("Past 30 days", "近 30 天"),
                tr("Past 90 days", "近 90 天"),
                tr("Past 180 days", "近 180 天"),
                tr("Past year", "近 1 年"),
                tr("Custom date range", "自定义时间范围"),
              ]}
              customDateOption={tr("Custom date range", "自定义时间范围")}
              uiLang={uiLang}
              variant="compact"
              triggerMode="switch"
              iconOnly
              onSelectionChange={handleTimeRangeSelection}
              labels={{
                selectPeriod: tr("Select time range", "选择时间范围"),
                customRange: tr("Custom date range", "自定义时间范围"),
                startDate: tr("Start date", "开始日期"),
                endDate: tr("End date", "结束日期"),
                switchPeriod: tr("Switch time range", "切换时间范围"),
              }}
            />
          </div>

          <div className="oq-marketplace-detail-analytics-grid">
            <article className="oq-marketplace-detail-summary" aria-labelledby="marketplace-detail-summary-title">
              <div className="oq-marketplace-detail-section-header">
                <h2 id="marketplace-detail-summary-title">{tr("Performance overview", "数据总览")}</h2>
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
                  <Metric label={tr("Portfolio days", "创建组合天数")} value={String(strategyAgeDays)} />
                  <Metric label={tr("Portfolio Investors", "跟投人数")} value={followerCount} />
                </div>
              </div>
            </article>

            <section className="oq-marketplace-detail-chart-section" aria-labelledby="marketplace-detail-chart-title">
              <div className="oq-marketplace-detail-section-header">
                <div className="oq-marketplace-detail-chart-heading">
                  <h2 id="marketplace-detail-chart-title">{tr("Performance", "收益走势")}</h2>
                  <div className="oq-marketplace-detail-chart-legend" role="group" aria-label={tr("Performance sources", "收益来源")}>
                    <button
                      type="button"
                      className={visibleChartSources.backtest ? "is-active" : ""}
                      aria-pressed={visibleChartSources.backtest}
                      onClick={() => setVisibleChartSources((current) => (
                        current.live ? { ...current, backtest: !current.backtest } : current
                      ))}
                    >
                      <i className="is-backtest" aria-hidden="true" />{tr("Backtest", "回测")}
                    </button>
                    <button
                      type="button"
                      className={visibleChartSources.live ? "is-active" : ""}
                      aria-pressed={visibleChartSources.live}
                      onClick={() => setVisibleChartSources((current) => (
                        current.backtest ? { ...current, live: !current.live } : current
                      ))}
                    >
                      <i className="is-live" aria-hidden="true" />{tr("Live", "实盘")}
                    </button>
                  </div>
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
                showBacktestLive
                backtestLabel={tr("Backtest", "回测")}
                showBacktest={visibleChartSources.backtest}
                showLive={visibleChartSources.live}
                seriesSplitIndex={trendSeriesSplitIndex}
                dataOffset={visibleTrendWindow.startIndex}
                liveLabel={tr("Live", "实盘")}
                ariaLabel={
                  chartMetric === "return"
                    ? tr(`${strategy.name} performance curve`, `${strategy.name} 收益曲线`)
                    : tr(`${strategy.name} P&L curve`, `${strategy.name} 盈亏曲线`)
                }
              />
              <div className="oq-marketplace-detail-chart-range" role="group" aria-label={tr("Chart time navigator", "图表时间缩略轴")}>
                <TradeTrendNavigator
                  data={trendData}
                  metric={chartMetric}
                  startIndex={chartWindow.startIndex}
                  endIndex={chartWindow.endIndex}
                  showBacktest={visibleChartSources.backtest}
                  showLive={visibleChartSources.live}
                  seriesSplitIndex={trendSeriesSplitIndex}
                  ariaLabel={tr("Drag to adjust chart time range", "拖动调整图表时间区间")}
                  onRangeChange={(range) => {
                    setChartWindow(normalizeChartWindow(range, trendData.length));
                    setTimeRange("30d");
                    setTimeRangeLabel(tr("Custom range", "自定义区间"));
                  }}
                />
              </div>
            </section>
          </div>

          <section className="oq-marketplace-detail-records oq-trade-workspace" aria-label={tr("Portfolio strategies and portfolio investors", "投资组合策略与跟投者")}>
            <Tabs defaultValue="strategies" className="oq-trade-workspace-tabs">
              <div className="oq-trade-workspace-tabs-header">
                <TabsList className="oq-trade-workspace-tabs-list" aria-label={tr("Portfolio views", "投资组合视图")}>
                  <TabsTrigger value="strategies">{tr("Portfolio allocation", "投资组合情况")}</TabsTrigger>
                  <TabsTrigger value="followers">{tr("Portfolio Investors", "跟投者")}</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="strategies" className="oq-trade-workspace-tab-panel">
                <StrategyAllocationList fundId={strategy.id} rows={strategyAllocations} tr={tr} />
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
        identity={{
          avatar: heroIdentity.avatar,
          avatarTone: heroIdentity.avatarTone,
          author: heroIdentity.author,
          strategyName: heroIdentity.strategyName,
        }}
        tr={tr}
        onOpenChange={(open) => {
          if (!open) setCopyTarget(null);
        }}
        onConfirm={() => {
          addFollowing(strategy.id);
          setCopyTarget(null);
          toast.success(tr("Copy investing started.", "已开始跟投。"));
        }}
      />
      <AlertDialog open={isStopConfirmOpen} onOpenChange={setIsStopConfirmOpen}>
        <AlertDialogContent className="oq-marketplace-detail-stop-dialog">
          <AlertDialogHeader className="oq-marketplace-detail-stop-dialog-header">
            <AlertDialogTitle className="oq-marketplace-detail-stop-dialog-title">
              {tr("Terminate this portfolio?", "确认终止投资组合？")}
            </AlertDialogTitle>
            <AlertDialogDescription className="oq-marketplace-detail-stop-dialog-description">
              {tr(
                "New trades and rebalancing will stop. Investors will no longer be able to copy this portfolio, and its positions will be handled under the current settlement rules before funds return to the relevant accounts. Historical records and settled performance remain available. This action cannot be undone.",
                "终止后，组合将停止新开仓与调仓，用户将无法继续跟投。现有仓位会按当前结算规则处理，资金结算后返回相应账户；历史记录与已结算收益仍可查看。此操作无法撤销。",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="oq-marketplace-detail-stop-dialog-footer">
            <AlertDialogCancel className="oq-marketplace-detail-stop-dialog-button">
              {tr("Cancel", "取消")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="oq-marketplace-detail-stop-dialog-button is-destructive"
              onClick={() => {
                setCreatorRunState("stopped");
                setIsStopConfirmOpen(false);
                toast.success(tr("Portfolio terminated.", "投资组合已终止。"));
              }}
            >
              {tr("Confirm termination", "确认终止")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isStopCopyConfirmOpen} onOpenChange={setIsStopCopyConfirmOpen}>
        <AlertDialogContent className="oq-marketplace-detail-stop-dialog">
          <AlertDialogHeader className="oq-marketplace-detail-stop-dialog-header">
            <AlertDialogTitle className="oq-marketplace-detail-stop-dialog-title">
              {tr("Terminate copy investment?", "确认终止跟投？")}
            </AlertDialogTitle>
            <AlertDialogDescription className="oq-marketplace-detail-stop-dialog-description">
              {tr(
                "Copy trading and future portfolio rebalancing will stop. Existing positions will be handled under the current settlement rules before funds return to your account. Historical records and settled performance remain available. This action cannot be undone.",
                "终止后，将停止跟随该投资组合的新开仓与调仓。现有仓位会按当前结算规则处理，资金结算后返回您的账户；历史记录与已结算收益仍可查看。此操作无法撤销。",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="oq-marketplace-detail-stop-dialog-footer">
            <AlertDialogCancel className="oq-marketplace-detail-stop-dialog-button">
              {tr("Cancel", "取消")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="oq-marketplace-detail-stop-dialog-button is-destructive"
              onClick={() => {
                removeFollowing(strategy.id);
                if (isCopyInvestmentView) setIsCopyInvestmentFollowing(false);
                setIsStopCopyConfirmOpen(false);
                toast.success(tr("Copy investment terminated.", "跟投已终止。"));
              }}
            >
              {tr("Confirm termination", "确认终止跟投")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

function StrategyAllocationList({
  fundId,
  rows,
  tr,
}: {
  fundId: string;
  rows: StrategyAllocation[];
  tr: (en: string, zh: string) => string;
}) {
  return (
    <div className="oq-marketplace-detail-strategy-allocation">
      <div className="oq-marketplace-detail-strategy-allocation-header" aria-hidden="true">
        <span>{tr(`Strategy allocation (${rows.length})`, `策略配置 (${rows.length})`)}</span>
        <span>{tr("Allocation", "资产占比")}</span>
        <span>{tr("P&L (USDT)", "盈亏(USDT)")}</span>
        <span>{tr("Return", "收益率")}</span>
        <span />
      </div>
      <div className="oq-marketplace-detail-strategy-allocation-list">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/marketplace/${fundId}/strategies/${row.id}`}
            className="oq-marketplace-detail-strategy-allocation-row"
          >
            <span className="oq-marketplace-detail-strategy-allocation-name">
              <strong>{row.name}</strong>
            </span>
            <span className="oq-marketplace-detail-strategy-allocation-value">{row.allocation}</span>
            <span className="oq-marketplace-detail-strategy-allocation-metric">
              <strong>{row.pnl}</strong>
            </span>
            <span className="oq-marketplace-detail-strategy-allocation-metric">
              <strong>{row.returnRate}</strong>
            </span>
            <ChevronRight aria-hidden="true" />
          </Link>
        ))}
      </div>
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
  const [currentPage, setCurrentPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / FOLLOWERS_PAGE_SIZE));
  const pageStart = (currentPage - 1) * FOLLOWERS_PAGE_SIZE;
  const pageRows = rows.slice(pageStart, pageStart + FOLLOWERS_PAGE_SIZE);
  const firstVisiblePage = Math.min(Math.max(currentPage - 2, 1), Math.max(pageCount - 4, 1));
  const visiblePages = Array.from(
    { length: Math.min(pageCount, 5) },
    (_, index) => firstVisiblePage + index,
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  return (
    <div className="oq-marketplace-detail-followers-table">
      <TradeWorkspaceTable
        label={tr("Portfolio Investors", "跟投者")}
        className="is-followers"
        headers={[
          tr("Portfolio Investor", "跟投者"),
          tr("Invested assets (USDT)", "跟投资产(USDT)"),
          tr("Cumulative P&L (USDT)", "累计盈亏 (USDT)"),
          tr("Days investing", "跟投天数"),
        ]}
        isEmpty={rows.length === 0}
        emptyMessage={tr("No portfolio investors", "暂无跟投者")}
      >
        {pageRows.map((follower) => (
          <tr key={follower.name}>
            <td>
              <div className="oq-marketplace-detail-follower-cell">
                <span className={`oq-marketplace-detail-follower-avatar is-${follower.tone}`} aria-hidden="true">
                  {follower.avatarSrc ? <img src={follower.avatarSrc} alt="" /> : follower.name.slice(0, 1)}
                </span>
                <strong>{follower.name}</strong>
              </div>
            </td>
            <td className="oq-marketplace-detail-follower-amount">{follower.amount}</td>
            <td className="oq-trade-workspace-value is-positive"><strong>{follower.pnl}</strong></td>
            <td>{tr(`${follower.days} days`, `${follower.days}天`)}</td>
          </tr>
        ))}
      </TradeWorkspaceTable>

      {pageCount > 1 ? (
        <nav className="oq-marketplace-detail-pagination" aria-label={tr("Portfolio investor pages", "跟投者分页")}>
          <div className="oq-marketplace-detail-pagination-count">
            {pageStart + 1}-{Math.min(pageStart + FOLLOWERS_PAGE_SIZE, rows.length)} / {rows.length}
          </div>
          <div className="oq-marketplace-detail-pagination-controls">
            <button
              type="button"
              aria-label={tr("First page", "第一页")}
              title={tr("First page", "第一页")}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
            >
              <ChevronsLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={tr("Previous page", "上一页")}
              title={tr("Previous page", "上一页")}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            {visiblePages.map((page) => (
              <button
                key={page}
                type="button"
                className={page === currentPage ? "is-active" : undefined}
                aria-label={tr(`Page ${page}`, `第 ${page} 页`)}
                aria-current={page === currentPage ? "page" : undefined}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              aria-label={tr("Next page", "下一页")}
              title={tr("Next page", "下一页")}
              disabled={currentPage === pageCount}
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
            >
              <ChevronRight aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={tr("Last page", "最后一页")}
              title={tr("Last page", "最后一页")}
              disabled={currentPage === pageCount}
              onClick={() => setCurrentPage(pageCount)}
            >
              <ChevronsRight aria-hidden="true" />
            </button>
          </div>
        </nav>
      ) : null}
    </div>
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

/*
 * OfficialLibrary — Browse official and graduated factors
 * Design: Card-based view with category filtering
 * Reuses FactorCard pattern from AlphaCardView
 */
import { useState, useMemo, useRef, useEffect, useId } from "react";
import { Link } from "wouter";
import gsap from "gsap";
import {
  ArrowUpDown,
  Search,
  Star,
  Users,
  Sparkles,
  Info,
  X,
  ArrowUpRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { factors, type Factor, generatePnLData } from "@/lib/mockData";
import { toast } from "sonner";
import { useAlphaViewMode, type AlphaViewMode } from "@/contexts/AlphaViewModeContext";

type CategoryFilter = "all" | "official" | "graduated";
type FactorSortKey = "isSharpe" | "osSharpe" | "fitness" | "returns" | "turnover" | "drawdown";
type SortDir = "asc" | "desc" | null;

function getDefaultFactorSortDir(key: FactorSortKey): Exclude<SortDir, null> {
  return key === "turnover" || key === "drawdown" ? "asc" : "desc";
}

function parseMetricValue(value: string | number) {
  if (typeof value === "number") return value;
  const parsed = Number(value.replace(/[%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSparklinePath(values: number[], width: number, height: number, padding = 6) {
  if (values.length < 2) return "";

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = (width - padding * 2) / (values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + index * step;
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function PnlSparkline({ values, label }: { values: number[]; label: string }) {
  const svgId = useId().replace(/:/g, "");
  const width = 420;
  const height = 86;
  const path = buildSparklinePath(values, width, height);
  const areaPath = path ? `${path} L ${width - 6} ${height - 6} L 6 ${height - 6} Z` : "";

  return (
    <div className="rounded-xl border border-border/60 bg-background/30 px-3 py-2.5">
      <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[78px] w-full overflow-visible" fill="none" aria-hidden="true">
        <path d={areaPath} fill={`url(#${svgId}-official-pnl-fill)`} opacity="0.55" />
        <path d={path} stroke={`url(#${svgId}-official-pnl-line)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id={`${svgId}-official-pnl-line`} x1="0" x2={width} y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="72%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id={`${svgId}-official-pnl-fill`} x1="0" x2="0" y1="0" y2={height} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#34D399" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ── Factor Flywheel Banner ── */
function FlywheelBanner() {
  return (
    <div className="surface-card overflow-hidden border-l-4 border-l-primary">
      <div className="px-5 py-4 flex items-start gap-4">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">Factor Flywheel</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Develop factors
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            Submit to competition
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            Top factors graduate to official library
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            Others use them in strategies
            <span className="mx-1.5 text-primary/60">&rarr;</span>
            You earn rewards
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Single Factor Card ── */
function FactorCard({ factor, isStarred, onToggleStar, viewMode }: {
  factor: Factor;
  isStarred: boolean;
  onToggleStar: () => void;
  viewMode: AlphaViewMode;
}) {
  const { uiLang } = useAppLanguage();
  const isOfficial = factor.category === "official";
  const isGraduated = factor.category === "graduated";
  const isBeginnerMode = viewMode === "beginner";
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const usedCount = new Intl.NumberFormat(uiLang === "zh" ? "zh-CN" : "en-US").format(factor.userCount ?? 0);
  const pnlValues = useMemo(() => {
    const pnlData = generatePnLData();
    const combined = [...pnlData.train, ...pnlData.test].map((item) => item.value);
    const sampleEvery = Math.max(1, Math.floor(combined.length / 36));
    return combined.filter((_, index) => index % sampleEvery === 0).slice(-36);
  }, []);

  const statusClass = isGraduated
    ? "border-purple-500/25 bg-purple-500/10 text-purple-400"
    : "border-amber-500/25 bg-amber-500/10 text-amber-400";

  const osSharpeColor = factor.osSharpe >= 1.0
    ? "text-success"
    : factor.osSharpe >= 0.5
    ? "text-amber-500 dark:text-amber-400"
    : "text-foreground";

  const isSharpeColor = factor.sharpe >= 1.0
    ? "text-success"
    : factor.sharpe >= 0.5
    ? "text-amber-500 dark:text-amber-400"
    : "text-foreground";

  const factorDescription = (() => {
    if (uiLang !== "zh") return factor.description;
    switch (factor.id) {
      case "AF-001":
        return "利用 RSI 交叉信号，在加密资产中捕捉 7 日价格动量。";
      case "AF-002":
        return "识别 ETH 交易对中相对于 20 日均值的异常成交量激增。";
      case "AF-004":
        return "利用主流 CEX 平台之间的价格差异，通过价差分析捕捉套利机会。";
      case "AF-005":
        return "基于资金费率与持仓兴趣确认，构建均值回归信号。";
      case "AF-007":
        return "追踪巨鲸钱包的聪明钱流动模式，挖掘交易信号。";
      case "AF-009":
        return "利用 OI Delta 信号，并结合近期波动率进行风险调整收益归一化。";
      case "AF-013":
        return "识别连环强平事件，并为均值回归布局。";
      case "AF-016":
        return "在现货与期货之间优化基差交易，并结合成交量衰减权重。";
      default:
        return factor.description;
    }
  })();

  const MetricCell = ({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) => (
    <div className="rounded-xl border border-border/50 bg-background/30 px-3 py-2">
      <div className="mb-1 whitespace-nowrap text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold font-mono tabular-nums ${colorClass || "text-foreground"}`}>
        {value}
      </div>
    </div>
  );

  return (
    <div className="surface-card group flex h-full flex-col overflow-hidden transition-all duration-200 hover:border-primary/30">
      <div className="border-b border-border/50 px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link href={`/alphas/${factor.id}?source=official&tier=${factor.category === "graduated" ? "graduated" : "official"}`}>
              <span className="block cursor-pointer truncate text-sm font-semibold leading-5 text-foreground transition-colors duration-200 hover:text-primary">
                {factor.name}
              </span>
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {uiLang === "zh" ? `已使用${usedCount}次` : `Used ${usedCount} times`}
              </span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusClass}`}>
                {isGraduated ? tr("Graduated", "三方") : tr("Official", "官方")}
              </span>
              {!isBeginnerMode && (
                <span className="text-[10px] font-mono text-muted-foreground">{factor.id}</span>
              )}
            </div>
            {factorDescription && (
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {factorDescription}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 px-4 py-3">
        <PnlSparkline values={pnlValues} label={tr("PnL Curve", "PNL 折线图")} />

        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
          <MetricCell label={tr("IS Sharpe", "样本内夏普比率")} value={factor.sharpe.toFixed(2)} colorClass={isSharpeColor} />
          <MetricCell label={tr("OS Sharpe", "样本外夏普比率")} value={factor.osSharpe.toFixed(2)} colorClass={osSharpeColor} />
          <MetricCell label={tr("Fitness", "适应度")} value={factor.fitness.toFixed(2)} />
          {!isBeginnerMode && <MetricCell label={tr("Returns", "收益")} value={factor.returns} />}
          {!isBeginnerMode && <MetricCell label={tr("Turnover", "换手率")} value={factor.turnover} />}
          {!isBeginnerMode && <MetricCell label={tr("Drawdown", "回撤")} value={factor.drawdown} colorClass="text-destructive" />}
        </div>
      </div>

      <div className="mt-auto border-t border-border/30 bg-accent/20 px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onToggleStar}
            className={`inline-flex h-8 items-center justify-center rounded-full border px-3 transition-colors ${
              isStarred
                ? "border-[#ffb900]/60 bg-[#ffb900]/30 text-[#ffb900]"
                : "border-border/60 bg-background/30 text-[#ffb900] hover:border-[#ffb900]/50"
            }`}
            title={isStarred ? tr("Unfavorite", "取消收藏") : tr("Favorite", "收藏")}
          >
            <Star className={`h-[14px] w-[14px] ${isStarred ? "fill-current" : ""}`} />
          </button>
          <Link href={`/alphas/${factor.id}?source=official&tier=${factor.category === "graduated" ? "graduated" : "official"}`}>
            <Button className="h-8 rounded-full bg-primary px-4 text-xs font-medium text-white hover:bg-primary/90 dark:text-[#020617]">
              {tr("View", "查看")}
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Main OfficialLibrary Page ── */
export default function OfficialLibrary() {
  const { uiLang } = useAppLanguage();
  const { alphaViewMode } = useAlphaViewMode();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sortKey, setSortKey] = useState<FactorSortKey | null>("isSharpe");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [starred, setStarred] = useState<Set<string>>(new Set(["AF-001", "AF-004"]));
  const [showFlywheelInfo, setShowFlywheelInfo] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);

  // Only show official and graduated factors
  const libraryFactors = useMemo(() => {
    return factors.filter((f) => f.category === "official" || f.category === "graduated");
  }, []);

  const filtered = useMemo(() => {
    const sortValue = (factor: Factor) => {
      switch (sortKey) {
        case "isSharpe":
          return factor.sharpe;
        case "osSharpe":
          return factor.osSharpe;
        case "fitness":
          return factor.fitness;
        case "returns":
          return parseMetricValue(factor.returns);
        case "turnover":
          return parseMetricValue(factor.turnover);
        case "drawdown":
          return parseMetricValue(factor.drawdown);
        default:
          return 0;
      }
    };

    const filteredFactors = libraryFactors.filter((f) => {
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !f.name.toLowerCase().includes(q) &&
          !(f.tag || "").toLowerCase().includes(q) &&
          !(f.description || "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });

    if (!sortKey || !sortDir) return filteredFactors;

    const direction = sortDir === "asc" ? 1 : -1;
    return filteredFactors.sort((a, b) => (sortValue(a) - sortValue(b)) * direction);
  }, [libraryFactors, categoryFilter, searchQuery, sortKey, sortDir]);

  // Entrance animation
  useEffect(() => {
    if (!listRef.current) return;
    const cards = listRef.current.querySelectorAll(".factor-card-item");
    gsap.set(cards, { y: 20, opacity: 0 });
    gsap.to(cards, {
      y: 0, opacity: 1,
      duration: 0.4, stagger: 0.05, ease: "power3.out",
    });
  }, [categoryFilter, searchQuery]);

  const tabs: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: tr("All", "全部") },
    { key: "official", label: tr("Official", "官方") },
    { key: "graduated", label: tr("Graduated", "三方") },
  ];
  const sortOptions: { key: FactorSortKey; label: string }[] = [
    { key: "isSharpe", label: tr("IS Sharpe", "IS夏普") },
    { key: "osSharpe", label: tr("OS Sharpe", "OS 夏普") },
    { key: "fitness", label: tr("Fitness", "适应度") },
    { key: "returns", label: tr("Returns", "收益率") },
    { key: "turnover", label: tr("Turnover", "换手率") },
    { key: "drawdown", label: tr("Drawdown", "回撤") },
  ];
  const sortDirectionLabel = (direction: SortDir) => {
    if (direction === "asc") return tr("Ascending", "升序");
    if (direction === "desc") return tr("Descending", "降序");
    return tr("Default", "默认");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-4xl font-bold text-foreground tracking-tight">{tr("Official Factor Library", "官方因子库")}</h1>
          <button
            onClick={() => setShowFlywheelInfo(true)}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
            title={tr("Factor Flywheel", "因子飞轮")}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {tr("Browse proven trading signals. Use them as building blocks for your strategies.", "浏览经过验证的交易信号，并将它们作为你策略的构建模块。")}
        </p>
      </div>

      {/* Flywheel Info Modal */}
      {showFlywheelInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowFlywheelInfo(false)}>
          <div className="relative w-full max-w-lg mx-4 surface-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowFlywheelInfo(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{tr("Factor Flywheel", "因子飞轮")}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tr("Develop factors", "开发因子")}
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              {tr("Submit to competition", "提交到竞赛")}
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              {tr("Top factors graduate to official library", "优秀因子进入官方库")}
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              {tr("Others use them in strategies", "其他人将它们用于策略")}
              <span className="mx-1.5 text-primary/60">&rarr;</span>
              {tr("You earn rewards", "你获得奖励")}
            </p>
          </div>
        </div>
      )}

      {/* Search + Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-[420px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={tr("Search by name or ID...", "按名称或 ID 搜索...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-xl border border-border bg-accent/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCategoryFilter(tab.key)}
                className={`flex h-8 items-center rounded-full border px-3 text-xs transition-all duration-200 ease-in-out ${
                  categoryFilter === tab.key
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs transition-all duration-200 ease-in-out bg-card border border-border text-muted-foreground hover:text-foreground hover:border-slate-300 dark:hover:border-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5" />
                {tr("Sort", "排序")}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 rounded-2xl" align="end">
              <div className="space-y-2">
                <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                  {sortOptions.map((option) => {
                    const active = sortKey === option.key;
                    return (
                      <button
                        key={option.key}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                          active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
                        }`}
                        onClick={() => {
                          if (active) {
                            setSortDir(sortDir === "asc" ? "desc" : "asc");
                          } else {
                            setSortKey(option.key);
                            setSortDir(getDefaultFactorSortDir(option.key));
                          }
                        }}
                      >
                        <span>{option.label}</span>
                        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                          {active ? sortDirectionLabel(sortDir) : tr("Default", "默认")}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {sortKey && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                    >
                      {tr("Toggle direction", "切换方向")}
                    </button>
                    <button
                      className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors"
                      onClick={() => {
                        setSortKey(null);
                        setSortDir(null);
                      }}
                    >
                      {tr("Clear", "清除")}
                    </button>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Factor Cards */}
      <div ref={listRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((factor) => (
          <div key={factor.id} className="factor-card-item">
            <FactorCard
              factor={factor}
              isStarred={starred.has(factor.id)}
              viewMode={alphaViewMode}
              onToggleStar={() => {
                setStarred((prev) => {
                  const next = new Set(prev);
                  const willStar = !next.has(factor.id);
                  if (willStar) next.add(factor.id);
                  else next.delete(factor.id);
                  toast.success(willStar ? tr("Added to favorites", "已加入收藏") : tr("Removed from favorites", "已取消收藏"));
                  return next;
                });
              }}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="surface-card px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">{tr("No factors match the current filters.", "没有符合当前筛选条件的因子。")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

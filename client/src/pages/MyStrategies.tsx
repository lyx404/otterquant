/*
 * MyStrategies — Figma-aligned strategy list page
 * Structure: Header + Summary cards + Toolbar + Strategy cards (grid/list)
 * Visual style stays aligned with existing My Alphas dark design tokens.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { strategies } from "@/lib/mockData";
import { parsePercent } from "@/lib/strategyUtils";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import {
  ArrowUpDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle2,
  Circle,
  Columns3,
  Grid2x2,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react";

type SortKey = "updated" | "name" | "roi" | "winRate" | "sharpe";
type ViewMode = "grid" | "list";
type MetricKey = "roi" | "winRate" | "sharpe" | "maxDrawdown";
type StrategyFilter = "all" | "favorites" | "paper" | "live";
type ExecutionMode = "paper" | "live" | "backtest";

interface StrategyViewRow {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
  statusLabel: "Paper Trading" | "Live Trading" | "Backtest";
  executionMode: ExecutionMode;
  statusClass: string;
  roi: string;
  winRate: string;
  sharpe: string;
  maxDrawdown: string;
}

const sortLabels: Record<SortKey, string> = {
  updated: "Updated Time",
  name: "Name",
  roi: "ROI",
  winRate: "Win Rate",
  sharpe: "Sharpe",
};

const defaultVisibleMetrics: Record<MetricKey, boolean> = {
  roi: true,
  winRate: true,
  sharpe: true,
  maxDrawdown: true,
};

function toStrategyViewRow(index: number): StrategyViewRow {
  const strategy = strategies[index % strategies.length];
  const executionMode: ExecutionMode =
    strategy.status === "live"
      ? "live"
      : strategy.status === "backtested"
        ? "backtest"
        : "paper";

  const statusLabel =
    executionMode === "live"
      ? "Live Trading"
      : executionMode === "paper"
        ? "Paper Trading"
        : "Backtest";

  const statusClass =
    executionMode === "live"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : executionMode === "paper"
        ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
        : "border-sky-500/20 bg-sky-500/10 text-sky-400";

  return {
    id: `STR-${463 + index}`,
    name: strategy.name,
    description: strategy.description,
    updatedAt: strategy.updatedAt,
    statusLabel,
    executionMode,
    statusClass,
    roi: strategy.annualReturn,
    winRate: strategy.winRate,
    sharpe: strategy.sharpe.toFixed(2),
    maxDrawdown: strategy.maxDrawdown,
  };
}

const strategyRows: StrategyViewRow[] = Array.from({ length: 20 }, (_, index) => toStrategyViewRow(index));

function MetricBox({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/35 p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold font-mono tabular-nums ${
          tone === "positive"
            ? "text-[#00d492]"
            : tone === "negative"
              ? "text-[#ff637e]"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StrategyCard({
  row,
  starred,
  onToggleStar,
  visibleMetrics,
  uiLang,
}: {
  row: StrategyViewRow;
  starred: boolean;
  onToggleStar: () => void;
  visibleMetrics: Record<MetricKey, boolean>;
  uiLang: "en" | "zh";
}) {
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const translatedDescription = (() => {
    if (uiLang !== "zh") return row.description;
    switch (row.name) {
      case "Cross-Exchange Arb Pro":
        return "利用主流 CEX 平台间的价格偏差，并结合价差分析与订单簿深度进行套利。";
      case "Stable Yield Optimizer":
        return "聚焦资金费率套利与基差交易的低风险策略，并通过受控敞口提升收益稳定性。";
      case "BTC Alpha Composite":
        return "结合 RSI 交叉、成交量背离与资金费率信号的多因子动量策略，适用于 BTC 永续合约。";
      case "DeFi Yield Hunter":
        return "从 TVL 资金流、LP 行为和 Gas 费模式中提取 Alpha，覆盖主要 DeFi 协议。";
      case "Altcoin Rotation":
        return "基于动量、巨鲸跟踪与链上指标，在前 50 大山寨币之间进行系统化轮动。";
      case "MEV Protection Alpha":
        return "通过识别并规避 MEV 攻击，同时捕捉具备抗 Sandwich 特征的机会来生成 Alpha。";
      default:
        return row.description;
    }
  })();
  return (
    <div className="surface-card overflow-hidden border border-border/70">
      <div className="border-b border-border/50 px-5 py-4">
        <p className="text-lg font-semibold leading-7 text-foreground">{row.name}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className={`inline-flex h-[25px] items-center rounded-full border px-[11px] py-[5px] text-[10px] font-semibold uppercase tracking-[0.18em] ${row.statusClass}`}>
            {row.statusLabel === "Live Trading"
              ? tr("Live Trading", "实盘交易")
              : row.statusLabel === "Paper Trading"
                ? tr("Paper Trading", "模拟交易")
                : tr("Backtest", "回测")}
          </span>
          <span className="text-xs text-muted-foreground">{tr("Updated", "更新于")}:{row.updatedAt}</span>
          <span className="text-xs text-muted-foreground">ID:{row.id}</span>
        </div>
      </div>

      <div className="px-5 pb-4 pt-3">
        <p className="text-sm leading-7 text-muted-foreground">{translatedDescription}</p>

        <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
          {visibleMetrics.roi ? <MetricBox label="ROI" value={row.roi} tone="positive" /> : null}
          {visibleMetrics.winRate ? <MetricBox label={tr("Win Rate", "胜率")} value={row.winRate} tone="positive" /> : null}
          {visibleMetrics.sharpe ? <MetricBox label={tr("Sharpe", "夏普比率")} value={row.sharpe} tone="positive" /> : null}
          {visibleMetrics.maxDrawdown ? <MetricBox label={tr("Max Drawdown", "最大回撤")} value={row.maxDrawdown} tone="negative" /> : null}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            className={`inline-flex h-8 items-center justify-center rounded-full border px-3 transition-colors ${
              starred
                ? "border-[#ffb900]/60 bg-[#ffb900]/30 text-[#ffb900]"
                : "border-border/60 bg-background/30 text-[#ffb900] hover:border-[#ffb900]/50"
            }`}
            onClick={onToggleStar}
            aria-label={tr("Toggle favorite", "切换收藏")}
          >
            <Star className={`h-[14px] w-[14px] ${starred ? "fill-current" : ""}`} />
          </button>

          <Link href={`/strategies/${row.id}`}>
            <Button className="h-8 rounded-full bg-primary px-4 text-xs font-medium text-[#020617] hover:bg-primary/90">
              {tr("View", "查看")}
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MyStrategies() {
  const { uiLang } = useAppLanguage();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDesc, setSortDesc] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [strategyFilter, setStrategyFilter] = useState<StrategyFilter>("all");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showColumnsMenu, setShowColumnsMenu] = useState(false);
  const [visibleMetrics, setVisibleMetrics] = useState<Record<MetricKey, boolean>>(defaultVisibleMetrics);
  const [starred, setStarred] = useState<Set<string>>(new Set(["STR-463", "STR-470"]));
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setShowSortMenu(false);
      }
      if (columnMenuRef.current && !columnMenuRef.current.contains(target)) {
        setShowColumnsMenu(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const byTopFilter = strategyRows.filter((row) => {
      if (strategyFilter === "favorites") return starred.has(row.id);
      if (strategyFilter === "paper") return row.executionMode === "paper";
      if (strategyFilter === "live") return row.executionMode === "live";
      return true;
    });

    const keyword = query.trim().toLowerCase();
    if (!keyword) return byTopFilter;
    return byTopFilter.filter((row) => row.name.toLowerCase().includes(keyword) || row.id.toLowerCase().includes(keyword));
  }, [query, strategyFilter, starred]);

  const sorted = useMemo(() => {
    const rows = [...filtered];
    rows.sort((a, b) => {
      let comp = 0;
      if (sortKey === "updated") {
        comp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else if (sortKey === "name") {
        comp = a.name.localeCompare(b.name);
      } else if (sortKey === "roi") {
        comp = parsePercent(a.roi) - parsePercent(b.roi);
      } else if (sortKey === "winRate") {
        comp = parsePercent(a.winRate) - parsePercent(b.winRate);
      } else if (sortKey === "sharpe") {
        comp = Number(a.sharpe) - Number(b.sharpe);
      }
      return sortDesc ? -comp : comp;
    });
    return rows;
  }, [filtered, sortDesc, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [page, pageSize, sorted]
  );

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [query, strategyFilter, sortKey, sortDesc, pageSize]);

  const getPageRange = () => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) return Array.from({ length: totalPages }, (_, i) => i + 1);
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const paperCount = useMemo(
    () => strategyRows.filter((row) => row.executionMode === "paper").length,
    []
  );
  const liveCount = useMemo(
    () => strategyRows.filter((row) => row.executionMode === "live").length,
    []
  );

  const topStats = [
    {
      key: "all" as const,
      label: "Total",
      value: String(strategyRows.length),
      icon: <List className="h-3.5 w-3.5 text-slate-400" />,
      tone: "text-foreground",
      labelClass: "text-muted-foreground",
    },
    {
      key: "favorites" as const,
      label: "My Favorites",
      value: String(starred.size),
      icon: <Star className="h-3.5 w-3.5 text-[#ffb900]" />,
      tone: "text-[#ffb900]",
      labelClass: "text-[#ffb900]",
    },
    {
      key: "paper" as const,
      label: "Paper Trading",
      value: String(paperCount),
      icon: <Circle className="h-3.5 w-3.5 text-indigo-400" />,
      tone: "text-indigo-400",
      labelClass: "text-indigo-400",
    },
    {
      key: "live" as const,
      label: "Live Trading",
      value: String(liveCount),
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
      tone: "text-emerald-400",
      labelClass: "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex items-start justify-between gap-4">
          <h1 className="text-foreground">{tr("My Strategy", "我的策略")}</h1>
        <Link href="/strategies/new?creationMode=platform&scale=single">
          <Button className="h-10 rounded-full bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-1 h-3.5 w-3.5" />
            {tr("New Strategy", "新建策略")}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {topStats.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setStrategyFilter((prev) => (prev === item.key ? "all" : item.key))}
            className={`surface-card h-[105px] border px-6 py-5 text-left transition-colors ${
              strategyFilter === item.key
                ? item.key === "favorites"
                  ? "border-amber-400/40 bg-amber-400/[0.06]"
                  : item.key === "paper"
                    ? "border-indigo-400/40 bg-indigo-400/[0.06]"
                    : item.key === "live"
                      ? "border-emerald-400/40 bg-emerald-400/[0.06]"
                      : "border-primary/30 bg-primary/[0.06]"
                : "border-border hover:border-border/80"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 label-upper">
              {item.icon}
              <p className={`${item.labelClass}`}>
                {item.label === "Total"
                  ? tr("Total", "总数")
                  : item.label === "My Favorites"
                    ? tr("My Favorites", "我的收藏")
                    : item.label === "Paper Trading"
                      ? tr("Paper Trading", "模拟交易")
                      : tr("Live Trading", "实盘交易")}
              </p>
            </div>
            <p className={`stat-value text-2xl font-bold ${item.tone}`}>{item.value}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <div className="relative w-full max-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
              placeholder={tr("Search by name or ID...", "按名称或 ID 搜索...")}
            className="h-8 w-full rounded-xl border border-border bg-accent/30 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={sortMenuRef}>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowSortMenu((prev) => !prev)}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {tr("Sort", "排序")}
            </button>

            {showSortMenu ? (
              <div className="surface-elevated absolute right-0 z-40 mt-2 w-48 p-2">
                {(["updated", "name", "roi", "winRate", "sharpe"] as SortKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      sortKey === key ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                    onClick={() => {
                      if (sortKey === key) {
                        setSortDesc((prev) => !prev);
                      } else {
                        setSortKey(key);
                        setSortDesc(true);
                      }
                    }}
                  >
                    <span>
                      {key === "updated"
                        ? tr("Updated Time", "更新时间")
                        : key === "name"
                          ? tr("Name", "名称")
                          : key === "roi"
                            ? "ROI"
                            : key === "winRate"
                              ? tr("Win Rate", "胜率")
                              : tr("Sharpe", "夏普比率")}
                    </span>
                    {sortKey === key ? <span>{sortDesc ? "DESC" : "ASC"}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative" ref={columnMenuRef}>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-card px-3 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowColumnsMenu((prev) => !prev)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
                {tr("Columns", "列")}
            </button>

            {showColumnsMenu ? (
              <div className="surface-elevated absolute right-0 z-40 mt-2 w-44 p-2">
                {([
                  { key: "roi", label: "ROI" },
                  { key: "winRate", label: tr("Win Rate", "胜率") },
                  { key: "sharpe", label: tr("Sharpe", "夏普比率") },
                  { key: "maxDrawdown", label: tr("Max Drawdown", "最大回撤") },
                ] as Array<{ key: MetricKey; label: string }>).map((item) => (
                  <label key={item.key} className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={visibleMetrics[item.key]}
                      onChange={() =>
                        setVisibleMetrics((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className="h-3.5 w-3.5 accent-indigo-500"
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          <div className="inline-flex h-[34px] items-center overflow-hidden rounded-xl border border-border bg-card p-px">
            <button
              type="button"
              className={`inline-flex h-8 w-8 items-center justify-center ${
                viewMode === "list" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <Columns3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={`inline-flex h-8 w-8 items-center justify-center ${
                viewMode === "grid" ? "bg-primary text-[#020617]" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <Grid2x2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {sorted.slice(0, 8).map((row) => (
            <StrategyCard
              key={row.id}
              row={row}
              starred={starred.has(row.id)}
              onToggleStar={() =>
                setStarred((prev) => {
                  const next = new Set(prev);
                  if (next.has(row.id)) next.delete(row.id);
                  else next.add(row.id);
                  return next;
                })
              }
              visibleMetrics={visibleMetrics}
              uiLang={uiLang}
            />
          ))}
        </div>
      ) : (
        <div className="surface-card overflow-hidden border border-border/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead className="border-b border-border/60">
                <tr>
                  <th className="w-10 px-3 py-3" />
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Name", "名称")}</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Status", "状态")}</th>
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Updated", "更新于")}</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ROI</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Win Rate", "胜率")}</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Sharpe", "夏普比率")}</th>
                  <th className="px-4 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Max Drawdown", "最大回撤")}</th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{tr("Action", "操作")}</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((row) => (
                  <tr
                    key={row.id}
                    className={`group border-t border-border/40 transition-colors ${
                      starred.has(row.id) ? "bg-amber-500/[0.03]" : ""
                    }`}
                  >
                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          setStarred((prev) => {
                            const next = new Set(prev);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            return next;
                          })
                        }
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-[#ffb900]"
                        aria-label={tr("Toggle favorite", "切换收藏")}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${starred.has(row.id) ? "fill-[#ffb900] text-[#ffb900]" : ""}`}
                        />
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground">ID:{row.id}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${row.statusClass}`}>
                        {row.statusLabel === "Live Trading"
                          ? tr("Live Trading", "实盘交易")
                          : row.statusLabel === "Paper Trading"
                            ? tr("Paper Trading", "模拟交易")
                            : tr("Backtest", "回测")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">{row.updatedAt}</td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-[#00d492]">{row.roi}</td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-[#00d492]">{row.winRate}</td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-[#00d492]">{row.sharpe}</td>
                    <td className="px-4 py-4 text-right font-mono text-sm text-[#ff637e]">{row.maxDrawdown}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/strategies/${row.id}`}>
                        <Button className="h-8 rounded-full bg-primary px-4 text-xs text-[#020617] hover:bg-primary/90">
                          {tr("View", "查看")}
                          <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                      {tr("No strategies match your filters.", "没有符合当前筛选条件的策略。")}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 bg-card/40 px-6 py-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">
                {sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
              </span>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5">
                  <span>{tr("Rows", "行数")}</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-6 w-16 rounded-lg border-border bg-transparent text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                disabled={page <= 1}
                onClick={() => setPage((prev) => prev - 1)}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {getPageRange().map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className={`h-7 w-7 rounded-lg p-0 text-xs font-mono tabular-nums ${
                    p === page ? "bg-primary text-primary-foreground" : "border-border"
                  }`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 rounded-lg border-border p-0"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

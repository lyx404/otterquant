/*
 * AlphaCardView — Card view for My Alphas
 * Receives pre-filtered & sorted data from parent (same as table view)
 * Field visibility fully synced with table view's visibleColumns
 */
import { useId, useMemo, type ReactNode } from "react";
import { Link } from "wouter";
import { ArrowUpRight, MoreHorizontal, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import {
  type Factor,
  type AlphaGrade,
  generatePnLData,
} from "@/lib/mockData";
import ShinyTag from "@/components/ui/shiny-tag";

type AlphaRow = Factor & {
  submissionStatus: "queued" | "backtesting" | "is_testing" | "os_testing" | "passed" | "failed" | "rejected";
  submittedAt?: string;
  osFitness?: number;
  compositeScore?: number;
  epochStatus?: string;
  epochId?: string;
};

const statusConfig: Record<string, { label: string; dotClass: string; textClass: string }> = {
  passed: { label: "Passed", dotClass: "bg-emerald-400", textClass: "text-emerald-400" },
  failed: { label: "Failed", dotClass: "bg-red-400", textClass: "text-red-400" },
};

interface AlphaCardViewProps {
  rows: AlphaRow[];
  visibleColumns: Set<string>;
  starred: Set<string>;
  onToggleStar: (id: string) => void;
  onRequestDelete: (row: AlphaRow) => void;
  plainExplainEnabled?: boolean;
}

const REVEALED_GRADE_STORAGE_PREFIX = "alphaforge_grade_reset_v4_";

function readRevealedGrade(factorId: string): AlphaGrade | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(`${REVEALED_GRADE_STORAGE_PREFIX}${factorId}`);
    return value === "S" || value === "A" || value === "B" || value === "C" || value === "D"
      ? value
      : null;
  } catch {
    return null;
  }
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

function MaybeExplainTooltip({
  enabled,
  explanation,
  children,
}: {
  enabled?: boolean;
  explanation: string;
  children: ReactNode;
}) {
  if (!enabled) return <>{children}</>;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs leading-5">
        {explanation}
      </TooltipContent>
    </Tooltip>
  );
}

function PnlSparkline({
  values,
  label,
  explainEnabled,
  explanation,
}: {
  values: number[];
  label: string;
  explainEnabled?: boolean;
  explanation: string;
}) {
  const svgId = useId().replace(/:/g, "");
  const width = 420;
  const height = 86;
  const path = buildSparklinePath(values, width, height);
  const areaPath = path ? `${path} L ${width - 6} ${height - 6} L 6 ${height - 6} Z` : "";

  return (
    <MaybeExplainTooltip enabled={explainEnabled} explanation={explanation}>
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[78px] w-full overflow-visible" fill="none" aria-hidden="true">
        <path d={areaPath} fill={`url(#${svgId}-alpha-card-pnl-fill)`} opacity="0.55" />
        <path d={path} stroke={`url(#${svgId}-alpha-card-pnl-line)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id={`${svgId}-alpha-card-pnl-line`} x1="0" x2={width} y1="0" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="72%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient id={`${svgId}-alpha-card-pnl-fill`} x1="0" x2="0" y1="0" y2={height} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#34D399" stopOpacity="0.02" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    </MaybeExplainTooltip>
  );
}

function sharpeLevel(value: number, tr: (en: string, zh: string) => string) {
  if (value >= 1) return tr("relatively steady", "相对稳定");
  if (value >= 0.5) return tr("moderate", "中等");
  return tr("less steady", "不够稳定");
}

function fitnessLevel(value: number, tr: (en: string, zh: string) => string) {
  if (value >= 1) return tr("strong", "较强");
  if (value >= 0.5) return tr("usable", "可用");
  return tr("weak", "偏弱");
}

function percentLevel(value: string, tr: (en: string, zh: string) => string, higherIsBetter = true) {
  const parsed = Math.abs(parseFloat(value));
  if (Number.isNaN(parsed)) return tr("for reference", "仅供参考");
  if (higherIsBetter) {
    if (parsed >= 15) return tr("high", "较高");
    if (parsed >= 5) return tr("moderate", "中等");
    return tr("low", "较低");
  }
  if (parsed <= 10) return tr("controlled", "控制较好");
  if (parsed <= 20) return tr("noticeable", "需要关注");
  return tr("high risk", "风险较高");
}

export default function AlphaCardView({
  rows,
  visibleColumns,
  starred,
  onToggleStar,
  onRequestDelete,
  plainExplainEnabled = false,
}: AlphaCardViewProps) {
  const { uiLang } = useAppLanguage();
  const isVisible = (key: string) => visibleColumns.has(key);
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const pnlValues = useMemo(() => {
    const pnlData = generatePnLData();
    const combined = [...pnlData.train, ...pnlData.test].map((item) => item.value);
    const sampleEvery = Math.max(1, Math.floor(combined.length / 36));
    return combined.filter((_, index) => index % sampleEvery === 0).slice(-36);
  }, []);

  const renderStatus = (status: AlphaRow["submissionStatus"]) => {
    const mapped = status === "passed" ? "passed" : "failed";
    const s = statusConfig[mapped];
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-2.5 py-1">
        <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`} />
        <span className={`text-[10px] font-semibold tracking-[0.14em] uppercase ${s.textClass}`}>
          {s.label === "Passed" ? tr("Passed", "通过") : tr("Failed", "失败")}
        </span>
      </span>
    );
  };

  const renderGrade = (row: AlphaRow) => {
    if (row.submissionStatus !== "passed") {
      return (
        <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-2.5 py-1 rounded-full border border-slate-300/70 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-[10px] font-semibold font-mono text-slate-700 dark:border-slate-600/60 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-300">
          -
        </span>
      );
    }

    const revealedGrade = readRevealedGrade(row.id);
    if (!revealedGrade) {
      return (
        <span
          className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-2.5 py-1 rounded-full border border-slate-300/70 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-600/60 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          title="Unrevealed grade"
          aria-label="Unrevealed grade"
        >
          <span className="text-[11px] leading-none font-black text-slate-500 dark:text-slate-300 select-none">?</span>
        </span>
      );
    }

    if (revealedGrade === "S" || revealedGrade === "A") {
      return <ShinyTag tier={revealedGrade} />;
    }

    return (
      <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-2.5 py-1 rounded-full border border-slate-300/70 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-[10px] font-semibold font-mono text-slate-900 dark:border-slate-600/60 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:text-slate-100">
        {revealedGrade}
      </span>
    );
  };

  /* Metric cell: clearer label/value hierarchy */
  const MetricCell = ({
    label,
    value,
    colorClass,
    explanation,
  }: {
    label: string;
    value: string;
    colorClass?: string;
    explanation?: string;
  }) => {
    const cell = (
      <div className="min-w-0">
        <div className="mb-1 whitespace-nowrap text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
        <div className={`text-sm font-semibold font-mono tabular-nums ${colorClass || "text-foreground"}`}>{value}</div>
      </div>
    );

    return (
      <MaybeExplainTooltip enabled={plainExplainEnabled && Boolean(explanation)} explanation={explanation ?? ""}>
        {cell}
      </MaybeExplainTooltip>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {rows.map((row) => {
        const osSharpeColor = row.osSharpe >= 1 ? "text-success" : row.osSharpe >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive";
        const fitnessColor = row.fitness >= 1 ? "text-success" : row.fitness >= 0.5 ? "text-foreground" : "text-muted-foreground";
        const metricExplanations: Record<string, string> = {
          sharpe: tr(
            `Higher Sharpe means steadier returns. ${row.sharpe.toFixed(2)} is ${sharpeLevel(row.sharpe, tr)}.`,
            `夏普比率越高代表越稳定，${row.sharpe.toFixed(2)} 为${sharpeLevel(row.sharpe, tr)}。`
          ),
          osSharpe: tr(
            `Higher OS Sharpe means better robustness. ${row.osSharpe.toFixed(2)} is ${sharpeLevel(row.osSharpe, tr)}.`,
            `样本外夏普越高代表泛化越稳，${row.osSharpe.toFixed(2)} 为${sharpeLevel(row.osSharpe, tr)}。`
          ),
          fitness: tr(
            `Higher fitness means better overall quality. ${row.fitness.toFixed(2)} is ${fitnessLevel(row.fitness, tr)}.`,
            `适应度越高代表综合质量越好，${row.fitness.toFixed(2)} 为${fitnessLevel(row.fitness, tr)}。`
          ),
          returns: tr(
            `Higher return means stronger backtest gain. ${row.returns} is ${percentLevel(row.returns, tr)}.`,
            `收益率越高代表回测收益越强，${row.returns} 为${percentLevel(row.returns, tr)}。`
          ),
          turnover: tr(
            `Higher turnover means more frequent trades. ${row.turnover} is ${percentLevel(row.turnover, tr)}.`,
            `换手率越高代表交易越频繁，${row.turnover} 为${percentLevel(row.turnover, tr)}。`
          ),
          drawdown: tr(
            `Lower drawdown means smoother risk. ${row.drawdown} is ${percentLevel(row.drawdown, tr, false)}.`,
            `回撤越低代表风险越平滑，${row.drawdown} 为${percentLevel(row.drawdown, tr, false)}。`
          ),
          testsPassed: tr(
            `More passed checks means safer validation. ${row.testsPassed}/${row.testsFailed}/${row.testsPending} for passed/failed/pending.`,
            `通过项越多代表验证越充分，${row.testsPassed}/${row.testsFailed}/${row.testsPending} 为通过/失败/待处理。`
          ),
        };

        /* Collect visible metrics for the grid — synced with table columns */
        const metrics: { label: string; value: string; colorClass?: string; explanation?: string }[] = [];
        if (isVisible("sharpe")) metrics.push({ label: tr("IS Sharpe", "样本内夏普比率"), value: row.sharpe.toFixed(2), explanation: metricExplanations.sharpe });
        if (isVisible("osSharpe")) metrics.push({ label: tr("OS Sharpe", "样本外夏普比率"), value: row.osSharpe.toFixed(2), colorClass: osSharpeColor, explanation: metricExplanations.osSharpe });
        if (isVisible("fitness")) metrics.push({ label: tr("Fitness", "适应度"), value: row.fitness.toFixed(2), colorClass: fitnessColor, explanation: metricExplanations.fitness });
        if (isVisible("returns")) metrics.push({ label: tr("Returns", "收益率"), value: row.returns, explanation: metricExplanations.returns });
        if (isVisible("turnover")) metrics.push({ label: tr("Turnover", "换手率"), value: row.turnover, explanation: metricExplanations.turnover });
        if (isVisible("drawdown")) metrics.push({ label: tr("Drawdown", "回撤"), value: row.drawdown, colorClass: "text-destructive", explanation: metricExplanations.drawdown });
        if (isVisible("testsPassed")) {
          const testsValue = `${row.testsPassed}/${row.testsFailed}${row.testsPending > 0 ? `/${row.testsPending}` : ""}`;
          metrics.push({ label: tr("Tests", "测试"), value: testsValue, explanation: metricExplanations.testsPassed });
        }

        return (
          <div
            key={row.id}
            className="surface-card overflow-hidden transition-all duration-200 hover:border-primary/30 group flex h-full flex-col"
          >
            {/* Card Header: title first, then key badges */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {isVisible("name") ? (
                    <Link href={`/alphas/${row.id}`}>
                      <span className="block text-sm font-semibold text-foreground hover:text-primary transition-colors duration-200 cursor-pointer truncate leading-5">
                        {row.name}
                      </span>
                    </Link>
                  ) : (
                    <span className="block text-sm font-semibold text-foreground truncate leading-5">{row.name}</span>
                  )}
                  {(isVisible("createdAt") || isVisible("id")) && (
                    <div className="mt-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {isVisible("createdAt") ? `Created:${row.createdAt}` : ""}
                      {isVisible("createdAt") && isVisible("id") ? "  " : ""}
                      {isVisible("id") ? `ID: ${row.id}` : ""}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    {isVisible("status_col") && renderStatus(row.submissionStatus)}
                    {isVisible("grade") && renderGrade(row)}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Body: metrics + secondary info */}
            <div className="px-4 py-3 flex-1 space-y-4">
              <PnlSparkline
                values={pnlValues}
                label={tr("PnL Curve", "PNL 折线图")}
                explainEnabled={plainExplainEnabled}
                explanation={tr(
                  `This line shows cumulative profit and loss. In this preview it moves from about ${pnlValues[0]?.toLocaleString() ?? "0"} to ${pnlValues[pnlValues.length - 1]?.toLocaleString() ?? "0"}.`,
                  `这条线表示累计收益变化。当前示例大约从 ${pnlValues[0]?.toLocaleString() ?? "0"} 走到 ${pnlValues[pnlValues.length - 1]?.toLocaleString() ?? "0"}。`
                )}
              />

              {metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-t border-border/50 pt-4 xl:grid-cols-3">
                  {metrics.map((m) => (
                    <MetricCell key={m.label} label={m.label} value={m.value} colorClass={m.colorClass} explanation={m.explanation} />
                  ))}
                </div>
              )}

              {isVisible("epochStatus") && (
                <div className="flex items-start gap-3 border-t border-border/50 pt-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">{tr("Arena Round", "竞技场轮次")}</div>
                    {row.submissionStatus !== "passed" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs font-mono text-muted-foreground/50 cursor-default">{tr("Ineligible", "不可参赛")}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {tr("Only passed factors are eligible to participate in the Arena", "只有通过的因子才可进入竞技场")}
                        </TooltipContent>
                      </Tooltip>
                    ) : row.epochId ? (
                      <Link href={`/leaderboard?epoch=${encodeURIComponent(row.epochId)}`}>
                        <span className="text-xs font-mono text-primary hover:underline cursor-pointer">{row.epochStatus || "Not Entered"}</span>
                      </Link>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs font-mono text-muted-foreground/50 cursor-default">{tr("Pending Entry", "待参赛")}</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[240px] text-xs leading-5">
                          {tr(
                            "Passed factors are automatically entered into Factor Arena. This factor will join when the next round starts.",
                            "通过状态的因子会自动参与因子竞技；当前轮次尚未开始，等待下一轮开始后自动参与。"
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer: actions */}
            <div className="mt-auto border-t border-border/40 px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={tr("More actions", "更多操作")}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-32 rounded-xl p-1" align="end">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
                      onClick={() => onRequestDelete(row)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {tr("Delete", "删除")}
                    </button>
                  </PopoverContent>
                </Popover>
                <button
                  type="button"
                  className={`inline-flex h-8 items-center justify-center rounded-full border px-3 transition-colors ${
                    starred.has(row.id)
                      ? "border-[#ffb900]/60 bg-[#ffb900]/30 text-[#ffb900]"
                      : "border-border/60 bg-background/30 text-[#ffb900] hover:border-[#ffb900]/50"
                  }`}
                  onClick={(e) => { e.stopPropagation(); onToggleStar(row.id); }}
                  aria-label={starred.has(row.id) ? tr("Unfavorite", "取消收藏") : tr("Favorite", "收藏")}
                >
                  <Star className={`h-[14px] w-[14px] ${starred.has(row.id) ? "fill-current" : ""}`} />
                </button>
                <Link href={`/alphas/${row.id}`}>
                  <Button className="h-8 rounded-full bg-primary px-4 text-xs font-medium text-white shadow-sm hover:bg-primary/90 dark:text-[#020617]">
                    {tr("View", "查看")}
                    <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {rows.length === 0 && (
        <div className="col-span-full surface-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">{tr("No factors found matching the current filters.", "没有符合当前筛选条件的因子。")}</p>
        </div>
      )}
    </div>
  );
}

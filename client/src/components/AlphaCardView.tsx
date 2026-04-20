/*
 * AlphaCardView — Card view for My Alphas
 * Receives pre-filtered & sorted data from parent (same as table view)
 * Field visibility fully synced with table view's visibleColumns
 */
import { Link } from "wouter";
import { ArrowUpRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type Factor,
  type AlphaGrade,
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

export default function AlphaCardView({ rows, visibleColumns, starred, onToggleStar }: AlphaCardViewProps) {
  const isVisible = (key: string) => visibleColumns.has(key);

  const renderStatus = (status: AlphaRow["submissionStatus"]) => {
    const mapped = status === "passed" ? "passed" : "failed";
    const s = statusConfig[mapped];
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/40 px-2.5 py-1">
        <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`} />
        <span className={`text-[10px] font-semibold tracking-[0.14em] uppercase ${s.textClass}`}>{s.label}</span>
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
  const MetricCell = ({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) => (
    <div className="rounded-xl border border-border/50 bg-background/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">{label}</div>
      <div className={`text-sm font-semibold font-mono tabular-nums ${colorClass || "text-foreground"}`}>{value}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {rows.map((row) => {
        const osSharpeColor = row.osSharpe >= 1 ? "text-success" : row.osSharpe >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive";
        const fitnessColor = row.fitness >= 1 ? "text-success" : row.fitness >= 0.5 ? "text-foreground" : "text-muted-foreground";

        /* Collect visible metrics for the grid — synced with table columns */
        const metrics: { label: string; value: string; colorClass?: string }[] = [];
        if (isVisible("sharpe")) metrics.push({ label: "IS Sharpe", value: row.sharpe.toFixed(2) });
        if (isVisible("osSharpe")) metrics.push({ label: "OS Sharpe", value: row.osSharpe.toFixed(2), colorClass: osSharpeColor });
        if (isVisible("fitness")) metrics.push({ label: "Fitness", value: row.fitness.toFixed(2), colorClass: fitnessColor });
        if (isVisible("returns")) metrics.push({ label: "Returns", value: row.returns });
        if (isVisible("turnover")) metrics.push({ label: "Turnover", value: row.turnover });
        if (isVisible("drawdown")) metrics.push({ label: "Drawdown", value: row.drawdown, colorClass: "text-destructive" });
        if (isVisible("testsPassed")) {
          const testsValue = `${row.testsPassed}/${row.testsFailed}${row.testsPending > 0 ? `/${row.testsPending}` : ""}`;
          metrics.push({ label: "Tests", value: testsValue });
        }

        return (
          <div
            key={row.id}
            className="surface-card overflow-hidden transition-all duration-200 hover:border-primary/30 group flex h-full flex-col"
          >
            {/* Card Header: title first, then key badges */}
            <div className="px-4 pt-4 pb-3 border-b border-border/50">
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
            <div className="px-4 py-3 flex-1 space-y-3">
              {isVisible("epochStatus") && (
                <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/20 px-3 py-2.5">
                  {isVisible("epochStatus") && (
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">Arena Round</div>
                      {row.submissionStatus !== "passed" ? (
                        <span className="text-xs font-mono text-muted-foreground/50">Ineligible</span>
                      ) : row.epochId ? (
                        <Link href={`/leaderboard?epoch=${encodeURIComponent(row.epochId)}`}>
                          <span className="text-xs font-mono text-primary hover:underline cursor-pointer">{row.epochStatus || "Not Entered"}</span>
                        </Link>
                      ) : (
                        <span className="text-xs font-mono text-muted-foreground">{row.epochStatus || "Not Entered"}</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {metrics.length > 0 && (
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-2.5">
                  {metrics.map((m) => (
                    <MetricCell key={m.label} label={m.label} value={m.value} colorClass={m.colorClass} />
                  ))}
                </div>
              )}
            </div>

            {/* Card Footer: actions */}
            <div className="mt-auto border-t border-border/30 bg-accent/20 px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  className={`inline-flex h-8 items-center justify-center rounded-full border px-3 transition-colors ${
                    starred.has(row.id)
                      ? "border-[#ffb900]/60 bg-[#ffb900]/30 text-[#ffb900]"
                      : "border-border/60 bg-background/30 text-[#ffb900] hover:border-[#ffb900]/50"
                  }`}
                  onClick={(e) => { e.stopPropagation(); onToggleStar(row.id); }}
                  aria-label={starred.has(row.id) ? "Unfavorite" : "Favorite"}
                >
                  <Star className={`h-[14px] w-[14px] ${starred.has(row.id) ? "fill-current" : ""}`} />
                </button>
                <Link href={`/alphas/${row.id}`}>
                  <Button className="h-8 rounded-full bg-primary px-4 text-xs font-medium text-[#020617] hover:bg-primary/90">
                    View
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
          <p className="text-sm text-muted-foreground">No alphas found matching the current filters.</p>
        </div>
      )}
    </div>
  );
}

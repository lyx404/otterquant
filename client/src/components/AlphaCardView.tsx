/*
 * AlphaCardView — Card view for My Alphas
 * Receives pre-filtered & sorted data from parent (same as table view)
 * Field visibility fully synced with table view's visibleColumns
 */
import { Link } from "wouter";
import { Star } from "lucide-react";
import {
  getAlphaGrade,
  type Factor,
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

export default function AlphaCardView({ rows, visibleColumns, starred, onToggleStar }: AlphaCardViewProps) {
  const isVisible = (key: string) => visibleColumns.has(key);

  const renderStatus = (status: AlphaRow["submissionStatus"]) => {
    const mapped = status === "passed" ? "passed" : "failed";
    const s = statusConfig[mapped];
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`} />
        <span className={`text-xs font-medium ${s.textClass}`}>{s.label}</span>
      </span>
    );
  };

  const renderGrade = (row: AlphaRow) => {
    if (row.submissionStatus !== "passed") {
      return <span className="text-xs text-muted-foreground/50 font-mono">-</span>;
    }
    const grade = getAlphaGrade(row.osSharpe);
    if (grade === "S" || grade === "A") {
      return <ShinyTag tier={grade} />;
    }
    return (
      <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-2.5 py-1 rounded-full border-[0.5px] border-white/40 text-[10px] font-semibold text-white bg-transparent">
        {grade}
      </span>
    );
  };

  /* Metric cell: unified style for all numeric values */
  const MetricCell = ({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) => (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-sm font-bold font-mono tabular-nums ${colorClass || "text-foreground"}`}>{value}</div>
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
            className="surface-card overflow-hidden transition-all duration-200 hover:border-primary/30 group"
          >
            {/* Card Header: Name + Status + Grade */}
            <div className="px-4 pt-4 pb-3 border-b border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button onClick={(e) => { e.stopPropagation(); onToggleStar(row.id); }} className="shrink-0 transition-transform duration-200 hover:scale-125">
                    <Star className={`w-3.5 h-3.5 transition-colors duration-200 ${starred.has(row.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"}`} />
                  </button>
                  {isVisible("name") ? (
                    <Link href={`/alphas/${row.id}`}>
                      <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors duration-200 cursor-pointer truncate">
                        {row.name}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-foreground truncate">{row.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isVisible("grade") && renderGrade(row)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                {isVisible("status_col") && renderStatus(row.submissionStatus)}
                {isVisible("id") && (
                  <span className="text-[10px] text-muted-foreground font-mono">{row.id}</span>
                )}
              </div>
            </div>

            {/* Card Body: Metrics Grid — only visible columns */}
            {metrics.length > 0 && (
              <div className="px-4 py-3">
                <div className="grid grid-cols-3 gap-3">
                  {metrics.map((m) => (
                    <MetricCell key={m.label} label={m.label} value={m.value} colorClass={m.colorClass} />
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Row: Arena Round + Date (if visible) */}
            {(isVisible("epochStatus") || isVisible("createdAt")) && (
              <div className="px-4 py-2.5 border-t border-border/30 flex items-center justify-between">
                {isVisible("epochStatus") && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Arena Round</div>
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
                {isVisible("createdAt") && (
                  <div className={isVisible("epochStatus") ? "text-right" : ""}>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Created</div>
                    <div className="text-xs font-mono text-muted-foreground">{row.createdAt}</div>
                  </div>
                )}
              </div>
            )}

            {/* Card Footer: View Detail */}
            <div className="px-4 py-2.5 border-t border-border/30 bg-accent/20">
              <Link href={`/alphas/${row.id}`}>
                <span className="text-xs font-medium text-primary hover:text-primary/80 transition-colors duration-200 cursor-pointer">
                  View Details →
                </span>
              </Link>
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

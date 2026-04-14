/*
 * AlphaCardView — Card view for My Alphas, fields synced with table view
 * Design: Grid cards showing same data as table columns
 * Fields: Name, Status, Grade, Arena Round, Date Created, IS Sharpe, OS Sharpe, Fitness, Returns, Turnover, Drawdown
 */
import { useMemo } from "react";
import { Link } from "wouter";
import { Star } from "lucide-react";
import {
  factors,
  submissions,
  getAlphaGrade,
  leaderboardByFactorByEpoch,
  currentEpoch,
  type Factor,
} from "@/lib/mockData";

/* Build epoch status lookup from leaderboard data */
function getEpochStatus(factorId: string): { display: string; epochId: string | null } {
  const currentEntries = leaderboardByFactorByEpoch[currentEpoch.id] || [];
  const currentEntry = currentEntries.find(e => e.factorId === factorId);
  if (currentEntry) {
    return { display: `${currentEpoch.id} #${currentEntry.rank}`, epochId: currentEpoch.id };
  }
  for (const [epochId, entries] of Object.entries(leaderboardByFactorByEpoch)) {
    if (epochId === currentEpoch.id) continue;
    const entry = entries.find(e => e.factorId === factorId);
    if (entry) {
      return { display: `${epochId} #${entry.rank}`, epochId };
    }
  }
  return { display: "Not Entered", epochId: null };
}
import ShinyTag from "@/components/ui/shiny-tag";

type AlphaRow = Factor & {
  submissionStatus: "queued" | "backtesting" | "is_testing" | "os_testing" | "passed" | "failed" | "rejected";
  submittedAt?: string;
  epochStatus?: string;
  epochId?: string;
};

const statusConfig: Record<string, { label: string; dotClass: string; textClass: string }> = {
  passed: { label: "Passed", dotClass: "bg-emerald-400", textClass: "text-emerald-400" },
  failed: { label: "Failed", dotClass: "bg-red-400", textClass: "text-red-400" },
};

export default function AlphaCardView() {
  const alphaRows: AlphaRow[] = useMemo(() => {
    return factors.map((f) => {
      const sub = submissions.find((s) => s.factorId === f.id);
      const submissionStatus = sub ? (sub.status as AlphaRow["submissionStatus"]) : "queued";
      return {
        ...f,
        submissionStatus,
        submittedAt: sub?.submittedAt,
        epochStatus: getEpochStatus(f.id).display,
        epochId: getEpochStatus(f.id).epochId ?? undefined,
      };
    });
  }, []);

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
    const textColorMap: Record<string, string> = {
      B: "text-[#4B94F8]",
      C: "text-[#43AF6D]",
      D: "text-muted-foreground/60",
    };
    return <span className={`text-xs font-semibold ${textColorMap[grade] || "text-muted-foreground"}`}>{grade}</span>;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {alphaRows.map((row) => {
        const sharpeColor = row.osSharpe >= 1 ? "text-success" : row.osSharpe >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive";

        return (
          <div
            key={row.id}
            className="surface-card overflow-hidden transition-all duration-200 hover:border-primary/30 group"
          >
            {/* Card Header: Name + Status + Grade */}
            <div className="px-4 pt-4 pb-3 border-b border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Star className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  <Link href={`/alphas/${row.id}`}>
                    <span className="text-sm font-semibold text-foreground hover:text-primary transition-colors duration-200 cursor-pointer truncate">
                      {row.name}
                    </span>
                  </Link>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {renderGrade(row)}
                </div>
              </div>
              <div className="flex items-center justify-between">
                {renderStatus(row.submissionStatus)}
                <span className="text-[10px] text-muted-foreground font-mono">{row.id}</span>
              </div>
            </div>

            {/* Card Body: Metrics Grid */}
            <div className="px-4 py-3">
              {/* Primary Metrics Row */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">IS Sharpe</div>
                  <div className="text-sm font-bold font-mono tabular-nums text-foreground">{row.sharpe.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">OS Sharpe</div>
                  <div className={`text-sm font-bold font-mono tabular-nums ${sharpeColor}`}>{row.osSharpe.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Fitness</div>
                  <div className={`text-sm font-bold font-mono tabular-nums ${row.fitness >= 1 ? "text-success" : row.fitness >= 0.5 ? "text-foreground" : "text-muted-foreground"}`}>
                    {row.fitness.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Secondary Metrics Row */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Returns</div>
                  <div className="text-xs font-mono tabular-nums text-foreground">{row.returns}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Turnover</div>
                  <div className="text-xs font-mono tabular-nums text-foreground">{row.turnover}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Drawdown</div>
                  <div className="text-xs font-mono tabular-nums text-destructive">{row.drawdown}</div>
                </div>
              </div>

              {/* Bottom Row: Arena Round + Date */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
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
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground mb-0.5">Created</div>
                  <div className="text-xs font-mono text-muted-foreground">{row.createdAt}</div>
                </div>
              </div>
            </div>

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

      {alphaRows.length === 0 && (
        <div className="col-span-full surface-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No alphas found.</p>
        </div>
      )}
    </div>
  );
}

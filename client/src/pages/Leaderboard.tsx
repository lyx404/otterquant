/*
 * Leaderboard — Indigo/Sky + Slate Design System
 * Cards: rounded-2xl, p-6 | Buttons: rounded-full | Inputs: rounded-lg
 * Primary: Indigo | Secondary: Sky | Success: Emerald | Danger: Red
 * Pure Tailwind classes — zero inline styles
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useMemo, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  Trophy,
  Clock,
  Award,
  Users,
  Medal,
  CheckCircle2,
  Timer,
  Crown,
  Gem,
  Coins,
} from "lucide-react";
import {
  allEpochs,
  leaderboardByFactorByEpoch,
  leaderboardByUserByEpoch,
} from "@/lib/mockData";

type ViewMode = "factor" | "user";

export default function Leaderboard() {
  const [viewMode, setViewMode] = useState<ViewMode>("factor");
  const [selectedEpochId, setSelectedEpochId] = useState(allEpochs[0].id);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;
    const lines = headerRef.current.querySelectorAll(".reveal-line");
    gsap.set(lines, { y: 100, skewY: 7, opacity: 0 });
    gsap.to(lines, {
      y: 0, skewY: 0, opacity: 1,
      duration: 1, stagger: 0.08, ease: "power4.out", delay: 0.1,
    });
  }, []);

  useEffect(() => {
    if (!statsRef.current) return;
    const items = statsRef.current.querySelectorAll(".fade-item");
    gsap.set(items, { y: 30, opacity: 0 });
    gsap.to(items, {
      y: 0, opacity: 1,
      duration: 0.6, stagger: 0.06, ease: "power3.out", delay: 0.3,
    });
  }, []);

  const selectedEpoch = useMemo(
    () => allEpochs.find((e) => e.id === selectedEpochId) ?? allEpochs[0],
    [selectedEpochId]
  );

  const isCurrent = !selectedEpoch.distributed;

  const factorData = useMemo(
    () => leaderboardByFactorByEpoch[selectedEpochId] ?? [],
    [selectedEpochId]
  );

  const userData = useMemo(
    () => leaderboardByUserByEpoch[selectedEpochId] ?? [],
    [selectedEpochId]
  );

  const rankBadge = (rank: number) => {
    if (rank === 1) return (
      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/30">
        <Crown className="w-4 h-4 text-white drop-shadow-sm" />
      </div>
    );
    if (rank === 2) return (
      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-slate-300 to-slate-500 shadow-lg shadow-slate-400/25 ring-2 ring-slate-300/30">
        <Medal className="w-4 h-4 text-white drop-shadow-sm" />
      </div>
    );
    if (rank === 3) return (
      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-600 to-amber-800 shadow-lg shadow-amber-700/25 ring-2 ring-amber-600/30">
        <Gem className="w-4 h-4 text-white drop-shadow-sm" />
      </div>
    );
    return <span className="w-8 h-8 flex items-center justify-center text-xs font-mono text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="space-y-8">
      {/* Header with Epoch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div ref={headerRef} className="reveal-clip">
          <div className="reveal-line">
            <h1 className="text-foreground">
              Leaderboard
            </h1>
          </div>
          <div className="reveal-line mt-2">
            <p className="text-base text-muted-foreground">
              Epoch rankings and reward distribution
            </p>
          </div>
        </div>

        {/* Epoch Selector */}
        <div className="flex items-center gap-3">
          <span className="label-upper shrink-0">Epoch</span>
          <Select value={selectedEpochId} onValueChange={setSelectedEpochId}>
            <SelectTrigger className="w-[260px] h-9 text-sm font-mono rounded-lg bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allEpochs.map((epoch) => (
                <SelectItem key={epoch.id} value={epoch.id} className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    {!epoch.distributed ? (
                      <Timer className="w-3.5 h-3.5 shrink-0 text-primary" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-success" />
                    )}
                    <span className="text-foreground">{epoch.id}</span>
                    <span className="text-xs text-muted-foreground">
                      {epoch.startDate} — {epoch.endDate}
                    </span>
                    {!epoch.distributed && (
                      <span className="text-[9px] px-1.5 py-0 h-4 inline-flex items-center rounded-full font-mono ml-1 bg-primary/10 text-primary border border-primary/20">
                        LIVE
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Epoch Info Bar */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`fade-item surface-card p-6 ${isCurrent ? "border-primary/20 dark:border-primary/30" : ""}`}>
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            {isCurrent ? "Current Epoch" : "Epoch"}
          </div>
          <div className="stat-value text-xl font-bold text-primary">{selectedEpoch.id}</div>
          <div className="text-xs mt-1 text-muted-foreground">
            {selectedEpoch.startDate} — {selectedEpoch.endDate}
          </div>
        </div>
        <div className="fade-item surface-card p-6">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> Prize Pool
          </div>
          <div className="stat-value text-xl font-bold text-success">{selectedEpoch.totalPool}</div>
          <div className="text-xs mt-1 text-muted-foreground">
            {isCurrent ? "distributed proportionally" : "fully distributed"}
          </div>
        </div>
        <div className="fade-item surface-card p-6">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {isCurrent ? "Time Remaining" : "Status"}
          </div>
          {isCurrent ? (
            <div className="stat-value text-xl font-bold text-destructive">{selectedEpoch.timeRemaining}</div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono bg-success/10 text-success border border-success/20">
                COMPLETED
              </span>
            </div>
          )}
          <div className="text-xs mt-1 text-muted-foreground">
            {isCurrent ? "until epoch ends" : `${selectedEpoch.winners} winners`}
          </div>
        </div>
        <div className="fade-item surface-card p-6">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Submissions
          </div>
          <div className="stat-value text-xl font-bold text-foreground">{selectedEpoch.totalSubmissions}</div>
          <div className="text-xs mt-1 text-muted-foreground">{selectedEpoch.qualifiedFactors} qualified</div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-2xl w-fit bg-accent border border-border">
        <button
          className={`h-8 text-xs px-4 rounded-xl font-medium transition-all duration-200 ease-in-out border ${
            viewMode === "factor"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
          }`}
          onClick={() => setViewMode("factor")}
        >
          By Factor
        </button>
        <button
          className={`h-8 text-xs px-4 rounded-xl font-medium transition-all duration-200 ease-in-out border ${
            viewMode === "user"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-transparent text-muted-foreground border-transparent hover:text-foreground"
          }`}
          onClick={() => setViewMode("user")}
        >
          By User
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="surface-card overflow-hidden px-2 sm:px-4">
        {viewMode === "factor" ? (
          <div key={`factor-${selectedEpochId}`}>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="label-upper w-[70px] pl-4">Rank</TableHead>
                  <TableHead className="label-upper">User</TableHead>
                  <TableHead className="label-upper">Factor</TableHead>
                  <TableHead className="label-upper">Market</TableHead>
                  <TableHead className="label-upper text-right">OS Sharpe</TableHead>
                  <TableHead className="label-upper text-right">OS Fitness</TableHead>
                  <TableHead className="label-upper text-right">Returns</TableHead>
                  <TableHead className="label-upper text-right">Score</TableHead>
                  <TableHead className="label-upper text-right pr-4">Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factorData.map((entry) => (
                  <TableRow
                    key={entry.factorId}
                    className={`transition-all duration-200 ease-in-out border-border hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                      entry.rank <= 3 ? "bg-primary/5 dark:bg-primary/[0.06]" : ""
                    }`}
                  >
                    <TableCell className="pl-4">{rankBadge(entry.rank)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono bg-accent border border-border text-muted-foreground">
                          {entry.avatar}
                        </div>
                        <span className="text-sm font-medium text-foreground">{entry.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{entry.factorName}</span>
                      <span className="text-[10px] font-mono ml-2 text-muted-foreground">{entry.factorId}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] border ${
                        entry.market === "CEX"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/25"
                      }`}>
                        {entry.market}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-sm ${
                        entry.osSharpe >= 1 ? "text-success" : entry.osSharpe >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive"
                      }`}>
                        {entry.osSharpe.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-foreground">{entry.osFitness.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-foreground">{entry.osReturns}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm font-bold text-success">{entry.compositeScore.toFixed(1)}</span>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-amber-500 dark:text-amber-400">
                        <Coins className="w-3.5 h-3.5" />
                        {entry.reward}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div key={`user-${selectedEpochId}`}>
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="label-upper w-[70px] pl-4">Rank</TableHead>
                  <TableHead className="label-upper">User</TableHead>
                  <TableHead className="label-upper text-right">Total Factors</TableHead>
                  <TableHead className="label-upper text-right">Qualified</TableHead>
                  <TableHead className="label-upper text-right">Avg OS Sharpe</TableHead>
                  <TableHead className="label-upper">Top Factor</TableHead>
                  <TableHead className="label-upper text-right pr-4">Total Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userData.map((entry) => (
                  <TableRow
                    key={entry.userId}
                    className={`transition-all duration-200 ease-in-out border-border hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                      entry.rank <= 3 ? "bg-primary/5 dark:bg-primary/[0.06]" : ""
                    }`}
                  >
                    <TableCell className="pl-4">{rankBadge(entry.rank)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono bg-accent border border-border text-muted-foreground">
                          {entry.avatar}
                        </div>
                        <span className="text-sm font-medium text-foreground">{entry.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-foreground">{entry.totalFactors}</TableCell>
                    <TableCell className="text-right font-mono text-sm text-success">{entry.qualifiedFactors}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-sm ${
                        entry.avgOsSharpe >= 1 ? "text-success" : entry.avgOsSharpe >= 0.5 ? "text-amber-500 dark:text-amber-400" : "text-destructive"
                      }`}>
                        {entry.avgOsSharpe.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">{entry.topFactor}</TableCell>
                    <TableCell className="text-right pr-4">
                      <span className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-amber-500 dark:text-amber-400">
                        <Coins className="w-3.5 h-3.5" />
                        {entry.totalReward}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

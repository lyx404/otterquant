/*
 * Leaderboard — Katana Deep Navy Design System
 * bg-0: #0d111c | bg-1: #101631 | Primary: #0058ff | Success: #00ffc2
 * Text: rgba(236,238,243, 0.92/0.48/0.32) | Border: rgba(236,238,243, 0.08/0.12)
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
} from "lucide-react";
import {
  allEpochs,
  leaderboardByFactorByEpoch,
  leaderboardByUserByEpoch,
} from "@/lib/mockData";
import { useKatanaColors } from "@/hooks/useKatanaColors";

/* ── color tokens (derived from theme) ── */
function useC() {
  const k = useKatanaColors();
  return {
    ...k,
    primaryBorder: k.isDark ? "rgba(0,88,255,0.30)" : "rgba(0,88,255,0.20)",
    successDim: k.isDark ? "rgba(0,255,194,0.10)" : "rgba(0,200,150,0.08)",
    successBorder: k.isDark ? "rgba(0,255,194,0.20)" : "rgba(0,200,150,0.15)",
    dangerDim: k.isDark ? "rgba(241,34,17,0.10)" : "rgba(241,34,17,0.06)",
    dangerBorder: k.isDark ? "rgba(241,34,17,0.20)" : "rgba(241,34,17,0.12)",
    gold: "#FFD700",
    goldDim: "rgba(255,215,0,0.12)",
    silver: "#C0C0C0",
    bronze: "#CD7F32",
  };
}

type ViewMode = "factor" | "user";

export default function Leaderboard() {
  const C = useC();

  const rankBadge = (rank: number) => {
    if (rank === 1) return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: C.goldDim }}><Medal className="w-3.5 h-3.5" style={{ color: C.gold }} /></div>;
    if (rank === 2) return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: C.card }}><Medal className="w-3.5 h-3.5" style={{ color: C.silver }} /></div>;
    if (rank === 3) return <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(205,127,50,0.10)" }}><Medal className="w-3.5 h-3.5" style={{ color: C.bronze }} /></div>;
    return <span className="w-6 h-6 flex items-center justify-center text-xs font-mono" style={{ color: C.text3 }}>{rank}</span>;
  };
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

  return (
    <div className="space-y-6">
      {/* Header with Epoch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div ref={headerRef} className="reveal-clip">
          <div className="reveal-line">
            <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-none" style={{ color: C.text1 }}>
              Leaderboard
            </h1>
          </div>
          <div className="reveal-line mt-2">
            <p className="text-sm" style={{ color: C.text2 }}>
              Epoch rankings and reward distribution
            </p>
          </div>
        </div>

        {/* Epoch Selector */}
        <div className="flex items-center gap-3">
          <span className="label-upper shrink-0">Epoch</span>
          <Select value={selectedEpochId} onValueChange={setSelectedEpochId}>
            <SelectTrigger
              className="w-[260px] h-9 text-sm font-mono rounded-xl"
              style={{ backgroundColor: C.card, borderColor: C.border }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ backgroundColor: C.popover, borderColor: C.border }}>
              {allEpochs.map((epoch) => (
                <SelectItem key={epoch.id} value={epoch.id} className="font-mono text-sm">
                  <div className="flex items-center gap-2">
                    {!epoch.distributed ? (
                      <Timer className="w-3.5 h-3.5 shrink-0" style={{ color: C.primary }} />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: C.success }} />
                    )}
                    <span style={{ color: C.text1 }}>{epoch.id}</span>
                    <span className="text-xs" style={{ color: C.text3 }}>
                      {epoch.startDate} — {epoch.endDate}
                    </span>
                    {!epoch.distributed && (
                      <span
                        className="text-[9px] px-1.5 py-0 h-4 inline-flex items-center rounded-full font-mono ml-1"
                        style={{ backgroundColor: C.primaryDim, color: C.primaryLight, border: `1px solid ${C.primaryBorder}` }}
                      >
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
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="fade-item katana-card p-4" style={isCurrent ? { borderColor: C.primaryBorder } : {}}>
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" />
            {isCurrent ? "Current Epoch" : "Epoch"}
          </div>
          <div className="stat-value text-xl font-bold" style={{ color: C.primaryLight }}>{selectedEpoch.id}</div>
          <div className="text-xs mt-1" style={{ color: C.text2 }}>
            {selectedEpoch.startDate} — {selectedEpoch.endDate}
          </div>
        </div>
        <div className="fade-item katana-card p-4">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> Prize Pool
          </div>
          <div className="stat-value text-xl font-bold" style={{ color: C.success }}>{selectedEpoch.totalPool}</div>
          <div className="text-xs mt-1" style={{ color: C.text2 }}>
            {isCurrent ? "distributed proportionally" : "fully distributed"}
          </div>
        </div>
        <div className="fade-item katana-card p-4">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {isCurrent ? "Time Remaining" : "Status"}
          </div>
          {isCurrent ? (
            <div className="stat-value text-xl font-bold" style={{ color: C.danger }}>{selectedEpoch.timeRemaining}</div>
          ) : (
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono"
                style={{ backgroundColor: C.successDim, color: C.success, border: `1px solid ${C.successBorder}` }}
              >
                COMPLETED
              </span>
            </div>
          )}
          <div className="text-xs mt-1" style={{ color: C.text2 }}>
            {isCurrent ? "until epoch ends" : `${selectedEpoch.winners} winners`}
          </div>
        </div>
        <div className="fade-item katana-card p-4">
          <div className="label-upper mb-2 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Submissions
          </div>
          <div className="stat-value text-xl font-bold" style={{ color: C.text1 }}>{selectedEpoch.totalSubmissions}</div>
          <div className="text-xs mt-1" style={{ color: C.text2 }}>{selectedEpoch.qualifiedFactors} qualified</div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 p-1 rounded-2xl w-fit" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
        <button
          className="h-8 text-xs px-4 rounded-xl font-medium transition-all duration-250"
          style={{
            backgroundColor: viewMode === "factor" ? C.primaryDim : "transparent",
            color: viewMode === "factor" ? C.primaryLight : C.text2,
            border: viewMode === "factor" ? `1px solid ${C.primaryBorder}` : "1px solid transparent",
          }}
          onClick={() => setViewMode("factor")}
        >
          By Factor
        </button>
        <button
          className="h-8 text-xs px-4 rounded-xl font-medium transition-all duration-250"
          style={{
            backgroundColor: viewMode === "user" ? C.primaryDim : "transparent",
            color: viewMode === "user" ? C.primaryLight : C.text2,
            border: viewMode === "user" ? `1px solid ${C.primaryBorder}` : "1px solid transparent",
          }}
          onClick={() => setViewMode("user")}
        >
          By User
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="katana-card overflow-hidden">
        {viewMode === "factor" ? (
          <div key={`factor-${selectedEpochId}`}>
            <Table>
              <TableHeader>
                <TableRow style={{ borderColor: C.border }}>
                  <TableHead className="label-upper w-[60px]">Rank</TableHead>
                  <TableHead className="label-upper">User</TableHead>
                  <TableHead className="label-upper">Factor</TableHead>
                  <TableHead className="label-upper">Market</TableHead>
                  <TableHead className="label-upper text-right">OS Sharpe</TableHead>
                  <TableHead className="label-upper text-right">OS Fitness</TableHead>
                  <TableHead className="label-upper text-right">Returns</TableHead>
                  <TableHead className="label-upper text-right">Score</TableHead>
                  <TableHead className="label-upper text-right">Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factorData.map((entry) => (
                  <TableRow
                    key={entry.factorId}
                    className="transition-all duration-200"
                    style={{
                      borderColor: C.borderWeak,
                      backgroundColor: entry.rank <= 3 ? C.primaryDim : "transparent",
                    }}
                  >
                    <TableCell>{rankBadge(entry.rank)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono"
                          style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.text2 }}
                        >
                          {entry.avatar}
                        </div>
                        <span className="text-sm font-medium" style={{ color: C.text1 }}>{entry.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" style={{ color: C.text1 }}>{entry.factorName}</span>
                      <span className="text-[10px] font-mono ml-2" style={{ color: C.text3 }}>{entry.factorId}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em]"
                        style={{
                          backgroundColor: entry.market === "CEX" ? C.primaryDim : "rgba(162,104,255,0.10)",
                          color: entry.market === "CEX" ? C.primaryLight : C.purple,
                          border: `1px solid ${entry.market === "CEX" ? C.primaryBorder : "rgba(162,104,255,0.25)"}`,
                        }}
                      >
                        {entry.market}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm" style={{
                        color: entry.osSharpe >= 1 ? C.success : entry.osSharpe >= 0.5 ? C.orange : C.danger
                      }}>
                        {entry.osSharpe.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm" style={{ color: C.text1 }}>{entry.osFitness.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-mono text-sm" style={{ color: C.text1 }}>{entry.osReturns}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm font-bold" style={{ color: C.success }}>{entry.compositeScore.toFixed(1)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm" style={{ color: C.gold }}>{entry.reward}</span>
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
                <TableRow style={{ borderColor: C.border }}>
                  <TableHead className="label-upper w-[60px]">Rank</TableHead>
                  <TableHead className="label-upper">User</TableHead>
                  <TableHead className="label-upper text-right">Total Factors</TableHead>
                  <TableHead className="label-upper text-right">Qualified</TableHead>
                  <TableHead className="label-upper text-right">Avg OS Sharpe</TableHead>
                  <TableHead className="label-upper">Top Factor</TableHead>
                  <TableHead className="label-upper text-right">Total Reward</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userData.map((entry) => (
                  <TableRow
                    key={entry.userId}
                    className="transition-all duration-200"
                    style={{
                      borderColor: C.borderWeak,
                      backgroundColor: entry.rank <= 3 ? C.primaryDim : "transparent",
                    }}
                  >
                    <TableCell>{rankBadge(entry.rank)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono"
                          style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.text2 }}
                        >
                          {entry.avatar}
                        </div>
                        <span className="text-sm font-medium" style={{ color: C.text1 }}>{entry.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm" style={{ color: C.text1 }}>{entry.totalFactors}</TableCell>
                    <TableCell className="text-right font-mono text-sm" style={{ color: C.success }}>{entry.qualifiedFactors}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm" style={{
                        color: entry.avgOsSharpe >= 1 ? C.success : entry.avgOsSharpe >= 0.5 ? C.orange : C.danger
                      }}>
                        {entry.avgOsSharpe.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm" style={{ color: C.text1 }}>{entry.topFactor}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-mono text-sm font-bold" style={{ color: C.gold }}>{entry.totalReward}</span>
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

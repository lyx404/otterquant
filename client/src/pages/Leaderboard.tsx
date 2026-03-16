/*
 * Leaderboard - Epoch-based ranking page
 * Every 3 days, fixed prize pool, ranked by OS composite score
 * Two tabs: Factor Ranking & User Ranking
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import {
  Trophy,
  Clock,
  Award,
  Users,
  TrendingUp,
  ChevronRight,
  Flame,
} from "lucide-react";
import {
  currentEpoch,
  previousEpochs,
  leaderboardByFactor,
  leaderboardByUser,
} from "@/lib/mockData";
import { motion } from "framer-motion";

const TROPHY_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/leaderboard-trophy-9A9Q5D9KsgD8YnPGnwC2ga.webp";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg font-bold text-neon-amber glow-green">🥇</span>;
  if (rank === 2) return <span className="text-lg font-bold text-gray-300">🥈</span>;
  if (rank === 3) return <span className="text-lg font-bold text-amber-600">🥉</span>;
  return <span className="text-sm font-mono text-muted-foreground w-6 text-center inline-block">{rank}</span>;
}

export default function Leaderboard() {
  const [tab, setTab] = useState("factors");

  return (
    <div className="space-y-6">
      {/* Header with Trophy */}
      <div className="flex items-start gap-6">
        <div className="hidden lg:block w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-border">
          <img src={TROPHY_IMG} alt="Trophy" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-neon-amber" />
            Leaderboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ranked by OS (Out-of-Sample) performance. Rewards distributed every 3 days to qualified factors.
          </p>
        </div>
      </div>

      {/* Current Epoch Banner */}
      <Card className="terminal-card border-neon-amber/20 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Epoch Info */}
            <div className="flex-1 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-neon-amber" />
                <span className="text-sm font-heading font-semibold text-neon-amber">Current Epoch</span>
                <span className="font-mono text-xs text-muted-foreground">{currentEpoch.id}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Prize Pool</div>
                  <div className="text-xl font-mono font-bold text-neon-green glow-green">{currentEpoch.totalPool}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Time Remaining</div>
                  <div className="text-xl font-mono font-bold text-neon-red">{currentEpoch.timeRemaining}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Qualified</div>
                  <div className="text-xl font-mono font-bold">{currentEpoch.qualifiedFactors}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Submissions</div>
                  <div className="text-xl font-mono font-bold">{currentEpoch.totalSubmissions}</div>
                </div>
              </div>
            </div>
            {/* Period Info */}
            <div className="border-t md:border-t-0 md:border-l border-border p-5 md:w-[280px] bg-secondary/20">
              <div className="text-xs text-muted-foreground mb-2">Period</div>
              <div className="font-mono text-sm mb-3">{currentEpoch.startDate} → {currentEpoch.endDate}</div>
              <div className="text-xs text-muted-foreground mb-2">Qualification Criteria</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1"><span className="text-neon-green">●</span> Pass all IS tests</li>
                <li className="flex items-center gap-1"><span className="text-neon-green">●</span> OS Sharpe &gt; 0</li>
                <li className="flex items-center gap-1"><span className="text-neon-green">●</span> OS Fitness &gt; 0</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Previous Epochs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Previous:</span>
        {previousEpochs.map((ep) => (
          <div key={ep.id} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/30 border border-border text-xs whitespace-nowrap">
            <span className="font-mono text-muted-foreground">{ep.id}</span>
            <span className="text-neon-green">{ep.winners} winners</span>
            <Badge variant="outline" className="text-[10px] bg-neon-green/10 text-neon-green border-neon-green/20">
              Distributed
            </Badge>
          </div>
        ))}
      </div>

      {/* Ranking Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary/50 border border-border">
          <TabsTrigger value="factors" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
            <TrendingUp className="w-3 h-3" />
            Factor Ranking
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
            <Users className="w-3 h-3" />
            User Ranking
          </TabsTrigger>
        </TabsList>

        {/* Factor Ranking */}
        <TabsContent value="factors">
          <Card className="terminal-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-12">Rank</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">User</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Factor</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Market</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-neon-cyan">OS Sharpe</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-neon-cyan">OS Fitness</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-neon-cyan">OS Returns</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-neon-amber">Score</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-neon-green">Reward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardByFactor.map((entry, i) => (
                    <motion.tr
                      key={entry.factorId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`border-border hover:bg-secondary/30 transition-colors ${i < 3 ? "bg-neon-amber/[0.02]" : ""}`}
                    >
                      <TableCell><RankBadge rank={entry.rank} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-mono font-bold text-neon-cyan">
                            {entry.avatar}
                          </div>
                          <span className="text-sm font-medium">{entry.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{entry.factorName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${entry.market === "CEX" ? "border-neon-cyan/30 text-neon-cyan" : "border-neon-purple/30 text-neon-purple"}`}>
                          {entry.market}
                        </Badge>
                      </TableCell>
                      <TableCell className={`font-mono text-sm ${entry.osSharpe >= 1 ? "text-neon-green" : "text-foreground"}`}>
                        {entry.osSharpe.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{entry.osFitness.toFixed(2)}</TableCell>
                      <TableCell className="font-mono text-sm text-neon-green">{entry.osReturns}</TableCell>
                      <TableCell className="font-mono text-sm font-bold text-neon-amber">{entry.compositeScore.toFixed(1)}</TableCell>
                      <TableCell className="font-mono text-sm font-bold text-neon-green glow-green">{entry.reward}</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Ranking */}
        <TabsContent value="users">
          <Card className="terminal-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-12">Rank</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">User</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Total Factors</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-neon-green">Qualified</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-neon-cyan">Avg OS Sharpe</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Top Factor</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-neon-green">Total Reward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardByUser.map((entry, i) => (
                    <motion.tr
                      key={entry.userId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`border-border hover:bg-secondary/30 transition-colors ${i < 3 ? "bg-neon-amber/[0.02]" : ""}`}
                    >
                      <TableCell><RankBadge rank={entry.rank} /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-mono font-bold text-neon-cyan">
                            {entry.avatar}
                          </div>
                          <span className="text-sm font-medium">{entry.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{entry.totalFactors}</TableCell>
                      <TableCell className="font-mono text-sm text-neon-green">{entry.qualifiedFactors}</TableCell>
                      <TableCell className={`font-mono text-sm ${entry.avgOsSharpe >= 1 ? "text-neon-green" : "text-foreground"}`}>
                        {entry.avgOsSharpe.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.topFactor}</TableCell>
                      <TableCell className="font-mono text-sm font-bold text-neon-green glow-green">{entry.totalReward}</TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scoring Methodology */}
      <Card className="terminal-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <Award className="w-4 h-4 text-neon-amber" />
            Scoring Methodology
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-xs text-muted-foreground">
            <div>
              <p className="mb-2 text-foreground font-medium">Composite Score Formula</p>
              <code className="block bg-secondary/50 p-3 rounded-md font-mono text-neon-cyan text-xs leading-relaxed">
                Score = 0.40 × norm(OS_Sharpe)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ 0.25 × norm(OS_Fitness)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ 0.20 × norm(OS_Returns)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;+ 0.15 × norm(1 / OS_Drawdown)
              </code>
            </div>
            <div>
              <p className="mb-2 text-foreground font-medium">Reward Distribution</p>
              <p className="leading-relaxed">
                Rewards are distributed proportionally based on each qualified factor's composite score.
                Only factors that pass all IS tests and have positive OS Sharpe and OS Fitness are eligible.
                The prize pool is fixed at <span className="text-neon-green font-mono">5,000 USDT</span> per epoch (3 days).
              </p>
              <p className="mt-2 leading-relaxed">
                <span className="text-foreground font-medium">Reward<sub>i</sub></span> = Pool × (Score<sub>i</sub> / Σ Score<sub>all</sub>)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

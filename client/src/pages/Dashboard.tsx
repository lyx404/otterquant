/*
 * Dashboard - Terminal Noir
 * Hero stats bar + recent activity + quick links
 * Large mono numbers, neon accents, data-dense layout
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  FlaskConical,
  TrendingUp,
  Trophy,
  Activity,
  Plus,
  CheckCircle,
  XCircle,
  Award,
  Users,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { dashboardStats, recentActivity, currentEpoch } from "@/lib/mockData";
import { motion } from "framer-motion";

const statCards = [
  { label: "Total Factors", value: dashboardStats.totalFactors.toString(), sub: `${dashboardStats.activeFactors} active`, icon: FlaskConical, color: "text-neon-cyan" },
  { label: "Avg Sharpe (OS)", value: dashboardStats.avgSharpe.toFixed(2), sub: "Out-of-Sample", icon: TrendingUp, color: "text-neon-green" },
  { label: "Total PnL", value: dashboardStats.totalPnL, sub: "All time", icon: Activity, color: "text-neon-green" },
  { label: "Pass Rate", value: dashboardStats.passRate, sub: `${dashboardStats.activeFactors}/${dashboardStats.totalFactors}`, icon: CheckCircle, color: "text-neon-amber" },
  { label: "Active Trades", value: dashboardStats.activeTrades.toString(), sub: "Running now", icon: Zap, color: "text-neon-cyan" },
  { label: "Subscribers", value: dashboardStats.subscriberCount.toLocaleString(), sub: "Platform total", icon: Users, color: "text-neon-purple" },
];

const iconMap: Record<string, React.ReactNode> = {
  plus: <Plus className="w-4 h-4" />,
  check: <CheckCircle className="w-4 h-4 text-neon-green" />,
  trophy: <Award className="w-4 h-4 text-neon-amber" />,
  activity: <Activity className="w-4 h-4 text-neon-cyan" />,
  x: <XCircle className="w-4 h-4 text-neon-red" />,
  user: <Users className="w-4 h-4 text-neon-purple" />,
};

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI Factor Mining Platform Overview
          </p>
        </div>
        <Link href="/alphas">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
            <Plus className="w-4 h-4" />
            New Factor
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <Card className="terminal-card border-border hover:border-glow-green transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                  <div className={`text-2xl font-mono font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stat.sub}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="terminal-card lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Activity className="w-4 h-4 text-neon-cyan" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentActivity.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-md hover:bg-secondary/50 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    {iconMap[item.icon]}
                  </div>
                  <span className="text-sm text-foreground flex-1 truncate">
                    {item.message}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.time}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Epoch Card */}
        <Card className="terminal-card border-neon-amber/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Trophy className="w-4 h-4 text-neon-amber" />
              Current Epoch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Epoch</span>
              <span className="text-sm font-mono text-neon-amber">{currentEpoch.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Prize Pool</span>
              <span className="text-lg font-mono font-bold text-neon-green glow-green">
                {currentEpoch.totalPool}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Time Left</span>
              <span className="text-sm font-mono text-neon-red">{currentEpoch.timeRemaining}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Qualified</span>
              <span className="text-sm font-mono">{currentEpoch.qualifiedFactors} / {currentEpoch.totalSubmissions}</span>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">
                Ranking by OS (Out-of-Sample) performance. Rewards distributed proportionally to composite score.
              </p>
              <Link href="/leaderboard">
                <Button variant="outline" className="w-full gap-2 border-neon-amber/30 text-neon-amber hover:bg-neon-amber/10">
                  View Leaderboard
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>

            {/* Quick Links */}
            <div className="pt-4 border-t border-border space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Quick Links</p>
              <Link href="/strategies">
                <div className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-secondary/50 transition-colors text-sm text-foreground">
                  <ArrowUpRight className="w-3 h-3 text-neon-cyan" />
                  Strategy Marketplace
                </div>
              </Link>
              <Link href="/trading">
                <div className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-secondary/50 transition-colors text-sm text-foreground">
                  <ArrowUpRight className="w-3 h-3 text-neon-cyan" />
                  Connect Exchange
                </div>
              </Link>
              <Link href="/subscription">
                <div className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-secondary/50 transition-colors text-sm text-foreground">
                  <ArrowUpRight className="w-3 h-3 text-neon-cyan" />
                  Manage Subscription
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

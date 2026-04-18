import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { strategies } from "@/lib/mockData";
import {
  tradeBots,
  tradePositionRows,
  formatSigned,
  type TradeEnvironment,
  type BotStatus,
} from "@/lib/tradeData";
import { getTradeBotsWithDeployments } from "@/lib/tradeDeployments";
import {
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

type PendingAction =
  | { type: "stop"; botId: string }
  | { type: "delete"; botId: string }
  | null;

export default function Trade() {
  const search = useSearch();
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const envFromQuery = searchParams.get("env");
  const focusStrategyId = searchParams.get("focusStrategy");
  const focusTradeId = searchParams.get("focusTradeId");

  const [environment, setEnvironment] = useState<TradeEnvironment>(
    envFromQuery === "live" ? "live" : "paper"
  );
  const [lastSyncAt, setLastSyncAt] = useState("13:22:00");
  const [focusedBotId, setFocusedBotId] = useState<string | null>(null);
  const [hiddenBotIds, setHiddenBotIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const allTradeBots = useMemo(() => getTradeBotsWithDeployments(tradeBots), []);
  const [statusById, setStatusById] = useState<Record<string, BotStatus>>(() =>
    Object.fromEntries(allTradeBots.map((bot, index) => [bot.id, index % 4 === 1 ? "paused" : "running"]))
  );

  useEffect(() => {
    if (envFromQuery === "paper" || envFromQuery === "live") {
      setEnvironment(envFromQuery);
    }
  }, [envFromQuery]);

  const visibleBots = useMemo(
    () =>
      allTradeBots
        .filter((bot) => bot.environment === environment)
        .filter((bot) => !hiddenBotIds.has(bot.id))
        .map((bot) => ({ ...bot, status: statusById[bot.id] ?? "running" })),
    [allTradeBots, environment, hiddenBotIds, statusById]
  );
  const visiblePositions = useMemo(
    () => tradePositionRows.filter((row) => row.environment === environment),
    [environment]
  );
  const summary = useMemo(() => {
    const activeBots = visibleBots.filter((bot) => bot.status === "running").length;
    const totalEquity = visibleBots.reduce((acc, bot) => acc + bot.equity, 0);
    const totalUnrealized = visiblePositions.reduce((acc, row) => acc + row.pnl, 0);
    const avgWinRate =
      visibleBots.length > 0
        ? visibleBots.reduce((acc, bot) => acc + bot.winRate, 0) / visibleBots.length
        : 0;

    return { activeBots, totalEquity, totalUnrealized, avgWinRate };
  }, [visibleBots, visiblePositions]);

  const stopBot = (botId: string) => {
    setStatusById((prev) => ({ ...prev, [botId]: "paused" }));
    toast.success("Trading bot stopped");
  };

  const deleteBot = (botId: string) => {
    setHiddenBotIds((prev) => {
      const next = new Set(prev);
      next.add(botId);
      return next;
    });
    toast.success("Trading bot deleted");
  };

  const resolveStrategyHref = (bot: (typeof visibleBots)[number]) => {
    if (bot.strategyId) return `/strategies/${bot.strategyId}`;
    const matched = strategies.find((item) => item.name === bot.name);
    if (matched) return `/strategies/${matched.id}`;
    return `/strategies/${bot.id}?name=${encodeURIComponent(bot.name)}`;
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    if (pendingAction.type === "stop") {
      stopBot(pendingAction.botId);
    } else {
      deleteBot(pendingAction.botId);
    }
    setPendingAction(null);
  };

  const syncNow = () => {
    const now = new Date();
    const time = now.toTimeString().slice(0, 8);
    setLastSyncAt(time);
    toast.success("Trade state synced");
  };

  useEffect(() => {
    if (!focusStrategyId && !focusTradeId) return;
    const target = visibleBots.find((bot) => {
      if (focusTradeId) return bot.id === focusTradeId;
      return bot.strategyId === focusStrategyId;
    });
    if (!target) return;
    const element = document.getElementById(`trade-bot-${target.id}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setFocusedBotId(target.id);
    const timer = window.setTimeout(() => setFocusedBotId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [focusStrategyId, focusTradeId, visibleBots]);

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-foreground">Trade</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage paper trading and live trading bots in one workspace.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-8 rounded-full border-border bg-card px-3 text-xs"
            onClick={syncNow}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Sync
          </Button>
        </div>
      </div>

      <div className="inline-flex h-9 items-center rounded-xl border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setEnvironment("paper")}
          className={`inline-flex h-7 items-center rounded-lg px-3 text-xs font-medium transition-colors ${
            environment === "paper"
              ? "bg-primary/12 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Paper Trading
        </button>
        <button
          type="button"
          onClick={() => setEnvironment("live")}
          className={`ml-1 inline-flex h-7 items-center rounded-lg px-3 text-xs font-medium transition-colors ${
            environment === "live"
              ? "bg-primary/12 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Live Trading
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="surface-card h-[105px] border border-border px-6 py-5">
          <div className="mb-2 flex items-center gap-2 label-upper text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
            Active Bots
          </div>
          <p className="stat-value text-2xl font-bold text-foreground">{summary.activeBots}</p>
        </div>

        <div className="surface-card h-[105px] border border-border px-6 py-5">
          <div className="mb-2 flex items-center gap-2 label-upper text-muted-foreground">
            <ArrowUpRight className="h-3.5 w-3.5 text-sky-400" />
            Total Equity
          </div>
          <p className="stat-value text-2xl font-bold text-foreground">
            {summary.totalEquity.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="surface-card h-[105px] border border-border px-6 py-5">
          <div className="mb-2 flex items-center gap-2 label-upper text-muted-foreground">
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
            Unrealized PnL
          </div>
          <p
            className={`stat-value text-2xl font-bold ${
              summary.totalUnrealized >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatSigned(summary.totalUnrealized)}
          </p>
        </div>

        <div className="surface-card h-[105px] border border-border px-6 py-5">
          <div className="mb-2 flex items-center gap-2 label-upper text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            Avg Win Rate
          </div>
          <p className="stat-value text-2xl font-bold text-indigo-300">
            {summary.avgWinRate.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="surface-card overflow-hidden border border-border/70">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-3">
          <div className="text-sm font-semibold text-foreground">Trading Bots</div>
          <div className="text-xs text-muted-foreground">Last synced: {lastSyncAt}</div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-4">
          {visibleBots.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-background/30 px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">No trading bots in this environment.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create or deploy a strategy in Strategy workspace first.
              </p>
              <div className="mt-4 flex justify-center">
                <Link href="/strategies">
                  <Button variant="outline" className="h-8 rounded-full border-border bg-card px-3 text-xs">
                    Go to Strategy
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            visibleBots.map((bot) => (
              <div
                key={bot.id}
                id={`trade-bot-${bot.id}`}
                className={`rounded-2xl border bg-background/35 p-4 transition-all ${
                  focusedBotId === bot.id
                    ? "border-primary/55 ring-1 ring-primary/35"
                    : "border-border/60"
                }`}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={resolveStrategyHref(bot)}>
                        <div className="text-sm font-semibold text-foreground transition-colors hover:text-primary cursor-pointer">
                          {bot.name}
                        </div>
                      </Link>
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                          bot.status === "running"
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                            : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {bot.status === "running" ? "running" : "stopped"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {bot.id} · {bot.symbol} · {bot.market} · {bot.leverage}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Equity
                    </div>
                    <div className="mt-1 text-xs font-semibold text-foreground">
                      {bot.equity.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      UPNL
                    </div>
                    <div
                      className={`mt-1 text-xs font-semibold ${
                        bot.unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatSigned(bot.unrealizedPnl)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      Win Rate
                    </div>
                    <div className="mt-1 text-xs font-semibold text-indigo-300">
                      {bot.winRate.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">Updated {bot.updatedAt}</div>
                  <div className="flex items-center gap-2">
                    <Link href={`/trade/${bot.id}?env=${bot.environment}&status=${bot.status}`}>
                      <Button
                        variant="outline"
                        className="h-8 rounded-full border-border bg-card px-3 text-xs"
                      >
                        Details
                      </Button>
                    </Link>
                    {bot.status === "running" ? (
                      <Button
                        variant="outline"
                        className="h-8 rounded-full border-border bg-card px-3 text-xs"
                        onClick={() => setPendingAction({ type: "stop", botId: bot.id })}
                      >
                        Stop
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="h-8 rounded-full border-border bg-card px-3 text-xs text-destructive hover:text-destructive"
                        onClick={() => setPendingAction({ type: "delete", botId: bot.id })}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AlertDialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "stop" ? "Stop Trading Bot" : "Delete Trading Bot"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "stop"
                ? "Are you sure you want to stop this bot? Open positions and bot settings will be kept for future resume."
                : "Are you sure you want to delete this stopped bot from the workspace? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPendingAction}>
              {pendingAction?.type === "stop" ? "Confirm Stop" : "Confirm Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

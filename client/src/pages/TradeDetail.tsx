import { useMemo, type ComponentType } from "react";
import { Link, useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatSigned,
  tradeBots,
  tradeFillRows,
  tradePositionRows,
  type FillRow,
  type TradeEnvironment,
} from "@/lib/tradeData";
import {
  ArrowLeft,
  ClipboardList,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

function isTradeEnvironment(value: string | null): value is TradeEnvironment {
  return value === "paper" || value === "live";
}

export default function TradeDetail() {
  const params = useParams<{ id: string }>();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const tradeId = params?.id ?? "";
  const trade = tradeBots.find((item) => item.id === tradeId);

  if (!trade) {
    return (
      <div className="space-y-6 min-w-0">
        <div className="surface-card border border-border/70 p-6">
          <p className="text-lg font-semibold text-foreground">Trade bot not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The selected trade id does not exist in the current workspace.
          </p>
          <Link href="/trade">
            <Button className="mt-4 h-8 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90">
              Back to Trade
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const envFromQuery = searchParams.get("env");
  const runtimeEnvironment = isTradeEnvironment(envFromQuery) ? envFromQuery : trade.environment;
  const statusFromQuery = searchParams.get("status");
  const runtimeStatus = statusFromQuery === "paused" ? "paused" : "running";

  const visiblePositions = tradePositionRows.filter(
    (row) => row.environment === runtimeEnvironment
  );
  const visibleFills = tradeFillRows.filter(
    (row) => row.environment === runtimeEnvironment
  );

  const realizedPnl = Number((trade.unrealizedPnl * 2.65).toFixed(2));
  const totalPnl = realizedPnl + trade.unrealizedPnl;
  const baseEquity = Math.max(trade.equity - totalPnl, 1);
  const roi = (totalPnl / baseEquity) * 100;
  const estimatedSharpe = Number((0.45 + trade.winRate / 32).toFixed(2));
  const maxDrawdown = Number((3.5 + (100 - trade.winRate) * 0.23).toFixed(2));
  const totalTrades = visibleFills.length * 27;
  const notionalTurnover = visibleFills.reduce((acc, row) => {
    const next = Number(row.value.replace(/,/g, "").replace(" USDT", ""));
    return acc + (Number.isFinite(next) ? next : 0);
  }, 0);
  const usedMargin = visiblePositions.reduce((acc, row) => {
    const next = Number(row.margin.replace(/,/g, "").replace(" USDT", ""));
    return acc + (Number.isFinite(next) ? next : 0);
  }, 0);
  const availableBalance = Math.max(trade.equity - usedMargin, 0);
  const makerTakerFee = Number((notionalTurnover * 0.00045).toFixed(2));
  const profitFactor = Number((1 + trade.winRate / 100).toFixed(2));
  const avgSlippageBps = Number((1.8 + visibleFills.length * 0.35).toFixed(2));

  const executionRows = useMemo(
    () =>
      visibleFills.map((row) => ({
        ...row,
        side: row.action,
        notional: row.value,
      })),
    [visibleFills]
  );

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href="/trade">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 rounded-full text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          </Link>
          <h1 className="mt-3 text-foreground">{trade.name}</h1>
          <p className="mt-1 text-xs font-mono text-muted-foreground">
            Trade ID: {trade.id} &middot; Symbol: {trade.symbol} &middot; Updated: {trade.updatedAt}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] ${
                runtimeEnvironment === "paper"
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {runtimeEnvironment === "paper" ? "Paper Execution" : "Live Execution"}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] ${
                runtimeStatus === "running"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}
            >
              {runtimeStatus}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/70 bg-accent/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {trade.market}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/70 bg-accent/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              {trade.leverage} leverage
            </span>
          </div>
        </div>
      </div>

      <section className="surface-card space-y-6 p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <TopMetric
            label="Total Equity (USDT)"
            value={trade.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          />
          <TopMetric
            label="PnL (USDT)"
            value={formatSigned(totalPnl)}
            tone={totalPnl >= 0 ? "positive" : "negative"}
          />
          <TopMetric
            label="ROI"
            value={`${formatSigned(roi)}%`}
            tone={roi >= 0 ? "positive" : "negative"}
          />
          <TopMetric
            label="Win Rate"
            value={`${trade.winRate.toFixed(2)}%`}
            tone={trade.winRate >= 50 ? "positive" : "neutral"}
          />
          <TopMetric
            label="Sharpe"
            value={estimatedSharpe.toFixed(2)}
            tone={estimatedSharpe >= 1 ? "positive" : "neutral"}
          />
          <TopMetric
            label="Max Drawdown"
            value={`${maxDrawdown.toFixed(2)}%`}
            tone="negative"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <DetailListCard
            title="Fund Snapshot"
            icon={Wallet}
            rows={[
              {
                label: "Account Equity",
                value: `${trade.equity.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT`,
              },
              {
                label: "Used Margin",
                value: `${usedMargin.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT`,
              },
              {
                label: "Available Balance",
                value: `${availableBalance.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT`,
              },
              {
                label: "Unrealized PnL",
                value: `${formatSigned(trade.unrealizedPnl)} USDT`,
                tone: trade.unrealizedPnl >= 0 ? "positive" : "negative",
              },
            ]}
          />
          <DetailListCard
            title="Performance Metrics"
            icon={TrendingUp}
            rows={[
              { label: "Win Rate", value: `${trade.winRate.toFixed(2)}%`, tone: trade.winRate >= 50 ? "positive" : "negative" },
              { label: "Estimated Sharpe", value: estimatedSharpe.toFixed(2), tone: estimatedSharpe >= 1 ? "positive" : "neutral" },
              { label: "Profit Factor", value: profitFactor.toFixed(2), tone: profitFactor >= 1 ? "positive" : "neutral" },
              { label: "Average Slippage", value: `${avgSlippageBps.toFixed(2)} bps` },
            ]}
          />
          <DetailListCard
            title="Execution Statistics"
            icon={ClipboardList}
            rows={[
              { label: "Open Positions", value: `${visiblePositions.length}` },
              { label: "Filled Orders", value: `${totalTrades}` },
              {
                label: "Notional Turnover",
                value: `${notionalTurnover.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT`,
              },
              {
                label: "Maker/Taker Fee (est.)",
                value: `${makerTakerFee.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USDT`,
              },
            ]}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.25fr_0.95fr]">
        <section className="surface-card p-5">
          <h2 className="text-base font-semibold text-foreground">Open Positions</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
            <Table>
              <TableHeader>
                <TableRow className="border-border/70">
                  <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Symbol</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Side</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Size</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Entry</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Mark</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Margin</TableHead>
                  <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">PnL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePositions.map((row) => (
                  <TableRow key={row.id} className="border-border/70">
                    <TableCell className="font-semibold text-foreground">{row.symbol}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] ${
                          row.side === "long"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {row.side}
                      </span>
                    </TableCell>
                    <TableCell className="data-value text-foreground">{row.size}</TableCell>
                    <TableCell className="data-value text-foreground">{row.entry}</TableCell>
                    <TableCell className="data-value text-foreground">{row.mark}</TableCell>
                    <TableCell className="data-value text-muted-foreground">{row.margin}</TableCell>
                    <TableCell className={`data-value ${row.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatSigned(row.pnl)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-base font-semibold text-foreground">Execution Tape</h2>
          <div className="mt-4 space-y-2">
            {executionRows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border/60 bg-accent/25 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      row.side.includes("Open") ? "bg-emerald-400" : "bg-rose-400"
                    }`}
                  />
                  <span className="font-mono">{row.time}</span>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${
                      row.side.includes("Long")
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/20 text-rose-400"
                    }`}
                  >
                    {row.side}
                  </span>
                </div>
                <div className="mt-2 text-sm text-foreground">
                  <span className="font-semibold text-amber-300">{row.symbol}</span>{" "}
                  <span className="text-muted-foreground">at</span>{" "}
                  <span className="font-mono">{row.price} USDT</span>
                  <span className="text-muted-foreground"> · Qty </span>
                  <span className="font-mono">{row.qty}</span>
                  <span className="text-muted-foreground"> · Notional </span>
                  <span className="font-mono">{row.notional}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold text-foreground">Account Assets</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow className="border-border/70">
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Account</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Environment</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Venue</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Asset</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Total Equity</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Available</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Updated At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-border/70">
                <TableCell className="font-medium text-foreground">{trade.name}</TableCell>
                <TableCell className="text-muted-foreground uppercase">{runtimeEnvironment}</TableCell>
                <TableCell className="text-muted-foreground">{trade.market}</TableCell>
                <TableCell className="font-semibold text-foreground">USDT</TableCell>
                <TableCell className="data-value text-foreground">
                  {trade.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="data-value text-emerald-400">
                  {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{trade.updatedAt}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-base font-semibold text-foreground">Orders</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow className="border-border/70">
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Time</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Symbol</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Side</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Price</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Quantity</TableHead>
                <TableHead className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Notional</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleFills.map((row) => (
                <TableRow key={row.id} className="border-border/70">
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.time}</TableCell>
                  <TableCell className="font-semibold text-foreground">{row.symbol}</TableCell>
                  <TableCell>
                    <ActionBadge action={row.action} />
                  </TableCell>
                  <TableCell className="data-value text-foreground">{row.price}</TableCell>
                  <TableCell className="data-value text-muted-foreground">{row.qty}</TableCell>
                  <TableCell className="data-value text-foreground">{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function TopMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  return (
    <div className="h-full w-full rounded-xl px-2 py-1.5 text-left">
      <div className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-2">
        <div
          className={`stat-value text-[20px] font-semibold leading-none ${
            tone === "positive"
              ? "text-emerald-400"
              : tone === "negative"
                ? "text-rose-400"
                : "text-foreground"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

type SectionRow = {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral";
};

function DetailListCard({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  rows: SectionRow[];
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-accent/35 p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium text-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span
              className={`data-value text-xs font-semibold ${
                row.tone === "positive"
                  ? "text-emerald-400"
                  : row.tone === "negative"
                    ? "text-rose-400"
                    : "text-foreground"
              }`}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: FillRow["action"] }) {
  const isLong = action.includes("Long");
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        isLong
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-rose-500/30 bg-rose-500/10 text-rose-400"
      }`}
    >
      {action}
    </span>
  );
}

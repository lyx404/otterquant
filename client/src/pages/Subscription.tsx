import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Activity,
  CalendarDays,
  Check,
  CreditCard,
  Database,
  History,
  ReceiptText,
  Wallet,
} from "lucide-react";

type UsageSubscriptionState = "before" | "after";

type UsagePlan = {
  id: "basic" | "scale";
  name: string;
  subtitle: string;
  baseCredits: number;
  rate: string;
  cta: string;
  features: string[];
};

type HostingHistoryItem = {
  month: string;
  hostedStrategies: number;
  usageDays: number;
  fee: number;
  status: "paid" | "settled";
};

const usagePlans: UsagePlan[] = [
  {
    id: "basic",
    name: "Usage Basic",
    subtitle: "For early strategy research and AI-assisted setup",
    baseCredits: 0,
    rate: "$0.008 / 1K tokens",
    cta: "Start Usage Billing",
    features: [
      "Pay only for Platform Agent consumption",
      "No fixed monthly software subscription",
      "Token usage dashboard",
      "Monthly usage cap controls",
    ],
  },
  {
    id: "scale",
    name: "Usage Scale",
    subtitle: "For teams running continuous strategy creation",
    baseCredits: 100,
    rate: "$0.006 / 1K tokens",
    cta: "Upgrade Usage Tier",
    features: [
      "Lower unit rate after monthly commitment",
      "Shared team usage pool",
      "Priority execution for batch generation",
      "Detailed invoice export",
    ],
  },
];

const hostingHistory: HostingHistoryItem[] = [
  { month: "2026-04", hostedStrategies: 8, usageDays: 30, fee: 40, status: "paid" },
  { month: "2026-03", hostedStrategies: 7, usageDays: 31, fee: 35, status: "paid" },
  { month: "2026-02", hostedStrategies: 7, usageDays: 28, fee: 35, status: "paid" },
  { month: "2026-01", hostedStrategies: 6, usageDays: 31, fee: 30, status: "paid" },
  { month: "2025-12", hostedStrategies: 6, usageDays: 31, fee: 30, status: "paid" },
  { month: "2025-11", hostedStrategies: 5, usageDays: 30, fee: 25, status: "paid" },
  { month: "2025-10", hostedStrategies: 5, usageDays: 31, fee: 25, status: "paid" },
  { month: "2025-09", hostedStrategies: 4, usageDays: 30, fee: 20, status: "settled" },
  { month: "2025-08", hostedStrategies: 4, usageDays: 31, fee: 20, status: "settled" },
  { month: "2025-07", hostedStrategies: 3, usageDays: 31, fee: 15, status: "settled" },
  { month: "2025-06", hostedStrategies: 3, usageDays: 30, fee: 15, status: "settled" },
  { month: "2025-05", hostedStrategies: 2, usageDays: 31, fee: 10, status: "settled" },
];

function PageSwitcher({ activePage }: { activePage: "usage" | "hosting" }) {
  const items = [
    {
      id: "usage" as const,
      label: "Usage-based Billing",
      href: "/subscription",
      icon: Activity,
    },
    {
      id: "hosting" as const,
      label: "Fixed Hosting Fee",
      href: "/subscription/hosting",
      icon: Database,
    },
  ];

  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-accent/35 p-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === activePage;
        return (
          <Link key={item.id} href={item.href}>
            <button
              type="button"
              className={`h-9 rounded-lg px-3 text-sm font-medium transition-colors inline-flex items-center gap-2 ${
                active
                  ? "border border-primary/35 bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          </Link>
        );
      })}
    </div>
  );
}

function UsageBillingPage() {
  const [subscriptionState, setSubscriptionState] =
    useState<UsageSubscriptionState>("before");
  const [monthlyCap, setMonthlyCap] = useState(300);

  const isSubscribed = subscriptionState === "after";
  const currentUsage = 128.4;
  const remainingCap = Math.max(0, monthlyCap - currentUsage);

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-foreground">Usage-based Billing</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Platform Agent usage is charged by consumption, separate from strategy hosting.
          </p>
        </div>
        <PageSwitcher activePage="usage" />
      </div>

      <section className="surface-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Subscription State</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Preview the experience before activation and after usage billing is enabled.
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background/35 p-1">
            <button
              type="button"
              onClick={() => setSubscriptionState("before")}
              className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${
                !isSubscribed
                  ? "border border-primary/35 bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Before Subscription
            </button>
            <button
              type="button"
              onClick={() => setSubscriptionState("after")}
              className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${
                isSubscribed
                  ? "border border-primary/35 bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              After Subscription
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-border bg-accent/25 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isSubscribed ? "Usage Billing Active" : "Usage Billing Not Activated"}
                </p>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {isSubscribed
                    ? "Your Platform Agent usage is being metered against this month's cap. Token usage and invoices are available here."
                    : "Activate usage-based billing before running paid Platform Agent tasks. No token consumption will be charged until activation."}
                </p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  isSubscribed
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                }`}
              >
                {isSubscribed ? "Active" : "Pending"}
              </span>
            </div>

            {isSubscribed ? (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-background/35 p-4">
                  <p className="text-xs text-muted-foreground">Current Usage</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                    ${currentUsage.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/35 p-4">
                  <p className="text-xs text-muted-foreground">Monthly Cap</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                    ${monthlyCap.toFixed(0)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background/35 p-4">
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className="mt-2 font-mono text-2xl font-semibold text-emerald-400">
                    ${remainingCap.toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-border bg-background/30 p-4">
                <p className="text-sm font-medium text-foreground">No active usage subscription</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose a usage tier below to enable metered Platform Agent billing.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-accent/25 p-5">
            <Label className="label-upper">Monthly Usage Cap</Label>
            <div className="mt-3 flex items-center gap-2">
              <Input
                type="number"
                min={0}
                value={monthlyCap}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setMonthlyCap(Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0);
                }}
                className="h-10"
              />
              <span className="inline-flex h-10 items-center rounded-md border border-border bg-background/35 px-3 text-sm font-medium text-foreground">
                USD
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Usage pauses automatically when the configured monthly cap is reached.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {usagePlans.map((plan) => (
          <article
            key={plan.id}
            className={`rounded-xl border p-5 ${
              plan.id === "scale"
                ? "border-emerald-500/35 bg-emerald-500/8"
                : "border-border bg-accent/25"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-foreground">{plan.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>
              </div>
              {plan.id === "scale" ? (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  Recommended
                </span>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-x-5 gap-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Base Credits</p>
                <p className="mt-1 font-mono text-3xl font-semibold text-foreground">
                  ${plan.baseCredits}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Metered Rate</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{plan.rate}</p>
              </div>
            </div>

            <ul className="mt-5 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className={`mt-6 h-10 w-full rounded-lg text-sm font-medium ${
                isSubscribed
                  ? "bg-accent text-foreground hover:bg-accent/80"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
              onClick={() => {
                setSubscriptionState("after");
                toast.success("Usage-based billing activated.");
              }}
              disabled={isSubscribed && plan.id === "basic"}
            >
              {isSubscribed && plan.id === "basic" ? "Current Usage Tier" : plan.cta}
            </Button>
          </article>
        ))}
      </section>
    </div>
  );
}

function FixedHostingFeePage() {
  const [hostedStrategyCount, setHostedStrategyCount] = useState(8);
  const [hostingBalance, setHostingBalance] = useState(75);
  const [topUpAmount, setTopUpAmount] = useState(25);

  const hostingFeePerStrategy = 5;
  const monthlyHostingFee = hostedStrategyCount * hostingFeePerStrategy;
  const availableDays =
    monthlyHostingFee > 0
      ? Math.floor((hostingBalance / monthlyHostingFee) * 30)
      : 0;
  const annualTotal = useMemo(
    () => hostingHistory.reduce((sum, item) => sum + item.fee, 0),
    []
  );

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-foreground">Fixed Hosting Fee</h1>
          <p className="mt-2 text-base text-muted-foreground">
            Strategy hosting is charged by hosted strategy count and tracked month by month.
          </p>
        </div>
        <PageSwitcher activePage="hosting" />
      </div>

      <section className="surface-card p-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-accent/25 p-4 space-y-3">
            <Label className="label-upper">Hosted Strategy Count</Label>
            <Input
              type="number"
              min={0}
              value={hostedStrategyCount}
              onChange={(event) => {
                const next = Number(event.target.value);
                setHostedStrategyCount(Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Pricing rule: 1 strategy = 5 USDT, 2 = 10 USDT, 3 = 15 USDT.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-accent/25 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              Estimated Monthly Hosting Fee
            </div>
            <p className="mt-2 font-mono text-3xl font-semibold text-foreground">
              {monthlyHostingFee.toFixed(2)} USDT
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Current balance supports about <span className="font-medium text-foreground">{availableDays}</span> days.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-accent/25 p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Wallet className="h-4 w-4" />
              Hosting Balance
            </div>
            <p className="mt-2 font-mono text-3xl font-semibold text-foreground">
              {hostingBalance.toFixed(2)} USDT
            </p>
            <p className={`mt-2 text-xs ${hostingBalance >= monthlyHostingFee ? "text-emerald-400" : "text-rose-400"}`}>
              {hostingBalance >= monthlyHostingFee
                ? "Sufficient for next billing cycle"
                : "Insufficient balance for next billing cycle"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-accent/15 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {[10, 25, 50, 100, 200].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setTopUpAmount(amount)}
                className={`h-8 rounded-lg px-3 text-xs font-medium transition-colors ${
                  topUpAmount === amount
                    ? "border border-primary/30 bg-primary/12 text-primary"
                    : "border border-border bg-background/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                +{amount} USDT
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-52">
              <Input
                type="number"
                min={1}
                value={topUpAmount}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setTopUpAmount(Number.isFinite(next) ? Math.max(1, Math.floor(next)) : 1);
                }}
              />
            </div>
            <Button
              className="h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                setHostingBalance((prev) => prev + topUpAmount);
                toast.success(`Hosting balance topped up by ${topUpAmount} USDT`);
              }}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Top Up Hosting Balance
            </Button>
          </div>
        </div>
      </section>

      <section className="surface-card p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Hosting Fee History</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Last 12 months of hosted strategy records and fixed hosting fees.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-accent/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">12-month total</p>
            <p className="font-mono text-lg font-semibold text-foreground">
              {annualTotal.toFixed(2)} USDT
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_0.8fr] gap-3 border-b border-border bg-accent/35 px-4 py-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              <span>Month</span>
              <span>Hosted Records</span>
              <span>Usage Days</span>
              <span>Fee</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-border/70">
              {hostingHistory.map((item) => (
                <div
                  key={item.month}
                  className="grid grid-cols-[1fr_1fr_1fr_1fr_0.8fr] gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-medium text-foreground">{item.month}</span>
                  <span className="text-muted-foreground">
                    {item.hostedStrategies} strategies
                  </span>
                  <span className="text-muted-foreground">{item.usageDays} days</span>
                  <span className="font-mono font-semibold text-foreground">
                    {item.fee.toFixed(2)} USDT
                  </span>
                  <span
                    className={`w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${
                      item.status === "paid"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-border bg-accent/40 text-muted-foreground"
                    }`}
                  >
                    {item.status === "paid" ? "Paid" : "Settled"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-accent/20 p-4 text-sm text-muted-foreground">
          <ReceiptText className="h-4 w-4 shrink-0 text-primary" />
          Monthly records are retained for 12 months and include each month's hosted strategy count and charged fee.
        </div>
      </section>
    </div>
  );
}

export default function Subscription() {
  const [location] = useLocation();
  const isHostingPage = location === "/subscription/hosting";

  return isHostingPage ? <FixedHostingFeePage /> : <UsageBillingPage />;
}

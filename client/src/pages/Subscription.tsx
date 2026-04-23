import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Gem, Sparkles, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type BillingCycle = "monthly" | "annual";

type Plan = {
  id: "starter" | "pro" | "expert";
  name: string;
  subtitle: string;
  monthlyPrice: number;
  featured?: boolean;
  highlight?: boolean;
  cta: string;
  features: string[];
};

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    subtitle: "Single-exchange spot strategy automation",
    monthlyPrice: 5,
    cta: "Current Plan",
    features: [
      "Usage-based billing enabled",
      "1 active API key",
      "5 hosted strategies",
      "Basic monitoring dashboard",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    subtitle: "Multi-exchange spot & perpetual trading",
    monthlyPrice: 15,
    featured: true,
    cta: "Continue with Pro",
    features: [
      "Everything in Starter",
      "3 active API keys",
      "20 hosted strategies",
      "Advanced performance analytics",
      "Priority support",
    ],
  },
  {
    id: "expert",
    name: "Expert",
    subtitle: "Institutional-grade API & execution stack",
    monthlyPrice: 49,
    highlight: true,
    cta: "Upgrade to Expert",
    features: [
      "Everything in Pro",
      "15 active API keys",
      "1,000 hosted strategies",
      "Dedicated execution endpoints",
      "Realtime support SLA",
    ],
  },
];

export default function Subscription() {
  const [cycle, setCycle] = useState<BillingCycle>("annual");
  const [hostedStrategyCount, setHostedStrategyCount] = useState(2);
  const [hostingBalance, setHostingBalance] = useState(30);
  const [topUpAmount, setTopUpAmount] = useState(10);

  const cycleLabel = cycle === "annual" ? "year" : "month";
  const annualDiscount = 0.25;
  const hostingFeePerStrategy = 5;
  const monthlyHostingFee = hostedStrategyCount * hostingFeePerStrategy;
  const availableDays =
    monthlyHostingFee > 0
      ? Math.floor((hostingBalance / monthlyHostingFee) * 30)
      : 0;

  const displayPlans = useMemo(
    () =>
      plans.map((plan) => {
        const billed = cycle === "annual" ? plan.monthlyPrice * (1 - annualDiscount) : plan.monthlyPrice;
        const annualTotal = plan.monthlyPrice * 12 * (1 - annualDiscount);
        return {
          ...plan,
          billed: Number(billed.toFixed(2)),
          annualTotal: Number(annualTotal.toFixed(2)),
        };
      }),
    [cycle]
  );

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-foreground">Subscription</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Choose the plan that matches your trading scale and billing preference.
        </p>
      </div>

      <div className="surface-card p-5">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-accent/35 p-1">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              className={`h-8 rounded-lg px-4 text-sm font-medium transition-colors ${
                cycle === "monthly"
                  ? "border border-primary/30 bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("annual")}
              className={`h-8 rounded-lg px-4 text-sm font-medium transition-colors ${
                cycle === "annual"
                  ? "border border-primary/30 bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
            </button>
            <span className="ml-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
              Save up to 25%
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
          {displayPlans.map((plan) => {
            const planIcon =
              plan.id === "starter" ? (
                <Zap className="h-5 w-5 text-muted-foreground" />
              ) : plan.id === "pro" ? (
                <Gem className="h-5 w-5 text-amber-400" />
              ) : (
                <Sparkles className="h-5 w-5 text-violet-300" />
              );

            const cardClass = plan.highlight
              ? "border-teal-400/30 bg-gradient-to-br from-teal-950/90 to-emerald-900/40"
              : plan.featured
                ? "border-amber-500/40 bg-amber-500/5"
                : "border-border bg-accent/25";

            return (
              <article key={plan.id} className={`rounded-2xl border p-6 ${cardClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {planIcon}
                      <h2 className="text-2xl font-semibold text-foreground">{plan.name}</h2>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>
                  </div>
                  {plan.featured ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      Recommended
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-tight text-foreground">${plan.billed}</span>
                  <span className="mb-1 text-lg text-muted-foreground">/{cycleLabel}</span>
                </div>

                {cycle === "annual" ? (
                  <p className="mt-2 text-sm text-emerald-400">Annual billing: ${plan.annualTotal} per year (25% off)</p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Billed monthly, cancel anytime.</p>
                )}

                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`mt-6 h-10 w-full rounded-lg text-sm font-medium ${
                    plan.highlight
                      ? "bg-teal-500 text-black hover:bg-teal-400"
                      : plan.featured
                        ? "bg-amber-500 text-black hover:bg-amber-400"
                        : "bg-accent text-foreground hover:bg-accent/80"
                  }`}
                >
                  {plan.cta}
                </Button>
              </article>
            );
          })}
        </div>
      </div>

      <div className="surface-card p-5">
        <h3 className="text-lg font-semibold text-foreground">Billing Models</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-accent/25 p-4">
            <p className="text-sm font-semibold text-foreground">Usage-based Billing</p>
            <p className="mt-1 text-sm text-muted-foreground">When using Platform Agent, billing is based on token consumption.</p>
          </div>
          <div className="rounded-xl border border-border bg-accent/25 p-4">
            <p className="text-sm font-semibold text-foreground">Fixed Hosting Fee</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Strategy hosting is charged by hosted strategy count. Example: 1 strategy = 5 USDT, 2 = 10 USDT, 3 = 15 USDT.
            </p>
          </div>
        </div>
      </div>

      <div className="surface-card p-5">
        <h3 className="text-lg font-semibold text-foreground">Hosting Fee Wallet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Strategy hosting is billed by hosted strategy count at {hostingFeePerStrategy} USDT per strategy per month.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-accent/25 p-4 space-y-3">
            <Label className="label-upper">Hosted Strategy Count</Label>
            <Input
              type="number"
              min={0}
              value={hostedStrategyCount}
              onChange={(e) => {
                const next = Number(e.target.value);
                setHostedStrategyCount(Number.isFinite(next) ? Math.max(0, Math.floor(next)) : 0);
              }}
            />
            <p className="text-xs text-muted-foreground">Pricing rule: 1 strategy = 5 USDT, 2 = 10 USDT, 3 = 15 USDT.</p>
          </div>

          <div className="rounded-xl border border-border bg-accent/25 p-4">
            <p className="text-xs text-muted-foreground">Estimated Monthly Hosting Fee</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-foreground">{monthlyHostingFee.toFixed(2)} USDT</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Current balance supports about <span className="text-foreground font-medium">{availableDays}</span> days.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-accent/25 p-4">
            <p className="text-xs text-muted-foreground">Hosting Balance</p>
            <p className="mt-2 font-mono text-3xl font-semibold text-foreground">{hostingBalance.toFixed(2)} USDT</p>
            <p className={`mt-2 text-xs ${hostingBalance >= monthlyHostingFee ? "text-emerald-400" : "text-rose-400"}`}>
              {hostingBalance >= monthlyHostingFee ? "Sufficient for next billing cycle" : "Insufficient balance for next billing cycle"}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-accent/15 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {[5, 10, 15, 30, 50].map((amount) => (
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
                onChange={(e) => {
                  const next = Number(e.target.value);
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
              Top Up Hosting Balance
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

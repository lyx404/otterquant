import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { toast } from "sonner";
import { CalendarDays, Database } from "lucide-react";

type CreditPackageId = "10" | "20" | "50" | "custom";

type CreditPackage = {
  id: CreditPackageId;
  amount: number | null;
  label: string;
  description: string;
};

type CreditActivityItem = {
  effectiveDate: string;
  expires: string;
  expiresIn: string;
  amount: number;
};

type HostingHistoryItem = {
  month: string;
  hostedStrategies: number;
  usageDays: number;
  fee: number;
  status: "paid" | "settled";
};

const creditPackages: CreditPackage[] = [
  {
    id: "10",
    amount: 10,
    label: "$10",
    description: "Approx. 120 factor generations using default model settings",
  },
  {
    id: "20",
    amount: 20,
    label: "$20",
    description: "Approx. 260 factor generations using default model settings",
  },
  {
    id: "50",
    amount: 50,
    label: "$50",
    description: "Approx. 700 factor generations using default model settings",
  },
  {
    id: "custom",
    amount: null,
    label: "Custom",
    description: "Buy any amount of credits",
  },
];

const initialCreditActivity: CreditActivityItem[] = [
  {
    effectiveDate: "Mar 1st, 2026",
    expires: "Mar 27th, 2027",
    expiresIn: "334 days left",
    amount: 100,
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

function CreditsPage() {
  const { uiLang } = useAppLanguage();
  const [creditBalance, setCreditBalance] = useState(74.19);
  const [expiringCredits, setExpiringCredits] = useState(74.19);
  const [monthlyUsage] = useState(30.43);
  const [dailyAverage] = useState(1.13);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackageId>("20");
  const [customAmount, setCustomAmount] = useState("100");
  const [couponCode, setCouponCode] = useState("");
  const [creditActivity, setCreditActivity] =
    useState<CreditActivityItem[]>(initialCreditActivity);

  const selectedAmount = useMemo(() => {
    const choice = creditPackages.find((item) => item.id === selectedPackage);
    if (!choice) return 0;
    if (choice.amount !== null) return choice.amount;
    const parsed = Number(customAmount);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }, [customAmount, selectedPackage]);
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);

  const handleBuyCredits = () => {
    if (selectedAmount <= 0) {
      toast.error(tr("Enter a valid credit amount.", "请输入有效的 credit 金额。"));
      return;
    }

    const roundedAmount = Number(selectedAmount.toFixed(2));
    const today = new Date();
    const expiry = new Date(today);
    expiry.setFullYear(expiry.getFullYear() + 1);

    setCreditBalance((prev) => Number((prev + roundedAmount).toFixed(2)));
    setExpiringCredits((prev) => Number((prev + roundedAmount).toFixed(2)));
    setCreditActivity((prev) => [
      {
        effectiveDate: today.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        expires: expiry.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        expiresIn: "365 days left",
        amount: roundedAmount,
      },
      ...prev,
    ]);
    toast.success(tr(`Purchased $${roundedAmount.toFixed(2)} credits`, `已购买 $${roundedAmount.toFixed(2)} credits`));
  };

  const handleRedeemCode = () => {
    const normalized = couponCode.trim().toUpperCase();
    if (!normalized) {
      toast.error(tr("Enter a coupon code first.", "请先输入优惠码。"));
      return;
    }

    if (normalized === "OTTER10") {
      setCreditBalance((prev) => Number((prev + 10).toFixed(2)));
      setExpiringCredits((prev) => Number((prev + 10).toFixed(2)));
      setCouponCode("");
      toast.success(tr("Coupon redeemed: $10 bonus credits added.", "优惠码已兑换：已添加 $10 奖励 credits。"));
      return;
    }

    toast.error(tr("Coupon code is invalid.", "优惠码无效。"));
  };

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-foreground">{tr("Credits", "Credits")}</h1>
        <p className="mt-2 text-base text-muted-foreground">
          {tr("Track balance, usage, and billing activity for factor and agent workflows.", "查看余额、消耗以及因子与 Agent 工作流的账单活动。")}
        </p>
      </div>

      <section className="space-y-6">
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="p-6">
              <p className="text-sm text-muted-foreground">{tr("Current balance", "当前余额")}</p>
              <p className="mt-3 font-mono text-4xl font-semibold text-foreground">
                ${creditBalance.toFixed(2)}
              </p>
              <p className="mt-3 max-w-[28ch] text-sm text-muted-foreground">
                {tr("Balance updates may take up to one hour to reflect recent usage.", "余额更新可能需要最多一小时才能反映最新消耗。")}
              </p>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">{tr("Credits expiring in 334 days", "334 天后到期的 credits")}</p>
              <p className="mt-3 font-mono text-4xl font-semibold text-amber-400">
                ${expiringCredits.toFixed(2)}
              </p>
              <Button
                variant="outline"
                className="mt-4 h-10 rounded-lg border-border bg-card text-foreground hover:bg-accent"
                onClick={() => toast.success(tr("Detailed credit expiry view is coming soon.", "credit 到期明细即将上线。"))}
              >
                {tr("See details", "查看详情")}
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">{tr("Usage this month", "本月消耗")}</p>
              <p className="mt-3 font-mono text-4xl font-semibold text-foreground">
                ${monthlyUsage.toFixed(2)}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">${dailyAverage.toFixed(2)}</span>
                <span>{tr("Daily average", "日均消耗")}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr]">
          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-foreground">{tr("Add Credits", "购买 Credits")}</h3>
            </div>
            <div className="border-t border-border px-6 py-6">
              <div className="space-y-4">
                {creditPackages.map((item) => {
                  const checked = selectedPackage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPackage(item.id)}
                      className={`flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left transition ${
                        checked
                          ? "border-primary/30 bg-primary/8"
                          : "border-border bg-background/30 hover:bg-accent/40"
                      }`}
                    >
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${
                          checked ? "border-foreground text-foreground" : "border-border text-transparent"
                        }`}
                      >
                        <span className={`h-3.5 w-3.5 rounded-full ${checked ? "bg-foreground" : "bg-transparent"}`} />
                      </span>
                      <span className="min-w-[120px] text-2xl font-semibold text-foreground">
                        {item.label}
                      </span>
                      <span className="text-sm text-muted-foreground">{item.description}</span>
                    </button>
                  );
                })}
              </div>

              {selectedPackage === "custom" ? (
                <div className="mt-4">
                  <Label className="mb-2 block text-xs text-muted-foreground">{tr("Custom credit amount", "自定义 credit 金额")}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    className="h-11"
                  />
                </div>
              ) : null}
            </div>
            <div className="border-t border-border px-6 py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Button
                  className="h-11 rounded-lg bg-foreground px-6 text-base font-medium text-background hover:bg-foreground/90"
                  onClick={handleBuyCredits}
                >
                  {tr("Buy", "购买")} ${selectedAmount.toFixed(2)}
                </Button>
                <div className="flex w-full max-w-[420px] items-center gap-2">
                  <Input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder={tr("Enter coupon code", "输入优惠码")}
                    className="h-11"
                  />
                  <Button
                    variant="outline"
                    className="h-11 rounded-lg border-border bg-card px-5 text-foreground hover:bg-accent"
                    onClick={handleRedeemCode}
                  >
                    {tr("Redeem", "兑换")}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-5">
            <h3 className="text-xl font-semibold text-foreground">{tr("Credit activity", "Credit 活动记录")}</h3>
          </div>
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[1fr_1.2fr_0.8fr] gap-3 border-b border-border bg-accent/20 px-6 py-4 text-sm text-muted-foreground">
              <span>{tr("Effective Date", "生效日期")}</span>
              <span>{tr("Expires", "到期时间")}</span>
              <span className="text-right">{tr("Amount", "金额")}</span>
            </div>
            <div className="divide-y divide-border/70">
              {creditActivity.map((item) => (
                <div key={`${item.effectiveDate}-${item.amount}`} className="grid grid-cols-[1fr_1.2fr_0.8fr] gap-3 px-6 py-5 text-sm">
                  <span className="font-medium text-foreground">{item.effectiveDate}</span>
                  <span className="text-muted-foreground">
                    {item.expires}
                    <span className="ml-2 text-muted-foreground/80">· {item.expiresIn}</span>
                  </span>
                  <span className="text-right font-mono font-semibold text-foreground">${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}

function FixedHostingFeePage() {
  const { uiLang } = useAppLanguage();
  const [hostedStrategyCount, setHostedStrategyCount] = useState(8);
  const [hostingBalance, setHostingBalance] = useState(75);
  const [topUpAmount, setTopUpAmount] = useState(25);
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);

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
          <h1 className="text-foreground">{tr("Fixed Hosting Fee", "固定托管费用")}</h1>
          <p className="mt-2 text-base text-muted-foreground">
            {tr("Strategy hosting is charged by hosted strategy count and tracked month by month.", "策略托管按托管数量计费，并按月记录。")}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-accent/35 px-4 py-2 text-sm text-muted-foreground">
          <Database className="h-4 w-4" />
          {tr("Fixed Hosting Fee", "固定托管费用")}
        </div>
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

  return isHostingPage ? <FixedHostingFeePage /> : <CreditsPage />;
}

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import { toast } from "sonner";
import {
  CalendarDays,
  CreditCard,
  Database,
  History,
  Layers3,
  ReceiptText,
  Trophy,
  Wallet,
} from "lucide-react";

type MoneyActivityItem = {
  id: string;
  orderNo: string;
  reasonEn: string;
  reasonZh: string;
  occurredAt: string;
  amount: number;
  direction: "increase" | "decrease";
  source: "recharge" | "arena" | "hosting" | "points" | "withdrawal";
};

type PointsActivityItem = {
  id: string;
  orderNo: string;
  reasonEn: string;
  reasonZh: string;
  occurredAt: string;
  points: number;
  direction: "increase" | "decrease";
};

type ThemeMode = "light" | "dark";
type FundsStatus = "idle" | "processing" | "success" | "error";
type CreditPaymentMethod = "stripe" | "wallet";

type HostingHistoryItem = {
  month: string;
  hostedStrategies: number;
  usageDays: number;
  fee: number;
  status: "paid" | "settled";
};

const walletActivities: MoneyActivityItem[] = [
  {
    id: "wallet-1",
    orderNo: "WLT-20260428-001",
    reasonEn: "Factor Arena prize",
    reasonZh: "因子竞技场奖金入账",
    occurredAt: "2026-04-28T10:24:00+08:00",
    amount: 32,
    direction: "increase",
    source: "arena",
  },
  {
    id: "wallet-3",
    orderNo: "WLT-20260420-002",
    reasonEn: "Credit recharge",
    reasonZh: "额度充值",
    occurredAt: "2026-04-20T09:00:00+08:00",
    amount: 20,
    direction: "decrease",
    source: "points",
  },
];

const pointsActivities: PointsActivityItem[] = [
  {
    id: "points-1",
    orderNo: "CRD-20260428-001",
    reasonEn: "Factor generation",
    reasonZh: "生成因子",
    occurredAt: "2026-04-28T11:36:00+08:00",
    points: 180,
    direction: "decrease",
  },
  {
    id: "points-2",
    orderNo: "CRD-20260427-002",
    reasonEn: "Strategy generation",
    reasonZh: "生成策略",
    occurredAt: "2026-04-27T17:18:00+08:00",
    points: 420,
    direction: "decrease",
  },
  {
    id: "points-3",
    orderNo: "CRD-20260401-003",
    reasonEn: "Credit purchase",
    reasonZh: "购买额度",
    occurredAt: "2026-04-01T00:00:00+08:00",
    points: 10000,
    direction: "increase",
  },
  {
    id: "points-4",
    orderNo: "CRD-20260331-004",
    reasonEn: "Strategy hosting",
    reasonZh: "策略托管消耗",
    occurredAt: "2026-03-31T23:59:00+08:00",
    points: 960,
    direction: "decrease",
  },
  {
    id: "points-5",
    orderNo: "CRD-20260301-005",
    reasonEn: "Credit expired",
    reasonZh: "额度过期",
    occurredAt: "2026-03-01T00:00:00+08:00",
    points: 300,
    direction: "decrease",
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

function CreditIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M28 12C30.6 23.4 35.6 28.4 47 31C35.6 33.6 30.6 38.6 28 50C25.4 38.6 20.4 33.6 9 31C20.4 28.4 25.4 23.4 28 12Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M50 7C51.1 11.6 53.4 13.9 58 15C53.4 16.1 51.1 18.4 50 23C48.9 18.4 46.6 16.1 42 15C46.6 13.9 48.9 11.6 50 7Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const PRESET_AMOUNTS = [30, 50, 100, 200];
const CREDIT_RATE = 100;
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 5000;
const WALLET_BALANCE_USD = 74.19;
const WITHDRAWAL_NETWORKS = [
  "Ethereum (ERC20)",
  "BNB Smart Chain (BEP20)",
  "Arbitrum One (ARB)",
  "Solana (SOL)",
];
const DEFAULT_WITHDRAWAL_NETWORK = WITHDRAWAL_NETWORKS[0];

const modalTheme = {
  modal: {
    shell: { light: "border-slate-200 bg-white", dark: "border-slate-700/80 bg-slate-900" },
    left: { light: "bg-white", dark: "bg-slate-900" },
    right: { light: "bg-[#f8fafc]", dark: "bg-slate-900" },
  },
  card: { light: "border-slate-200 bg-white", dark: "border-slate-700/80 bg-slate-900" },
  subtleCard: { light: "border-slate-200 bg-slate-50/70", dark: "border-slate-700/80 bg-slate-900/40" },
  text: {
    title: { light: "text-slate-950", dark: "text-slate-50" },
    body: { light: "text-slate-600", dark: "text-slate-200" },
    muted: { light: "text-slate-500", dark: "text-slate-300" },
    faint: { light: "text-slate-400", dark: "text-slate-400" },
  },
  input: {
    light: "border-slate-200 bg-white text-slate-950 placeholder:text-slate-400 focus:border-[#635bff] focus:ring-[#635bff]/10",
    dark: "border-slate-600 bg-slate-950/70 text-slate-50 placeholder:text-slate-500 focus:border-[#9b8cff] focus:ring-[#9b8cff]/15",
  },
};

function getCurrentThemeMode(): ThemeMode {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function usdToCredits(amountUsd: number) {
  return Math.round((Number(amountUsd) || 0) * CREDIT_RATE);
}

function formatUsd(amount: number) {
  return `${(Number(amount) || 0).toFixed(2)} USD`;
}

function formatCredits(credits: number) {
  return new Intl.NumberFormat("en-US").format(Number(credits) || 0);
}

function isValidAmount(amount: number) {
  const value = Number(amount);
  return Number.isFinite(value) && value >= MIN_AMOUNT && value <= MAX_AMOUNT;
}

function canPayWithWallet(amountUsd: number, balanceUsd = WALLET_BALANCE_USD) {
  return isValidAmount(amountUsd) && Number(amountUsd) <= Number(balanceUsd);
}

function walletBalanceAfterWithdraw(amountUsd: number, balanceUsd = WALLET_BALANCE_USD) {
  return Math.max(0, Number(balanceUsd || 0) - Number(amountUsd || 0));
}

function walletShortfall(amountUsd: number, balanceUsd = WALLET_BALANCE_USD) {
  return Math.max(0, Number(amountUsd || 0) - Number(balanceUsd || 0));
}

function isValidWithdrawalAddress(network: string, address: string) {
  const value = String(address || "").trim();
  if (!value) return false;
  if (network === "Solana (SOL)") return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function getWithdrawalAddressHint(network: string) {
  return network === "Solana (SOL)"
    ? "请输入 32-44 位 Solana 钱包地址。"
    : "请输入以 0x 开头的 42 位 EVM 钱包地址。";
}

function ModalIcon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    x: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 1 1v2" />
        <path d="M4 7.5v9A2.5 2.5 0 0 0 6.5 19H20a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5Z" />
        <path d="M17 14h.01" />
      </>
    ),
    check: (
      <>
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
        <path d="m8 12 2.6 2.6L16.5 9" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        <path d="M12 14v2" />
      </>
    ),
    card: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18" />
        <path d="M7 15h3" />
      </>
    ),
    chevronDown: <path d="m6 9 6 6 6-6" />,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name] || paths.wallet}
    </svg>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
  mode,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mode: ThemeMode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={modalTheme.text.muted[mode]}>{label}</span>
      <span className={highlight ? cx("font-semibold", modalTheme.text.title[mode]) : cx("font-medium", modalTheme.text.body[mode])}>
        {value}
      </span>
    </div>
  );
}

function AmountCard({
  value,
  selected,
  onClick,
  variant = "credits",
  mode,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
  variant?: "credits" | "wallet";
  mode: ThemeMode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-xl border px-3 py-3 text-left transition-all",
        selected
          ? "border-[#635bff] bg-[#635bff]/[0.08] dark:border-[#9b8cff] dark:bg-[#9b8cff]/[0.12]"
          : mode === "dark"
            ? "border-slate-700/80 bg-transparent hover:border-slate-500 hover:bg-slate-800/50"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      <p className={cx("text-xs font-medium", selected ? "text-[#5546f6] dark:text-[#c9c2ff]" : modalTheme.text.faint[mode])}>预设金额</p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={cx("text-2xl font-semibold tracking-tight", selected ? "text-[#5546f6] dark:text-[#c9c2ff]" : modalTheme.text.title[mode])}>
          {value}
        </span>
        <span className={cx("text-xs font-bold", selected ? "text-[#5546f6] dark:text-[#c9c2ff]" : modalTheme.text.muted[mode])}>USD</span>
      </div>
      {variant !== "wallet" ? <p className={cx("mt-2 text-xs", modalTheme.text.faint[mode])}>{formatCredits(usdToCredits(value))} 额度</p> : null}
    </button>
  );
}

function PaymentMethodRadio({ selected, color = "violet", mode }: { selected: boolean; color?: "violet" | "green" | "blue"; mode: ThemeMode }) {
  const bg = color === "green" ? "bg-emerald-500 border-emerald-500" : color === "blue" ? "bg-blue-500 border-blue-500" : "bg-[#635bff] border-[#635bff]";
  return (
    <span className={cx("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", selected ? bg : mode === "dark" ? "border-slate-600 bg-slate-900" : "border-slate-300 bg-white")}>
      {selected ? <span className={cx("h-1.5 w-1.5 rounded-full", mode === "dark" ? "bg-slate-950" : "bg-white")} /> : null}
    </span>
  );
}

function SkeletonStripeElement({ mode }: { mode: ThemeMode }) {
  return (
    <div className={cx("space-y-3 rounded-2xl border p-4", modalTheme.card[mode])}>
      <div className={cx("h-4 w-24 rounded-full", mode === "dark" ? "bg-slate-800" : "bg-slate-100")} />
      <div className={cx("h-11 rounded-xl border", mode === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50")} />
      <div className="grid grid-cols-2 gap-3">
        <div className={cx("h-11 rounded-xl border", mode === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50")} />
        <div className={cx("h-11 rounded-xl border", mode === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50")} />
      </div>
      <div className={cx("h-11 rounded-xl border", mode === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50")} />
    </div>
  );
}

function MockStripePaymentElement({
  ready,
  setReady,
  mode,
}: {
  ready: boolean;
  setReady: (ready: boolean) => void;
  mode: ThemeMode;
}) {
  const [stripeMethod, setStripeMethod] = useState<"link" | "alipay" | "card">("link");
  const [email, setEmail] = useState("xiaoyu@example.com");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12 / 34");
  const [cvc, setCvc] = useState("123");
  const [name, setName] = useState("Xiaoyu Long");
  const inputBase = cx("h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-4", modalTheme.input[mode]);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 550);
    return () => window.clearTimeout(timer);
  }, [setReady]);

  if (!ready) return <SkeletonStripeElement mode={mode} />;

  const baseCard = cx("w-full border-t px-1 py-4 text-left transition first:border-t-0", mode === "dark" ? "border-slate-700/80 hover:bg-slate-800/35" : "border-slate-200 hover:bg-slate-50/80");

  return (
    <div className="rounded-xl border border-slate-200 px-3 dark:border-slate-700/80">
      <button type="button" onClick={() => setStripeMethod("link")} className={cx(baseCard, stripeMethod === "link" && "bg-emerald-50/70 dark:bg-emerald-950/25")}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">link</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cx("text-sm font-semibold", modalTheme.text.title[mode])}>Link 快捷支付</p>
                <p className={cx("mt-1 text-xs leading-5", modalTheme.text.muted[mode])}>使用邮箱验证后快速完成支付。</p>
              </div>
              <PaymentMethodRadio selected={stripeMethod === "link"} color="green" mode={mode} />
            </div>
            {stripeMethod === "link" ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                <label className="block">
                  <span className={cx("mb-1.5 block text-xs font-medium", modalTheme.text.muted[mode])}>Link account email</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} className={inputBase} />
                </label>
              </motion.div>
            ) : null}
          </div>
        </div>
      </button>

      <button type="button" onClick={() => setStripeMethod("alipay")} className={cx(baseCard, stripeMethod === "alipay" && "bg-blue-50/70 dark:bg-blue-950/25")}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">支</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cx("text-sm font-semibold", modalTheme.text.title[mode])}>支付宝</p>
                <p className={cx("mt-1 text-xs leading-5", modalTheme.text.muted[mode])}>点击支付后跳转到支付宝完成授权支付。</p>
              </div>
              <PaymentMethodRadio selected={stripeMethod === "alipay"} color="blue" mode={mode} />
            </div>
            {stripeMethod === "alipay" ? <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cx("mt-4 border-t pt-3 text-xs leading-5", mode === "dark" ? "border-blue-400/30 text-slate-300" : "border-blue-100 text-slate-500")}>真实接入时由 Stripe Payment Element 处理跳转与返回。</motion.div> : null}
          </div>
        </div>
      </button>

      <button type="button" onClick={() => setStripeMethod("card")} className={cx(baseCard, stripeMethod === "card" && "bg-[#635bff]/[0.06]")}>
        <div className="flex items-start gap-3">
          <div className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold", mode === "dark" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}>卡</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cx("text-sm font-semibold", modalTheme.text.title[mode])}>银行卡</p>
                <p className={cx("mt-1 text-xs leading-5", modalTheme.text.muted[mode])}>Visa / Mastercard / American Express</p>
              </div>
              <PaymentMethodRadio selected={stripeMethod === "card"} mode={mode} />
            </div>
            {stripeMethod === "card" ? (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                <label className="block">
                  <span className={cx("mb-1.5 block text-xs font-medium", modalTheme.text.muted[mode])}>Card number</span>
                  <div className={cx("flex items-center gap-2 rounded-xl border px-3 py-3 focus-within:ring-4", modalTheme.input[mode])}>
                    <ModalIcon name="card" className={cx("h-4 w-4", modalTheme.text.faint[mode])} />
                    <input value={card} onChange={(event) => setCard(event.target.value)} className="w-full bg-transparent text-sm outline-none" />
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className={cx("mb-1.5 block text-xs font-medium", modalTheme.text.muted[mode])}>Expiry</span>
                    <input value={expiry} onChange={(event) => setExpiry(event.target.value)} className={inputBase} />
                  </label>
                  <label className="block">
                    <span className={cx("mb-1.5 block text-xs font-medium", modalTheme.text.muted[mode])}>CVC</span>
                    <input value={cvc} onChange={(event) => setCvc(event.target.value)} className={inputBase} />
                  </label>
                </div>
                <label className="block">
                  <span className={cx("mb-1.5 block text-xs font-medium", modalTheme.text.muted[mode])}>Name on card</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className={inputBase} />
                </label>
              </motion.div>
            ) : null}
          </div>
        </div>
      </button>
    </div>
  );
}

function UnifiedPaymentCard({
  amount,
  credits,
  walletEnough,
  walletAvailableAfter,
  stripeReady,
  setStripeReady,
  paymentMethod,
  setPaymentMethod,
  isSubmitting,
  status,
  error,
  setStatus,
  setError,
  canSubmit,
  handlePay,
  mode,
}: {
  amount: number;
  credits: number;
  walletEnough: boolean;
  walletAvailableAfter: number;
  stripeReady: boolean;
  setStripeReady: (ready: boolean) => void;
  paymentMethod: CreditPaymentMethod;
  setPaymentMethod: (method: CreditPaymentMethod) => void;
  isSubmitting: boolean;
  status: FundsStatus;
  error: string;
  setStatus: (status: FundsStatus) => void;
  setError: (error: string) => void;
  canSubmit: boolean;
  handlePay: () => void;
  mode: ThemeMode;
}) {
  const walletMissing = walletShortfall(amount);

  return (
    <div className="space-y-5">
      <div>
        <p className={cx("text-base font-semibold", modalTheme.text.title[mode])}>支付方式</p>
        <p className={cx("mt-1 text-sm leading-6", modalTheme.text.muted[mode])}>选择一种方式完成本次充值。</p>
      </div>
      <div className={cx("grid grid-cols-2 gap-1 rounded-xl p-1", mode === "dark" ? "bg-slate-800/80" : "bg-slate-200/70")}>
        <button type="button" onClick={() => { setPaymentMethod("stripe"); setStatus("idle"); setError(""); }} className={cx("rounded-lg px-3 py-3 text-sm font-semibold transition", paymentMethod === "stripe" ? "bg-white text-[#5546f6] shadow-sm dark:bg-[#9b8cff] dark:text-slate-950" : cx(modalTheme.text.muted[mode], "hover:text-slate-900 dark:hover:text-slate-100"))}>在线支付</button>
        <button type="button" onClick={() => { setPaymentMethod("wallet"); setStatus("idle"); setError(""); }} className={cx("rounded-lg px-3 py-3 text-sm font-semibold transition", paymentMethod === "wallet" ? "bg-white text-[#5546f6] shadow-sm dark:bg-[#9b8cff] dark:text-slate-950" : cx(modalTheme.text.muted[mode], "hover:text-slate-900 dark:hover:text-slate-100"))}>钱包余额</button>
      </div>

      <AnimatePresence mode="wait">
        {paymentMethod === "wallet" ? (
          <motion.div key="wallet-inline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={cx("border-t pt-5", mode === "dark" ? "border-slate-700/80" : "border-slate-200")}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#635bff]/10 text-[#5546f6] dark:bg-[#9b8cff]/[0.18] dark:text-[#c9c2ff]">
                <ModalIcon name="wallet" className="h-5 w-5" />
              </div>
              <div>
                <p className={cx("text-sm font-semibold", modalTheme.text.title[mode])}>使用钱包余额付款</p>
                <p className={cx("mt-1 text-xs leading-5", modalTheme.text.muted[mode])}>无需跳转，直接从当前钱包余额扣款。</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <SummaryRow label="钱包余额" value={formatUsd(WALLET_BALANCE_USD)} mode={mode} />
              <SummaryRow label="本次支付" value={formatUsd(amount)} mode={mode} />
              <div className={cx("h-px", mode === "dark" ? "bg-slate-700" : "bg-slate-200")} />
              <SummaryRow label="支付后余额" value={formatUsd(walletAvailableAfter)} highlight mode={mode} />
            </div>
            {!walletEnough ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-200">钱包余额不足，还差 {formatUsd(walletMissing)}，本次可使用在线支付。</div> : null}
          </motion.div>
        ) : (
          <motion.div key="stripe-inline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <MockStripePaymentElement ready={stripeReady} setReady={setStripeReady} mode={mode} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cx("border-t pt-4", mode === "dark" ? "border-slate-700/80" : "border-slate-200")}>
        <div className="space-y-3">
          <SummaryRow label="支付金额" value={formatUsd(amount)} mode={mode} />
          {paymentMethod === "wallet" ? <SummaryRow label="支付后钱包余额" value={formatUsd(walletAvailableAfter)} mode={mode} /> : null}
          <SummaryRow label="到账金额" value={`${formatCredits(credits)} 额度`} highlight mode={mode} />
        </div>
      </div>

      {status === "error" ? <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">{error}</motion.div> : null}
      {status === "success" ? <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200"><div className="flex items-start gap-3"><ModalIcon name="check" className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-300" /><div><p className="font-semibold">充值成功</p><p>{formatCredits(credits)} 额度已到账。</p></div></div></motion.div> : null}
      <Button onClick={handlePay} disabled={!canSubmit} className="h-12 w-full rounded-xl bg-[#5546f6] text-base font-semibold text-white shadow-[0_14px_32px_rgba(85,70,246,0.22)] transition hover:bg-[#4637e8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:bg-[#8b7cff] dark:text-slate-950 dark:hover:bg-[#a79bff] dark:disabled:bg-slate-800 dark:disabled:text-slate-500">
        {isSubmitting ? (paymentMethod === "wallet" ? "扣款中..." : "Processing...") : status === "success" ? "已完成" : paymentMethod === "wallet" ? `使用钱包支付 ${formatUsd(amount)}` : `支付 ${formatUsd(amount)}`}
      </Button>
      <div className={cx("flex items-center justify-center gap-2 text-xs", modalTheme.text.faint[mode])}>
        <ModalIcon name="lock" className="h-3.5 w-3.5" />
        <span>{paymentMethod === "wallet" ? "Internal wallet balance · Preview mode" : "Online payment · Preview mode"}</span>
      </div>
    </div>
  );
}

function FundsModalShell({
  open,
  onClose,
  title,
  subtitle,
  amount,
  setAmount,
  valid,
  leftVariant,
  rightContent,
  amountLabel = "充值金额",
  leftHero = null,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  amount: number;
  setAmount: (amount: number) => void;
  valid: boolean;
  leftVariant: "credits" | "wallet";
  rightContent: ReactNode;
  amountLabel?: string;
  leftHero?: ReactNode;
  mode: ThemeMode;
}) {
  function handleAmountChange(value: string) {
    const clean = value.replace(/[^0-9.]/g, "");
    setAmount(clean === "" ? 0 : Number(clean));
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className={cx("fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl", mode === "dark" ? "bg-[#020617]/76" : "bg-slate-900/30")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ opacity: 0, y: 22, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ type: "spring", damping: 24, stiffness: 280 }} className={cx("relative grid h-[92vh] w-full max-w-[1120px] overflow-hidden rounded-[28px] border lg:grid-cols-[1.06fr_0.94fr]", mode === "dark" ? "shadow-[0_32px_100px_rgba(2,6,23,0.52)]" : "shadow-[0_30px_90px_rgba(15,23,42,0.18)]", modalTheme.modal.shell[mode])}>
            <button onClick={onClose} type="button" className={cx("absolute right-5 top-5 z-20 rounded-full p-2 transition", modalTheme.text.faint[mode], mode === "dark" ? "hover:bg-slate-800 hover:text-slate-200" : "hover:bg-slate-100 hover:text-slate-700")} aria-label="Close">
              <ModalIcon name="x" className="h-5 w-5" />
            </button>
            <div className={cx("relative h-full min-h-0 overflow-y-auto p-7 md:p-9", modalTheme.modal.left[mode])}>
              <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-[#635bff]/8 blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#635bff]/10 text-[#5546f6]">
                    <ModalIcon name="wallet" className="h-5 w-5" />
                  </div>
                  <h2 className={cx("text-3xl font-semibold tracking-tight", modalTheme.text.title[mode])}>{title}</h2>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                  {leftVariant === "credits" ? <span className="rounded-full bg-[#635bff]/10 px-3 py-1 font-semibold text-[#5546f6]">1 USD = 100 额度</span> : null}
                  <span className={modalTheme.text.muted[mode]}>{subtitle}</span>
                </div>
                {leftHero ? (
                  <div className="mt-8">{leftHero}</div>
                ) : (
                  <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {PRESET_AMOUNTS.map((value) => (
                      <AmountCard key={value} value={value} selected={amount === value} onClick={() => handleAmountChange(String(value))} variant={leftVariant} mode={mode} />
                    ))}
                  </div>
                )}
                <div className={cx("mt-7 border-t pt-5", mode === "dark" ? "border-slate-700/80" : "border-slate-200")}>
                  <label className="w-full">
                    <span className={cx("mb-2 block text-xs font-semibold", modalTheme.text.muted[mode])}>{amountLabel}</span>
                    <div className={cx("flex h-14 items-center rounded-xl border px-4 transition focus-within:ring-4", modalTheme.input[mode])}>
                      <input value={amount || ""} onChange={(event) => handleAmountChange(event.target.value)} inputMode="decimal" className="w-full bg-transparent text-xl font-semibold outline-none" placeholder="输入金额" />
                      <span className={cx("text-sm font-bold", modalTheme.text.faint[mode])}>USD</span>
                    </div>
                  </label>
                  {!valid ? <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-300">请输入有效金额，且金额不能超过可用余额或上限。</p> : null}
                </div>
              </div>
            </div>
            <div className={cx("relative h-full min-h-0 overflow-y-scroll border-t p-5 [scrollbar-gutter:stable] md:p-6 lg:border-l lg:border-t-0", mode === "dark" ? "border-slate-700/80" : "border-slate-200", modalTheme.modal.right[mode])}>{rightContent}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CreditsRechargeModal({ open, onClose, mode = "dark" }: { open: boolean; onClose: () => void; mode?: ThemeMode }) {
  const [amount, setAmount] = useState(100);
  const [stripeReady, setStripeReady] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<CreditPaymentMethod>("stripe");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FundsStatus>("idle");
  const [error, setError] = useState("");
  const credits = useMemo(() => usdToCredits(amount), [amount]);
  const valid = isValidAmount(amount);
  const walletEnough = canPayWithWallet(amount, WALLET_BALANCE_USD);
  const walletAvailableAfter = walletBalanceAfterWithdraw(amount);
  const canSubmit = valid && !isSubmitting && status !== "success" && (paymentMethod === "stripe" ? stripeReady : walletEnough);

  function resetFeedback() {
    setStatus("idle");
    setError("");
  }

  async function handlePay() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError("");
    setStatus("processing");
    await new Promise((resolve) => window.setTimeout(resolve, paymentMethod === "wallet" ? 650 : 1100));
    if (paymentMethod === "stripe" && amount === 30) {
      setError("Payment failed in preview. Try 50, 100, or 200 USD to view success state.");
      setStatus("error");
      setIsSubmitting(false);
      return;
    }
    setStatus("success");
    setIsSubmitting(false);
  }

  return (
    <FundsModalShell
      open={open}
      onClose={onClose}
      title="额度充值"
      subtitle="选择金额并完成支付，额度将在支付成功后自动到账。"
      amount={amount}
      setAmount={(next) => {
        setAmount(next);
        resetFeedback();
      }}
      valid={valid}
      leftVariant="credits"
      mode={mode}
      rightContent={
        <UnifiedPaymentCard
          amount={amount}
          credits={credits}
          walletEnough={walletEnough}
          walletAvailableAfter={walletAvailableAfter}
          stripeReady={stripeReady}
          setStripeReady={setStripeReady}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          isSubmitting={isSubmitting}
          status={status}
          error={error}
          setStatus={setStatus}
          setError={setError}
          canSubmit={canSubmit}
          handlePay={handlePay}
          mode={mode}
        />
      }
    />
  );
}

function WithdrawCard({
  amount,
  isSubmitting,
  status,
  error,
  canSubmit,
  handleWithdraw,
  successMessage,
  accountBound,
  selectedNetwork,
  setSelectedNetwork,
  walletAddress,
  setWalletAddress,
  addressError,
  setAddressError,
  onBindAccount,
  onRequestUnbind,
  mode,
}: {
  amount: number;
  isSubmitting: boolean;
  status: FundsStatus;
  error: string;
  canSubmit: boolean;
  handleWithdraw: () => void;
  successMessage: string;
  accountBound: boolean;
  selectedNetwork: string;
  setSelectedNetwork: (network: string) => void;
  walletAddress: string;
  setWalletAddress: (address: string) => void;
  addressError: string;
  setAddressError: (error: string) => void;
  onBindAccount: () => void;
  onRequestUnbind: () => void;
  mode: ThemeMode;
}) {
  const walletAfterWithdraw = walletBalanceAfterWithdraw(amount);
  const overBalance = Number(amount || 0) > WALLET_BALANCE_USD;
  const addressHint = getWithdrawalAddressHint(selectedNetwork);
  const hasAddressError = Boolean(addressError);

  return (
    <div className="space-y-5">
      <div>
        <p className={cx("text-base font-semibold", modalTheme.text.title[mode])}>提现方式</p>
        <p className={cx("mt-1 text-sm leading-6", modalTheme.text.muted[mode])}>将钱包余额提现到已绑定的钱包地址。</p>
      </div>
      {accountBound ? (
        <div className={cx("border-t pt-5", mode === "dark" ? "border-slate-700/80" : "border-slate-200")}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#635bff]/10 text-[#5546f6] dark:bg-[#9b8cff]/[0.18] dark:text-[#c9c2ff]">
              <ModalIcon name="wallet" className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cx("text-sm font-semibold", modalTheme.text.title[mode])}>提现到绑定钱包</p>
              <p className={cx("mt-1 text-xs leading-5", modalTheme.text.muted[mode])}>{selectedNetwork}</p>
              <p className={cx("mt-1 break-all text-xs leading-5", modalTheme.text.muted[mode])}>{walletAddress}</p>
              <Button onClick={onRequestUnbind} variant="outline" className={cx("mt-4 h-9 rounded-lg px-3 text-xs font-semibold", mode === "dark" ? "border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>解绑钱包</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-amber-200 pt-5 dark:border-amber-400/40">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
              <ModalIcon name="wallet" className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cx("text-sm font-semibold", modalTheme.text.title[mode])}>未绑定提现钱包</p>
              <p className="mt-1 text-xs leading-5 text-amber-700 dark:text-amber-200">请选择提现网络并输入钱包地址，绑定后才能提交提现申请。</p>
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className={cx("mb-1.5 block text-xs font-medium", modalTheme.text.body[mode])}>选择网络</span>
                  <div className="relative">
                    <select value={selectedNetwork} onChange={(event) => { setSelectedNetwork(event.target.value); setAddressError(""); }} className={cx("h-11 w-full appearance-none rounded-xl border py-0 pl-3 pr-10 text-sm outline-none focus:ring-4", modalTheme.input[mode])}>
                      {WITHDRAWAL_NETWORKS.map((network) => <option key={network} value={network}>{network}</option>)}
                    </select>
                    <ModalIcon name="chevronDown" className={cx("pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2", modalTheme.text.faint[mode])} />
                  </div>
                </label>
                <label className="block">
                  <span className={cx("mb-1.5 block text-xs font-medium", modalTheme.text.body[mode])}>钱包地址</span>
                  <input value={walletAddress} onChange={(event) => { setWalletAddress(event.target.value); setAddressError(""); }} placeholder="输入钱包地址" className={cx("h-11 w-full rounded-xl border px-3 text-sm outline-none placeholder:text-slate-300 focus:ring-4 dark:placeholder:text-slate-500", hasAddressError ? "border-red-400 bg-white text-slate-950 focus:border-red-500 focus:ring-red-500/10 dark:bg-slate-950 dark:text-slate-50" : modalTheme.input[mode])} />
                  <p className={cx("mt-1.5 text-xs leading-5", hasAddressError ? "text-red-600 dark:text-red-300" : "text-amber-700 dark:text-amber-200")}>{hasAddressError ? addressError : addressHint}</p>
                </label>
              </div>
              <Button onClick={onBindAccount} className="mt-4 h-10 rounded-lg bg-[#5546f6] px-4 text-sm font-semibold text-white hover:bg-[#4637e8] dark:bg-[#8b7cff] dark:text-slate-950 dark:hover:bg-[#a79bff]">绑定钱包</Button>
            </div>
          </div>
        </div>
      )}

      <div className={cx("border-t pt-4", mode === "dark" ? "border-slate-700/80" : "border-slate-200")}>
        <div className="space-y-3">
          <SummaryRow label="钱包余额" value={formatUsd(WALLET_BALANCE_USD)} mode={mode} />
          <SummaryRow label="提现金额" value={formatUsd(amount)} mode={mode} />
          <SummaryRow label="提现后余额" value={formatUsd(walletAfterWithdraw)} highlight mode={mode} />
        </div>
      </div>
      {overBalance ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-200">提现金额超过钱包余额，请调整金额后再提交。</div> : null}
      {status === "error" ? <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">{error}</motion.div> : null}
      {status === "success" ? <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200"><div className="flex items-start gap-3"><ModalIcon name="check" className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-300" /><div><p className="font-semibold">提现申请已提交</p><p>{successMessage}</p></div></div></motion.div> : null}
      <Button onClick={handleWithdraw} disabled={!canSubmit} className="h-12 w-full rounded-xl bg-[#5546f6] text-base font-semibold text-white shadow-[0_14px_32px_rgba(85,70,246,0.22)] transition hover:bg-[#4637e8] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:bg-[#8b7cff] dark:text-slate-950 dark:hover:bg-[#a79bff] dark:disabled:bg-slate-800 dark:disabled:text-slate-500">
        {isSubmitting ? "提交中..." : status === "success" ? "已提交" : `提现 ${formatUsd(amount)}`}
      </Button>
      <div className={cx("flex items-center justify-center gap-2 text-xs", modalTheme.text.faint[mode])}>
        <ModalIcon name="lock" className="h-3.5 w-3.5" />
        <span>{accountBound ? "Wallet withdrawal · Preview mode" : "Wallet address required · Preview mode"}</span>
      </div>
    </div>
  );
}

function WalletWithdrawModal({ open, onClose, mode = "dark" }: { open: boolean; onClose: () => void; mode?: ThemeMode }) {
  const [amount, setAmount] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<FundsStatus>("idle");
  const [error, setError] = useState("");
  const [accountBound, setAccountBound] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(DEFAULT_WITHDRAWAL_NETWORK);
  const [walletAddress, setWalletAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [confirmUnbindOpen, setConfirmUnbindOpen] = useState(false);
  const valid = isValidAmount(amount) && Number(amount || 0) <= WALLET_BALANCE_USD;
  const walletAfterWithdraw = walletBalanceAfterWithdraw(amount);
  const canSubmit = valid && accountBound && isValidWithdrawalAddress(selectedNetwork, walletAddress) && !isSubmitting && status !== "success";

  function resetFeedback() {
    setStatus("idle");
    setError("");
  }

  function handleBindWallet() {
    if (!isValidWithdrawalAddress(selectedNetwork, walletAddress)) {
      setAddressError(getWithdrawalAddressHint(selectedNetwork));
      return;
    }
    setAccountBound(true);
    resetFeedback();
  }

  function handleConfirmUnbindWallet() {
    setAccountBound(false);
    setSelectedNetwork(DEFAULT_WITHDRAWAL_NETWORK);
    setWalletAddress("");
    setAddressError("");
    setConfirmUnbindOpen(false);
    resetFeedback();
  }

  async function handleWithdraw() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError("");
    setStatus("processing");
    await new Promise((resolve) => window.setTimeout(resolve, 850));
    if (amount === 30) {
      setError("Withdrawal failed in preview. Try 50, 100, or 200 USD to view success state.");
      setStatus("error");
      setIsSubmitting(false);
      return;
    }
    setStatus("success");
    setIsSubmitting(false);
  }

  const leftHero = (
    <div className="border-t border-[#635bff]/20 pt-5 dark:border-[#9b8cff]/35">
      <p className="text-xs font-semibold text-[#5546f6]">钱包余额</p>
      <p className={cx("mt-2 text-3xl font-semibold tracking-tight", modalTheme.text.title[mode])}>{formatUsd(WALLET_BALANCE_USD)}</p>
      <p className={cx("mt-2 text-sm", modalTheme.text.muted[mode])}>可提现余额</p>
    </div>
  );

  return (
    <>
      <FundsModalShell
        open={open}
        onClose={onClose}
        title="钱包提现"
        subtitle="选择提现金额，资金将从钱包余额转出到已绑定的钱包地址。"
        amount={amount}
        setAmount={(next) => {
          setAmount(next);
          resetFeedback();
        }}
        valid={valid}
        leftVariant="wallet"
        amountLabel="提现金额"
        leftHero={leftHero}
        mode={mode}
        rightContent={
          <WithdrawCard
            amount={amount}
            isSubmitting={isSubmitting}
            status={status}
            error={error}
            canSubmit={canSubmit}
            handleWithdraw={handleWithdraw}
            accountBound={accountBound}
            selectedNetwork={selectedNetwork}
            setSelectedNetwork={setSelectedNetwork}
            walletAddress={walletAddress}
            setWalletAddress={setWalletAddress}
            addressError={addressError}
            setAddressError={setAddressError}
            onBindAccount={handleBindWallet}
            onRequestUnbind={() => setConfirmUnbindOpen(true)}
            mode={mode}
            successMessage={`${formatUsd(amount)} 提现申请已提交，提现后钱包余额约为 ${formatUsd(walletAfterWithdraw)}。`}
          />
        }
      />
      <AnimatePresence>
        {confirmUnbindOpen ? (
          <motion.div className={cx("fixed inset-0 z-[70] flex items-center justify-center p-6 backdrop-blur-sm", mode === "dark" ? "bg-slate-950/50" : "bg-slate-900/25")} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }} className={cx("w-full max-w-[380px] rounded-3xl border p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)]", modalTheme.card[mode])}>
              <p className={cx("text-lg font-semibold", modalTheme.text.title[mode])}>确认解绑钱包？</p>
              <p className={cx("mt-2 text-sm leading-6", modalTheme.text.muted[mode])}>解绑后将清空当前网络和钱包地址，需要重新绑定后才能提现。</p>
              <div className="mt-5 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setConfirmUnbindOpen(false)} className={cx("h-10 rounded-xl px-4 text-sm font-semibold", mode === "dark" ? "border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>取消</Button>
                <Button onClick={handleConfirmUnbindWallet} className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700">确认解绑</Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function CreditsPage() {
  const { uiLang } = useAppLanguage();
  const [walletWithdrawOpen, setWalletWithdrawOpen] = useState(false);
  const [creditRechargeOpen, setCreditRechargeOpen] = useState(false);
  const [fundsModalMode, setFundsModalMode] = useState<ThemeMode>(() => getCurrentThemeMode());
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const walletBalance = 74.19;
  const arenaPrizeTotal = 32;
  const pointBalance = 12840;
  const monthlyPointUsage = 2460;
  const hostedStrategyCount = 8;

  useEffect(() => {
    const root = document.documentElement;
    const syncThemeMode = () => setFundsModalMode(root.classList.contains("dark") ? "dark" : "light");
    syncThemeMode();

    const observer = new MutationObserver(syncThemeMode);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return uiLang === "zh"
      ? new Intl.DateTimeFormat("zh-CN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }).format(date)
      : new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }).format(date);
  };

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-foreground">{tr("Wallet & Credit", "钱包&额度")}</h1>
        <p className="mt-2 text-base text-muted-foreground">
          {tr("Track wallet balance, credit usage, and account activity.", "查看钱包余额、额度消耗与账户活动。")}
        </p>
      </div>

      <Tabs defaultValue="wallet" className="gap-5">
        <TabsList className="h-11 rounded-xl border border-border bg-card p-1">
          <TabsTrigger value="wallet" className="min-w-28 rounded-lg px-4">
            <Wallet className="h-4 w-4" />
            {tr("Wallet", "钱包")}
          </TabsTrigger>
          <TabsTrigger value="points" className="min-w-28 rounded-lg px-4">
            <CreditIcon className="h-4 w-4" />
            {tr("Credit", "额度")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wallet" className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
              <div className="p-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-slate-300">
                  <Wallet className="h-4 w-4" />
                  {tr("Wallet balance", "钱包余额")}
                </div>
                <p className="mt-3 font-mono text-4xl font-semibold text-foreground">
                  ${walletBalance.toFixed(2)}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg border-sky-400/45 bg-sky-400/10 px-4 text-sm font-medium text-sky-700 hover:border-sky-500/60 hover:bg-sky-400/15 dark:border-sky-300/45 dark:bg-sky-300/12 dark:text-sky-100 dark:hover:bg-sky-300/18"
                    onClick={() => setWalletWithdrawOpen(true)}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {tr("Withdraw", "提现")}
                  </Button>
                </div>
              </div>
              <div className="border-t border-border/60 p-6 lg:border-l lg:border-t-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-slate-300">
                  <Trophy className="h-4 w-4" />
                  {tr("Arena cumulative prizes", "竞技场累计奖金")}
                </div>
                <p className="mt-3 font-mono text-3xl font-semibold text-amber-400">
                  ${arenaPrizeTotal.toFixed(2)}
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-6 py-5">
              <h3 className="text-xl font-semibold text-foreground">{tr("Wallet activity", "钱包活动记录")}</h3>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[840px]">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-3 border-b border-border bg-accent/20 px-6 py-4 text-sm text-muted-foreground">
                  <span>{tr("Change", "变更记录")}</span>
                  <span>{tr("Order No.", "单号")}</span>
                  <span>{tr("Time", "操作时间")}</span>
                  <span className="text-right">{tr("Amount", "金额")}</span>
                </div>
                <div className="divide-y divide-border/70">
                  {walletActivities.map((item) => {
                    const isIncrease = item.direction === "increase";
                    return (
                      <div key={item.id} className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-3 px-6 py-5 text-sm">
                        <span className="flex items-center font-medium text-foreground">
                          {tr(item.reasonEn, item.reasonZh)}
                        </span>
                        <span className="flex items-center font-mono text-xs text-muted-foreground">{item.orderNo}</span>
                        <span className="flex items-center text-muted-foreground">{formatDateTime(item.occurredAt)}</span>
                        <span className={`text-right font-mono font-semibold ${isIncrease ? "text-emerald-400" : "text-rose-400"}`}>
                          {isIncrease ? "+" : "-"}${item.amount.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="points" className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/70">
            <div className="grid grid-cols-1 md:grid-cols-3">
              <div className="p-6">
                <p className="text-sm text-muted-foreground dark:text-slate-300">{tr("Remaining credit", "当前剩余额度")}</p>
                <p className="mt-3 font-mono text-4xl font-semibold text-foreground">
                  {pointBalance.toLocaleString()}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    className="h-9 rounded-lg bg-indigo-500 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 dark:bg-indigo-400 dark:text-slate-950 dark:hover:bg-indigo-300"
                    onClick={() => setCreditRechargeOpen(true)}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    {tr("Recharge", "充值")}
                  </Button>
                </div>
              </div>
              <div className="border-t border-border/60 p-6 md:border-l md:border-t-0">
                <p className="text-sm text-muted-foreground dark:text-slate-300">{tr("Credit used this month", "本月共消费额度")}</p>
                <p className="mt-3 font-mono text-4xl font-semibold text-amber-400">
                  {monthlyPointUsage.toLocaleString()}
                </p>
                <p className="mt-4 text-sm text-muted-foreground dark:text-slate-300">
                  {tr("Credit is valid for 12 months.", "额度有效期为 12 个月")}
                </p>
              </div>
              <div className="border-t border-border/60 p-6 md:border-l md:border-t-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-slate-300">
                  <Layers3 className="h-4 w-4" />
                  {tr("Hosted strategies", "当前托管策略数量")}
                </div>
                <p className="mt-3 font-mono text-4xl font-semibold text-foreground">
                  {hostedStrategyCount}
                </p>
                <p className="mt-4 text-sm text-muted-foreground dark:text-slate-300">
                  {tr("Strategy hosting fee: 500 credit / strategy / month", "策略托管费：500额度/个/月")}
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-6 py-5">
              <h3 className="text-xl font-semibold text-foreground">{tr("Credit activity", "额度活动记录")}</h3>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[840px]">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-3 border-b border-border bg-accent/20 px-6 py-4 text-sm text-muted-foreground">
                  <span>{tr("Change", "变更记录")}</span>
                  <span>{tr("Order No.", "单号")}</span>
                  <span>{tr("Time", "操作时间")}</span>
                  <span className="text-right">{tr("Credit", "额度")}</span>
                </div>
                <div className="divide-y divide-border/70">
                  {pointsActivities.map((item) => {
                    const isIncrease = item.direction === "increase";
                    return (
                      <div key={item.id} className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr] gap-3 px-6 py-5 text-sm">
                        <span className="flex items-center font-medium text-foreground">
                          {tr(item.reasonEn, item.reasonZh)}
                        </span>
                        <span className="flex items-center font-mono text-xs text-muted-foreground">{item.orderNo}</span>
                        <span className="flex items-center text-muted-foreground">{formatDateTime(item.occurredAt)}</span>
                        <span className={`text-right font-mono font-semibold ${isIncrease ? "text-emerald-400" : "text-rose-400"}`}>
                          {isIncrease ? "+" : "-"}{item.points.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <CreditsRechargeModal
        open={creditRechargeOpen}
        onClose={() => setCreditRechargeOpen(false)}
        mode={fundsModalMode}
      />
      <WalletWithdrawModal
        open={walletWithdrawOpen}
        onClose={() => setWalletWithdrawOpen(false)}
        mode={fundsModalMode}
      />
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

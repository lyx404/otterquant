export type GameWalletAccountKind = "coin" | "cash";

export type GameWalletActivityItem = {
  id: string;
  orderNo: string;
  reasonEn: string;
  reasonZh: string;
  occurredAt: string;
  amount: number;
  direction: "increase" | "decrease";
};

export const BALANCE_PER_USD = 100;
export const SYSTEM_BALANCE_AMOUNT = 100000000;
export const HUD_CASH_AMOUNT = 99.9;
export const HUD_CASH_CENTS = Math.round(HUD_CASH_AMOUNT * 100);
export const FISH_BALANCE_AMOUNT = 10000;
export const WALLET_BALANCE_USD = HUD_CASH_AMOUNT;
export const WALLET_BALANCE_AMOUNT = Math.round(WALLET_BALANCE_USD * BALANCE_PER_USD);

export const HUD_ASSETS = {
  coin: "/assets/hud-coin.svg",
  cash: "/assets/hud-cash.svg",
  fish: "/assets/hud-fish.svg",
  pond: "/assets/hud-pond.svg",
  market: "/assets/hud-market.svg",
  guide: "/assets/inventory-menu-icon-v2.svg",
  scratchCard: "/assets/hud-scratch-card.svg",
  wallet: "/assets/wallet-menu-icon-new.svg",
  leaderboard: "/assets/hud-leaderboard.svg",
  settings: "/assets/settings.svg",
  rod: "/assets/cast.svg",
  basket: "/assets/hud-basket-button.svg",
} as const;

export const coinActivities: GameWalletActivityItem[] = [
  {
    id: "coin-1",
    orderNo: "COIN-20260428-001",
    reasonEn: "Sold SSS-grade factor",
    reasonZh: "售出SSS级因子",
    occurredAt: "2026-04-28T10:24:00+08:00",
    amount: 2800,
    direction: "increase",
  },
  {
    id: "coin-2",
    orderNo: "COIN-20260427-002",
    reasonEn: "Bought scratch card",
    reasonZh: "购买刮刮乐",
    occurredAt: "2026-04-27T18:30:00+08:00",
    amount: 600,
    direction: "decrease",
  },
  {
    id: "coin-3",
    orderNo: "COIN-20260426-003",
    reasonEn: "Sold A-grade factor",
    reasonZh: "售出A级因子",
    occurredAt: "2026-04-26T09:10:00+08:00",
    amount: 5000,
    direction: "increase",
  },
  {
    id: "coin-4",
    orderNo: "COIN-20260425-004",
    reasonEn: "Bought scratch card",
    reasonZh: "购买刮刮乐",
    occurredAt: "2026-04-25T21:18:00+08:00",
    amount: 1200,
    direction: "decrease",
  },
  {
    id: "coin-5",
    orderNo: "COIN-20260424-005",
    reasonEn: "Sold S-grade factor",
    reasonZh: "售出S级因子",
    occurredAt: "2026-04-24T12:06:00+08:00",
    amount: 3600,
    direction: "increase",
  },
];

export const cashActivities: GameWalletActivityItem[] = [
  {
    id: "cash-1",
    orderNo: "CASH-20260428-001",
    reasonEn: "Scratch card prize",
    reasonZh: "刮刮乐中奖",
    occurredAt: "2026-04-28T10:24:00+08:00",
    amount: 32,
    direction: "increase",
  },
  {
    id: "cash-2",
    orderNo: "CASH-20260420-002",
    reasonEn: "Withdrawal",
    reasonZh: "提现",
    occurredAt: "2026-04-20T09:00:00+08:00",
    amount: 20,
    direction: "decrease",
  },
  {
    id: "cash-3",
    orderNo: "CASH-20260418-003",
    reasonEn: "Scratch card prize",
    reasonZh: "刮刮乐中奖",
    occurredAt: "2026-04-18T16:42:00+08:00",
    amount: 18,
    direction: "increase",
  },
  {
    id: "cash-4",
    orderNo: "CASH-20260415-004",
    reasonEn: "Withdrawal",
    reasonZh: "提现",
    occurredAt: "2026-04-15T21:18:00+08:00",
    amount: 6,
    direction: "decrease",
  },
  {
    id: "cash-5",
    orderNo: "CASH-20260412-005",
    reasonEn: "Scratch card prize",
    reasonZh: "刮刮乐中奖",
    occurredAt: "2026-04-12T12:06:00+08:00",
    amount: 12,
    direction: "increase",
  },
  {
    id: "cash-6",
    orderNo: "CASH-20260408-006",
    reasonEn: "Withdrawal",
    reasonZh: "提现",
    occurredAt: "2026-04-08T19:35:00+08:00",
    amount: 4,
    direction: "decrease",
  },
  {
    id: "cash-7",
    orderNo: "CASH-20260404-007",
    reasonEn: "Scratch card prize",
    reasonZh: "刮刮乐中奖",
    occurredAt: "2026-04-04T11:20:00+08:00",
    amount: 9,
    direction: "increase",
  },
  {
    id: "cash-8",
    orderNo: "CASH-20260330-008",
    reasonEn: "Withdrawal",
    reasonZh: "提现",
    occurredAt: "2026-03-30T14:52:00+08:00",
    amount: 3,
    direction: "decrease",
  },
  {
    id: "cash-9",
    orderNo: "CASH-20260326-009",
    reasonEn: "Scratch card prize",
    reasonZh: "刮刮乐中奖",
    occurredAt: "2026-03-26T08:30:00+08:00",
    amount: 5,
    direction: "increase",
  },
  {
    id: "cash-10",
    orderNo: "CASH-20260321-010",
    reasonEn: "Withdrawal",
    reasonZh: "提现",
    occurredAt: "2026-03-21T17:48:00+08:00",
    amount: 15,
    direction: "decrease",
  },
];

export function formatBalance(amount: number) {
  return `${Math.round(Number(amount) || 0).toLocaleString()}`;
}

export function formatHudBalance(amount: number) {
  const value = Math.round(Number(amount) || 0);
  const absValue = Math.abs(value);
  if (absValue <= 9999999) return value.toLocaleString();

  const units = [
    { suffix: "B", value: 1000000000 },
    { suffix: "M", value: 1000000 },
    { suffix: "K", value: 1000 },
  ];
  const unit = units.find((item) => absValue >= item.value) ?? units[units.length - 1];
  const compactValue = value / unit.value;
  const formatted = compactValue.toFixed(1);

  return `${formatted}${unit.suffix}`;
}

export function formatHudCashBalance(amount: number) {
  const value = Number(amount) || 0;
  const absValue = Math.abs(value);

  if (absValue < 1000) {
    return `$${value.toFixed(1)}`;
  }

  const units = [
    { suffix: "B", value: 1000000000 },
    { suffix: "M", value: 1000000 },
    { suffix: "K", value: 1000 },
  ];
  const unit = units.find((item) => absValue >= item.value) ?? units[units.length - 1];
  return `$${(value / unit.value).toFixed(1)}${unit.suffix}`;
}

export function balanceToUsd(amount: number) {
  return (Number(amount) || 0) / BALANCE_PER_USD;
}

export function usdToBalance(amount: number) {
  return Math.round((Number(amount) || 0) * BALANCE_PER_USD);
}

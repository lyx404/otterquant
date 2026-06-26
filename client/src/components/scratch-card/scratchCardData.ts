export type ScratchCardPrize = {
  num: number;
  cents: number;
};

export type ScratchTicket = {
  winning: number[];
  prizes: ScratchCardPrize[];
};

export const DESKTOP_STAGE_W = 1920;
export const DESKTOP_STAGE_H = 1080;
export const MOBILE_STAGE_W = 560;
export const MOBILE_STAGE_H = 1040;
export const MOBILE_BREAKPOINT = 767;
export const BASE_TILE = 150;
export const BASE_NUMBER_W = 150;
export const BASE_NUMBER_H = 80;
export const MIN_TICKET_QUANTITY = 1;
export const MAX_TICKET_QUANTITY = 100;
export const TICKET_PRICE = 1000;

export const SCRATCH_CARD_ASSETS = {
  sky: "/scratch-card/assets/bg.png",
  ribbonLeft: "/scratch-card/assets/top-left.svg",
  ribbonRight: "/scratch-card/assets/top-right.svg",
  back: "/scratch-card/assets/back.svg",
  coinFront: "/scratch-card/assets/coin-front.png",
  coinSide: "/scratch-card/assets/coin-side.png",
  balance: "/scratch-card/assets/balance.svg",
  cash: "/scratch-card/assets/cash.svg",
  banner: "/scratch-card/assets/banner.svg",
  stars: "/scratch-card/assets/stars.png",
  starMed: "/scratch-card/assets/star-med.svg",
  starSmall: "/scratch-card/assets/star-small.svg",
} as const;

export const SCRATCH_CARD_COPY = {
  zh: {
    htmlLang: "zh-CN",
    pageTitle: "幸运刮刮乐",
    title: "幸运刮刮乐",
    subtitle: "刮开好运，现金惊喜即刻到手",
    stats: "数值统计",
    closeScratchCard: "关闭刮刮乐",
    scratchAction: "刮奖操作",
    purchaseInfo: "购买信息",
    openGameCoins: "打开游戏币",
    openCash: "打开现金",
    quantity: "购买张数",
    quantityMinus: "减少购买张数",
    quantityPlus: "增加购买张数",
    ticket: "刮刮乐彩票",
    winningNumbers: "中奖号码",
    scratchArea: "待刮区",
    ticketUnit: "张",
    start: "开始刮奖",
    reveal: "一键刮开",
    revealAll: "一键全开",
    next: "下一张",
    confirm: "确认",
    prizeAmount: "中奖金额",
    totalPrizeAmount: "总中奖金额",
    noPrize: "未中奖",
    cumulative: "累计",
    closeWallet: "关闭钱包",
    insufficientBalance: "余额不足",
    completedProgress: (total: number) => `已完成 ${total}/${total} 张`,
    currentProgress: (current: number, total: number) => `第 ${current}/${total} 张`,
  },
  en: {
    htmlLang: "en",
    pageTitle: "Lucky Scratch",
    title: "Lucky Scratch",
    subtitle: "Scratch for luck. Cash surprises land instantly.",
    stats: "Stats",
    closeScratchCard: "Close scratch card",
    scratchAction: "Scratch action",
    purchaseInfo: "Purchase info",
    openGameCoins: "Open game coins",
    openCash: "Open cash",
    quantity: "Qty",
    quantityMinus: "Decrease qty",
    quantityPlus: "Increase qty",
    ticket: "Scratch card ticket",
    winningNumbers: "Winning Numbers",
    scratchArea: "Scratch Area",
    ticketUnit: "tix",
    start: "Start",
    reveal: "Reveal",
    revealAll: "Reveal All",
    next: "Next",
    confirm: "Confirm",
    prizeAmount: "Prize Amount",
    totalPrizeAmount: "Total Prize",
    noPrize: "No Prize",
    cumulative: "Total",
    closeWallet: "Close wallet",
    insufficientBalance: "Insufficient balance",
    completedProgress: (total: number) => `Completed ${total}/${total}`,
    currentProgress: (current: number, total: number) => `${current}/${total}`,
  },
} as const;

export const TICKET_POOL: ScratchTicket[] = [
  {
    winning: [1, 6, 20],
    prizes: [
      { num: 1, cents: 10 },
      { num: 10, cents: 10 },
      { num: 12, cents: 50 },
      { num: 12, cents: 30 },
      { num: 5, cents: 1000 },
      { num: 20, cents: 100 },
    ],
  },
  {
    winning: [3, 8, 12],
    prizes: [
      { num: 3, cents: 20 },
      { num: 9, cents: 10 },
      { num: 12, cents: 70 },
      { num: 8, cents: 40 },
      { num: 14, cents: 20 },
      { num: 18, cents: 200 },
    ],
  },
  {
    winning: [2, 5, 16],
    prizes: [
      { num: 2, cents: 50 },
      { num: 7, cents: 10 },
      { num: 16, cents: 120 },
      { num: 11, cents: 30 },
      { num: 5, cents: 200 },
      { num: 19, cents: 20 },
    ],
  },
  {
    winning: [4, 10, 18],
    prizes: [
      { num: 1, cents: 10 },
      { num: 10, cents: 80 },
      { num: 18, cents: 150 },
      { num: 6, cents: 20 },
      { num: 4, cents: 60 },
      { num: 20, cents: 100 },
    ],
  },
  {
    winning: [7, 13, 19],
    prizes: [
      { num: 7, cents: 30 },
      { num: 13, cents: 100 },
      { num: 15, cents: 10 },
      { num: 19, cents: 200 },
      { num: 2, cents: 20 },
      { num: 8, cents: 40 },
    ],
  },
  {
    winning: [9, 14, 18],
    prizes: [
      { num: 1, cents: 10 },
      { num: 3, cents: 20 },
      { num: 5, cents: 30 },
      { num: 7, cents: 50 },
      { num: 12, cents: 100 },
      { num: 20, cents: 200 },
    ],
  },
];

export function formatScratchCash(cents: number) {
  return `$${(cents / 100).toFixed(1)}`;
}

export function ticketWinCents(ticket: ScratchTicket) {
  return ticket.prizes.reduce((sum, prize) => (
    ticket.winning.includes(prize.num) ? sum + prize.cents : sum
  ), 0);
}

export function pickScratchTicket() {
  return TICKET_POOL[Math.floor(Math.random() * TICKET_POOL.length)];
}

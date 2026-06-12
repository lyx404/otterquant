import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { usePageTransition } from "@/contexts/PageTransitionContext";
import { useAppLanguage } from "@/contexts/AppLanguageContext";

const SCRATCH_CARD_SRC = "/scratch-card/index.html";
type ScratchCardWalletKind = "coin" | "cash";
type WalletActivityItem = {
  id: string;
  orderNo: string;
  reasonEn: string;
  reasonZh: string;
  occurredAt: string;
  amount: number;
  direction: "increase" | "decrease";
};

const SYSTEM_BALANCE_AMOUNT = 1000000;
const HUD_CASH_AMOUNT = 999.0;
const HUD_ASSETS = {
  coin: "/assets/hud-coin.svg",
  cash: "/assets/hud-cash.svg",
} as const;

const coinActivities: WalletActivityItem[] = [
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

const cashActivities: WalletActivityItem[] = [
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
];

function formatBalance(amount: number) {
  return `${Math.round(Number(amount) || 0).toLocaleString()}`;
}

export default function ScratchCard() {
  const { navigateWithTransition } = usePageTransition();
  const { uiLang } = useAppLanguage();
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletAccountKind, setWalletAccountKind] = useState<ScratchCardWalletKind>("coin");
  const scratchCardTitle = uiLang === "zh" ? "幸运刮刮乐" : "Lucky Scratch Card";
  const scratchCardSrc = `${SCRATCH_CARD_SRC}?lang=${uiLang}`;
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const activeWalletConfig = walletAccountKind === "coin"
    ? {
        title: tr("Game Coins", "游戏币"),
        balance: formatBalance(SYSTEM_BALANCE_AMOUNT),
        icon: HUD_ASSETS.coin,
        activities: coinActivities,
        formatActivityAmount: formatBalance,
      }
    : {
        title: tr("Cash", "现金"),
        balance: `$${HUD_CASH_AMOUNT.toFixed(1)}`,
        icon: HUD_ASSETS.cash,
        activities: cashActivities,
        formatActivityAmount: (amount: number) => `$${amount.toFixed(2)}`,
      };
  const formatWalletDateTime = (value: string) => new Intl.DateTimeFormat(
    uiLang === "zh" ? "zh-CN" : "en-US",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
  ).format(new Date(value));

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "scratch-card:back") {
        const origin = event.data.origin;
        const hasOrigin =
          typeof origin?.x === "number" &&
          typeof origin?.y === "number" &&
          origin.x >= 0 &&
          origin.x <= 1 &&
          origin.y >= 0 &&
          origin.y <= 1;
        void navigateWithTransition("/", hasOrigin ? origin : undefined);
      }
      if (event.data?.type === "scratch-card:wallet") {
        const accountKind = event.data.accountKind as ScratchCardWalletKind;
        if (accountKind !== "coin" && accountKind !== "cash") return;
        setWalletAccountKind(accountKind);
        setWalletOpen(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigateWithTransition]);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "#c6d1f6",
      }}
      aria-label={scratchCardTitle}
    >
      <iframe
        title={scratchCardTitle}
        src={scratchCardSrc}
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
        }}
      />
      {walletOpen && (
        <div
          className="scratch-wallet-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setWalletOpen(false);
          }}
        >
          <section
            className="scratch-wallet-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scratch-wallet-title"
          >
            <header className="scratch-wallet-header">
              <h2 className="scratch-wallet-title" id="scratch-wallet-title">
                {activeWalletConfig.title}
              </h2>
              <button
                className="scratch-wallet-close"
                type="button"
                aria-label={tr("Close wallet", "关闭钱包")}
                onClick={() => setWalletOpen(false)}
              >
                <X size={22} strokeWidth={3} />
              </button>
            </header>

            <div className="scratch-wallet-content">
              <section className="scratch-wallet-balance-card">
                <div className="scratch-wallet-balance-value">
                  <img src={activeWalletConfig.icon} alt="" />
                  <span>{activeWalletConfig.balance}</span>
                </div>
              </section>

              <section className="scratch-wallet-section">
                <div className="scratch-wallet-table">
                  <div className="scratch-wallet-row scratch-wallet-row--head">
                    <span>{tr("Activity", "变更记录")}</span>
                    <span>{tr("Order No.", "单号")}</span>
                    <span>{tr("Time", "变更时间")}</span>
                    <span className="scratch-wallet-amount">
                      <span className="scratch-wallet-amount-label">
                        <img src={activeWalletConfig.icon} alt="" />
                        <span>{tr("Balance", "余额")}</span>
                      </span>
                    </span>
                  </div>
                  {activeWalletConfig.activities.map((item) => {
                    const isIncrease = item.direction === "increase";
                    return (
                      <div className="scratch-wallet-row" key={item.id}>
                        <span>{tr(item.reasonEn, item.reasonZh)}</span>
                        <span className="scratch-wallet-mono">{item.orderNo}</span>
                        <span>{formatWalletDateTime(item.occurredAt)}</span>
                        <span className="scratch-wallet-amount">
                          {isIncrease ? "+" : "-"}{activeWalletConfig.formatActivityAmount(item.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </section>
        </div>
      )}
      <style>{`
        .scratch-wallet-backdrop {
          position: absolute;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(78, 67, 60, .22);
          backdrop-filter: blur(2px);
          font-family: "Alimama FangYuanTi VF", "Alimama FangYuanTi", "Alibaba PuHuiTi", "PingFang SC", "Microsoft YaHei", sans-serif;
        }

        .scratch-wallet-modal {
          width: min(1080px, 94vw);
          max-height: min(720px, 88vh);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: linear-gradient(180deg, #fffdf4 0%, #fff8e7 100%);
          border: 2px solid rgba(196, 184, 158, .9);
          border-radius: 8px;
          box-shadow:
            0 0 0 2px rgba(255, 253, 244, .88),
            5px 5px 0 rgba(189, 174, 160, .72),
            0 20px 48px rgba(66, 48, 31, .18);
          color: #4e433c;
          image-rendering: pixelated;
        }

        .scratch-wallet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 16px 18px;
          background: rgba(255, 249, 232, .88);
          border-bottom: 2px solid rgba(196, 184, 158, .62);
        }

        .scratch-wallet-title {
          margin: 0;
          color: #4e433c;
          font-size: 30px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: 0;
        }

        .scratch-wallet-close {
          width: 38px;
          height: 38px;
          display: inline-grid;
          place-items: center;
          flex: 0 0 auto;
          color: #4e433c;
          background: #fff3d3;
          border: 1.5px solid rgba(196, 184, 158, .86);
          border-radius: 4px;
          box-shadow: 2px 2px 0 rgba(189, 174, 160, .48);
          cursor: pointer;
        }

        .scratch-wallet-close:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 rgba(189, 174, 160, .58);
        }

        .scratch-wallet-content {
          min-height: 0;
          overflow: auto;
          padding: 18px clamp(18px, 2.6vw, 34px) 24px;
        }

        .scratch-wallet-balance-card,
        .scratch-wallet-section {
          background: rgba(255, 253, 244, .86);
          border: 2px solid rgba(196, 184, 158, .7);
          border-radius: 8px;
          box-shadow: 3px 3px 0 rgba(189, 174, 160, .35);
        }

        .scratch-wallet-balance-card {
          padding: 18px;
        }

        .scratch-wallet-balance-value {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #4e433c;
          font-size: 32px;
          font-weight: 950;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }

        .scratch-wallet-balance-value img {
          width: 40px;
          height: 41px;
          flex: 0 0 auto;
          object-fit: contain;
          image-rendering: pixelated;
        }

        .scratch-wallet-section {
          margin-top: 16px;
          overflow: auto;
        }

        .scratch-wallet-table {
          min-width: 720px;
        }

        .scratch-wallet-row {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr .75fr;
          gap: 12px;
          align-items: center;
          padding: 12px 16px;
          color: #4e433c;
          font-size: 13px;
          font-weight: 800;
          border-bottom: 1px solid rgba(196, 184, 158, .45);
        }

        .scratch-wallet-row:last-child {
          border-bottom: 0;
        }

        .scratch-wallet-row--head {
          color: rgba(78, 67, 60, .68);
          background: rgba(255, 249, 232, .65);
          font-size: 12px;
          font-weight: 950;
        }

        .scratch-wallet-mono,
        .scratch-wallet-amount {
          font-variant-numeric: tabular-nums;
        }

        .scratch-wallet-mono {
          font-size: 12px;
        }

        .scratch-wallet-amount {
          text-align: right;
          font-weight: 950;
        }

        .scratch-wallet-amount-label {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
        }

        .scratch-wallet-amount-label img {
          width: 18px;
          height: 18px;
          object-fit: contain;
          image-rendering: pixelated;
        }

        @media (max-width: 760px) {
          .scratch-wallet-backdrop {
            align-items: stretch;
            padding: 14px;
          }

          .scratch-wallet-modal {
            width: 100%;
            max-height: none;
          }

          .scratch-wallet-title {
            font-size: 24px;
          }
        }
      `}</style>
    </main>
  );
}

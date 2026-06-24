import { ArrowLeft, CreditCard, X } from "lucide-react";
import type { ReactNode } from "react";
import "./GameWalletModal.css";
import {
  cashActivities,
  coinActivities,
  formatBalance,
  HUD_ASSETS,
  type GameWalletAccountKind,
  type GameWalletActivityItem,
} from "@/lib/gameWallet";

type WalletConfig = {
  title: string;
  balance: string;
  icon: string;
  activities: GameWalletActivityItem[];
  formatActivityAmount: (amount: number) => string;
  allowWithdraw: boolean;
};

type GameWalletModalProps = {
  accountKind: GameWalletAccountKind;
  cashBalance: string;
  coinBalance: string;
  closeLabel: string;
  pageTransitionPhase?: "opening" | "open" | "closing";
  isWithdrawOpen?: boolean;
  titleOverride?: string;
  closeWithdrawLabel?: string;
  backLabel?: string;
  onClose: () => void;
  onBackdropClose?: () => void;
  onOpenCashWallet?: () => void;
  onWithdraw?: () => void;
  withdrawContent?: ReactNode;
  tr: (en: string, zh: string) => string;
  formatWalletDateTime: (value: string) => string;
};

export function GameWalletModal({
  accountKind,
  cashBalance,
  coinBalance,
  closeLabel,
  pageTransitionPhase,
  isWithdrawOpen = false,
  titleOverride,
  closeWithdrawLabel,
  backLabel,
  onClose,
  onBackdropClose,
  onOpenCashWallet,
  onWithdraw,
  withdrawContent,
  tr,
  formatWalletDateTime,
}: GameWalletModalProps) {
  const activeWalletConfig: WalletConfig = accountKind === "coin"
    ? {
        title: tr("Game Coins", "游戏币"),
        balance: coinBalance,
        icon: HUD_ASSETS.coin,
        activities: coinActivities,
        formatActivityAmount: formatBalance,
        allowWithdraw: false,
      }
    : {
        title: tr("Cash", "现金"),
        balance: cashBalance,
        icon: HUD_ASSETS.cash,
        activities: cashActivities,
        formatActivityAmount: (amount: number) => `$${amount.toFixed(2)}`,
        allowWithdraw: true,
      };
  const title = titleOverride ?? (isWithdrawOpen ? tr("Withdraw", "提现") : activeWalletConfig.title);

  return (
    <div
      className="shop-modal-backdrop wallet-modal-backdrop mobile-page-shell"
      data-mobile-page-transition={pageTransitionPhase}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          (onBackdropClose ?? onClose)();
        }
      }}
    >
      <section className="shop-modal wallet-modal mobile-page-surface" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title">
        <header className="shop-modal__header">
          <div className="wallet-modal__heading">
            {isWithdrawOpen && onOpenCashWallet && (
              <button
                className="wallet-modal__back"
                type="button"
                aria-label={backLabel ?? tr("Back to wallet", "返回钱包")}
                onClick={onOpenCashWallet}
              >
                <ArrowLeft size={20} strokeWidth={3} />
              </button>
            )}
            <h2 className="shop-modal__title" id="wallet-modal-title">{title}</h2>
          </div>
          <button
            className="shop-modal__close"
            type="button"
            aria-label={isWithdrawOpen ? (closeWithdrawLabel ?? closeLabel) : closeLabel}
            onClick={onClose}
          >
            <X size={22} strokeWidth={3} />
          </button>
        </header>

        <div className="wallet-content">
          <div className={`wallet-panel${isWithdrawOpen ? " wallet-panel--withdraw-flow" : " wallet-panel--overview"}`}>
            {isWithdrawOpen && withdrawContent ? (
              withdrawContent
            ) : (
              <>
                <div className="wallet-summary-grid">
                  <section className={`wallet-card wallet-card--balance${activeWalletConfig.allowWithdraw ? " wallet-card--withdrawable" : ""}`}>
                    <div className="wallet-card__balance-main">
                      <div className="wallet-card__value wallet-balance-value">
                        <img className="wallet-balance-value__icon" src={activeWalletConfig.icon} alt="" />
                        <span>{activeWalletConfig.balance}</span>
                      </div>
                    </div>
                    {activeWalletConfig.allowWithdraw && onWithdraw && (
                      <div className="wallet-action-row">
                        <button
                          className="wallet-action"
                          type="button"
                          onClick={onWithdraw}
                        >
                          <CreditCard size={16} strokeWidth={3} />
                          {tr("Withdraw", "提现")}
                        </button>
                      </div>
                    )}
                  </section>
                </div>

                <section className="wallet-section">
                  <div className="wallet-table">
                    <div className="wallet-table__row wallet-table__row--head">
                      <span className="wallet-table__activity">{tr("Activity", "变更记录")}</span>
                      <span className="wallet-table__order">{tr("Order No.", "单号")}</span>
                      <span className="wallet-table__time">{tr("Time", "变更时间")}</span>
                      <span className="wallet-table__amount">
                        <span className="wallet-table__balance">
                          <img className="wallet-table__balance-icon" src={activeWalletConfig.icon} alt="" />
                          <span>{tr("Balance", "余额")}</span>
                        </span>
                      </span>
                    </div>
                    {activeWalletConfig.activities.map((item) => {
                      const isIncrease = item.direction === "increase";
                      return (
                        <div className="wallet-table__row wallet-table__row--item" key={item.id}>
                          <span className="wallet-table__activity">{tr(item.reasonEn, item.reasonZh)}</span>
                          <span className="wallet-table__mono wallet-table__order">
                            <span className="wallet-table__mobile-label">{tr("Order No.", "单号")}</span>
                            <span className="wallet-table__mobile-value">{item.orderNo}</span>
                          </span>
                          <span className="wallet-table__time">
                            <span className="wallet-table__mobile-label">{tr("Time", "变更时间")}</span>
                            <span className="wallet-table__mobile-value">{formatWalletDateTime(item.occurredAt)}</span>
                          </span>
                          <span className={`wallet-table__amount ${isIncrease ? "wallet-table__amount--plus" : "wallet-table__amount--minus"}`}>
                            <span className="wallet-table__balance">
                              <span>{isIncrease ? "+" : "-"}{activeWalletConfig.formatActivityAmount(item.amount)}</span>
                            </span>
                          </span>
                      </div>
                    );
                  })}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

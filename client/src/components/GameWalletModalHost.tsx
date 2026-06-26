import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { GameWalletModal } from "@/components/GameWalletModal";
import { useAppLanguage, type UiLang } from "@/contexts/AppLanguageContext";
import { useGameEconomy } from "@/contexts/GameEconomyContext";
import {
  BALANCE_PER_USD,
  balanceToUsd,
  formatBalance,
  type GameWalletAccountKind,
} from "@/lib/gameWallet";

type MobilePageTransitionPhase = "opening" | "open" | "closing";
type FundsStatus = "idle" | "processing" | "success" | "error";

const MIN_AMOUNT = 1000;
const MAX_AMOUNT = 500000;
const WITHDRAWAL_NETWORKS = [
  "Ethereum (ERC20)",
  "BNB Smart Chain (BEP20)",
  "Arbitrum One (ARB)",
  "Solana (SOL)",
] as const;
const DEFAULT_WITHDRAWAL_NETWORK = WITHDRAWAL_NETWORKS[0];

function useLocalPrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function useMobilePageTransition(isOpen: boolean, exitDurationMs = 220, enterDurationMs = 320) {
  const prefersReducedMotion = useLocalPrefersReducedMotion();
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [phase, setPhase] = useState<MobilePageTransitionPhase>(isOpen ? "open" : "closing");

  useEffect(() => {
    if (prefersReducedMotion) {
      setShouldRender(isOpen);
      setPhase(isOpen ? "open" : "closing");
      return undefined;
    }

    let timeoutId = 0;

    if (isOpen) {
      setShouldRender(true);
      setPhase("opening");
      timeoutId = window.setTimeout(() => {
        setPhase("open");
      }, enterDurationMs);
    } else if (shouldRender) {
      setPhase("closing");
      timeoutId = window.setTimeout(() => {
        setShouldRender(false);
      }, exitDurationMs);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [enterDurationMs, exitDurationMs, isOpen, prefersReducedMotion, shouldRender]);

  return { shouldRender, phase };
}

function formatUsd(amount: number) {
  return `${(Number(amount) || 0).toFixed(2)} USD`;
}

function formatUsdInputValue(amount: number) {
  return balanceToUsd(amount).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function isValidAmount(amount: number) {
  const value = Number(amount);
  return Number.isFinite(value) && value >= MIN_AMOUNT && value <= MAX_AMOUNT;
}

function isValidWithdrawalAddress(network: string, address: string) {
  const value = String(address || "").trim();
  if (!value) return false;
  if (value.length < 8 || value.length > 128) return false;
  if (network === "Solana (SOL)") return /^[1-9A-HJ-NP-Za-km-z]{8,128}$/.test(value);
  return /^0x[a-fA-F0-9]{6,126}$/.test(value);
}

function getWithdrawalAddressHint(network: string, lang: UiLang) {
  return network === "Solana (SOL)"
    ? lang === "zh"
      ? "请输入 8-128 字符的 Solana 钱包地址。"
      : "Enter an 8-128 character Solana wallet address."
    : lang === "zh"
      ? "请输入以 0x 开头的 EVM 钱包地址，长度为 8-128 字符。"
      : "Enter an EVM wallet address starting with 0x, 8-128 characters.";
}

export type GameWalletModalController = {
  openWalletModal: (accountKind?: GameWalletAccountKind) => void;
  walletPageTransition: {
    shouldRender: boolean;
    phase: MobilePageTransitionPhase;
  };
  walletAccountKind: GameWalletAccountKind;
  walletWithdrawOpen: boolean;
  closeWalletModal: () => void;
  openCashWallet: () => void;
  openWithdrawModal: () => void;
  withdrawContent: ReactNode;
  tr: (en: string, zh: string) => string;
  formatWalletDateTime: (value: string) => string;
  coinBalanceText: string;
  cashBalanceText: string;
};

const GameWalletModalContext = createContext<GameWalletModalController | null>(null);

export function useGameWalletModalController(
  initialAccountKind: GameWalletAccountKind = "coin",
): GameWalletModalController {
  const { uiLang } = useAppLanguage();
  const { coinBalance, cashCents, spendCashCents } = useGameEconomy();
  const tr = useCallback((en: string, zh: string) => (uiLang === "zh" ? zh : en), [uiLang]);

  const [walletOpen, setWalletOpen] = useState(false);
  const walletPageTransition = useMobilePageTransition(walletOpen, 260);
  const [walletAccountKind, setWalletAccountKind] = useState<GameWalletAccountKind>(initialAccountKind);
  const [walletWithdrawOpen, setWalletWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(MIN_AMOUNT);
  const [withdrawNetwork, setWithdrawNetwork] = useState<string>(DEFAULT_WITHDRAWAL_NETWORK);
  const [withdrawNetworkOpen, setWithdrawNetworkOpen] = useState(false);
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAddressError, setWithdrawAddressError] = useState("");
  const [withdrawAccountBound, setWithdrawAccountBound] = useState(false);
  const [withdrawWalletEditing, setWithdrawWalletEditing] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState<FundsStatus>("idle");
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const withdrawNetworkSelectRef = useRef<HTMLDivElement | null>(null);

  const cashBalanceUsd = cashCents / BALANCE_PER_USD;
  const walletBalanceAmount = cashCents;
  const walletBalanceUsd = balanceToUsd(walletBalanceAmount);

  const resetWithdrawFeedback = useCallback(() => {
    setWithdrawStatus("idle");
  }, []);

  useEffect(() => {
    if (!withdrawNetworkOpen) return undefined;

    const closeWithdrawNetwork = (event: PointerEvent) => {
      if (withdrawNetworkSelectRef.current && !withdrawNetworkSelectRef.current.contains(event.target as Node)) {
        setWithdrawNetworkOpen(false);
      }
    };
    const handleWithdrawNetworkKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWithdrawNetworkOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeWithdrawNetwork);
    document.addEventListener("keydown", handleWithdrawNetworkKeydown);
    return () => {
      document.removeEventListener("pointerdown", closeWithdrawNetwork);
      document.removeEventListener("keydown", handleWithdrawNetworkKeydown);
    };
  }, [withdrawNetworkOpen]);

  useEffect(() => {
    if (walletOpen || walletPageTransition.shouldRender) return;
    setWalletWithdrawOpen(false);
    setWithdrawNetworkOpen(false);
    setWithdrawWalletEditing(false);
    resetWithdrawFeedback();
  }, [resetWithdrawFeedback, walletOpen, walletPageTransition.shouldRender]);

  const handleWithdrawNetworkChange = useCallback((network: string) => {
    setWithdrawNetwork(network);
    setWithdrawAccountBound(false);
    setWithdrawAddressError("");
    resetWithdrawFeedback();
    setWithdrawNetworkOpen(false);
  }, [resetWithdrawFeedback]);

  const openWalletModal = useCallback((accountKind: GameWalletAccountKind = walletAccountKind) => {
    setWalletAccountKind(accountKind);
    setWalletWithdrawOpen(false);
    setWithdrawNetworkOpen(false);
    setWalletOpen(true);
    setWithdrawWalletEditing(false);
    resetWithdrawFeedback();
  }, [resetWithdrawFeedback, walletAccountKind]);

  const openWithdrawModal = useCallback(() => {
    setWalletWithdrawOpen(true);
    setWithdrawNetworkOpen(false);
    setWithdrawWalletEditing(false);
    resetWithdrawFeedback();
  }, [resetWithdrawFeedback]);

  const closeWalletModal = useCallback(() => {
    setWalletOpen(false);
    setWithdrawNetworkOpen(false);
  }, []);

  const openCashWallet = useCallback(() => {
    openWalletModal("cash");
  }, [openWalletModal]);

  const formatWalletDateTime = useCallback((value: string) => {
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
  }, [uiLang]);

  const handleBindWithdrawWallet = useCallback(() => {
    if (!isValidWithdrawalAddress(withdrawNetwork, withdrawAddress)) {
      setWithdrawAddressError(getWithdrawalAddressHint(withdrawNetwork, uiLang));
      setWithdrawAccountBound(false);
      setWithdrawWalletEditing(true);
      return;
    }
    setWithdrawAccountBound(true);
    setWithdrawWalletEditing(false);
    setWithdrawAddressError("");
    resetWithdrawFeedback();
  }, [resetWithdrawFeedback, uiLang, withdrawAddress, withdrawNetwork]);

  const handleSubmitWithdraw = useCallback(async () => {
    const validAmount = isValidAmount(withdrawAmount) && withdrawAmount <= walletBalanceAmount;
    const validAddress = withdrawAccountBound && isValidWithdrawalAddress(withdrawNetwork, withdrawAddress);
    if (!validAmount || !validAddress || withdrawSubmitting || withdrawStatus === "success") return;
    setWithdrawSubmitting(true);
    setWithdrawStatus("processing");
    await new Promise((resolve) => window.setTimeout(resolve, 850));
    if (withdrawAmount === 3000) {
      setWithdrawStatus("error");
    } else {
      spendCashCents(withdrawAmount);
      setWithdrawStatus("success");
    }
    setWithdrawSubmitting(false);
  }, [
    spendCashCents,
    walletBalanceAmount,
    withdrawAccountBound,
    withdrawAddress,
    withdrawAmount,
    withdrawNetwork,
    withdrawStatus,
    withdrawSubmitting,
  ]);

  const withdrawAmountValid = isValidAmount(withdrawAmount) && withdrawAmount <= walletBalanceAmount;
  const withdrawAddressValue = withdrawAddress.trim();
  const withdrawWalletFormOpen = !withdrawAccountBound || withdrawWalletEditing;
  const withdrawAddressValid = isValidWithdrawalAddress(withdrawNetwork, withdrawAddress);
  const withdrawPrimaryDisabled =
    withdrawStatus === "success"
      ? false
      : withdrawWalletFormOpen
        ? !withdrawAddressValue
        : withdrawSubmitting || !withdrawAmountValid || !withdrawAccountBound || !withdrawAddressValid;
  const withdrawPrimaryLabel = withdrawSubmitting
    ? tr("Submitting...", "提交中...")
    : withdrawStatus === "success"
      ? tr("Back", "返回")
      : withdrawWalletFormOpen
        ? withdrawAccountBound
          ? tr("Save wallet", "保存钱包")
          : tr("Bind wallet", "绑定钱包")
        : withdrawAccountBound
          ? tr("Confirm withdrawal", "确认提现")
          : tr("Bind wallet", "绑定钱包");

  const handleWithdrawPrimaryAction = useCallback(() => {
    if (withdrawStatus === "success") {
      openWalletModal("cash");
      return;
    }

    void handleSubmitWithdraw();
  }, [handleSubmitWithdraw, openWalletModal, withdrawStatus]);

  const withdrawContent = useMemo(() => (
    <section className="wallet-withdraw wallet-withdraw--modal">
      {withdrawWalletFormOpen ? (
        <div className="wallet-withdraw__steps">
          <section className="wallet-step">
            <div className="wallet-step__body">
              <div className="wallet-step__head">
                <h3 className="wallet-step__title">{withdrawAccountBound ? tr("Change bound wallet", "更改绑定钱包") : tr("Bind wallet", "绑定钱包")}</h3>
              </div>
              <div className="wallet-field">
                <span>{tr("Network", "选择网络")}</span>
                <div
                  className={`wallet-select${withdrawNetworkOpen ? " is-open" : ""}`}
                  ref={withdrawNetworkSelectRef}
                >
                  <button
                    className="wallet-select__button"
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={withdrawNetworkOpen}
                    onClick={() => setWithdrawNetworkOpen((open) => !open)}
                  >
                    <span className="wallet-select__value">{withdrawNetwork}</span>
                    <span className="wallet-select__chevron" aria-hidden="true" />
                  </button>
                  {withdrawNetworkOpen ? (
                    <div
                      className="wallet-select__menu"
                      role="listbox"
                      aria-label={tr("Network", "选择网络")}
                    >
                      {WITHDRAWAL_NETWORKS.map((network) => (
                        <button
                          key={network}
                          className={`wallet-select__option${network === withdrawNetwork ? " is-selected" : ""}`}
                          type="button"
                          role="option"
                          aria-selected={network === withdrawNetwork}
                          onClick={() => handleWithdrawNetworkChange(network)}
                        >
                          {network}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <label className="wallet-field">
                <span>{tr("Wallet address", "钱包地址")}</span>
                <input
                  className="wallet-input"
                  value={withdrawAddress}
                  onChange={(event) => {
                    setWithdrawAddress(event.target.value);
                    setWithdrawAccountBound(false);
                    setWithdrawAddressError("");
                    resetWithdrawFeedback();
                  }}
                  placeholder={tr("Enter wallet address", "输入钱包地址")}
                />
                {withdrawAddressError && (
                  <span className="wallet-field__hint is-error">
                    {withdrawAddressError}
                  </span>
                )}
              </label>
            </div>
          </section>

          <div className="wallet-withdraw__actions">
            <button
              className="wallet-submit"
              type="button"
              disabled={withdrawPrimaryDisabled}
              onClick={handleBindWithdrawWallet}
            >
              {withdrawPrimaryLabel}
            </button>
          </div>
        </div>
      ) : (
        <div className="wallet-withdraw__steps">
          <section className="wallet-step">
            <div className="wallet-step__body">
              <div className="wallet-step__head">
                <h3 className="wallet-step__title">{tr("Enter withdrawal amount", "输入提现金额")}</h3>
              </div>
              <label className="wallet-field">
                <span className="wallet-input-unit-wrap">
                  <input
                    className="wallet-input wallet-input--with-unit"
                    inputMode="decimal"
                    aria-label={tr("Withdrawal amount", "提现金额")}
                    value={withdrawAmount ? formatUsdInputValue(withdrawAmount) : ""}
                    onChange={(event) => {
                      const clean = event.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
                      setWithdrawAmount(clean === "" ? 0 : Math.round(Number(clean || 0) * BALANCE_PER_USD));
                      resetWithdrawFeedback();
                    }}
                    placeholder={tr("Enter USD amount", "输入 USD 金额")}
                  />
                  <span className="wallet-input-unit" aria-hidden="true">USD</span>
                </span>
              </label>
              <div className={`wallet-conversion${withdrawAmountValid ? "" : " is-error"}`}>
                <span>
                  {tr("Minimum", "最低")} {formatUsd(MIN_AMOUNT / BALANCE_PER_USD)} · {tr("Available", "可提现")} {formatUsd(walletBalanceUsd)}
                </span>
              </div>
            </div>
          </section>

          <section className="wallet-step">
            <div className="wallet-step__body">
              <div className="wallet-bound-summary">
                <div className="wallet-bound-summary__main">
                  <span className="wallet-bound-summary__label">{tr("Withdraw to", "提现至")}</span>
                  <span className="wallet-bound-summary__target">
                    <span className="wallet-bound-summary__address" title={withdrawAddressValue}>
                      {withdrawAddressValue}
                    </span>
                    <span className="wallet-bound-summary__network">{withdrawNetwork}</span>
                  </span>
                </div>
                <button
                  className="wallet-bound-summary__edit"
                  type="button"
                  onClick={() => {
                    setWithdrawWalletEditing(true);
                    resetWithdrawFeedback();
                  }}
                >
                  {tr("Change", "更改")}
                </button>
              </div>
            </div>
          </section>

          <div className="wallet-withdraw__actions">
            {withdrawStatus === "error" && (
              <div className="wallet-status is-error">
                {tr(
                  "Withdrawal preview failed. Try 10.00 USD, 20.00 USD, or 50.00 USD to view the success state.",
                  "提现预览失败。请尝试 10.00 USD、20.00 USD 或 50.00 USD 查看成功状态。"
                )}
              </div>
            )}
            {withdrawStatus === "success" && (
              <div className="wallet-status">
                {tr(
                  `${formatUsd(balanceToUsd(withdrawAmount))} withdrawal request submitted.`,
                  `${formatUsd(balanceToUsd(withdrawAmount))} 提现申请已提交。`
                )}
              </div>
            )}
            <button
              className="wallet-submit wallet-submit--withdraw"
              type="button"
              disabled={withdrawPrimaryDisabled}
              onClick={handleWithdrawPrimaryAction}
            >
              {withdrawPrimaryLabel}
            </button>
          </div>
        </div>
      )}
    </section>
  ), [
    handleBindWithdrawWallet,
    handleWithdrawNetworkChange,
    handleWithdrawPrimaryAction,
    resetWithdrawFeedback,
    tr,
    walletBalanceUsd,
    withdrawAccountBound,
    withdrawAddress,
    withdrawAddressError,
    withdrawAmount,
    withdrawAmountValid,
    withdrawNetwork,
    withdrawNetworkOpen,
    withdrawPrimaryDisabled,
    withdrawPrimaryLabel,
    withdrawStatus,
    withdrawWalletFormOpen,
    withdrawAddressValue,
  ]);

  return {
    openWalletModal,
    walletPageTransition,
    walletAccountKind,
    walletWithdrawOpen,
    closeWalletModal,
    openCashWallet,
    openWithdrawModal,
    withdrawContent,
    tr,
    formatWalletDateTime,
    coinBalanceText: formatBalance(coinBalance),
    cashBalanceText: `$${cashBalanceUsd.toFixed(1)}`,
  };
}

export function GameWalletModalHost({ controller }: { controller: GameWalletModalController }) {
  if (!controller.walletPageTransition.shouldRender) return null;

  return (
    <GameWalletModal
      accountKind={controller.walletAccountKind}
      cashBalance={controller.cashBalanceText}
      coinBalance={controller.coinBalanceText}
      closeLabel={controller.tr("Close wallet", "关闭钱包")}
      closeWithdrawLabel={controller.tr("Close withdraw", "关闭提现")}
      backLabel={controller.tr("Back to wallet", "返回钱包")}
      pageTransitionPhase={controller.walletPageTransition.phase}
      isWithdrawOpen={controller.walletWithdrawOpen}
      onClose={controller.closeWalletModal}
      onBackdropClose={controller.closeWalletModal}
      onOpenCashWallet={controller.openCashWallet}
      onWithdraw={controller.openWithdrawModal}
      withdrawContent={controller.withdrawContent}
      tr={controller.tr}
      formatWalletDateTime={controller.formatWalletDateTime}
    />
  );
}

export function GameWalletModalProvider({ children }: { children: ReactNode }) {
  const controller = useGameWalletModalController("coin");

  return (
    <GameWalletModalContext.Provider value={controller}>
      {children}
      <GameWalletModalHost controller={controller} />
    </GameWalletModalContext.Provider>
  );
}

export function useGameWalletModal() {
  const controller = useContext(GameWalletModalContext);

  if (!controller) {
    throw new Error("useGameWalletModal must be used within GameWalletModalProvider");
  }

  return controller;
}

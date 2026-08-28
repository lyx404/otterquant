import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarketplaceAvatar } from "@/components/MarketplaceAvatar";
import type { UiCopy } from "@/contexts/AppLanguageContext";
import type { Strategy } from "@/lib/mockData";
import type { MarketplaceAvatarTone } from "@/lib/marketplaceData";
import "./CopyTradeDialog.css";

const AVAILABLE_FUNDS = 438_473;
const MIN_COPY_AMOUNT = 5_000;
const COPY_AMOUNT_STEP = 1_000;

function formatUsdt(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CopyTradeDialog({
  strategy,
  identity,
  tr,
  onOpenChange,
  onConfirm,
}: {
  strategy: Strategy | null;
  identity?: {
    avatar: string;
    author: string;
    strategyName: string;
    avatarTone?: MarketplaceAvatarTone;
  };
  tr: (en: string, zh: string, copy?: UiCopy) => string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(0);
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");
  const [adjustmentFeedback, setAdjustmentFeedback] = useState("");
  const fieldMessage = error || adjustmentFeedback;
  const displayIdentity = strategy
    ? identity ?? {
        avatar: strategy.author.slice(0, 1),
        author: strategy.author,
        strategyName: strategy.name,
      }
    : null;

  useEffect(() => {
    if (strategy) {
      setAmount(0);
      setAmountInput("");
      setError("");
      setAdjustmentFeedback("");
    }
  }, [strategy?.id]);

  useEffect(() => {
    if (!adjustmentFeedback) return;
    const timeoutId = window.setTimeout(() => setAdjustmentFeedback(""), 2_000);
    return () => window.clearTimeout(timeoutId);
  }, [adjustmentFeedback]);

  const normalizedAmount = (value: number) => {
    const boundedAmount = Math.max(value, 0);
    return Math.round(boundedAmount / COPY_AMOUNT_STEP) * COPY_AMOUNT_STEP;
  };

  const getValidationMessage = (value: number) => {
    if (!Number.isFinite(value) || value < MIN_COPY_AMOUNT) {
      return tr(`Enter at least ${MIN_COPY_AMOUNT.toLocaleString()} USDT to continue.`, `跟投金额最低为 ${MIN_COPY_AMOUNT.toLocaleString()} USDT。`);
    }
    if (value > AVAILABLE_FUNDS) {
      return tr("The copy investing amount exceeds your available funds.", "跟投金额超过可用资金余额。");
    }
    if (value % COPY_AMOUNT_STEP !== 0) {
      return tr(
        `Copy investing amount must be a multiple of ${COPY_AMOUNT_STEP.toLocaleString()} USDT.`,
        `跟投资金需为 ${COPY_AMOUNT_STEP.toLocaleString()} USDT 的倍数。`,
      );
    }
    return "";
  };

  const showAdjustmentFeedback = (value: number) => {
    setAdjustmentFeedback(tr(
      `Copy investing amount must be a multiple of ${COPY_AMOUNT_STEP.toLocaleString()} USDT. Adjusted to ${value.toLocaleString()} USDT.`,
      `跟投资金需为 ${COPY_AMOUNT_STEP.toLocaleString()} USDT 的倍数，已自动调整至 ${value.toLocaleString()} USDT。`,
      {
        ja: `コピートレード額は ${COPY_AMOUNT_STEP.toLocaleString()} USDT 単位です。${value.toLocaleString()} USDT に調整しました。`,
        ko: `카피 트레이딩 금액은 ${COPY_AMOUNT_STEP.toLocaleString()} USDT 단위여야 합니다. ${value.toLocaleString()} USDT로 조정했습니다.`,
        es: `El importe de copy trading debe ser múltiplo de ${COPY_AMOUNT_STEP.toLocaleString()} USDT. Se ajustó a ${value.toLocaleString()} USDT.`,
        fr: `Le montant du copy trading doit être un multiple de ${COPY_AMOUNT_STEP.toLocaleString()} USDT. Il a été ajusté à ${value.toLocaleString()} USDT.`,
      },
    ));
  };

  const handleAmountChange = (value: string) => {
    if (!value.trim()) {
      setAmount(0);
      setAmountInput("");
      setError("");
      setAdjustmentFeedback("");
      return;
    }
    const nextAmount = Number(value);
    const sanitizedAmount = Number.isFinite(nextAmount) ? Math.max(nextAmount, 0) : 0;
    setAmount(sanitizedAmount);
    setAmountInput(value);
    setError(getValidationMessage(sanitizedAmount));
    setAdjustmentFeedback("");
  };

  const handleConfirm = () => {
    const nextAmount = normalizedAmount(amount);
    if (nextAmount !== amount) {
      setAmount(nextAmount);
      setAmountInput(String(nextAmount));
      showAdjustmentFeedback(nextAmount);
    }
    const validationMessage = getValidationMessage(nextAmount);
    setError(validationMessage);
    if (validationMessage) {
      return;
    }
    onConfirm(nextAmount);
  };

  const handleAmountBlur = () => {
    if (amount <= 0) return;
    const nextAmount = normalizedAmount(amount);
    if (nextAmount !== amount) {
      setAmount(nextAmount);
      setAmountInput(String(nextAmount));
      showAdjustmentFeedback(nextAmount);
    }
    setError(getValidationMessage(nextAmount));
  };

  const isAmountValid = amount > 0 && !getValidationMessage(amount);

  return (
    <Dialog open={Boolean(strategy)} onOpenChange={onOpenChange}>
      {strategy ? (
        <DialogContent className="oq-marketplace-copy-dialog">
          <DialogHeader className="oq-marketplace-copy-dialog-header">
            <DialogTitle>
              <MarketplaceAvatar
                strategyId={strategy.id}
                name={displayIdentity?.author ?? strategy.author}
                avatar={displayIdentity?.avatar ?? strategy.author.slice(0, 1)}
                avatarTone={displayIdentity?.avatarTone ?? "orange"}
                className="oq-marketplace-copy-dialog-avatar"
              />
              <span className="oq-marketplace-copy-dialog-identity">
                <span className="oq-marketplace-copy-dialog-author">{displayIdentity?.author}</span>
                <span className="oq-marketplace-copy-dialog-strategy">{displayIdentity?.strategyName}</span>
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="oq-marketplace-copy-form">
            <div className="oq-marketplace-copy-field">
              <div className="oq-marketplace-copy-field-heading">
                <label htmlFor="marketplace-copy-amount">{tr("Copy Investing amount", "跟投投入")}</label>
                <div className="oq-marketplace-copy-input-available">
                  <span>{tr("Available funds", "可用资金")}</span>
                  <strong>{formatUsdt(AVAILABLE_FUNDS)} USDT</strong>
                </div>
              </div>
              <div className={`oq-marketplace-copy-input-wrap${error ? " is-invalid" : ""}`}>
                <input
                  id="marketplace-copy-amount"
                  type="number"
                  min={MIN_COPY_AMOUNT}
                  max={AVAILABLE_FUNDS}
                  step={COPY_AMOUNT_STEP}
                  inputMode="decimal"
                  value={amountInput}
                  placeholder={tr(`Min. ${MIN_COPY_AMOUNT.toLocaleString()}`, `最低 ${MIN_COPY_AMOUNT.toLocaleString()}`)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={fieldMessage ? "marketplace-copy-error" : undefined}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  onBlur={handleAmountBlur}
                />
                <span aria-hidden="true">USDT</span>
              </div>
              <p
                id="marketplace-copy-error"
                className={`oq-marketplace-copy-message${error ? " is-error" : adjustmentFeedback ? " is-feedback" : ""}`}
                role={error ? "alert" : adjustmentFeedback ? "status" : undefined}
                aria-live="polite"
              >
                {fieldMessage}
              </p>
            </div>
          </div>

          <DialogFooter className="oq-marketplace-copy-dialog-footer">
            <button type="button" className="oq-marketplace-copy-button" onClick={() => onOpenChange(false)}>
              {tr("Cancel", "取消")}
            </button>
            <button type="button" className="oq-marketplace-copy-button is-primary" disabled={!isAmountValid} onClick={handleConfirm}>
              {tr("Confirm", "确认跟投")}
            </button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

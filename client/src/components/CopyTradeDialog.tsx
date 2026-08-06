import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Strategy } from "@/lib/mockData";
import "./CopyTradeDialog.css";

const AVAILABLE_FUNDS = 438_473;
const MIN_COPY_AMOUNT = 5_000;
const COPY_AMOUNT_STEP = 1_000;

function formatUsdt(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normalizeCopyAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const maxSteppedAmount = Math.floor(AVAILABLE_FUNDS / COPY_AMOUNT_STEP) * COPY_AMOUNT_STEP;
  const roundedAmount = Math.round(value / COPY_AMOUNT_STEP) * COPY_AMOUNT_STEP;
  return Math.min(Math.max(roundedAmount, 0), maxSteppedAmount);
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
  };
  tr: (en: string, zh: string) => string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");
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
      setError("");
    }
  }, [strategy?.id]);

  const handleAmountChange = (value: string) => {
    if (!value.trim()) {
      setAmount(0);
      setError("");
      return;
    }
    const nextAmount = Number(value);
    setAmount(Number.isFinite(nextAmount) ? Math.min(Math.max(nextAmount, 0), AVAILABLE_FUNDS) : 0);
    setError("");
  };

  const handleConfirm = () => {
    const normalizedAmount = normalizeCopyAmount(amount);
    if (normalizedAmount < MIN_COPY_AMOUNT) {
      setError(tr(`Enter at least ${MIN_COPY_AMOUNT.toLocaleString()} USDT to continue.`, `跟投金额最低为 ${MIN_COPY_AMOUNT.toLocaleString()} USDT。`));
      return;
    }
    setAmount(normalizedAmount);
    onConfirm(normalizedAmount);
  };

  const handleAmountBlur = () => {
    if (amount <= 0) return;
    const normalizedAmount = normalizeCopyAmount(amount);
    setAmount(normalizedAmount);
    setError(normalizedAmount < MIN_COPY_AMOUNT
      ? tr(`Enter at least ${MIN_COPY_AMOUNT.toLocaleString()} USDT to continue.`, `跟投金额最低为 ${MIN_COPY_AMOUNT.toLocaleString()} USDT。`)
      : "");
  };

  return (
    <Dialog open={Boolean(strategy)} onOpenChange={onOpenChange}>
      {strategy ? (
        <DialogContent className="oq-marketplace-copy-dialog">
          <DialogHeader className="oq-marketplace-copy-dialog-header">
            <DialogTitle>
              <span className="oq-marketplace-copy-dialog-avatar" aria-hidden="true">{displayIdentity?.avatar}</span>
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
                  value={amount || ""}
                  placeholder={tr(`Min. ${MIN_COPY_AMOUNT.toLocaleString()}`, `最低 ${MIN_COPY_AMOUNT.toLocaleString()}`)}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "marketplace-copy-error" : undefined}
                  onChange={(event) => handleAmountChange(event.target.value)}
                  onBlur={handleAmountBlur}
                />
                <span aria-hidden="true">USDT</span>
              </div>
              {error ? <p id="marketplace-copy-error" className="oq-marketplace-copy-error" role="alert">{error}</p> : null}
            </div>
          </div>

          <DialogFooter className="oq-marketplace-copy-dialog-footer">
            <button type="button" className="oq-marketplace-copy-button is-primary" onClick={handleConfirm}>
              <Check aria-hidden="true" />
              {tr("Confirm Copy Investing", "确认跟投")}
            </button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

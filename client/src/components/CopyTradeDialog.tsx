import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import type { Strategy } from "@/lib/mockData";
import "./CopyTradeDialog.css";

const AVAILABLE_FUNDS = 438_473;
const MIN_COPY_AMOUNT = 5_000;

function formatUsdt(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CopyTradeDialog({
  strategy,
  tr,
  onOpenChange,
  onConfirm,
}: {
  strategy: Strategy | null;
  tr: (en: string, zh: string) => string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");
  const copyPercent = Math.min(100, Math.max(0, (amount / AVAILABLE_FUNDS) * 100));

  useEffect(() => {
    if (strategy) {
      setAmount(0);
      setError("");
    }
  }, [strategy?.id]);

  const handleAmountChange = (value: string) => {
    const nextAmount = Number(value);
    setAmount(Number.isFinite(nextAmount) ? Math.min(Math.max(nextAmount, 0), AVAILABLE_FUNDS) : 0);
    setError("");
  };

  const handlePercentChange = (values: number[]) => {
    const nextPercent = values[0] ?? 0;
    setAmount(Number(((AVAILABLE_FUNDS * nextPercent) / 100).toFixed(2)));
    setError("");
  };

  const handleConfirm = () => {
    if (amount < MIN_COPY_AMOUNT) {
      setError(tr(`Enter at least ${MIN_COPY_AMOUNT.toLocaleString()} USDT to continue.`, `跟单金额最低为 ${MIN_COPY_AMOUNT.toLocaleString()} USDT。`));
      return;
    }
    onConfirm(amount);
  };

  return (
    <Dialog open={Boolean(strategy)} onOpenChange={onOpenChange}>
      {strategy ? (
        <DialogContent className="oq-marketplace-copy-dialog">
          <DialogHeader className="oq-marketplace-copy-dialog-header">
            <DialogTitle>{tr("Copy trading settings", "跟单设置")}</DialogTitle>
          </DialogHeader>

          <div className="oq-marketplace-copy-form">
            <div className="oq-marketplace-copy-field">
              <div className="oq-marketplace-copy-field-heading">
                <label htmlFor="marketplace-copy-amount">{tr("Copy trading amount", "跟单投入")}</label>
                <div className="oq-marketplace-copy-available">
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
                  step="100"
                  inputMode="decimal"
                  value={amount}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "marketplace-copy-error" : undefined}
                  onChange={(event) => handleAmountChange(event.target.value)}
                />
                <span>USDT</span>
              </div>
              {error ? <p id="marketplace-copy-error" className="oq-marketplace-copy-error" role="alert">{error}</p> : null}
            </div>

            <div className="oq-marketplace-copy-slider-field">
              <div className="oq-marketplace-copy-slider-heading">
                <label htmlFor="marketplace-copy-percent">{tr("Use available funds", "使用资金比例")}</label>
                <strong>{copyPercent.toFixed(2)}%</strong>
              </div>
              <Slider
                id="marketplace-copy-percent"
                aria-label={tr("Use available funds percentage", "使用资金比例")}
                min={0}
                max={100}
                step={0.01}
                value={[copyPercent]}
                onValueChange={handlePercentChange}
                className="oq-marketplace-copy-slider"
              />
              <div className="oq-marketplace-copy-slider-scale" aria-hidden="true">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          <DialogFooter className="oq-marketplace-copy-dialog-footer">
            <button type="button" className="oq-marketplace-copy-button is-primary" onClick={handleConfirm}>
              <Check aria-hidden="true" />
              {tr("Confirm copy", "确认跟单")}
            </button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

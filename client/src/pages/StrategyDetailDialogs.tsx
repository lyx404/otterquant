import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getExchangeVenueMeta,
  type ExchangeApiConnection,
} from "@/lib/exchangeApiConnections";
import { ArrowUpRight, GitBranch, RotateCcw, Unplug, X } from "lucide-react";
import type { StrategyConfigRow } from "./StrategyDetailParts";
import "./StrategyDetailDialogs.css";

type Tr = (en: string, zh: string, copy?: Record<string, string>) => string;

const optimizerNumericParameters = [
  { key: "wmin", defaultValue: "-0.03", step: "0.01" },
  { key: "wmax", defaultValue: "0.03", step: "0.01" },
  { key: "gross_exposure", defaultValue: "1.0", step: "0.1" },
  { key: "net_exposure_th", defaultValue: "0.03", step: "0.01" },
  { key: "lambd", defaultValue: "3000.0", step: "100" },
  { key: "cost", defaultValue: "1.2", step: "0.1" },
  { key: "cov_window", defaultValue: "90", step: "1" },
  { key: "cov_shrinkage", defaultValue: "0.1", step: "0.01" },
  { key: "beta_neutral_th", defaultValue: "0.02", step: "0.01" },
  { key: "beta_window", defaultValue: "90", step: "1" },
] as const;

type OptimizerParameterKey = (typeof optimizerNumericParameters)[number]["key"];
export type OptimizerParameterValues = Record<OptimizerParameterKey, string>;

export type OptimizedStrategyVersion = {
  id: string;
  number: string;
  createdAt: string;
};

const defaultOptimizerParameterValues = Object.fromEntries(
  optimizerNumericParameters.map((parameter) => [parameter.key, parameter.defaultValue])
) as OptimizerParameterValues;

export function OptimizerDialog({
  open,
  onOpenChange,
  strategyName,
  strategyId,
  optimizedVersions,
  tr,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyName: string;
  strategyId: string;
  optimizedVersions: OptimizedStrategyVersion[];
  tr: Tr;
  onSubmit: (values: OptimizerParameterValues) => void;
}) {
  const [values, setValues] = useState<OptimizerParameterValues>(() => ({ ...defaultOptimizerParameterValues }));
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const numericValues = optimizerNumericParameters.map((parameter) => Number(values[parameter.key]));
  const isValid = numericValues.every(Number.isFinite) && Number(values.wmin) < Number(values.wmax);

  const versionLinks = optimizedVersions.map((version) => (
    <a
      href={`/strategies/${encodeURIComponent(version.id)}?name=${encodeURIComponent(strategyName)}&optimizedFrom=${encodeURIComponent(strategyId)}`}
      key={version.id}
    >
      <span>
        <strong>{strategyName}</strong>
        <span className="oq-optimizer-version-meta">
          <small>{`NO.${version.number}`}</small>
          <small>{tr("Created", "创建时间")} {version.createdAt}</small>
        </span>
      </span>
      <ArrowUpRight aria-hidden="true" />
    </a>
  ));

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setIsVersionsOpen(false);
    onOpenChange(nextOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="oq-sd-dialog oq-optimizer-dialog max-w-[560px] border-border bg-card p-0 text-foreground">
          <DialogHeader className="oq-optimizer-header">
            <DialogTitle>{tr("Optimizer", "优化器")}</DialogTitle>
            {optimizedVersions.length > 0 ? (
              <button
                type="button"
                className="oq-optimizer-history-trigger"
                aria-haspopup="dialog"
                onClick={() => setIsVersionsOpen(true)}
              >
                <GitBranch aria-hidden="true" />
                {tr("Optimization History", "优化历史")}
              </button>
            ) : null}
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (isValid) onSubmit(values);
            }}
          >
            <div className="oq-optimizer-parameter-list">
              {optimizerNumericParameters.map((parameter) => {
                const isModified = values[parameter.key] !== parameter.defaultValue;
                const inputId = `optimizer-${parameter.key}`;
                return (
                  <div className="oq-optimizer-parameter-row" key={parameter.key}>
                    <label htmlFor={inputId}><code>{parameter.key}</code></label>
                    <div className="oq-optimizer-input-wrap">
                      <input
                        id={inputId}
                        type="number"
                        inputMode="decimal"
                        step={parameter.step}
                        value={values[parameter.key]}
                        onChange={(event) => setValues((current) => ({ ...current, [parameter.key]: event.target.value }))}
                        aria-label={parameter.key}
                      />
                      {isModified ? (
                        <button
                          type="button"
                          className="oq-optimizer-reset-parameter"
                          aria-label={`${tr("Restore default value", "恢复默认值")} ${parameter.key}`}
                          title={tr("Restore default value", "恢复默认值")}
                          onClick={() => setValues((current) => ({ ...current, [parameter.key]: parameter.defaultValue }))}
                        >
                          <RotateCcw aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              <div className="oq-optimizer-parameter-row is-readonly">
                <code>market_symbol</code>
                <output>&quot;BTCUSDT&quot;</output>
              </div>
            </div>

            <div className="oq-optimizer-actions">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {tr("Cancel", "取消")}
              </Button>
              <Button type="submit" disabled={!isValid}>
                {tr("Run Optimizer", "运行优化")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={open && isVersionsOpen} onOpenChange={setIsVersionsOpen}>
        <DialogContent className="oq-sd-dialog oq-optimizer-history-dialog max-w-[420px] border-border bg-card p-0 text-foreground">
          <DialogHeader className="oq-optimizer-history-header">
            <DialogTitle>{tr("Optimization History", "优化历史")}</DialogTitle>
          </DialogHeader>
          <div className="oq-optimizer-history-body">
            <div className="oq-optimizer-version-list">
              {versionLinks}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LiveDeployDialog({
  open,
  onOpenChange,
  tr,
  connectedExchangeApis,
  selectedExchangeApiId,
  setSelectedExchangeApiId,
  goToExchangeApi,
  liveCapitalInput,
  setLiveCapitalInput,
  isCapitalBelowMinimum,
  canSubmitLiveDeploy,
  submitLiveDeployment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tr: Tr;
  connectedExchangeApis: ExchangeApiConnection[];
  selectedExchangeApiId: string;
  setSelectedExchangeApiId: (value: string) => void;
  goToExchangeApi: () => void;
  liveCapitalInput: string;
  setLiveCapitalInput: (value: string) => void;
  isCapitalBelowMinimum: boolean;
  canSubmitLiveDeploy: boolean;
  submitLiveDeployment: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="oq-sd-dialog max-w-2xl border-border bg-card p-0 text-foreground">
        <DialogHeader className="border-b border-border/60 px-6 py-5">
          <DialogTitle>{tr("Deploy Strategy to Live Trading", "部署到实盘交易")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {tr("Exchange", "交易所")}
              </p>
              <button type="button" className="text-xs text-primary hover:text-primary/80" onClick={goToExchangeApi}>
                {tr("Manage Connections", "管理连接")}
              </button>
            </div>

            {connectedExchangeApis.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-accent/25 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background/40 text-muted-foreground">
                      <Unplug className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{tr("No Exchange API Connected", "未连接交易所 API")}</p>
                      <p className="text-xs text-muted-foreground">
                        {tr("Connect an exchange API account to enable live deployment.", "连接交易所 API 账户后即可启用实盘部署。")}
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="outline" className="h-8 shrink-0 rounded-full border-border bg-card px-3 text-xs" onClick={goToExchangeApi}>
                    {tr("Connect Exchange", "连接交易所")}
                  </Button>
                </div>
              </div>
            ) : (
              <Select value={selectedExchangeApiId} onValueChange={setSelectedExchangeApiId}>
                <SelectTrigger className="h-11 w-full border-border/70 bg-background/35 text-foreground">
                  <SelectValue placeholder={tr("Select exchange account", "选择交易所账户")} />
                </SelectTrigger>
                <SelectContent className="border-border bg-card text-foreground">
                  {connectedExchangeApis.map((exchange) => {
                    const venue = getExchangeVenueMeta(exchange.venue);
                    return (
                      <SelectItem key={exchange.id} value={exchange.id}>
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md border text-[9px] font-semibold uppercase tracking-[0.08em] ${venue.iconClassName}`}>
                          {venue.iconText}
                        </span>
                        <span className="truncate">{exchange.accountName} · {venue.label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {tr("Base Capital", "基础资金")}
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={liveCapitalInput}
                onChange={(event) => setLiveCapitalInput(event.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="1000"
                className="h-10"
                aria-invalid={isCapitalBelowMinimum}
              />
              <div className="inline-flex h-10 items-center rounded-md border border-border bg-accent/35 px-3 text-sm font-medium text-foreground">
                USDT
              </div>
            </div>
            {isCapitalBelowMinimum ? (
              <p className="text-xs text-[var(--destructive)]">
                {tr("Minimum activation capital is 100 USDT. Deployment cannot be initiated below this threshold.", "最低启用资金为 100 USDT，低于该阈值无法发起部署。")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {tr("Minimum activation capital: 100 USDT.", "最低启用资金：100 USDT。")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 px-6 py-4">
          <Button variant="outline" className="h-9 rounded-full border-border bg-card px-4 text-xs" onClick={() => onOpenChange(false)}>
            {tr("Cancel", "取消")}
          </Button>
          <Button className="h-9 rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90" disabled={!canSubmitLiveDeploy} onClick={submitLiveDeployment}>
            {tr("Submit Live Deployment", "提交实盘部署")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StrategyConfigDialog({
  open,
  onOpenChange,
  strategyName,
  strategyId,
  tr,
  strategyConfigGroups,
  factorWeightItems,
  factorWeightTotal,
  factorWeightColors,
  formatDecimalWeight,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyName: string;
  strategyId: string;
  tr: Tr;
  strategyConfigGroups: Array<{ title: string; rows: StrategyConfigRow[] }>;
  factorWeightItems: Array<{ label: string; value: number }>;
  factorWeightTotal: number;
  factorWeightColors: string[];
  formatDecimalWeight: (value: number) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="oq-sd-dialog max-w-[680px] border-border bg-card p-0 text-foreground">
        <DialogClose className="absolute right-4 top-4 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:outline-none focus-visible:ring-0">
          <X className="h-4 w-4" />
          <span className="sr-only">{tr("Close", "关闭")}</span>
        </DialogClose>
        <DialogHeader className="px-5 pb-1 pt-4">
          <DialogTitle className="text-base">{tr("Strategy Configuration", "策略配置")}</DialogTitle>
          <p className="mt-1 text-xs text-muted-foreground">{strategyName} · {strategyId}</p>
        </DialogHeader>

        <div className="space-y-2 px-5 pb-4 pt-1">
          {strategyConfigGroups.map((group) => (
            <section key={group.title} className="rounded-xl bg-accent/20 px-3.5 py-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.title}
              </h3>
              <div className="mt-1.5 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
                {group.rows.map((row) => (
                  <div key={row.key} className={`min-w-0 ${row.key === "signal" || row.key === "factor-weights" ? "sm:col-span-2" : ""}`}>
                    <p className="text-[11px] leading-4 text-muted-foreground">{row.label}</p>
                    <p className="mt-0.5 break-words text-[13px] font-medium leading-5 text-foreground">{row.value}</p>
                    {row.key === "factor-weights" && factorWeightItems.length > 0 ? (
                      <div className="space-y-1.5 pt-1.5">
                        <div className="flex h-1.5 overflow-hidden rounded-full bg-muted/70">
                          {factorWeightItems.map((item, index) => {
                            const width = factorWeightTotal > 0 ? Math.max(0, Math.min((item.value / factorWeightTotal) * 100, 100)) : 0;
                            return (
                              <div
                                key={`${item.label}-${index}`}
                                className="h-full"
                                style={{ width: `${width}%`, backgroundColor: factorWeightColors[index % factorWeightColors.length] }}
                                title={`${item.label} ${formatDecimalWeight(item.value)}`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] leading-4 text-muted-foreground">
                          {factorWeightItems.map((item, index) => (
                            <span key={`${item.label}-legend-${index}`} className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: factorWeightColors[index % factorWeightColors.length] }} />
                              {item.label} {formatDecimalWeight(item.value)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getExchangeVenueMeta,
  type ExchangeApiConnection,
} from "@/lib/exchangeApiConnections";
import { formatStrategyFactorId } from "@/lib/strategyUtils";
import { ChevronDown, Layers3, RotateCcw, Unplug, X } from "lucide-react";
import { Link } from "wouter";
import "./StrategyDetailDialogs.css";

type Tr = (en: string, zh: string, copy?: Record<string, string>) => string;

export const STRATEGY_VERSION_HISTORY_LIMIT = 10;
export const STRATEGY_VERSION_DEMO_PROCESSING_DELAY_MS = 10_000;

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
type OptimizerMode = "conservative" | "balanced" | "aggressive";

export type StrategyVersion = {
  id: string;
  number: string;
  createdAt: string;
  source: "edit" | "optimizer";
  note: string;
  status: "ready" | "pending";
  demoProcessingStartedAt?: number;
};

export function getStrategyVersionDemoRemainingMs(
  version: StrategyVersion | undefined,
  now = Date.now()
): number | null {
  if (version?.status !== "pending" || version.demoProcessingStartedAt === undefined) return null;
  return Math.max(
    0,
    version.demoProcessingStartedAt + STRATEGY_VERSION_DEMO_PROCESSING_DELAY_MS - now
  );
}

export function normalizeStrategyVersionHistory(versions: StrategyVersion[]): StrategyVersion[] {
  return versions.map((version, index) => {
    if (index === 0 || version.status === "ready") return version;
    return { ...version, status: "ready" };
  });
}

export function buildStrategyVersionHistory(strategyId: string, baseTimestamp: string): StrategyVersion[] {
  const baseDate = baseTimestamp.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? baseTimestamp;
  const subtractDays = (days: number) => {
    const date = new Date(`${baseDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return baseDate;
    date.setUTCDate(date.getUTCDate() - days);
    return date.toISOString().slice(0, 10);
  };

  return Array.from({ length: STRATEGY_VERSION_HISTORY_LIMIT }, (_, index) => {
    const number = String(STRATEGY_VERSION_HISTORY_LIMIT - index).padStart(2, "0");
    const hour = String(9 + ((index * 2) % 8)).padStart(2, "0");
    return {
      id: `${strategyId}-V${number}`,
      number,
      createdAt: `${subtractDays(index)} ${hour}:${index % 2 === 0 ? "00" : "30"}`,
      source: index % 2 === 0 ? "optimizer" : "edit",
      note: index === 2 ? "调整因子权重，降低组合波动。" : "",
      status: "ready",
    };
  });
}

const defaultOptimizerParameterValues = Object.fromEntries(
  optimizerNumericParameters.map((parameter) => [parameter.key, parameter.defaultValue])
) as OptimizerParameterValues;

const optimizerPresetValues: Record<OptimizerMode, OptimizerParameterValues> = {
  conservative: {
    wmin: "-0.02",
    wmax: "0.02",
    gross_exposure: "0.7",
    net_exposure_th: "0.02",
    lambd: "4500.0",
    cost: "1.5",
    cov_window: "120",
    cov_shrinkage: "0.15",
    beta_neutral_th: "0.01",
    beta_window: "120",
  },
  balanced: { ...defaultOptimizerParameterValues },
  aggressive: {
    wmin: "-0.05",
    wmax: "0.05",
    gross_exposure: "1.5",
    net_exposure_th: "0.05",
    lambd: "2000.0",
    cost: "1.0",
    cov_window: "60",
    cov_shrinkage: "0.08",
    beta_neutral_th: "0.04",
    beta_window: "60",
  },
};

function StrategyVersionList({
  strategyName,
  strategyId,
  strategyCreatedAt,
  versions,
  defaultVersionId,
  onViewComposition,
  onViewVersion,
  onSetDefaultVersion,
  tr,
}: {
  strategyName: string;
  strategyId: string;
  strategyCreatedAt: string;
  versions: StrategyVersion[];
  defaultVersionId: string | null;
  onViewComposition: (version: StrategyVersion) => void;
  onViewVersion: (version: StrategyVersion) => void;
  onSetDefaultVersion: (version: StrategyVersion) => void;
  tr: Tr;
}) {
  return (
    <div className="oq-strategy-version-list" role="list">
      {versions.slice(0, STRATEGY_VERSION_HISTORY_LIMIT).map((version, index) => {
        const isDefault = version.id === defaultVersionId;
        const isLatest = index === 0;
        const viewParams = new URLSearchParams({ name: strategyName, version: version.id });
        if (strategyCreatedAt) viewParams.set("createdAt", strategyCreatedAt);
        const viewUrl = `/strategies/${encodeURIComponent(strategyId)}?${viewParams.toString()}`;
        const note = version.note.trim();
        const versionTitle = index === 0
          ? tr("Latest version", "最新版本")
          : `${tr("Version", "版本")} ${Number(version.number)}`;
        const sourceLabel = version.source === "edit"
          ? tr("Edited update", "编辑更新")
          : tr("Generated by optimizer", "优化器生成");
        const localizedNote = note === "调整因子权重，降低组合波动。"
          ? tr(
              "Adjusted factor weights to reduce portfolio volatility.",
              "调整因子权重，降低组合波动。"
            )
          : note;
        return (
          <article
            className={`oq-strategy-version-item${isDefault ? " is-default" : ""}${version.status === "pending" ? " is-pending" : ""}`}
            key={version.id}
            role="listitem"
            aria-current={isDefault ? "true" : undefined}
          >
            <div className="oq-strategy-version-content">
              <div className="oq-strategy-version-heading">
                <strong>{versionTitle}</strong>
                {version.status === "pending" ? (
                  <span className="oq-strategy-version-status is-pending">
                    {tr("Processing", "处理中")}
                  </span>
                ) : null}
              </div>
              <div className="oq-strategy-version-meta">
                <time dateTime={version.createdAt.replace(" ", "T")}>{version.createdAt}</time>
                <span aria-hidden="true">·</span>
                <span>{sourceLabel}</span>
              </div>

              {note ? (
                <p className="oq-strategy-version-note">
                  {tr("Note: ", "备注：")}
                  {localizedNote}
                </p>
              ) : null}
            </div>

            <div className="oq-strategy-version-actions">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="is-composition"
                    aria-label={tr("Strategy Composition", "策略构成")}
                    onClick={() => onViewComposition(version)}
                  >
                    <Layers3 aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {tr("Strategy Composition", "策略构成")}
                </TooltipContent>
              </Tooltip>
              {version.status === "ready" ? (
                <>
                  <Link
                    className={isDefault ? "is-viewing" : undefined}
                    href={viewUrl}
                    onClick={() => onViewVersion(version)}
                  >
                    {isDefault ? tr("Viewing", "查看中") : tr("View", "查看")}
                  </Link>
                  {isLatest ? null : (
                    <button type="button" onClick={() => onSetDefaultVersion(version)}>
                      {tr("Rollback", "回滚")}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="is-view-disabled"
                    aria-label={tr("View (Processing)", "查看（处理中）")}
                    disabled
                  >
                    {tr("View", "查看")}
                  </button>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function StrategyVersionHistoryDialog({
  open,
  onOpenChange,
  strategyName,
  strategyId,
  strategyCreatedAt,
  versions,
  defaultVersionId,
  onViewComposition,
  onSetDefaultVersion,
  title,
  tr,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyName: string;
  strategyId: string;
  strategyCreatedAt: string;
  versions: StrategyVersion[];
  defaultVersionId: string | null;
  onViewComposition: (version: StrategyVersion) => void;
  onSetDefaultVersion: (version: StrategyVersion) => void;
  title: string;
  tr: Tr;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="oq-sd-dialog oq-strategy-version-dialog border-border bg-card p-0 text-foreground">
        <DialogHeader className="oq-strategy-version-header">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {tr("Review and manage the strategy's version history.", "查看并管理策略的历史版本。")}
          </DialogDescription>
        </DialogHeader>
        <div className="oq-strategy-version-body">
          <StrategyVersionList
            strategyName={strategyName}
            strategyId={strategyId}
            strategyCreatedAt={strategyCreatedAt}
            versions={versions}
            defaultVersionId={defaultVersionId}
            onViewComposition={onViewComposition}
            onViewVersion={() => {
              onOpenChange(false);
            }}
            onSetDefaultVersion={onSetDefaultVersion}
            tr={tr}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function StrategyDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  strategyName,
  tr,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  strategyName: string;
  tr: Tr;
}) {
  const description = strategyName
    ? tr(
        `Are you sure you want to delete ${strategyName}? It will be permanently removed from your workspace and cannot be restored.`,
        `确认删除 ${strategyName}？删除后无法恢复。`,
        {
          ja: `${strategyName}を削除しますか？削除後は復元できません。`,
          ko: `${strategyName} 전략을 삭제할까요? 삭제 후 복구할 수 없습니다.`,
          es: `¿Quieres eliminar ${strategyName}? Se retirará permanentemente y no se podrá restaurar.`,
          fr: `Voulez-vous supprimer ${strategyName} ? Elle sera définitivement supprimée et ne pourra pas être restaurée.`,
        }
      )
    : tr(
        "Are you sure you want to delete this strategy? It will be permanently removed from your workspace and cannot be restored.",
        "确认要删除该策略吗？此操作会将其从工作区永久移除，且无法恢复。",
        {
          ja: "このストラテジーを削除しますか？ワークスペースから完全に削除され、復元できません。",
          ko: "이 전략을 삭제할까요? 워크스페이스에서 영구적으로 삭제되며 복구할 수 없습니다.",
          es: "¿Quieres eliminar esta estrategia? Se retirará permanentemente del espacio de trabajo y no se podrá recuperar.",
          fr: "Voulez-vous supprimer cette stratégie ? Elle sera définitivement retirée de l’espace de travail et ne pourra pas être restaurée.",
        }
      );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="oq-strategy-delete-dialog">
        <AlertDialogHeader className="oq-strategy-delete-dialog-header">
          <AlertDialogTitle className="oq-strategy-delete-dialog-title">
            {tr("Delete Strategy", "删除策略")}
          </AlertDialogTitle>
          <AlertDialogDescription className="oq-strategy-delete-dialog-description">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="oq-strategy-delete-dialog-footer">
          <AlertDialogCancel className="oq-strategy-delete-dialog-button">
            {tr("Cancel", "取消")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="oq-strategy-delete-dialog-button is-primary"
            onClick={onConfirm}
          >
            {tr("Confirm Delete", "确认删除")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function OptimizerDialog({
  open,
  onOpenChange,
  tr,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tr: Tr;
  onSubmit: (values: OptimizerParameterValues, note: string) => void;
}) {
  const [values, setValues] = useState<OptimizerParameterValues>(() => ({ ...defaultOptimizerParameterValues }));
  const [baselineValues, setBaselineValues] = useState<OptimizerParameterValues>(() => ({
    ...defaultOptimizerParameterValues,
  }));
  const [selectedMode, setSelectedMode] = useState<OptimizerMode | null>("balanced");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [note, setNote] = useState("");
  const numericValues = optimizerNumericParameters.map((parameter) => Number(values[parameter.key]));
  const isValid = numericValues.every(Number.isFinite) && Number(values.wmin) < Number(values.wmax);
  const modeOptions: Array<{ key: OptimizerMode; label: string }> = [
    { key: "conservative", label: tr("Conservative", "保守") },
    { key: "balanced", label: tr("Balanced", "均衡") },
    { key: "aggressive", label: tr("Aggressive", "激进") },
  ];

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setIsDetailsOpen(false);
    onOpenChange(nextOpen);
  };

  const applyMode = (mode: OptimizerMode) => {
    const presetValues = { ...optimizerPresetValues[mode] };
    setSelectedMode(mode);
    setBaselineValues(presetValues);
    setValues(presetValues);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="oq-sd-dialog oq-optimizer-dialog border-border bg-card p-0 text-foreground">
        <DialogHeader className="oq-optimizer-header">
          <DialogTitle>{tr("Optimizer", "优化器")}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid) onSubmit(values, note.trim());
          }}
        >
          <fieldset className="oq-optimizer-mode-field" aria-labelledby="optimizer-mode-label">
            <span id="optimizer-mode-description" className="sr-only">
              {tr(
                "Conservative prioritizes stability; Balanced balances return, risk, and cost; Aggressive pursues more return potential with higher exposure.",
                "保守模式优先控制波动；均衡模式兼顾收益、风险和成本；激进模式以更高仓位追求更高收益弹性。"
              )}
            </span>
            <div className="oq-optimizer-mode-heading">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span id="optimizer-mode-label" className="oq-optimizer-mode-label">
                    {tr("Optimization Mode", "优化模式")}
                    <span className="oq-optimizer-required-mark" aria-hidden="true">*</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  className="oq-plain-explanation-tooltip oq-optimizer-mode-tooltip"
                >
                  <div>
                    <strong>{tr("Conservative", "保守")}</strong>
                    <span>{tr("Lower exposure and tighter risk limits prioritize stability.", "降低仓位并收紧风险限制，优先控制波动。")}</span>
                  </div>
                  <div>
                    <strong>{tr("Balanced", "均衡")}</strong>
                    <span>{tr("Balances return potential, risk, and trading costs.", "在收益潜力、风险和交易成本之间保持平衡。")}</span>
                  </div>
                  <div>
                    <strong>{tr("Aggressive", "激进")}</strong>
                    <span>{tr("Higher exposure and looser limits pursue more return potential.", "提高仓位并放宽限制，追求更高收益弹性。")}</span>
                  </div>
                </TooltipContent>
              </Tooltip>
              <button
                type="button"
                className="oq-optimizer-details-toggle"
                aria-expanded={isDetailsOpen}
                aria-controls="optimizer-detailed-parameters"
                onClick={() => setIsDetailsOpen((current) => !current)}
              >
                {isDetailsOpen
                  ? tr("Collapse Detailed Parameters", "收起详细参数")
                  : tr("Expand Detailed Parameters", "展开详细参数")}
                <ChevronDown className="oq-optimizer-details-chevron" aria-hidden="true" />
              </button>
            </div>
            <div
              className="oq-optimizer-mode-group"
              role="radiogroup"
              aria-labelledby="optimizer-mode-label"
              aria-describedby="optimizer-mode-description"
              aria-required="true"
            >
              {modeOptions.map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  className={selectedMode === mode.key ? "is-active" : ""}
                  role="radio"
                  aria-checked={selectedMode === mode.key}
                  tabIndex={selectedMode === mode.key || (selectedMode === null && mode.key === "balanced") ? 0 : -1}
                  onClick={() => applyMode(mode.key)}
                  onKeyDown={(event) => {
                    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const currentIndex = modeOptions.findIndex((item) => item.key === mode.key);
                    const nextIndex = event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? modeOptions.length - 1
                        : event.key === "ArrowLeft" || event.key === "ArrowUp"
                          ? (currentIndex - 1 + modeOptions.length) % modeOptions.length
                          : (currentIndex + 1) % modeOptions.length;
                    applyMode(modeOptions[nextIndex].key);
                    const modeButtons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button[role='radio']");
                    modeButtons?.[nextIndex]?.focus();
                  }}
                >
                  <strong>{mode.label}</strong>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="oq-optimizer-secondary-fields">
            {isDetailsOpen ? (
              <div id="optimizer-detailed-parameters" className="oq-optimizer-parameter-list">
                {optimizerNumericParameters.map((parameter) => {
                  const isModified = values[parameter.key] !== baselineValues[parameter.key];
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
                          onChange={(event) => {
                            setSelectedMode(null);
                            setValues((current) => ({ ...current, [parameter.key]: event.target.value }));
                          }}
                          aria-label={parameter.key}
                        />
                        {isModified ? (
                          <button
                            type="button"
                            className="oq-optimizer-reset-parameter"
                            aria-label={`${tr("Restore default value", "恢复默认值")} ${parameter.key}`}
                            title={tr("Restore default value", "恢复默认值")}
                            onClick={() => {
                              setValues((current) => ({
                                ...current,
                                [parameter.key]: baselineValues[parameter.key],
                              }));
                            }}
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
            ) : null}

            <label className="oq-optimizer-note-field" htmlFor="optimizer-note">
              <span>{tr("Note", "备注")}</span>
              <textarea
                id="optimizer-note"
                value={note}
                maxLength={300}
                placeholder={tr("Add a note", "添加备注")}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
          </div>

          <div className="oq-optimizer-actions">
            <Button
              type="button"
              variant="outline"
              className="oq-optimizer-action-secondary"
              onClick={() => handleOpenChange(false)}
            >
              {tr("Cancel", "取消")}
            </Button>
            <Button type="submit" className="oq-optimizer-action-primary" disabled={!isValid}>
              {tr("Run Optimizer", "运行优化")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PaperDeployDialog({
  open,
  onOpenChange,
  strategyName,
  strategyId,
  tr,
  submitPaperDeployment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyName: string;
  strategyId: string;
  tr: Tr;
  submitPaperDeployment: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="oq-sd-dialog oq-paper-deploy-dialog max-w-[480px] border-border bg-card p-0 text-foreground">
        <DialogHeader className="oq-paper-deploy-header">
          <DialogTitle>{tr("Deploy Strategy to Paper Trading", "部署到模拟交易")}</DialogTitle>
        </DialogHeader>

        <dl className="oq-paper-deploy-summary">
          <div>
            <dt>{tr("Strategy", "策略")}</dt>
            <dd className="oq-paper-deploy-strategy">
              <strong>{strategyName}</strong>
              <span>{strategyId}</span>
            </dd>
          </div>
          <div>
            <dt>{tr("Environment", "环境")}</dt>
            <dd>{tr("Paper Trading", "模拟交易")}</dd>
          </div>
          <div>
            <dt>{tr("Initial Capital", "初始资金")}</dt>
            <dd className="oq-paper-deploy-number">12,000 USDT</dd>
          </div>
          <div>
            <dt>{tr("Leverage", "杠杆")}</dt>
            <dd className="oq-paper-deploy-number">1x</dd>
          </div>
        </dl>

        <div className="oq-paper-deploy-actions">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tr("Cancel", "取消")}
          </Button>
          <Button type="button" onClick={submitPaperDeployment}>
            {tr("Confirm Paper Deployment", "确认模拟部署")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
  title,
  tr,
  direction,
  topTailRule,
  factorWeightItems,
  formatDecimalWeight,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  tr: Tr;
  direction: string;
  topTailRule: string;
  factorWeightItems: Array<{ id: string; label: string; value: number }>;
  formatDecimalWeight: (value: number) => string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="oq-sd-dialog oq-strategy-config-dialog border-border bg-card p-0 text-foreground">
        <DialogClose className="oq-strategy-config-close">
          <X className="h-4 w-4" />
          <span className="sr-only">{tr("Close", "关闭")}</span>
        </DialogClose>
        <DialogHeader className="oq-strategy-config-header">
          <DialogTitle>{title ?? tr("Strategy Configuration", "策略配置")}</DialogTitle>
          <DialogDescription className="sr-only">
            {tr("Review the strategy direction, ranking rule and factor weights.", "查看策略方向、分层规则和因子权重。")}
          </DialogDescription>
        </DialogHeader>

        <div className="oq-strategy-config-body">
          <dl className="oq-strategy-config-summary">
            <div>
              <dt>{tr("Strategy Side", "策略方向")}</dt>
              <dd>{direction}</dd>
            </div>
            <div>
              <dt>{tr("Top/Tail Rule", "头尾分层规则")}</dt>
              <dd>{topTailRule}</dd>
            </div>
          </dl>

          <section className="oq-strategy-config-factors" aria-labelledby="strategy-config-factor-title">
            <div className="oq-strategy-config-section-head">
              <h3 id="strategy-config-factor-title">{tr("Factor Weights", "因子与权重")}</h3>
              <span>{tr("Weight", "权重")}</span>
            </div>

            <div className="oq-strategy-config-factor-table" role="list" aria-label={tr("Factor Weights", "因子与权重")}>
              {factorWeightItems.map((item) => (
                <div className="oq-strategy-config-factor-row" role="listitem" key={item.id}>
                  <div className="oq-strategy-config-factor-name">
                    <span>
                      <small>{formatStrategyFactorId(item.id)}</small>
                      <strong>{item.label}</strong>
                    </span>
                  </div>
                  <div className="oq-strategy-config-factor-weight">
                    <output>{formatDecimalWeight(item.value)}</output>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import {
  Activity,
  Archive,
  Bot,
  BrainCircuit,
  ChartNoAxesCombined,
  CircleAlert,
  CircleDot,
  ClipboardList,
  Clock3,
  DatabaseZap,
  FileChartColumn,
  FileText,
  FolderKanban,
  Gauge,
  LayoutGrid,
  LibraryBig,
  LineChart,
  Maximize2,
  Minus,
  Search,
  Settings,
  ShieldAlert,
  SquareTerminal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "./DesktopOS.css";

type WindowId =
  | "factor-radar"
  | "strategy-editor"
  | "backtest-terminal"
  | "ai-researcher"
  | "task-manager"
  | "project-folder"
  | "risk-exposure"
  | "memo";

type DesktopAsset = {
  id: string;
  name: string;
  type: ".factor" | ".strategy" | ".backtest" | ".memo" | ".folder" | ".stack";
  meta: string;
  window: WindowId;
  x: number;
  y: number;
};

type AppWindow = {
  id: WindowId;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized?: boolean;
};

const desktopAssets: DesktopAsset[] = [
  { id: "quality-mom", name: "质量动量.factor", type: ".factor", meta: "IC 0.071 / T-1", window: "factor-radar", x: 7, y: 12 },
  { id: "low-vol", name: "低波红利.strategy", type: ".strategy", meta: "LIVE DRAFT / V4", window: "strategy-editor", x: 18, y: 30 },
  { id: "small-cap", name: "小盘失效复盘.memo", type: ".memo", meta: "UPDATED 09:44", window: "memo", x: 7, y: 50 },
  { id: "ai-folder", name: "AI 候选因子.folder", type: ".folder", meta: "32 SIGNALS", window: "project-folder", x: 20, y: 66 },
  { id: "unfinished", name: "未完成实验.stack", type: ".stack", meta: "7 WAITING", window: "task-manager", x: 42, y: 78 },
  { id: "april-drawdown", name: "2025-04 回撤.backtest", type: ".backtest", meta: "MAX DD -8.2%", window: "risk-exposure", x: 44, y: 18 },
];

const dockItems = [
  { id: "factor-radar", label: "挖因子", icon: BrainCircuit, state: "SCAN" },
  { id: "strategy-editor", label: "创建策略", icon: ChartNoAxesCombined, state: "NEW" },
  { id: "backtest-terminal", label: "新建回测", icon: SquareTerminal, state: "62%" },
  { id: "factor-library", label: "因子库", icon: LibraryBig, state: "128" },
  { id: "strategy-library", label: "策略库", icon: FileChartColumn, state: "RISK" },
  { id: "memo", label: "研究笔记", icon: FileText, state: "12" },
  { id: "ai-researcher", label: "AI 研究员", icon: Bot, state: "3" },
  { id: "data-source", label: "数据源", icon: DatabaseZap, state: "SYNC" },
  { id: "risk-exposure", label: "风险扫描", icon: ShieldAlert, state: "1" },
];

const initialWindows: AppWindow[] = [
  {
    id: "factor-radar",
    title: "因子雷达",
    subtitle: "A-SHARE / CSI 800 / 2019-2026",
    x: 28,
    y: 15,
    w: 34,
    h: 46,
  },
  {
    id: "strategy-editor",
    title: "策略编辑器",
    subtitle: "低换手质量动量 / DRAFT V4",
    x: 49,
    y: 34,
    w: 33,
    h: 40,
  },
  {
    id: "ai-researcher",
    title: "AI 研究员",
    subtitle: "SYSTEM REVIEWER / 3 SUGGESTIONS",
    x: 66,
    y: 12,
    w: 27,
    h: 30,
  },
];

const windowDefaults: Record<WindowId, AppWindow> = {
  "factor-radar": initialWindows[0],
  "strategy-editor": initialWindows[1],
  "ai-researcher": initialWindows[2],
  "backtest-terminal": {
    id: "backtest-terminal",
    title: "回测终端",
    subtitle: "QUEUE / FACTOR_TEST_LOW_VOL_V4",
    x: 34,
    y: 42,
    w: 37,
    h: 32,
  },
  "task-manager": {
    id: "task-manager",
    title: "任务管理器",
    subtitle: "6 RUNNING / 3 WAITING",
    x: 38,
    y: 18,
    w: 35,
    h: 43,
  },
  "project-folder": {
    id: "project-folder",
    title: "AI 候选因子",
    subtitle: "PROJECT FOLDER / 32 SIGNALS",
    x: 24,
    y: 22,
    w: 38,
    h: 45,
  },
  "risk-exposure": {
    id: "risk-exposure",
    title: "风险暴露",
    subtitle: "SIZE / TURNOVER / INDUSTRY",
    x: 45,
    y: 16,
    w: 32,
    h: 38,
  },
  memo: {
    id: "memo",
    title: "研究笔记",
    subtitle: "小盘失效复盘 / MEMO",
    x: 30,
    y: 28,
    w: 30,
    h: 36,
  },
};

const commands = [
  "创建一个低换手质量动量策略",
  "搜索近三年 IC 稳定的因子",
  "对比 low_vol_v3 和 low_vol_v4",
  "解释 2025 年 4 月回撤原因",
  "新建一个 A 股红利策略项目",
];

function DesktopOS() {
  const [selectedAsset, setSelectedAsset] = useState<string>("quality-mom");
  const [windows, setWindows] = useState<AppWindow[]>(initialWindows);
  const [activeWindow, setActiveWindow] = useState<WindowId>("ai-researcher");
  const [commandOpen, setCommandOpen] = useState(false);
  const [command, setCommand] = useState("");

  const visibleWindows = useMemo(
    () => windows.filter((windowItem) => !windowItem.minimized),
    [windows]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }

      if (event.key === "Escape") {
        setCommandOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openWindow = (id: WindowId) => {
    setWindows((current) => {
      const exists = current.some((windowItem) => windowItem.id === id);
      if (exists) {
        return current.map((windowItem) =>
          windowItem.id === id ? { ...windowItem, minimized: false } : windowItem
        );
      }
      return [...current, windowDefaults[id]];
    });
    setActiveWindow(id);
  };

  const closeWindow = (id: WindowId) => {
    setWindows((current) => current.filter((windowItem) => windowItem.id !== id));
  };

  const minimizeWindow = (id: WindowId) => {
    setWindows((current) =>
      current.map((windowItem) =>
        windowItem.id === id ? { ...windowItem, minimized: true } : windowItem
      )
    );
  };

  return (
    <main className="oq-os-shell" aria-label="OtterQuant desktop OS preview">
      <SystemBar
        runningTasks={6}
        onOpenTasks={() => openWindow("task-manager")}
        onOpenCommand={() => setCommandOpen(true)}
      />

      <section className="oq-desktop" aria-label="研究桌面">
        <div className="oq-desktop-metric" aria-label="恢复的研究现场">
          <span className="oq-label">RESTORED RESEARCH SCENE</span>
          <strong>07</strong>
          <span>assets active / 3 windows restored</span>
        </div>

        <div className="oq-assets-layer">
          {desktopAssets.map((asset) => (
            <button
              className={`oq-asset ${selectedAsset === asset.id ? "is-selected" : ""}`}
              key={asset.id}
              onClick={() => setSelectedAsset(asset.id)}
              onDoubleClick={() => openWindow(asset.window)}
              style={{
                left: `${asset.x}%`,
                top: `${asset.y}%`,
              }}
              type="button"
            >
              <AssetGlyph type={asset.type} />
              <span>{asset.name}</span>
              <small>{asset.meta}</small>
            </button>
          ))}
        </div>

        <div className="oq-window-layer">
          {visibleWindows.map((windowItem) => (
            <ResearchWindow
              active={activeWindow === windowItem.id}
              key={windowItem.id}
              onActivate={() => setActiveWindow(windowItem.id)}
              onClose={() => closeWindow(windowItem.id)}
              onMinimize={() => minimizeWindow(windowItem.id)}
              windowItem={windowItem}
            />
          ))}
        </div>

        <RightRail onOpenAi={() => openWindow("ai-researcher")} />
      </section>

      <Dock
        activeWindows={windows}
        onOpen={(id) => openWindow(id)}
      />

      <CommandCenter
        command={command}
        onChangeCommand={setCommand}
        onClose={() => setCommandOpen(false)}
        open={commandOpen}
      />
    </main>
  );
}

function SystemBar({
  runningTasks,
  onOpenTasks,
  onOpenCommand,
}: {
  runningTasks: number;
  onOpenTasks: () => void;
  onOpenCommand: () => void;
}) {
  return (
    <header className="oq-system-bar">
      <div className="oq-menu-cluster">
        <strong>OtterQuant</strong>
        <span>File</span>
        <span>Factor</span>
        <span>Strategy</span>
        <span>Backtest</span>
        <span>Window</span>
        <span>Help</span>
      </div>
      <div className="oq-status-cluster">
        <button className="oq-status-pill" type="button">
          A 股已收盘 · 美股盘前 · CRYPTO LIVE
        </button>
        <span>DATA 15:02:18</span>
        <button className="oq-status-pill" onClick={onOpenTasks} type="button">
          TASKS {runningTasks}
        </button>
        <span>QUEUE 72%</span>
        <button className="oq-risk-button" type="button">
          <CircleAlert size={14} />
          RISK 1
        </button>
        <button className="oq-search-trigger" onClick={onOpenCommand} type="button">
          <Search size={14} />
          CMD K
        </button>
        <button className="oq-avatar" type="button" aria-label="账户菜单">
          L
        </button>
      </div>
    </header>
  );
}

function AssetGlyph({ type }: { type: DesktopAsset["type"] }) {
  const Icon =
    type === ".factor"
      ? Activity
      : type === ".strategy"
        ? LineChart
        : type === ".backtest"
          ? Gauge
          : type === ".memo"
            ? FileText
            : type === ".folder"
              ? FolderKanban
              : Archive;

  return (
    <span className="oq-asset-glyph">
      <Icon size={26} />
      <i>{type}</i>
    </span>
  );
}

function ResearchWindow({
  active,
  onActivate,
  onClose,
  onMinimize,
  windowItem,
}: {
  active: boolean;
  onActivate: () => void;
  onClose: () => void;
  onMinimize: () => void;
  windowItem: AppWindow;
}) {
  return (
    <article
      className={`oq-window ${active ? "is-active" : ""}`}
      onMouseDown={onActivate}
      style={{
        left: `${windowItem.x}%`,
        top: `${windowItem.y}%`,
        width: `${windowItem.w}%`,
        minHeight: `${windowItem.h}vh`,
      }}
    >
      <header className="oq-window-bar">
        <div>
          <strong>{windowItem.title}</strong>
          <span>{windowItem.subtitle}</span>
        </div>
        <div className="oq-window-actions">
          <button onClick={onMinimize} type="button" aria-label="最小化">
            <Minus size={14} />
          </button>
          <button type="button" aria-label="最大化">
            <Maximize2 size={14} />
          </button>
          <button onClick={onClose} type="button" aria-label="关闭">
            <X size={14} />
          </button>
        </div>
      </header>
      <WindowContent id={windowItem.id} />
    </article>
  );
}

function WindowContent({ id }: { id: WindowId }) {
  if (id === "factor-radar") {
    return (
      <div className="oq-window-body">
        <div className="oq-window-hero">
          <span className="oq-label">SIGNAL STABILITY</span>
          <strong>0.071</strong>
          <span>avg ic / 36m / neutralized</span>
        </div>
        <SegmentedMetric label="规模暴露" value="34%" tone="warning" filled={7} />
        <SegmentedMetric label="换手压力" value="18%" tone="success" filled={4} />
        <div className="oq-sparkline" aria-label="因子表现趋势">
          {Array.from({ length: 22 }, (_, index) => (
            <i key={index} style={{ height: `${18 + ((index * 13) % 38)}px` }} />
          ))}
        </div>
      </div>
    );
  }

  if (id === "strategy-editor") {
    return (
      <div className="oq-window-body">
        <div className="oq-flow">
          {["股票池", "因子权重", "风控", "调仓", "回测"].map((step, index) => (
            <span className={index === 2 ? "is-live" : ""} key={step}>
              {step}
            </span>
          ))}
        </div>
        <MetricRows
          rows={[
            ["年化收益", "+18.4%", "success"],
            ["最大回撤", "-8.2%", "warning"],
            ["月换手", "41%", "primary"],
            ["样本外衰减", "12%", "warning"],
          ]}
        />
        <button className="oq-primary-action" type="button">RUN BACKTEST</button>
      </div>
    );
  }

  if (id === "ai-researcher") {
    return (
      <div className="oq-window-body">
        <p className="oq-ai-note">
          当前策略收益提升主要来自换手增加，而不是信号质量改善。建议对 `low_vol_v4` 做一次中性化检查，并对比 V3 的样本外稳定性。
        </p>
        <MetricRows
          rows={[
            ["下一步", "中性化检查", "primary"],
            ["风险", "规模暴露", "warning"],
            ["置信", "82%", "success"],
          ]}
        />
      </div>
    );
  }

  if (id === "task-manager") {
    return (
      <div className="oq-window-body">
        {[
          ["回测运行中", "LOW_VOL_V4", "62%", "primary"],
          ["因子扫描中", "QUALITY_MOM", "41%", "primary"],
          ["风险报告生成中", "ETF_ROTATION", "88%", "warning"],
          ["数据同步中", "CRYPTO_RT", "DONE", "success"],
        ].map(([label, name, value, tone]) => (
          <SegmentedMetric
            filled={value === "DONE" ? 12 : Math.max(2, Math.floor(Number.parseInt(value, 10) / 8))}
            key={`${label}-${name}`}
            label={`${label} / ${name}`}
            tone={tone}
            value={value}
          />
        ))}
      </div>
    );
  }

  if (id === "project-folder") {
    return (
      <div className="oq-window-body">
        <div className="oq-project-grid">
          {["研究假设", "候选因子", "数据集", "策略版本", "回测结果", "AI 总结"].map((item, index) => (
            <button key={item} type="button">
              <span>0{index + 1}</span>
              {item}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="oq-window-body">
      <MetricRows
        rows={[
          ["状态", id === "risk-exposure" ? "需复查" : "草稿", id === "risk-exposure" ? "warning" : "primary"],
          ["最近修改", "15:02", "primary"],
          ["归属项目", "红利低波", "primary"],
        ]}
      />
      <p className="oq-ai-note">
        失败实验也被保留为研究资产。删除、归档和复盘原因会进入失败实验库，后续可恢复或用于模型 reviewer。
      </p>
    </div>
  );
}

function MetricRows({
  rows,
}: {
  rows: Array<[string, string, string]>;
}) {
  return (
    <div className="oq-metric-rows">
      {rows.map(([label, value, tone]) => (
        <div key={label}>
          <span>{label}</span>
          <strong className={`tone-${tone}`}>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function SegmentedMetric({
  filled,
  label,
  tone,
  value,
}: {
  filled: number;
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <div className="oq-segmented">
      <div>
        <span>{label}</span>
        <strong className={`tone-${tone}`}>{value}</strong>
      </div>
      <div className="oq-segments">
        {Array.from({ length: 12 }, (_, index) => (
          <i className={index < filled ? `is-filled tone-${tone}` : ""} key={index} />
        ))}
      </div>
    </div>
  );
}

function RightRail({ onOpenAi }: { onOpenAi: () => void }) {
  return (
    <aside className="oq-right-rail" aria-label="通知与 AI 面板">
      <div className="oq-rail-section">
        <span className="oq-label">AI REVIEW</span>
        <button onClick={onOpenAi} type="button">
          这个因子可能存在规模暴露，建议做一次中性化检查。
        </button>
      </div>
      <div className="oq-rail-section">
        <span className="oq-label">TASK QUEUE</span>
        <SegmentedMetric label="回测终端" value="62%" tone="primary" filled={8} />
        <SegmentedMetric label="报告生成" value="88%" tone="warning" filled={10} />
      </div>
      <div className="oq-rail-section">
        <span className="oq-label">FAILED LIBRARY</span>
        <p>过拟合策略 12 / 样本外失败 7 / 表现不稳 4</p>
      </div>
    </aside>
  );
}

function Dock({
  activeWindows,
  onOpen,
}: {
  activeWindows: AppWindow[];
  onOpen: (id: WindowId) => void;
}) {
  const activeIds = new Set(activeWindows.map((windowItem) => windowItem.id));

  return (
    <nav className="oq-dock" aria-label="Dock 工具栏">
      {dockItems.map((item) => {
        const Icon = item.icon;
        const windowId = item.id as WindowId;
        const canOpen = windowId in windowDefaults;

        return (
          <button
            className={activeIds.has(windowId) ? "is-running" : ""}
            key={item.id}
            onClick={() => canOpen && onOpen(windowId)}
            title={item.label}
            type="button"
          >
            <Icon size={22} />
            <span>{item.label}</span>
            <i>{item.state}</i>
          </button>
        );
      })}
    </nav>
  );
}

function CommandCenter({
  command,
  onChangeCommand,
  onClose,
  open,
}: {
  command: string;
  onChangeCommand: (value: string) => void;
  onClose: () => void;
  open: boolean;
}) {
  if (!open) return null;

  return (
    <div className="oq-command-backdrop" role="presentation">
      <section className="oq-command" role="dialog" aria-modal="true" aria-label="全局命令中心">
        <header>
          <Search size={18} />
          <input
            autoFocus
            onChange={(event) => onChangeCommand(event.target.value)}
            placeholder="搜索资产、功能，或直接创建研究任务"
            value={command}
          />
          <button onClick={onClose} type="button">[ X ]</button>
        </header>
        <div className="oq-command-grid">
          <div>
            <span className="oq-label">RECENT COMMANDS</span>
            {commands.map((item) => (
              <button key={item} type="button">
                <CircleDot size={12} />
                {item}
              </button>
            ))}
          </div>
          <div>
            <span className="oq-label">SYSTEM SHORTCUTS</span>
            {[
              ["挖因子", BrainCircuit],
              ["任务管理器", ClipboardList],
              ["恢复上次布局", LayoutGrid],
              ["账户设置", Settings],
              ["风险扫描", ShieldAlert],
              ["最近文件", Clock3],
            ].map(([label, Icon]) => {
              const ShortcutIcon = Icon as typeof BrainCircuit;
              return (
                <button key={label as string} type="button">
                  <ShortcutIcon size={14} />
                  {label as string}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

export default DesktopOS;

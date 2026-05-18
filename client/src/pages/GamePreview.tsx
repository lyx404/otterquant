import { type CSSProperties, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Check,
  ClipboardList,
  Clock3,
  Crown,
  Lock,
  Plus,
  Store,
  Users,
} from "lucide-react";
import "./QuantEdgeRoom.css";

type SeatState = {
  id: number;
  name: string;
  specialty: string;
  locked: boolean;
  cost: number;
  x: string;
  y: string;
};

type TabKey = "factors" | "market" | "strategy" | "real";

const initialSeats: SeatState[] = [
  {
    id: 1,
    name: "AI Scout",
    specialty: "Research",
    locked: false,
    cost: 0,
    x: "32.5%",
    y: "40.8%",
  },
  {
    id: 2,
    name: "AI Backtester",
    specialty: "Backtest",
    locked: true,
    cost: 12000,
    x: "36.1%",
    y: "63.8%",
  },
  {
    id: 3,
    name: "AI Executor",
    specialty: "Execution",
    locked: true,
    cost: 18000,
    x: "51.5%",
    y: "69.5%",
  },
  {
    id: 4,
    name: "AI Risk Guard",
    specialty: "Risk",
    locked: true,
    cost: 24000,
    x: "58.6%",
    y: "52.3%",
  },
  {
    id: 5,
    name: "AI PM",
    specialty: "Portfolio",
    locked: true,
    cost: 36000,
    x: "70.8%",
    y: "63.2%",
  },
];

const tabContent: Record<TabKey, { title: string; text: string; metric: string }> = {
  factors: {
    title: "Factors",
    text: "研究员正在从量价、宏观和链上数据里筛选候选因子。",
    metric: "12 signals",
  },
  market: {
    title: "Factor Market",
    text: "市场里有 4 个因子补给箱刷新，稀有度随声誉提升。",
    metric: "4 boxes",
  },
  strategy: {
    title: "Strategy",
    text: "把通过回测的因子装配成策略，等待 AI PM 审核。",
    metric: "2 drafts",
  },
  real: {
    title: "Real Market",
    text: "实盘通道未完全开放，先用模拟资金验证执行稳定性。",
    metric: "+3.42%",
  },
};

const navItems: Array<{ key: TabKey; label: string; icon: typeof BarChart3 }> = [
  { key: "factors", label: "Factors", icon: BarChart3 },
  { key: "market", label: "Factor Market", icon: Store },
  { key: "strategy", label: "Strategy", icon: ClipboardList },
  { key: "real", label: "Real Market", icon: ChartNoAxesCombined },
];

const formatMoney = (value: number) =>
  `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <section className={`qe-panel ${className ?? ""}`}>{children}</section>;
}

function SeatIcon({ unlocked }: { unlocked: boolean }) {
  return (
    <span className={unlocked ? "qe-seat-icon unlocked" : "qe-seat-icon"}>
      {unlocked ? <Bot size={18} /> : <Lock size={15} />}
    </span>
  );
}

export default function GamePreview() {
  const [seats, setSeats] = useState(initialSeats);
  const [selectedSeat, setSelectedSeat] = useState(1);
  const [cash, setCash] = useState(125430);
  const [reputation, setReputation] = useState(150);
  const [activeTab, setActiveTab] = useState<TabKey>("factors");
  const [minutes, setMinutes] = useState(9 * 60 + 42);
  const [bubble, setBubble] = useState("AI Scout 正在读取白板目标");
  const [toast, setToast] = useState("点击空座位或 Connect AI 解锁研究员");

  const unlockedSeats = seats.filter((seat) => !seat.locked).length;
  const nextLockedSeat = seats.find((seat) => seat.locked);
  const selected = seats.find((seat) => seat.id === selectedSeat) ?? seats[0];

  const clock = useMemo(() => {
    const hour = Math.floor(minutes / 60) % 24;
    const minute = minutes % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }, [minutes]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMinutes((value) => (value + 7) % (24 * 60));
      setCash((value) => value + unlockedSeats * 280);
    }, 2600);

    return () => window.clearInterval(timer);
  }, [unlockedSeats]);

  const connectAi = () => {
    if (!nextLockedSeat) {
      setToast("全部 AI 座位已连接，Quant Edge Fund 满员运行中");
      return;
    }

    if (cash < nextLockedSeat.cost) {
      setToast(`${nextLockedSeat.name} 需要 ${formatMoney(nextLockedSeat.cost)} 资金`);
      return;
    }

    setSeats((current) =>
      current.map((seat) =>
        seat.id === nextLockedSeat.id ? { ...seat, locked: false } : seat
      )
    );
    setSelectedSeat(nextLockedSeat.id);
    setCash((value) => value - nextLockedSeat.cost);
    setReputation((value) => value + 25);
    setBubble(`${nextLockedSeat.name} 已上线：${nextLockedSeat.specialty}`);
    setToast(`已连接 ${nextLockedSeat.name}，新增一个研究席位`);
  };

  const chooseSeat = (seat: SeatState) => {
    setSelectedSeat(seat.id);
    if (seat.locked) {
      setToast(`${seat.name} 仍锁定，连接成本 ${formatMoney(seat.cost)}`);
      setBubble("先连接 AI，再把这个席位投入研究流程");
      return;
    }

    setToast(`${seat.name} 正在处理 ${seat.specialty} 工作流`);
    setBubble(`${seat.name}: ${seat.specialty} queue online`);
  };

  const activeTabContent = tabContent[activeTab];

  return (
    <main className="qe-page">
      <div className="qe-stage" aria-label="Quant Edge Fund interactive room">
        <div className="qe-room-art" />
        <div className="qe-vignette" />

        <div className="qe-left-stack" aria-label="状态面板">
          <Panel className="qe-clock-panel">
            <span className="qe-clock-face">
              <Clock3 size={27} />
            </span>
            <div>
              <strong>{clock}</strong>
              <span>MON, DAY 1</span>
            </div>
          </Panel>

          <Panel className="qe-money-panel">
            <span className="qe-cash-cube">
              <BriefcaseBusiness size={27} />
            </span>
            <div>
              <strong>{formatMoney(cash)}</strong>
              <span>$ {((unlockedSeats + 1) * 2140).toLocaleString("en-US")} / day</span>
            </div>
          </Panel>

          <Panel className="qe-rep-panel">
            <Crown size={38} />
            <div>
              <span>Reputation</span>
              <strong>{reputation}</strong>
            </div>
          </Panel>
        </div>

        <Panel className="qe-seat-panel" aria-label="AI seats">
          <div className="qe-seat-panel-head">
            <span>
              <Users size={25} />
              AI Seats
            </span>
            <strong>{unlockedSeats} / 5</strong>
          </div>
          <div className="qe-seat-slots">
            {seats.map((seat) => (
              <button
                aria-label={seat.locked ? `${seat.name} locked` : `${seat.name} connected`}
                className={seat.locked ? "" : "unlocked"}
                key={seat.id}
                onClick={() => chooseSeat(seat)}
                type="button"
              >
                <SeatIcon unlocked={!seat.locked} />
              </button>
            ))}
          </div>
        </Panel>

        <button
          className="qe-hotspot qe-board-hotspot"
          onClick={() => {
            setActiveTab("strategy");
            setToast("白板目标已打开：DATA -> MODEL -> EDGE -> PnL");
            setBubble("Research, Backtest, Execute, Improve");
          }}
          type="button"
        >
          <span>Quant Edge Fund</span>
        </button>

        <button
          className="qe-hotspot qe-bot-hotspot"
          onClick={() => {
            setBubble("AI Scout: 我可以帮你发现一个新因子");
            setToast("蓝色机器人已激活，等待分配研究任务");
          }}
          type="button"
        >
          <Bot size={28} />
        </button>

        {seats.map((seat) => (
          <button
            className={`qe-seat-hotspot ${seat.locked ? "locked" : "ready"} ${
              selectedSeat === seat.id ? "selected" : ""
            }`}
            key={seat.id}
            onClick={() => chooseSeat(seat)}
            style={{ "--x": seat.x, "--y": seat.y } as CSSProperties}
            type="button"
          >
            <span className="qe-plus">{seat.locked ? <Plus size={28} /> : <Check size={22} />}</span>
            <span className="qe-lock">{seat.locked ? <Lock size={18} /> : <Bot size={17} />}</span>
          </button>
        ))}

        <div className="qe-speech" role="status">
          {bubble}
        </div>

        <Panel className="qe-connect-panel">
          <h2>Connect AI</h2>
          <div className="qe-ai-portrait">
            <Bot size={44} />
            <span />
          </div>
          <p>
            {nextLockedSeat
              ? `Connect your AI to unlock ${nextLockedSeat.name}.`
              : "All AI seats are connected."}
          </p>
          <button onClick={connectAi} type="button">
            {nextLockedSeat ? "Connect AI" : "Fully Connected"}
          </button>
        </Panel>

        <div className="qe-bottom-dock" aria-label="底部导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeTab === item.key ? "active" : ""}
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  setToast(`${tabContent[item.key].title} 面板已打开`);
                }}
                type="button"
              >
                <Icon size={38} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <Panel className="qe-info-drawer">
          <div>
            <span>{activeTabContent.metric}</span>
            <strong>{activeTabContent.title}</strong>
            <p>{activeTabContent.text}</p>
          </div>
          <div className="qe-mini-chart" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </Panel>

        <div className="qe-toast" role="status">
          {toast}
        </div>
      </div>
    </main>
  );
}

import { useState } from "react";
import { Claude, OpenAI } from "@lobehub/icons";
import { Check, Link2Off } from "lucide-react";
import { toast } from "sonner";
import openClawMark from "@assets/agent-settings/asset-6.png";

type AgentId = "claude" | "chatgpt" | "openclaw";
type Translate = (en: string, zh: string) => string;

type AgentSettingsPanelProps = {
  tr: Translate;
};

type Agent = {
  id: AgentId;
  name: string;
  detail: string;
  lastSync: string;
};

const AGENTS: Agent[] = [
  { id: "claude", name: "Claude", detail: "桌面端 + 终端", lastSync: "上次同步 4 分钟前" },
  { id: "chatgpt", name: "ChatGPT", detail: "桌面端 + 终端", lastSync: "上次同步 42 分钟前" },
  { id: "openclaw", name: "OpenClaw", detail: "桌面端 + 终端", lastSync: "尚未连接" },
];

const ACTIVITY = [
  { time: "8月17日 20:22", agent: "Claude", event: "connected" },
  { time: "8月21日 20:22", agent: "ChatGPT", event: "reconnected" },
  { time: "8月24日 20:18", agent: "Claude", event: "reconnected" },
] as const;

function AgentMark({ id }: { id: AgentId }) {
  if (id === "claude") return <Claude.Avatar aria-hidden="true" size={28} shape="square" />;
  if (id === "chatgpt") return <OpenAI.Avatar aria-hidden="true" size={28} shape="square" />;
  return <img className="oq-agent-management-mark-image" src={openClawMark} alt="" />;
}

function StatusPill({ connected, label }: { connected: boolean; label: string }) {
  return (
    <span className={`oq-agent-management-status ${connected ? "is-connected" : "is-disconnected"}`}>
      <span aria-hidden="true" />
      {label}
    </span>
  );
}

export function AgentSettingsPanel({ tr }: AgentSettingsPanelProps) {
  const [connectionById, setConnectionById] = useState<Record<AgentId, boolean>>({
    claude: true,
    chatgpt: true,
    openclaw: false,
  });

  const toggleConnection = (agent: Agent) => {
    const nextConnected = !connectionById[agent.id];
    setConnectionById((current) => ({ ...current, [agent.id]: nextConnected }));
    toast.success(nextConnected ? tr(`${agent.name} connected`, `${agent.name} 已连接`) : tr(`${agent.name} disconnected`, `${agent.name} 已断开连接`));
  };

  return (
    <div className="oq-agent-management-page">
      <section className="oq-agent-management-card" aria-labelledby="oq-agent-connections-title">
        <div className="oq-agent-management-card-header">
          <h3 id="oq-agent-connections-title">{tr("Agent connections", "智能体连接")}</h3>
          <p>{tr("Connected agents automatically sync factor results.", "已连接的智能体会自动同步因子结果。")}</p>
        </div>
        <div className="oq-agent-management-table">
          <div className="oq-agent-management-row oq-agent-management-head">
            <span>{tr("Agent", "智能体")}</span>
            <span>{tr("Status", "状态")}</span>
            <span>{tr("Recent activity", "最近活动")}</span>
            <span className="oq-agent-management-action-heading">{tr("Action", "操作")}</span>
          </div>
          {AGENTS.map((agent) => {
            const connected = connectionById[agent.id];
            return (
              <div className="oq-agent-management-row" key={agent.id}>
                <div className="oq-agent-management-agent">
                  <span className={`oq-agent-management-mark is-${agent.id}`}><AgentMark id={agent.id} /></span>
                  <span><strong>{agent.name}</strong><small>{agent.detail}</small></span>
                </div>
                <StatusPill connected={connected} label={connected ? tr("Connected", "已连接") : tr("Not connected", "未连接")} />
                <span className="oq-agent-management-sync">{connected ? tr(agent.lastSync, agent.lastSync) : tr("Not connected yet", "尚未连接")}</span>
                <button type="button" className={`oq-agent-management-action ${connected ? "is-secondary" : "is-primary"}`} onClick={() => toggleConnection(agent)}>
                  {connected ? <><Link2Off aria-hidden="true" />{tr("Disconnect", "断开连接")}</> : <><Check aria-hidden="true" />{tr("Connect", "连接")}</>}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="oq-agent-management-card" aria-labelledby="oq-agent-activity-title">
        <div className="oq-agent-management-card-header">
          <h3 id="oq-agent-activity-title">{tr("Connection activity", "连接活动")}</h3>
          <p>{tr("Recent connect, reconnect and disconnect history.", "最近的连接、重连与断开记录。")}</p>
        </div>
        <div className="oq-agent-management-table oq-agent-management-activity">
          <div className="oq-agent-management-row oq-agent-management-head">
            <span>{tr("Time", "时间")}</span>
            <span>{tr("Agent", "智能体")}</span>
            <span className="oq-agent-management-event-heading">{tr("Event", "事件")}</span>
          </div>
          {ACTIVITY.map((item) => {
            const id = item.agent === "Claude" ? "claude" : "chatgpt";
            return (
              <div className="oq-agent-management-row" key={`${item.time}-${item.agent}`}>
                <span className="oq-agent-management-time">{item.time}</span>
                <span className="oq-agent-management-activity-agent"><span className={`oq-agent-management-mark is-${id}`}><AgentMark id={id} /></span><strong>{item.agent}</strong></span>
                <StatusPill connected={item.event === "connected"} label={item.event === "connected" ? tr("Connected", "已连接") : tr("Reconnected", "已重连")} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

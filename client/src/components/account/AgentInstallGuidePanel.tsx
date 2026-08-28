import { useState, type ReactNode } from "react";
import { Claude, OpenAI } from "@lobehub/icons";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import openClawMark from "@assets/agent-settings/asset-6.png";

type AgentId = "claude" | "chatgpt" | "openclaw";
type GuideMode = "desktop" | "terminal";
type Translate = (en: string, zh: string) => string;

type AgentInstallGuidePanelProps = {
  tr: Translate;
};

const QUANDORA_PLUGIN_URL = "https://github.com/varsity-tech-product/quandora-plugins";
const MCP_SERVER_URL = "https://mcp.quandora.ai/factor-mining";

const AGENTS: Array<{ id: AgentId; name: string; statusZh: string }> = [
  { id: "claude", name: "Claude", statusZh: "安装指南" },
  { id: "chatgpt", name: "ChatGPT (Codex)", statusZh: "即将上线" },
  { id: "openclaw", name: "OpenClaw", statusZh: "即将上线" },
];

function AgentMark({ id }: { id: AgentId }) {
  if (id === "claude") return <Claude.Avatar aria-hidden="true" size={30} shape="square" />;
  if (id === "chatgpt") return <OpenAI.Avatar aria-hidden="true" size={30} shape="square" />;
  return <img className="oq-agent-install-mark-image" src={openClawMark} alt="" />;
}

function CopyField({ value, label, tr }: { value: string; label: string; tr: Translate }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(tr(`${label} copied`, `${label}已复制`));
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="oq-agent-install-copy-field">
      <code>{value}</code>
      <button type="button" aria-label={copied ? tr("Copied", "已复制") : tr(`Copy ${label}`, `复制${label}`)} onClick={handleCopy}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </button>
    </div>
  );
}

function Step({ number, children }: { number: number; children: ReactNode }) {
  return (
    <section className="oq-agent-install-step">
      <span className="oq-agent-install-step-number" aria-hidden="true">{number}</span>
      <div className="oq-agent-install-step-card">{children}</div>
    </section>
  );
}

export function AgentInstallGuidePanel({ tr }: AgentInstallGuidePanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentId>("claude");
  const [mode, setMode] = useState<GuideMode>("desktop");
  const selected = AGENTS.find((agent) => agent.id === selectedAgent) ?? AGENTS[0];
  const isAvailable = selectedAgent === "claude";

  return (
    <div className="oq-agent-install-page">
      <aside className="oq-agent-install-agent-list" aria-label={tr("Agent selection", "智能体选择")}>
        {AGENTS.map((agent) => (
          <button
            type="button"
            key={agent.id}
            className={`oq-agent-install-agent${selectedAgent === agent.id ? " is-active" : ""}`}
            aria-pressed={selectedAgent === agent.id}
            onClick={() => setSelectedAgent(agent.id)}
          >
            <span className={`oq-agent-install-mark is-${agent.id}`}><AgentMark id={agent.id} /></span>
            <span><strong>{agent.name}</strong><small>{agent.statusZh}</small></span>
          </button>
        ))}
      </aside>

      <div className="oq-agent-install-guide">
        <header className="oq-agent-install-guide-header">
          <span className={`oq-agent-install-mark is-${selectedAgent}`}><AgentMark id={selectedAgent} /></span>
          <span><h2>{selected.name}</h2><p>{isAvailable ? tr("Factor mining connection guide", "因子挖掘连接安装指南") : tr("Installation guide coming soon", "安装指南即将上线")}</p></span>
          {isAvailable && (
            <div className="oq-agent-install-mode" role="group" aria-label={tr("Installation mode", "安装方式")}>
              <button type="button" className={mode === "desktop" ? "is-active" : ""} onClick={() => setMode("desktop")}>{tr("Desktop", "桌面端")}</button>
              <button type="button" className={mode === "terminal" ? "is-active" : ""} onClick={() => setMode("terminal")}>{tr("Terminal", "终端")}</button>
            </div>
          )}
        </header>

        {isAvailable ? mode === "desktop" ? (
          <div className="oq-agent-install-steps">
            <Step number={1}>
              <h3>{tr("Copy the Quandora link", "复制 Quandora 链接")}</h3>
              <p>{tr("Use the copy button in the next step.", "点击复制按钮，下一步会用到。")}</p>
              <CopyField value={QUANDORA_PLUGIN_URL} label={tr("Quandora link", "Quandora 链接")} tr={tr} />
            </Step>
            <Step number={2}>
              <h3>{tr("Open Customise → Plugins → Add marketplace", "打开 Customise → Plugins → Add marketplace")}</h3>
              <p>{tr("Open Customise, select Plugins, then Add marketplace. Choose Add from a repository, paste the link into the URL field, and select Sync.", "打开 Customise，点击 Plugins，再点击 Add marketplace。选择「Add from a repository」，把链接粘贴到 URL 输入框，完成后点击 Sync。")}</p>
            </Step>
            <Step number={3}>
              <h3>{tr("Open Connectors", "进入 Connectors")}</h3>
              <p>{tr("Select Connectors and add a custom connector. Paste the values below, then select Add.", "点击 Connectors，添加自定义连接器。粘贴下方信息后点击 Add。")}</p>
              <label>{tr("Name", "名称")}</label>
              <CopyField value="quandora" label={tr("name", "名称")} tr={tr} />
              <label>{tr("Remote MCP server URL", "远程 MCP 服务器地址")}</label>
              <CopyField value={MCP_SERVER_URL} label={tr("MCP server URL", "MCP 服务器地址")} tr={tr} />
            </Step>
            <Step number={4}>
              <h3>{tr("Connect and authorize", "连接并授权")}</h3>
              <p>{tr("After adding the connector, select Connect and complete Quandora authorization in your browser.", "添加完成后点击 Connect，在浏览器中完成 Quandora 授权。")}</p>
            </Step>
          </div>
        ) : (
          <div className="oq-agent-install-steps">
            <Step number={1}>
              <h3>{tr("Run the install command", "运行安装命令")}</h3>
              <p>{tr("Run this command in your terminal to add the Quandora connector.", "在终端中运行以下命令以添加 Quandora 连接器。")}</p>
              <CopyField value={`claude mcp add quandora ${MCP_SERVER_URL}`} label={tr("install command", "安装命令")} tr={tr} />
            </Step>
            <Step number={2}>
              <h3>{tr("Connect and authorize", "连接并授权")}</h3>
              <p>{tr("Open Claude, select the Quandora connector, then complete authorization in your browser.", "打开 Claude，选择 Quandora 连接器，然后在浏览器中完成授权。")}</p>
            </Step>
          </div>
        ) : (
          <div className="oq-agent-install-unavailable">
            <span className={`oq-agent-install-mark is-${selectedAgent}`}><AgentMark id={selectedAgent} /></span>
            <h3>{tr("Coming soon", "即将上线")}</h3>
            <p>{tr("This agent's installation guide is being prepared.", "该智能体的安装指南正在准备中。")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

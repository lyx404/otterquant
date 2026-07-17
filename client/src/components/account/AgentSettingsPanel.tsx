import { useState } from "react";
import { Codex } from "@lobehub/icons";
import { Check, Copy, FlaskConical, Link2 } from "lucide-react";
import { toast } from "sonner";
import claudeMark from "@assets/agent-settings/asset-4.png";
import openClawMark from "@assets/agent-settings/asset-6.png";
import codexManualGuide from "@assets/agent-settings/asset-7.png";

type AgentId = "codex" | "claude" | "openclaw";
type Translate = (en: string, zh: string) => string;

type AgentSettingsPanelProps = {
  tr: Translate;
};

const INSTALL_COMMAND = "npx @codex/buddy install --token=YOUR_TOKEN";

const AGENTS: Array<{ id: AgentId; name: string; connected: boolean }> = [
  { id: "codex", name: "Codex desktop", connected: true },
  { id: "claude", name: "Claude Code desktop", connected: false },
  { id: "openclaw", name: "Open Claw desktop", connected: false },
];

function AgentMark({ agentId }: { agentId: AgentId }) {
  if (agentId === "claude") {
    return <img className="oq-agent-mark-image" src={claudeMark} alt="" />;
  }

  if (agentId === "openclaw") {
    return (
      <img
        className="oq-agent-mark-image oq-agent-mark-openclaw"
        src={openClawMark}
        alt=""
      />
    );
  }

  return (
    <Codex.Avatar
      aria-hidden="true"
      className="oq-agent-codex-avatar"
      size={16}
      shape="square"
    />
  );
}

export function AgentSettingsPanel({ tr }: AgentSettingsPanelProps) {
  const [connectionById, setConnectionById] = useState<
    Record<AgentId, boolean>
  >({
    codex: true,
    claude: false,
    openclaw: false,
  });
  const [copied, setCopied] = useState(false);

  const handleCopyInstallCommand = async () => {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
    setCopied(true);
    toast.success(tr("Install command copied", "安装命令已复制"));
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleTest = (agent: (typeof AGENTS)[number]) => {
    const connected = connectionById[agent.id];
    toast.success(
      connected
        ? tr(
            `${agent.name} connection test passed`,
            `${agent.name} 连接测试通过`
          )
        : tr(`${agent.name} is not connected`, `${agent.name} 尚未连接`)
    );
  };

  const handleDisconnect = (agent: (typeof AGENTS)[number]) => {
    setConnectionById(current => ({ ...current, [agent.id]: false }));
    toast.success(
      connectionById[agent.id]
        ? tr(`${agent.name} disconnected`, `${agent.name} 已断开`)
        : tr(
            `${agent.name} is already disconnected`,
            `${agent.name} 已处于断开状态`
          )
    );
  };

  const handleConnectGuide = (agent: (typeof AGENTS)[number]) => {
    toast.success(
      tr(
        `Showing the ${agent.name} connection guide`,
        `正在查看 ${agent.name} 连接指引`
      )
    );
  };

  return (
    <div className="oq-agent-settings">
      <div className="oq-agent-connection-list">
        {AGENTS.map(agent => {
          const connected = connectionById[agent.id];

          return (
            <article className="oq-agent-connection-card" key={agent.id}>
              <div
                className={`oq-agent-mark ${agent.id === "codex" ? "is-codex" : ""}`}
              >
                <AgentMark agentId={agent.id} />
              </div>
              <div className="oq-agent-connection-title">{agent.name}</div>
              <div
                className={`oq-agent-connection-status ${connected ? "is-connected" : ""}`}
              >
                <span aria-hidden="true" />
                {connected
                  ? tr("Connected", "已连接")
                  : tr("Disconnected", "未连接")}
              </div>
              <div className="oq-agent-card-actions">
                <button
                  type="button"
                  className="oq-agent-control"
                  onClick={() => handleTest(agent)}
                >
                  <FlaskConical aria-hidden="true" />
                  <span>{tr("Test", "测试")}</span>
                </button>
                <button
                  type="button"
                  className="oq-agent-control"
                  onClick={() => handleDisconnect(agent)}
                >
                  <span>{tr("Disconnect", "断开连接")}</span>
                </button>
                <button
                  type="button"
                  className="oq-agent-control"
                  onClick={() => handleConnectGuide(agent)}
                >
                  <Link2 aria-hidden="true" />
                  <span>{tr("Connect Guide", "连接指引")}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="oq-agent-installation-list">
        <article className="oq-agent-install-card oq-agent-auto-install-card">
          <div className="oq-agent-install-heading">
            <div className="oq-agent-install-mark is-codex">
              <Codex.Avatar
                aria-hidden="true"
                className="oq-agent-codex-avatar"
                size={15}
                shape="square"
              />
            </div>
            <strong>Codex desktop</strong>
            <span className="oq-agent-install-mode">
              {tr("Auto Install", "自动安装")}
            </span>
          </div>
          <p>
            {tr(
              "Enter the following command in the Codex chat to install the plugin.",
              "在 Codex 聊天中输入以下命令以安装插件。"
            )}
          </p>
          <div className="oq-agent-install-command">
            <code>{INSTALL_COMMAND}</code>
            <button
              type="button"
              onClick={handleCopyInstallCommand}
              aria-label={tr("Copy install command", "复制安装命令")}
            >
              {copied ? (
                <Check aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
              <span>
                {copied ? tr("Copied", "已复制") : tr("Copy", "复制")}
              </span>
            </button>
          </div>
        </article>

        <article className="oq-agent-install-card oq-agent-manual-install-card">
          <div className="oq-agent-install-heading">
            <div className="oq-agent-install-mark is-codex">
              <Codex.Avatar
                aria-hidden="true"
                className="oq-agent-codex-avatar"
                size={15}
                shape="square"
              />
            </div>
            <strong>Codex desktop</strong>
            <span className="oq-agent-install-mode">
              {tr("Manual Install", "手动安装")}
            </span>
          </div>
          <p>
            {tr(
              "Follow the steps below to add the plugin in Codex by hand.",
              "按以下步骤在 Codex 中手动添加插件。"
            )}
          </p>
          <div className="oq-agent-manual-guide">
            <img
              src={codexManualGuide}
              alt={tr("Codex plugin installation steps", "Codex 插件安装步骤")}
            />
          </div>
        </article>
      </div>
    </div>
  );
}

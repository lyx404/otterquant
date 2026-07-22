import { useState } from "react";
import { Claude, Codex } from "@lobehub/icons";
import { BookOpen, Check, Copy, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import openClawMark from "@assets/agent-settings/asset-6.png";
import codexManualGuide from "@assets/agent-settings/codex-manual-install-figma.png";

type AgentId = "codex" | "claude" | "openclaw";
type Translate = (en: string, zh: string) => string;
type LocalizedCopy = { en: string; zh: string };

type AgentSettingsPanelProps = {
  tr: Translate;
};

const INSTALL_COMMAND = "npx @codex/buddy install --token=YOUR_TOKEN";

const AGENTS: Array<{ id: AgentId; name: string; connected: boolean }> = [
  { id: "codex", name: "Codex", connected: true },
  { id: "claude", name: "Claude Code", connected: false },
  { id: "openclaw", name: "Open Claw", connected: false },
];

const MANUAL_STEPS: Record<AgentId, LocalizedCopy[]> = {
  codex: [],
  claude: [
    {
      en: "Open Claude Code and go to the plugin settings.",
      zh: "打开 Claude Code，进入插件设置。",
    },
    {
      en: "Choose the manual installation option and paste the command above.",
      zh: "选择手动添加，并粘贴上方安装命令。",
    },
    {
      en: "Complete authorization, then return here to test the connection.",
      zh: "完成授权后，返回此页面测试连接。",
    },
  ],
  openclaw: [
    {
      en: "Open Open Claw and go to Settings, then Plugins.",
      zh: "打开 Open Claw，进入设置中的插件页面。",
    },
    {
      en: "Choose to add a local plugin and paste the command above.",
      zh: "选择添加本地插件，并粘贴上方安装命令。",
    },
    {
      en: "Confirm the connection, then return here to run a test.",
      zh: "确认连接后，返回此页面运行测试。",
    },
  ],
};

function AgentMark({ agentId, size = 20 }: { agentId: AgentId; size?: number }) {
  if (agentId === "claude") {
    return (
      <Claude.Avatar
        aria-hidden="true"
        className="oq-agent-claude-avatar"
        size={size}
        shape="square"
      />
    );
  }

  if (agentId === "openclaw") {
    return <img className="oq-agent-mark-image" src={openClawMark} alt="" />;
  }

  return (
    <Codex.Avatar
      aria-hidden="true"
      className="oq-agent-codex-avatar"
      size={size}
      shape="square"
    />
  );
}

export function AgentSettingsPanel({ tr }: AgentSettingsPanelProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>("codex");
  const [connectionById, setConnectionById] = useState<
    Record<AgentId, boolean>
  >({
    codex: true,
    claude: false,
    openclaw: false,
  });
  const [copied, setCopied] = useState(false);
  const selectedAgent =
    AGENTS.find(agent => agent.id === selectedAgentId) ?? AGENTS[0];
  const manualSteps = MANUAL_STEPS[selectedAgentId];

  const handleCopyInstallCommand = async () => {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
    setCopied(true);
    toast.success(
      tr(
        `${selectedAgent.name} install command copied`,
        `${selectedAgent.name} 安装命令已复制`
      )
    );
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleSelectAgent = (agentId: AgentId) => {
    if (agentId === selectedAgentId) return;
    setCopied(false);
    setSelectedAgentId(agentId);
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

  return (
    <div className="oq-agent-settings">
      <div className="oq-agent-connection-list">
        {AGENTS.map(agent => {
          const connected = connectionById[agent.id];
          const selected = selectedAgentId === agent.id;

          return (
            <article
              className={`oq-agent-connection-card${selected ? " is-selected" : ""}`}
              key={agent.id}
              data-agent-id={agent.id}
            >
              <button
                type="button"
                className="oq-agent-card-select"
                aria-pressed={selected}
                aria-label={tr(
                  `Select ${agent.name}`,
                  `选择 ${agent.name}`
                )}
                onClick={() => handleSelectAgent(agent.id)}
              >
                <span className={`oq-agent-mark is-${agent.id}`}>
                  <AgentMark agentId={agent.id} />
                </span>
                <span className="oq-agent-connection-title">{agent.name}</span>
                <span
                  className={`oq-agent-connection-status ${connected ? "is-connected" : ""}`}
                >
                  <span aria-hidden="true" />
                  {connected
                    ? tr("Connected", "已连接")
                    : tr("Disconnected", "未连接")}
                </span>
              </button>
              <div className="oq-agent-card-actions">
                {connected ? (
                  <>
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
                  </>
                ) : (
                  <button
                    type="button"
                    className="oq-agent-control oq-agent-guide-control"
                    onClick={() => handleSelectAgent(agent.id)}
                  >
                    <BookOpen aria-hidden="true" />
                    <span>{tr("View connection guide", "查看连接教程")}</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <Accordion
        className="oq-agent-installation-list"
        key={selectedAgentId}
        type="multiple"
        defaultValue={["auto"]}
        aria-live="polite"
      >
        <AccordionItem className="oq-agent-install-card" value="auto">
          <AccordionTrigger className="oq-agent-install-trigger">
            <span className="oq-agent-install-heading">
              <strong>{tr("Auto Install", "自动安装")}</strong>
              <span className="oq-agent-recommended-tag">
                {tr("Recommended", "推荐")}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="oq-agent-install-content oq-agent-auto-install-content">
            <p>
              {tr(
                `Enter the following command in ${selectedAgent.name} to install the plugin.`,
                `在 ${selectedAgent.name} 中输入以下命令以安装插件。`
              )}
            </p>
            <div className="oq-agent-install-command">
              <code>{INSTALL_COMMAND}</code>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`oq-agent-copy-button${copied ? " is-copied" : ""}`}
                    onClick={handleCopyInstallCommand}
                    aria-label={copied
                      ? tr("Install command copied", "安装命令已复制")
                      : tr("Copy install command", "复制安装命令")}
                  >
                    {copied ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <Copy aria-hidden="true" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {copied ? tr("Copied", "已复制") : tr("Copy install command", "复制安装命令")}
                </TooltipContent>
              </Tooltip>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem className="oq-agent-install-card" value="manual">
          <AccordionTrigger className="oq-agent-install-trigger">
            <span className="oq-agent-install-heading">
              <strong>{tr("Manual Install", "手动安装")}</strong>
            </span>
          </AccordionTrigger>
          <AccordionContent className="oq-agent-install-content oq-agent-manual-install-content">
            <p>
              {tr(
                `Follow the steps below to add the plugin in ${selectedAgent.name} by hand.`,
                `按以下步骤在 ${selectedAgent.name} 中手动添加插件。`
              )}
            </p>
            <div className="oq-agent-manual-guide">
              {selectedAgentId === "codex" ? (
                <img
                  src={codexManualGuide}
                  alt={tr(
                    "Codex plugin installation steps",
                    "Codex 插件安装步骤"
                  )}
                />
              ) : (
                <ol className="oq-agent-guide-steps">
                  {manualSteps.map((step, index) => (
                    <li key={step.en}>
                      <span aria-hidden="true">{index + 1}</span>
                      <p>{tr(step.en, step.zh)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

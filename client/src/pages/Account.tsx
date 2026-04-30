/*
 * Account — Indigo/Sky + Slate Design System
 * Cards: rounded-2xl, p-6 | Buttons: rounded-full | Inputs: rounded-lg
 * Primary: Indigo | Success: Emerald
 * Pure Tailwind classes — zero inline styles
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAppLanguage, type UiLang } from "@/contexts/AppLanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  User, Key, Link2, Shield, Copy, Check,
  Eye, EyeOff, RefreshCw, AlertTriangle, Compass,
  Bell, Mail, Send, Pencil, X, Plus, Trash2, FileText, MoreHorizontal, LogOut,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { exchanges, type Exchange } from "@/lib/mockData";
import {
  getExchangeVenueMeta,
  readExchangeApiConnections,
  writeExchangeApiConnections,
  type ExchangeApiConnection,
  type ExchangeVenue,
} from "@/lib/exchangeApiConnections";

type TabId = "general" | "profile" | "exchangeApi" | "api";
const tabs: { id: TabId; labelEn: string; labelZh: string; icon: React.ElementType }[] = [
  { id: "general", labelEn: "General", labelZh: "通用", icon: Shield },
  { id: "profile", labelEn: "Profile", labelZh: "资料", icon: User },
  { id: "exchangeApi", labelEn: "Exchange API", labelZh: "交易所 API", icon: Link2 },
  { id: "api", labelEn: "Agent API", labelZh: "Agent API", icon: Key },
];

/* ── API Key data model ── */
interface ApiKeyItem {
  id: string;
  name: string;
  apiKey: string;
  skillVersion: string;
  createdAt: string;
  updatedAt: string;
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "ot_sk_";
  for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

const SKILL_LATEST = "v2.4.1";

function buildPrompt(apiKey: string, skillVersion: string): string {
  return `# Quandora Trading Skill Configuration

## API Key
\`${apiKey}\`

## Skill Version
${skillVersion}

## Setup Instructions
Paste this entire prompt into your AI agent (ChatGPT / Claude / DeepSeek) to enable Quandora Trading capabilities.

Your agent will be able to:
- Mine and backtest alpha factors automatically
- Access real-time market data (CEX & DEX)
- Submit strategies to the Quandora Arena
- Monitor portfolio performance

## Connection Endpoint
https://api.quandora.trade/v1/agent

## Authentication
Include the API key in your agent's system prompt or environment configuration. The agent will automatically authenticate when making requests.`;
}

const INITIAL_KEYS: ApiKeyItem[] = [
  {
    id: "1",
    name: "My Trading Bot",
    apiKey: "ot_sk_7x9kM2nP4qR8sT6uW3yA1bC5dE0fG2h",
    skillVersion: "v2.4.1",
    createdAt: "2026-03-01",
    updatedAt: "2026-03-28",
  },
  {
    id: "2",
    name: "Research Agent",
    apiKey: "ot_sk_hJ2kL4mN6pQ8rS0tU2vW4xY6zA8bC0dE",
    skillVersion: "v2.3.0",
    createdAt: "2026-02-15",
    updatedAt: "2026-03-15",
  },
];

/* ── Copy button helper ── */
function CopyBtn({ text, uiLang = "en" }: { text: string; uiLang?: UiLang }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(uiLang === "zh" ? "已复制到剪贴板" : "Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg transition-colors duration-200 ease-in-out text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── Copy Prompt button ── */
function CopyPromptBtn({ apiKey, skillVersion, itemSkillVersion, uiLang = "en" }: { apiKey: string; skillVersion: string; itemSkillVersion: string; uiLang?: UiLang }) {
  const [copied, setCopied] = useState(false);
  const needsUpdate = itemSkillVersion !== skillVersion;
  const handleCopy = () => {
    navigator.clipboard.writeText(buildPrompt(apiKey, skillVersion));
    setCopied(true);
    toast.success(
      needsUpdate
        ? (uiLang === "zh" ? "已更新至最新 Skill 并复制提示词" : "Updated to latest skill & prompt copied")
        : (uiLang === "zh" ? "提示词已复制到剪贴板" : "Prompt copied to clipboard")
    );
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`h-7 text-xs px-2.5 rounded-full flex items-center gap-1 transition-all duration-200 ease-in-out border ${
        needsUpdate ? "border-amber-500/30 text-amber-500 hover:bg-amber-500/10" : "border-primary/20 text-primary hover:bg-primary/10"
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
      {copied ? (uiLang === "zh" ? "已复制" : "Copied") : needsUpdate ? (uiLang === "zh" ? "复制最新提示词" : "Copy Latest Prompt") : (uiLang === "zh" ? "复制提示词" : "Copy Prompt")}
    </button>
  );
}

export default function Account() {
  const { user, updateUser, logout } = useAuth();
  const { uiLang, setUiLang } = useAppLanguage();
  const { themePreference, setThemePreference } = useTheme();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [exchangeList, setExchangeList] = useState<Exchange[]>(exchanges);
  const [username, setUsername] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [nickname, setNickname] = useState(user?.displayName || "AlphaTrader");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [passwordVerCode, setPasswordVerCode] = useState("");
  const [passwordCodeSent, setPasswordCodeSent] = useState(false);
  const [emailVerCode, setEmailVerCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [alphasNotify, setAlphasNotify] = useState(true);
  const [arenaNotify, setArenaNotify] = useState(true);
  const [systemNotify, setSystemNotify] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);
  const [exchangeApiItems, setExchangeApiItems] = useState<ExchangeApiConnection[]>(() =>
    readExchangeApiConnections()
  );
  const [showCreateExchangeModal, setShowCreateExchangeModal] = useState(false);
  const [exchangeCreateStep, setExchangeCreateStep] = useState<1 | 2>(1);
  const [selectedExchangeVenue, setSelectedExchangeVenue] = useState<ExchangeVenue>("binance");
  const [exchangeAccountName, setExchangeAccountName] = useState("");
  const [exchangeApiKey, setExchangeApiKey] = useState("");
  const [exchangeApiSecret, setExchangeApiSecret] = useState("");
  const [editingExchangeNameId, setEditingExchangeNameId] = useState<string | null>(null);
  const [editExchangeNameValue, setEditExchangeNameValue] = useState("");
  const [exchangeDeleteConfirmId, setExchangeDeleteConfirmId] = useState<string | null>(null);
  const [exchangeMoreMenuId, setExchangeMoreMenuId] = useState<string | null>(null);
  const exchangeMoreMenuRef = useRef<HTMLDivElement>(null);

  // Edit mode states for each subsection
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [originalNickname, setOriginalNickname] = useState(nickname);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>(INITIAL_KEYS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [newApiName, setNewApiName] = useState("");
  const [createdApiKey, setCreatedApiKey] = useState("");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [moreMenuId, setMoreMenuId] = useState<string | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);

  // Close more menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuId(null);
      }
    };
    if (moreMenuId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreMenuId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exchangeMoreMenuRef.current && !exchangeMoreMenuRef.current.contains(e.target as Node)) {
        setExchangeMoreMenuId(null);
      }
    };
    if (exchangeMoreMenuId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exchangeMoreMenuId]);

  useEffect(() => {
    writeExchangeApiConnections(exchangeApiItems);
  }, [exchangeApiItems]);

  const handleRefreshSkill = useCallback((id: string) => {
    const now = new Date().toISOString().split("T")[0];
    setApiKeys((prev) =>
      prev.map((k) => {
        if (k.id !== id) return k;
        if (k.skillVersion === SKILL_LATEST) {
          toast.success(tr("Already on the latest version", "当前已是最新版本"));
          return k;
        }
        toast.success(tr(`Skill updated to ${SKILL_LATEST}`, `Skill 已更新到 ${SKILL_LATEST}`));
        return { ...k, skillVersion: SKILL_LATEST, updatedAt: now };
      })
    );
  }, [tr]);

  useEffect(() => {
    if (!headerRef.current) return;
    const lines = headerRef.current.querySelectorAll(".reveal-line");
    gsap.set(lines, { y: 100, skewY: 7, opacity: 0 });
    gsap.to(lines, {
      y: 0, skewY: 0, opacity: 1,
      duration: 1, stagger: 0.08, ease: "power4.out", delay: 0.1,
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab && tabs.some((t) => t.id === tab)) setActiveTab(tab as TabId);
  }, []);

  const handleConnect = (id: string) => {
    setExchangeList((prev) =>
      prev.map((ex) =>
        ex.id === id ? { ...ex, status: ex.status === "connected" ? "disconnected" : "connected" } : ex
      )
    );
    toast.success(tr("Exchange connection updated", "交易所连接状态已更新"));
  };

  const handleCancelProfile = () => {
    setNickname(originalNickname);
    setAvatarPreview(user?.avatar || null);
    setEditingProfile(false);
  };

  const handleCancelEmail = () => {
    setEmailVerCode("");
    setEmailCodeSent(false);
    setNewEmail("");
    setEditingEmail(false);
  };

  const handleCancelPassword = () => {
    setPasswordVerCode("");
    setPasswordCodeSent(false);
    setNewPassword("");
    setConfirmPassword("");
    setEditingPassword(false);
  };

  const resetExchangeCreateFlow = useCallback(() => {
    setExchangeCreateStep(1);
    setSelectedExchangeVenue("binance");
    setExchangeAccountName("");
    setExchangeApiKey("");
    setExchangeApiSecret("");
  }, []);

  const handleOpenExchangeModal = useCallback(() => {
    resetExchangeCreateFlow();
    setShowCreateExchangeModal(true);
  }, [resetExchangeCreateFlow]);

  const handleCreateExchangeApi = useCallback(() => {
    if (!exchangeAccountName.trim() || !exchangeApiKey.trim() || !exchangeApiSecret.trim()) {
      toast.error(tr("Please complete all required fields.", "请完整填写所有必填字段。"));
      return;
    }
    const now = new Date().toISOString().split("T")[0];
    const newExchangeItem: ExchangeApiConnection = {
      id: `ex-${Date.now()}`,
      venue: selectedExchangeVenue,
      accountName: exchangeAccountName.trim(),
      apiKey: exchangeApiKey.trim(),
      createdAt: now,
      updatedAt: now,
    };
    setExchangeApiItems((prev) => [newExchangeItem, ...prev]);
    setShowCreateExchangeModal(false);
    resetExchangeCreateFlow();
    toast.success(
      uiLang === "zh"
        ? `${selectedExchangeVenue.toUpperCase()} API 已连接成功。`
        : `${selectedExchangeVenue.toUpperCase()} API connected successfully.`
    );
  }, [exchangeAccountName, exchangeApiKey, exchangeApiSecret, resetExchangeCreateFlow, selectedExchangeVenue, tr, uiLang]);

  const handleSaveExchangeName = useCallback((id: string) => {
    if (!editExchangeNameValue.trim()) {
      toast.error(tr("Name cannot be empty", "名称不能为空"));
      return;
    }
    setExchangeApiItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, accountName: editExchangeNameValue.trim() } : item
      )
    );
    setEditingExchangeNameId(null);
    setEditExchangeNameValue("");
    toast.success(tr("Exchange account name updated", "交易所账户名称已更新"));
  }, [editExchangeNameValue, tr]);

  const handleDeleteExchangeApi = useCallback((id: string) => {
    setExchangeApiItems((prev) => prev.filter((item) => item.id !== id));
    toast.success(tr("Exchange API deleted", "交易所 API 已删除"));
  }, [tr]);

  // API Key actions
  const handleCreateApi = useCallback(() => {
    if (!newApiName.trim()) { toast.error(tr("Please enter an API name", "请输入 API 名称")); return; }
    const key = generateApiKey();
    setCreatedApiKey(key);
    setCreateStep(2);
  }, [newApiName, tr]);

  const handleFinishCreate = useCallback(() => {
    const now = new Date().toISOString().split("T")[0];
    const newItem: ApiKeyItem = {
      id: Date.now().toString(),
      name: newApiName.trim(),
      apiKey: createdApiKey,
      skillVersion: SKILL_LATEST,
      createdAt: now,
      updatedAt: now,
    };
    setApiKeys((prev) => [newItem, ...prev]);
    setShowCreateModal(false);
    setCreateStep(1);
    setNewApiName("");
    setCreatedApiKey("");
    toast.success(tr("API key created successfully", "API 密钥创建成功"));
  }, [newApiName, createdApiKey, tr]);

  const handleDeleteApi = useCallback((id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    toast.success(tr("API key deleted", "API 密钥已删除"));
  }, [tr]);

  const handleSaveName = useCallback((id: string) => {
    if (!editNameValue.trim()) { toast.error(tr("Name cannot be empty", "名称不能为空")); return; }
    const now = new Date().toISOString().split("T")[0];
    setApiKeys((prev) =>
      prev.map((k) => k.id === id ? { ...k, name: editNameValue.trim(), updatedAt: now } : k)
    );
    setEditingNameId(null);
    setEditNameValue("");
    toast.success(tr("API name updated", "API 名称已更新"));
  }, [editNameValue, tr]);

  const toggleKeyVisibility = useCallback((id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const disabledInputCls = "rounded-lg bg-accent border-border opacity-60 cursor-not-allowed";
  const activeInputCls = "rounded-lg bg-card border-border";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div ref={headerRef} className="reveal-clip">
        <div className="reveal-line">
          <h1 className="text-foreground">{tr("Account", "账户设置")}</h1>
        </div>
        <div className="reveal-line mt-2">
          <p className="text-base text-muted-foreground">
            {tr(
              "Manage your profile, API keys, and exchange connections",
              "管理账户资料、Agent API 密钥与交易所连接"
            )}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 rounded-2xl w-fit bg-accent border border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`h-8 text-xs px-3 rounded-xl font-medium transition-all duration-200 ease-in-out flex items-center gap-1.5 border ${
                isActive
                  ? "bg-primary/10 text-primary border-primary/20"
                  : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="w-3.5 h-3.5" />
              {tr(tab.labelEn, tab.labelZh)}
            </button>
          );
        })}
      </div>

      {/* ═══════════════ General Tab ═══════════════ */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="surface-card">
            <div className="px-6 py-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-base font-semibold text-foreground">{tr("General Settings", "通用设置")}</span>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{tr("Language", "语言")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {tr("Set display language for UI and notifications.", "设置界面与通知的显示语言。")}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-border bg-accent/35 p-1">
                  <button
                    className={`h-7 rounded-full px-3 text-xs transition-colors ${
                      uiLang === "en" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setUiLang("en")}
                  >
                    EN
                  </button>
                  <button
                    className={`h-7 rounded-full px-3 text-xs transition-colors ${
                      uiLang === "zh" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setUiLang("zh")}
                  >
                    中文
                  </button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">{tr("Theme", "主题")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {tr("Choose light, dark, or system theme.", "选择浅色、深色或跟随系统主题。")}
                  </div>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-border bg-accent p-1">
                  {([
                    { value: "dark", en: "Dark", zh: "深色模式" },
                    { value: "light", en: "Light", zh: "浅色模式" },
                    { value: "system", en: "System", zh: "跟随系统" },
                  ] as const).map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setThemePreference?.(item.value)}
                      className={`h-8 rounded-full px-3 text-xs font-medium transition-colors ${
                        themePreference === item.value
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tr(item.en, item.zh)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="surface-card">
            <div className="px-6 py-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="text-base font-semibold text-foreground">{tr("Notification Settings", "通知设置")}</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-foreground">{tr("Signals Notifications", "信号通知")}</div>
                  <div className="text-xs text-muted-foreground">{tr("Get notified about signal status changes, test results, and performance updates", "接收信号状态变化、回测结果与绩效更新通知")}</div>
                </div>
                <button
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${alphasNotify ? "bg-primary" : "bg-muted"}`}
                  onClick={() => { setAlphasNotify(!alphasNotify); toast.success(alphasNotify ? tr("Signals notifications disabled", "已关闭信号通知") : tr("Signals notifications enabled", "已开启信号通知")); }}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${alphasNotify ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <div className="text-sm font-medium text-foreground">{tr("Arena Notifications", "竞技场通知")}</div>
                  <div className="text-xs text-muted-foreground">{tr("Get notified about competition rounds, rankings, and prize pool updates", "接收比赛轮次、排名与奖池更新通知")}</div>
                </div>
                <button
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${arenaNotify ? "bg-primary" : "bg-muted"}`}
                  onClick={() => { setArenaNotify(!arenaNotify); toast.success(arenaNotify ? tr("Arena notifications disabled", "已关闭竞技场通知") : tr("Arena notifications enabled", "已开启竞技场通知")); }}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${arenaNotify ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div className="pr-6">
                  <div className="text-sm font-medium text-foreground">{tr("System Messages", "系统消息")}</div>
                  <div className="text-xs text-muted-foreground">
                    {tr(
                      "Get notified about skill updates, new skills, deprecations, platform announcements, maintenance, and Official Library expansion.",
                      "接收技能更新、新技能发布、废弃公告、平台通知、维护通知与官方库扩展信息。"
                    )}
                  </div>
                </div>
                <button
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${systemNotify ? "bg-primary" : "bg-muted"}`}
                  onClick={() => { setSystemNotify(!systemNotify); toast.success(systemNotify ? tr("System messages disabled", "已关闭系统消息") : tr("System messages enabled", "已开启系统消息")); }}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${systemNotify ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ Profile Tab ═══════════════ */}
      {activeTab === "profile" && (
        <div className="space-y-8">
          {/* Account Settings */}
          <div className="surface-card">
              <div className="px-6 py-4 pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-foreground">{tr("Account Settings", "账户信息设置")}</span>
                </div>
              </div>

            {/* 1. Profile (Nickname & Avatar) */}
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{tr("Profile", "个人资料")}</span>
                </div>
                {!editingProfile ? (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => { setOriginalNickname(nickname); setEditingProfile(true); }}
                  >
                    <Pencil className="w-3 h-3" />
                    {tr("Edit", "编辑")}
                  </button>
                ) : (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-border text-muted-foreground hover:text-foreground"
                    onClick={handleCancelProfile}
                  >
                    <X className="w-3 h-3" />
                    {tr("Cancel", "取消")}
                  </button>
                )}
              </div>
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div
                    className={`w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors duration-200 ${
                      editingProfile ? "border-primary/40 cursor-pointer hover:border-primary/60" : "border-border cursor-default"
                    }`}
                    onClick={() => editingProfile && avatarInputRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">{nickname.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) { toast.error(tr("Image must be less than 2MB", "图片大小必须小于 2MB")); return; }
                        const reader = new FileReader();
                        reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {editingProfile && <span className="text-[10px] text-muted-foreground">{tr("Click to upload", "点击上传")}</span>}
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="label-upper">{tr("Nickname", "昵称")}</Label>
                  <Input
                    placeholder={tr("Enter your nickname", "请输入昵称")}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    disabled={!editingProfile}
                    className={`${editingProfile ? activeInputCls : disabledInputCls} md:max-w-md`}
                  />
                  {editingProfile && (
                    <button
                      className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce mt-2"
                      onClick={() => {
                        if (!nickname.trim()) { toast.error(tr("Nickname cannot be empty", "昵称不能为空")); return; }
                        const profileUpdates: Partial<{displayName: string; avatar: string}> = { displayName: nickname };
                        if (avatarPreview) profileUpdates.avatar = avatarPreview;
                        updateUser(profileUpdates);
                        setOriginalNickname(nickname);
                        toast.success(tr("Profile updated successfully", "资料更新成功"));
                        setEditingProfile(false);
                      }}
                    >
                      {tr("Save Profile", "保存资料")}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Change Email */}
            <div className="px-6 py-4 pb-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{tr("Change Email", "修改邮箱")}</span>
                </div>
                {!editingEmail ? (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => setEditingEmail(true)}
                  >
                    <Pencil className="w-3 h-3" />
                    {tr("Edit", "编辑")}
                  </button>
                ) : (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-border text-muted-foreground hover:text-foreground"
                    onClick={handleCancelEmail}
                  >
                    <X className="w-3 h-3" />
                    {tr("Cancel", "取消")}
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="label-upper">{tr("Current Email", "当前邮箱")}</Label>
                  <Input value={email} disabled className={disabledInputCls} />
                </div>
                {editingEmail && (
                  <div className="space-y-2">
                    <Label className="label-upper">{tr("Verification Code", "验证码")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={tr("Enter verification code", "请输入验证码")}
                        value={emailVerCode}
                        onChange={(e) => setEmailVerCode(e.target.value)}
                        className={`${activeInputCls} flex-1`}
                      />
                      <button
                        className="h-9 px-4 rounded-full text-xs font-medium transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10 flex items-center gap-1.5 shrink-0"
                        onClick={() => { setEmailCodeSent(true); toast.success(tr("Verification code sent to your current email", "验证码已发送至当前邮箱")); }}
                      >
                        <Send className="w-3 h-3" />
                        {emailCodeSent ? tr("Resend Code", "重新发送") : tr("Send Code", "发送验证码")}
                      </button>
                    </div>
                  </div>
                )}
                {editingEmail && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="label-upper">{tr("New Email", "新邮箱")}</Label>
                    <Input
                      type="email"
                      placeholder={tr("Enter new email address", "请输入新邮箱地址")}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className={`${activeInputCls} md:max-w-md`}
                    />
                    {newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) && (
                      <p className="text-xs text-destructive">{tr("Please enter a valid email address", "请输入有效的邮箱地址")}</p>
                    )}
                  </div>
                )}
              </div>
              {editingEmail && (
                <button
                  className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                  onClick={() => {
                    if (!emailVerCode.trim()) { toast.error(tr("Please enter the verification code", "请输入验证码")); return; }
                    if (!newEmail.trim()) { toast.error(tr("Please enter a new email address", "请输入新邮箱地址")); return; }
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { toast.error(tr("Please enter a valid email address", "请输入有效的邮箱地址")); return; }
                    toast.success(tr("Email updated successfully", "邮箱更新成功"));
                    setEmail(newEmail);
                    updateUser({ email: newEmail });
                    setEmailVerCode(""); setEmailCodeSent(false); setNewEmail(""); setEditingEmail(false);
                  }}
                >
                  {tr("Save Email", "保存邮箱")}
                </button>
              )}
            </div>

            {/* 3. Change Password */}
            <div className="px-6 py-4 pb-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{tr("Change Password", "修改密码")}</span>
                </div>
                {!editingPassword ? (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => setEditingPassword(true)}
                  >
                    <Pencil className="w-3 h-3" />
                    {tr("Edit", "编辑")}
                  </button>
                ) : (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-border text-muted-foreground hover:text-foreground"
                    onClick={handleCancelPassword}
                  >
                    <X className="w-3 h-3" />
                    {tr("Cancel", "取消")}
                  </button>
                )}
              </div>
            </div>
            {editingPassword ? (
              <div className="px-6 pb-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-upper">{tr("Email", "邮箱")}</Label>
                    <Input value={email} disabled className={disabledInputCls} />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-upper">{tr("Verification Code", "验证码")}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder={tr("Enter verification code", "请输入验证码")}
                        value={passwordVerCode}
                        onChange={(e) => setPasswordVerCode(e.target.value)}
                        className={`${activeInputCls} flex-1`}
                      />
                      <button
                        className="h-9 px-4 rounded-full text-xs font-medium transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10 flex items-center gap-1.5 shrink-0"
                        onClick={() => { setPasswordCodeSent(true); toast.success(tr("Verification code sent to your email", "验证码已发送至邮箱")); }}
                      >
                        <Send className="w-3 h-3" />
                        {passwordCodeSent ? tr("Resend Code", "重新发送") : tr("Send Code", "发送验证码")}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="label-upper">{tr("New Password", "新密码")}</Label>
                    <Input type="password" placeholder={tr("Enter new password", "请输入新密码")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={activeInputCls} />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-upper">{tr("Confirm New Password", "确认新密码")}</Label>
                    <Input type="password" placeholder={tr("Re-enter new password", "请再次输入新密码")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={activeInputCls} />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive">{tr("Passwords do not match", "两次输入密码不一致")}</p>
                    )}
                  </div>
                </div>
                <button
                  className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                  onClick={() => {
                    if (!passwordVerCode.trim()) { toast.error(tr("Please enter the verification code", "请输入验证码")); return; }
                    if (!newPassword.trim()) { toast.error(tr("Please enter a new password", "请输入新密码")); return; }
                    if (newPassword.length < 8) { toast.error(tr("Password must be at least 8 characters", "密码至少为 8 位")); return; }
                    if (newPassword !== confirmPassword) { toast.error(tr("Passwords do not match", "两次输入密码不一致")); return; }
                    toast.success(tr("Password updated successfully", "密码更新成功"));
                    setPasswordVerCode(""); setPasswordCodeSent(false); setNewPassword(""); setConfirmPassword(""); setEditingPassword(false);
                  }}
                >
                  {tr("Save Password", "保存密码")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ═══════════════ Exchange API Tab ═══════════════ */}
      {activeTab === "exchangeApi" && (
        <div className="space-y-6">
          <div className="surface-card">
            <div className="px-6 py-4 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-foreground">{tr("Connected Exchanges", "已连接交易所")}</span>
                  <span className="text-xs text-muted-foreground ml-1">({exchangeApiItems.length})</span>
                </div>
                <button
                  className="h-8 text-xs px-4 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce font-medium"
                  onClick={handleOpenExchangeModal}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {tr("New Exchange API", "新建交易所 API")}
                </button>
              </div>
            </div>

            <div className="p-6">
              {exchangeApiItems.length === 0 ? (
                <div className="text-center py-12">
                  <Link2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{tr("No exchange API connected", "尚未连接交易所 API")}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {tr("Add a venue connection to enable live execution and account sync.", "添加交易所连接后即可启用实盘执行与账户同步。")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {exchangeApiItems.map((item) => {
                    const venue = getExchangeVenueMeta(item.venue);
                    const keyVisible = visibleKeys.has(item.id);
                    const maskedKey = `${item.apiKey.slice(0, 8)}${"\u2022".repeat(10)}`;
                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-2xl border border-border bg-accent/50 hover:border-primary/20 transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between mb-3 gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {editingExchangeNameId === item.id ? (
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Input
                                  value={editExchangeNameValue}
                                  onChange={(e) => setEditExchangeNameValue(e.target.value)}
                                  className="h-7 text-sm rounded-lg bg-card border-border max-w-xs"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveExchangeName(item.id);
                                    if (e.key === "Escape") setEditingExchangeNameId(null);
                                  }}
                                />
                                <button
                                  className="h-7 text-xs px-2.5 rounded-full flex items-center gap-1 transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110"
                                  onClick={() => handleSaveExchangeName(item.id)}
                                >
                                  <Check className="w-3 h-3" />
                                  {tr("Save", "保存")}
                                </button>
                                <button
                                  className="h-7 text-xs px-2 rounded-full flex items-center transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                                  onClick={() => setEditingExchangeNameId(null)}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-semibold text-foreground truncate">{item.accountName}</span>
                                <button
                                  className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                  onClick={() => {
                                    setEditingExchangeNameId(item.id);
                                    setEditExchangeNameValue(item.accountName);
                                  }}
                                  title={tr("Edit", "编辑")}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                          <div className="relative shrink-0" ref={exchangeMoreMenuId === item.id ? exchangeMoreMenuRef : undefined}>
                            <button
                              className="h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200 border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                              onClick={() => setExchangeMoreMenuId(exchangeMoreMenuId === item.id ? null : item.id)}
                              title={tr("More options", "更多操作")}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                            {exchangeMoreMenuId === item.id && (
                              <div className="absolute right-0 top-full mt-1 w-40 py-1 rounded-xl bg-card border border-border shadow-xl z-20">
                                <button
                                  className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 text-destructive hover:bg-destructive/10 transition-colors"
                                  onClick={() => {
                                    setExchangeMoreMenuId(null);
                                    setExchangeDeleteConfirmId(item.id);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  {tr("Delete Exchange API", "删除交易所 API")}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-16 shrink-0">
                            {tr("Venue", "交易所")}
                          </span>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/60 border border-border/60 text-xs text-foreground">
                            <span className={item.venue === "binance" ? "text-amber-400 font-semibold" : "text-foreground font-semibold"}>
                              {venue.badge}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-16 shrink-0">
                            {tr("API Key", "API 密钥")}
                          </span>
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/60 border border-border/60 flex-1 min-w-0">
                            <code className="font-mono text-xs text-primary truncate flex-1">
                              {keyVisible ? item.apiKey : maskedKey}
                            </code>
                            <button
                              onClick={() => toggleKeyVisibility(item.id)}
                              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              title={keyVisible ? tr("Hide API Key", "隐藏 API 密钥") : tr("Show API Key", "显示 API 密钥")}
                            >
                              {keyVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <CopyBtn text={item.apiKey} uiLang={uiLang} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ API Keys Tab ═══════════════ */}
      {activeTab === "api" && (
        <div className="space-y-6">
          {/* Header + Create Button */}
          <div className="surface-card">
            <div className="px-6 py-4 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-foreground">{tr("Agent API", "Agent API")}</span>
                  <span className="text-xs text-muted-foreground ml-1">({apiKeys.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="h-8 text-xs px-4 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce font-medium"
                    onClick={() => { setShowCreateModal(true); setCreateStep(1); setNewApiName(""); setCreatedApiKey(""); }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {tr("New API Key", "新建 API 密钥")}
                  </button>
                </div>
              </div>
            </div>

            {/* API Keys List */}
            <div className="p-6">
              {apiKeys.length === 0 ? (
                <div className="text-center py-12">
                  <Key className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">{tr("No API keys yet", "暂无 API 密钥")}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{tr("Create your first API key to connect your AI agent", "创建首个 API 密钥以连接你的 AI Agent")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-border bg-accent/50 hover:border-primary/20 transition-colors duration-200"
                    >
                      {/* Row 1: Name + Actions */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {editingNameId === item.id ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                className="h-7 text-sm rounded-lg bg-card border-border max-w-xs"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(item.id); if (e.key === "Escape") setEditingNameId(null); }}
                              />
                              <button
                                className="h-7 text-xs px-2.5 rounded-full flex items-center gap-1 transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110"
                                onClick={() => handleSaveName(item.id)}
                              >
                                <Check className="w-3 h-3" />
                                {tr("Save", "保存")}
                              </button>
                              <button
                                className="h-7 text-xs px-2 rounded-full flex items-center transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingNameId(null)}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-semibold text-foreground truncate">{item.name}</span>
                              <button
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                onClick={() => { setEditingNameId(item.id); setEditNameValue(item.name); }}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-3">
                          <CopyPromptBtn uiLang={uiLang} apiKey={item.apiKey} skillVersion={SKILL_LATEST} itemSkillVersion={item.skillVersion} />
                          {/* More menu */}
                          <div className="relative" ref={moreMenuId === item.id ? moreMenuRef : undefined}>
                            <button
                              className="h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200 border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
                              onClick={() => setMoreMenuId(moreMenuId === item.id ? null : item.id)}
                              title={tr("More options", "更多操作")}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                            {moreMenuId === item.id && (
                              <div className="absolute right-0 top-full mt-1 w-36 py-1 rounded-xl bg-card border border-border shadow-xl z-20">
                                <button
                                  className="w-full px-3 py-2 text-xs text-left flex items-center gap-2 text-destructive hover:bg-destructive/10 transition-colors"
                                  onClick={() => { setMoreMenuId(null); setDeleteConfirmId(item.id); }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  {tr("Delete API Key", "删除 API 密钥")}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: API Key */}
                      <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-14 shrink-0">{tr("API Key", "API 密钥")}</span>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/60 border border-border/60 flex-1 min-w-0">
                          <code className="font-mono text-xs text-primary truncate flex-1">
                            {visibleKeys.has(item.id) ? item.apiKey : item.apiKey.slice(0, 6) + "\u2022".repeat(16) + "..."}
                          </code>
                          <button onClick={() => toggleKeyVisibility(item.id)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                            {visibleKeys.has(item.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <CopyBtn uiLang={uiLang} text={item.apiKey} />
                        </div>
                      </div>

                      {/* Row 3: Meta info + Refresh */}
                      <div className="flex items-center">
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="uppercase tracking-wider font-medium">{tr("Skill", "Skill")}</span>
                            <span className="text-primary font-semibold">{item.skillVersion}</span>
                            {item.skillVersion !== SKILL_LATEST && (
                              <span className="text-amber-500 ml-0.5">{tr(`(update available: ${SKILL_LATEST})`, `（可更新至：${SKILL_LATEST}）`)}</span>
                            )}
                          </span>
                          <span className="border-l border-border pl-4 flex items-center gap-1.5">
                            {tr("Updated", "更新于")} {item.updatedAt}
                            <button
                              className="p-0.5 rounded-md text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => handleRefreshSkill(item.id)}
                              title={tr("Check for skill updates", "检查 Skill 更新")}
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Link href="/launch-guide">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full text-xs border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            >
              <Compass className="w-3.5 h-3.5" />
              {tr("Launch Guide", "启动指引")}
            </Button>
          </Link>

        </div>
      )}

      {/* ═══════════════ Profile Actions ═══════════════ */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="surface-card">
            <div className="p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{tr("Log Out", "退出登录")}</div>
                <div className="text-xs text-muted-foreground">{tr("Sign out of your current account and return to the landing page.", "退出当前账户并返回落地页。")}</div>
              </div>
              <Button
                className="rounded-full gap-1.5 self-start sm:self-auto bg-destructive text-destructive-foreground hover:brightness-110"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut className="w-4 h-4" />
                {tr("Log Out", "退出登录")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ Create Exchange API Modal ═══════════════ */}
      {showCreateExchangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateExchangeModal(false)} />
          <div className="relative w-full max-w-2xl mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 pt-5 pb-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground">
                  {exchangeCreateStep === 1 ? tr("Add Exchange API", "添加交易所 API") : tr("Configure API Credentials", "配置 API 凭证")}
                </h3>
                <button
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border"
                  onClick={() => setShowCreateExchangeModal(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className={`flex items-center gap-2 ${exchangeCreateStep >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    exchangeCreateStep >= 1 ? "border-primary bg-primary/10" : "border-border"
                  }`}>1</div>
                  <span className="text-xs font-medium">{tr("Select Venue", "选择交易所")}</span>
                </div>
                <div className={`flex-1 h-px ${exchangeCreateStep >= 2 ? "bg-primary" : "bg-border"}`} />
                <div className={`flex items-center gap-2 ${exchangeCreateStep >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    exchangeCreateStep >= 2 ? "border-primary bg-primary/10" : "border-border"
                  }`}>2</div>
                  <span className="text-xs font-medium">{tr("API Configuration", "API 配置")}</span>
                </div>
              </div>
            </div>

            {exchangeCreateStep === 1 && (
              <div className="px-6 pb-6 space-y-4">
                <p className="text-xs text-muted-foreground">
                  {tr("Choose an exchange venue to connect your trading account.", "选择一个交易所来连接你的交易账户。")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: "binance" as const, label: "Binance", brand: "BINANCE" },
                    { id: "okx" as const, label: "OKX", brand: "OKX" },
                  ].map((venue) => {
                    const active = selectedExchangeVenue === venue.id;
                    return (
                      <button
                        key={venue.id}
                        type="button"
                        onClick={() => setSelectedExchangeVenue(venue.id)}
                        className={`rounded-xl border text-left overflow-hidden transition-all duration-200 ${
                          active
                            ? "border-primary/50 bg-primary/10"
                            : "border-border bg-accent/40 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-stretch">
                          <div className="w-36 bg-black flex items-center justify-center px-3 py-5">
                            <span
                              className={`font-semibold tracking-wide text-sm ${
                                venue.id === "binance" ? "text-amber-400" : "text-white"
                              }`}
                            >
                              {venue.brand}
                            </span>
                          </div>
                          <div className="flex-1 px-4 py-4 flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{venue.label}</span>
                            <span
                              className={`w-4 h-4 rounded-full border ${
                                active ? "border-primary bg-primary/80" : "border-border"
                              }`}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                    onClick={() => setExchangeCreateStep(2)}
                  >
                    {tr("Continue", "继续")}
                  </button>
                </div>
              </div>
            )}

            {exchangeCreateStep === 2 && (
              <div className="px-6 pb-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tr("Account Name", "账户名称")} *</Label>
                  <Input
                    value={exchangeAccountName}
                    onChange={(e) => setExchangeAccountName(e.target.value)}
                    placeholder={tr("e.g., Primary Futures Account", "例如：主力合约账户")}
                    className="rounded-lg bg-accent border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tr("API Key", "API 密钥")} *</Label>
                  <Input
                    value={exchangeApiKey}
                    onChange={(e) => setExchangeApiKey(e.target.value)}
                    placeholder={tr("Enter your API key", "输入你的 API 密钥")}
                    className="rounded-lg bg-accent border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">{tr("API Secret", "API Secret")} *</Label>
                  <Input
                    value={exchangeApiSecret}
                    onChange={(e) => setExchangeApiSecret(e.target.value)}
                    placeholder={tr("Enter your API secret", "输入你的 API Secret")}
                    className="rounded-lg bg-accent border-border"
                  />
                </div>

                <div className="rounded-xl border border-border bg-accent/30 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{tr("Security Best Practices", "安全最佳实践")}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {tr("API credentials are encrypted at rest. Do not enable withdrawal permissions. Trade and read-only scopes are sufficient for strategy execution and monitoring.", "API 凭证会以加密形式存储。请勿开启提币权限。仅开启交易与只读权限即可满足策略执行与监控需求。")}
                      </p>
                      <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                        <li>{tr("Disable withdrawal permissions.", "关闭提币权限。")}</li>
                        <li>{tr("Restrict API access by IP whitelist.", "通过 IP 白名单限制 API 访问。")}</li>
                        <li>{tr("Rotate API credentials periodically.", "定期轮换 API 凭证。")}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                    onClick={() => setExchangeCreateStep(1)}
                  >
                    {tr("Back", "返回")}
                  </button>
                  <button
                    className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                    onClick={handleCreateExchangeApi}
                  >
                    {tr("Add Exchange API", "添加交易所 API")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ Create API Modal ═══════════════ */}
      {/* ═══════════════ Delete Confirm Modal ═══════════════ */}
      {exchangeDeleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setExchangeDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{tr("Delete Exchange API", "删除交易所 API")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tr("Are you sure you want to delete", "确认删除")}{" "}
                <span className="font-medium text-foreground">
                  "{exchangeApiItems.find((item) => item.id === exchangeDeleteConfirmId)?.accountName}"
                </span>
                ?
                {" "}
                {tr(
                  "This action cannot be undone and this exchange account will no longer be available for trading deployment.",
                  "该操作不可撤销，此交易所账户将无法用于策略部署。"
                )}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                onClick={() => setExchangeDeleteConfirmId(null)}
              >
                {tr("Cancel", "取消")}
              </button>
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-destructive text-destructive-foreground hover:brightness-110"
                onClick={() => {
                  handleDeleteExchangeApi(exchangeDeleteConfirmId);
                  setExchangeDeleteConfirmId(null);
                }}
              >
                {tr("Delete", "删除")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{tr("Delete API Key", "删除 API 密钥")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tr("Are you sure you want to delete", "确认删除")}{" "}
                <span className="font-medium text-foreground">"{apiKeys.find(k => k.id === deleteConfirmId)?.name}"</span>?
                {" "}
                {tr("This action cannot be undone and any agents using this key will lose access.", "该操作不可撤销，使用该密钥的 Agent 将失去访问权限。")}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                onClick={() => setDeleteConfirmId(null)}
              >
                {tr("Cancel", "取消")}
              </button>
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-destructive text-destructive-foreground hover:brightness-110"
                onClick={() => { handleDeleteApi(deleteConfirmId); setDeleteConfirmId(null); }}
              >
                {tr("Delete", "删除")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ Logout Confirm Modal ═══════════════ */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{tr("Confirm Log Out", "确认退出登录")}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tr("Are you sure you want to log out of your current account?", "确认退出当前账户吗？")}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                onClick={() => setShowLogoutConfirm(false)}
              >
                {tr("Cancel", "取消")}
              </button>
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-destructive text-destructive-foreground hover:brightness-110"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                  navigate("/landing");
                }}
              >
                {tr("Log Out", "退出登录")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ Create API Modal ═══════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          {/* Modal */}
          <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header: Title + Close */}
            <div className="px-6 pt-5 pb-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-foreground">
                  {createStep === 1 ? tr("Create New API Key", "创建新的 API 密钥") : tr("Your API Key is Ready", "API 密钥已准备就绪")}
                </h3>
                <button
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent hover:border-border"
                  onClick={() => { if (createStep === 2) handleFinishCreate(); else setShowCreateModal(false); }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Steps indicator */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex items-center gap-2 ${createStep >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    createStep >= 1 ? "border-primary bg-primary/10" : "border-border"
                  }`}>1</div>
                  <span className="text-xs font-medium">{tr("Generate API", "生成 API")}</span>
                </div>
                <div className={`flex-1 h-px ${createStep >= 2 ? "bg-primary" : "bg-border"}`} />
                <div className={`flex items-center gap-2 ${createStep >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    createStep >= 2 ? "border-primary bg-primary/10" : "border-border"
                  }`}>2</div>
                  <span className="text-xs font-medium">{tr("Paste to Agent", "粘贴到 Agent")}</span>
                </div>
              </div>
            </div>

            {/* Step 1: Name & Create */}
            {createStep === 1 && (
              <div className="px-6 pb-6 space-y-4">
                <p className="text-xs text-muted-foreground">{tr("Give your API key a name to identify it later.", "为 API 密钥命名，便于后续识别。")}</p>
                <div className="space-y-2">
                  <Label className="label-upper">{tr("API Name", "API 名称")}</Label>
                  <Input
                    placeholder={tr("e.g., My Trading Bot, Research Agent...", "例如：我的交易机器人、研究 Agent...")}
                    value={newApiName}
                    onChange={(e) => setNewApiName(e.target.value)}
                    className="rounded-lg bg-accent border-border"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateApi(); }}
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                    onClick={handleCreateApi}
                  >
                    {tr("Create API Key", "创建 API 密钥")}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Show Prompt */}
            {createStep === 2 && (
              <div className="px-6 pb-6 space-y-4">
                <p className="text-xs text-muted-foreground">{tr("Copy the prompt below and paste it into your AI agent (ChatGPT / Claude / DeepSeek) to start using Quandora Trading.", "复制下方提示词并粘贴到你的 AI Agent（ChatGPT / Claude / DeepSeek）即可开始使用 Quandora Trading。")}</p>

                {/* Prompt preview */}
                <div>
                  <div className="p-4 rounded-xl bg-accent border border-border max-h-64 overflow-y-auto">
                    <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                      {buildPrompt(createdApiKey, SKILL_LATEST)}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    className="h-9 px-6 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 btn-bounce flex items-center gap-2"
                    onClick={() => {
                      navigator.clipboard.writeText(buildPrompt(createdApiKey, SKILL_LATEST));
                      toast.success(tr("Prompt copied to clipboard", "提示词已复制到剪贴板"));
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {tr("Copy Prompt", "复制提示词")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

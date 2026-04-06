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
import {
  User, Key, Link2, Shield, Copy, Check,
  Eye, EyeOff, RefreshCw, Wifi, WifiOff, AlertTriangle, Compass,
  Bell, Mail, Send, Pencil, X, Plus, Trash2, FileText,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { exchanges, type Exchange } from "@/lib/mockData";

type TabId = "profile" | "api";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "api", label: "API Keys", icon: Key },
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
  return `# Otter Trading Skill Configuration

## API Key
\`${apiKey}\`

## Skill Version
${skillVersion}

## Setup Instructions
Paste this entire prompt into your AI agent (ChatGPT / Claude / DeepSeek) to enable Otter Trading capabilities.

Your agent will be able to:
- Mine and backtest alpha factors automatically
- Access real-time market data (CEX & DEX)
- Submit strategies to the Otter Arena
- Monitor portfolio performance

## Connection Endpoint
https://api.otter.trade/v1/agent

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
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg transition-colors duration-200 ease-in-out text-muted-foreground hover:text-foreground">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── Copy Prompt button ── */
function CopyPromptBtn({ apiKey, skillVersion }: { apiKey: string; skillVersion: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(buildPrompt(apiKey, skillVersion));
    setCopied(true);
    toast.success("Prompt copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="h-7 text-xs px-2.5 rounded-full flex items-center gap-1 transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10"
    >
      {copied ? <Check className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
      {copied ? "Copied" : "Copy Prompt"}
    </button>
  );
}

export default function Account() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
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
  const headerRef = useRef<HTMLDivElement>(null);

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
    toast.success("Exchange connection updated");
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

  // API Key actions
  const handleCreateApi = useCallback(() => {
    if (!newApiName.trim()) { toast.error("Please enter an API name"); return; }
    const key = generateApiKey();
    setCreatedApiKey(key);
    setCreateStep(2);
  }, [newApiName]);

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
    toast.success("API key created successfully");
  }, [newApiName, createdApiKey]);

  const handleDeleteApi = useCallback((id: string) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    toast.success("API key deleted");
  }, []);

  const handleSaveName = useCallback((id: string) => {
    if (!editNameValue.trim()) { toast.error("Name cannot be empty"); return; }
    const now = new Date().toISOString().split("T")[0];
    setApiKeys((prev) =>
      prev.map((k) => k.id === id ? { ...k, name: editNameValue.trim(), updatedAt: now } : k)
    );
    setEditingNameId(null);
    setEditNameValue("");
    toast.success("API name updated");
  }, [editNameValue]);

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
          <h1 className="text-foreground">Account</h1>
        </div>
        <div className="reveal-line mt-2">
          <p className="text-base text-muted-foreground">
            Manage your profile, API keys, and exchange connections
          </p>
        </div>
        <div className="reveal-line mt-3">
          <Link href="/launch-guide">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full text-xs border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            >
              <Compass className="w-3.5 h-3.5" />
              Launch Guide
            </Button>
          </Link>
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
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════ Profile Tab ═══════════════ */}
      {activeTab === "profile" && (
        <div className="space-y-8">
          {/* Account Settings */}
          <div className="surface-card">
            <div className="px-6 py-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-base font-semibold text-foreground">Account Settings</span>
              </div>
            </div>

            {/* 1. Profile (Nickname & Avatar) */}
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Profile</span>
                </div>
                {!editingProfile ? (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => { setOriginalNickname(nickname); setEditingProfile(true); }}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                ) : (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-border text-muted-foreground hover:text-foreground"
                    onClick={handleCancelProfile}
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                )}
              </div>
              <div className="flex items-start gap-6">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div
                    className={`w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors duration-200 ${
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
                        if (file.size > 2 * 1024 * 1024) { toast.error("Image must be less than 2MB"); return; }
                        const reader = new FileReader();
                        reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {editingProfile && <span className="text-[10px] text-muted-foreground">Click to upload</span>}
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="label-upper">Nickname</Label>
                  <Input
                    placeholder="Enter your nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    disabled={!editingProfile}
                    className={`${editingProfile ? activeInputCls : disabledInputCls} md:max-w-md`}
                  />
                  {editingProfile && (
                    <button
                      className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce mt-2"
                      onClick={() => {
                        if (!nickname.trim()) { toast.error("Nickname cannot be empty"); return; }
                        const profileUpdates: Partial<{displayName: string; avatar: string}> = { displayName: nickname };
                        if (avatarPreview) profileUpdates.avatar = avatarPreview;
                        updateUser(profileUpdates);
                        setOriginalNickname(nickname);
                        toast.success("Profile updated successfully");
                        setEditingProfile(false);
                      }}
                    >
                      Save Profile
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
                  <span className="text-sm font-semibold text-foreground">Change Email</span>
                </div>
                {!editingEmail ? (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => setEditingEmail(true)}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                ) : (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-border text-muted-foreground hover:text-foreground"
                    onClick={handleCancelEmail}
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="label-upper">Current Email</Label>
                  <Input value={email} disabled className={disabledInputCls} />
                </div>
                {editingEmail && (
                  <div className="space-y-2">
                    <Label className="label-upper">Verification Code</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter verification code"
                        value={emailVerCode}
                        onChange={(e) => setEmailVerCode(e.target.value)}
                        className={`${activeInputCls} flex-1`}
                      />
                      <button
                        className="h-9 px-4 rounded-full text-xs font-medium transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10 flex items-center gap-1.5 shrink-0"
                        onClick={() => { setEmailCodeSent(true); toast.success("Verification code sent to your current email"); }}
                      >
                        <Send className="w-3 h-3" />
                        {emailCodeSent ? "Resend Code" : "Send Code"}
                      </button>
                    </div>
                  </div>
                )}
                {editingEmail && (
                  <div className="space-y-2 md:col-span-2">
                    <Label className="label-upper">New Email</Label>
                    <Input
                      type="email"
                      placeholder="Enter new email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className={`${activeInputCls} md:max-w-md`}
                    />
                    {newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) && (
                      <p className="text-xs text-destructive">Please enter a valid email address</p>
                    )}
                  </div>
                )}
              </div>
              {editingEmail && (
                <button
                  className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                  onClick={() => {
                    if (!emailVerCode.trim()) { toast.error("Please enter the verification code"); return; }
                    if (!newEmail.trim()) { toast.error("Please enter a new email address"); return; }
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { toast.error("Please enter a valid email address"); return; }
                    toast.success("Email updated successfully");
                    setEmail(newEmail);
                    updateUser({ email: newEmail });
                    setEmailVerCode(""); setEmailCodeSent(false); setNewEmail(""); setEditingEmail(false);
                  }}
                >
                  Save Email
                </button>
              )}
            </div>

            {/* 3. Change Password */}
            <div className="px-6 py-4 pb-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Change Password</span>
                </div>
                {!editingPassword ? (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => setEditingPassword(true)}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                ) : (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-border text-muted-foreground hover:text-foreground"
                    onClick={handleCancelPassword}
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
            {editingPassword ? (
              <div className="px-6 pb-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="label-upper">Email</Label>
                    <Input value={email} disabled className={disabledInputCls} />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-upper">Verification Code</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Enter verification code"
                        value={passwordVerCode}
                        onChange={(e) => setPasswordVerCode(e.target.value)}
                        className={`${activeInputCls} flex-1`}
                      />
                      <button
                        className="h-9 px-4 rounded-full text-xs font-medium transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10 flex items-center gap-1.5 shrink-0"
                        onClick={() => { setPasswordCodeSent(true); toast.success("Verification code sent to your email"); }}
                      >
                        <Send className="w-3 h-3" />
                        {passwordCodeSent ? "Resend Code" : "Send Code"}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="label-upper">New Password</Label>
                    <Input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={activeInputCls} />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-upper">Confirm New Password</Label>
                    <Input type="password" placeholder="Re-enter new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={activeInputCls} />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive">Passwords do not match</p>
                    )}
                  </div>
                </div>
                <button
                  className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                  onClick={() => {
                    if (!passwordVerCode.trim()) { toast.error("Please enter the verification code"); return; }
                    if (!newPassword.trim()) { toast.error("Please enter a new password"); return; }
                    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
                    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
                    toast.success("Password updated successfully");
                    setPasswordVerCode(""); setPasswordCodeSent(false); setNewPassword(""); setConfirmPassword(""); setEditingPassword(false);
                  }}
                >
                  Save Password
                </button>
              </div>
            ) : null}
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
                  <span className="text-base font-semibold text-foreground">API Keys</span>
                  <span className="text-xs text-muted-foreground ml-1">({apiKeys.length})</span>
                </div>
                <button
                  className="h-8 text-xs px-4 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce font-medium"
                  onClick={() => { setShowCreateModal(true); setCreateStep(1); setNewApiName(""); setCreatedApiKey(""); }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  New API Key
                </button>
              </div>
            </div>

            {/* API Keys List */}
            <div className="p-6">
              {apiKeys.length === 0 ? (
                <div className="text-center py-12">
                  <Key className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No API keys yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Create your first API key to connect your AI agent</p>
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
                                Save
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
                          <CopyPromptBtn apiKey={item.apiKey} skillVersion={SKILL_LATEST} />
                          <button
                            className="h-7 w-7 rounded-full flex items-center justify-center transition-all duration-200 border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5"
                            onClick={() => setDeleteConfirmId(item.id)}
                            title="Delete API key"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Row 2: API Key */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium w-14 shrink-0">API Key</span>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/60 border border-border/60 flex-1 min-w-0">
                          <code className="font-mono text-xs text-primary truncate flex-1">
                            {visibleKeys.has(item.id) ? item.apiKey : item.apiKey.slice(0, 6) + "\u2022".repeat(16) + "..."}
                          </code>
                          <button onClick={() => toggleKeyVisibility(item.id)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                            {visibleKeys.has(item.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                          <CopyBtn text={item.apiKey} />
                        </div>
                      </div>

                      {/* Row 3: Meta info */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="uppercase tracking-wider font-medium">Skill</span>
                          <span className="text-primary font-semibold">{item.skillVersion}</span>
                          {item.skillVersion !== SKILL_LATEST && (
                            <span className="text-amber-500 ml-0.5">(update available: {SKILL_LATEST})</span>
                          )}
                        </span>
                        <span className="border-l border-border pl-4">Created {item.createdAt}</span>
                        <span className="border-l border-border pl-4">Updated {item.updatedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


        </div>
      )}

      {/* ═══════════════ Notification Settings ═══════════════ */}
      {activeTab === "profile" && (
        <div className="surface-card">
          <div className="px-6 py-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-base font-semibold text-foreground">Notification Settings</span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <div className="text-sm font-medium text-foreground">Alphas Notifications</div>
                <div className="text-xs text-muted-foreground">Get notified about alpha status changes, test results, and performance updates</div>
              </div>
              <button
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${alphasNotify ? "bg-primary" : "bg-muted"}`}
                onClick={() => { setAlphasNotify(!alphasNotify); toast.success(alphasNotify ? "Alphas notifications disabled" : "Alphas notifications enabled"); }}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${alphasNotify ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <div className="text-sm font-medium text-foreground">Arena Notifications</div>
                <div className="text-xs text-muted-foreground">Get notified about competition rounds, rankings, and prize pool updates</div>
              </div>
              <button
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${arenaNotify ? "bg-primary" : "bg-muted"}`}
                onClick={() => { setArenaNotify(!arenaNotify); toast.success(arenaNotify ? "Arena notifications disabled" : "Arena notifications enabled"); }}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${arenaNotify ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ Create API Modal ═══════════════ */}
      {/* ═══════════════ Delete Confirm Modal ═══════════════ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
          <div className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Delete API Key</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Are you sure you want to delete <span className="font-medium text-foreground">"{apiKeys.find(k => k.id === deleteConfirmId)?.name}"</span>? This action cannot be undone and any agents using this key will lose access.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 bg-destructive text-destructive-foreground hover:brightness-110"
                onClick={() => { handleDeleteApi(deleteConfirmId); setDeleteConfirmId(null); }}
              >
                Delete
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
                  {createStep === 1 ? "Create New API Key" : "Your API Key is Ready"}
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
                  <span className="text-xs font-medium">Generate API</span>
                </div>
                <div className={`flex-1 h-px ${createStep >= 2 ? "bg-primary" : "bg-border"}`} />
                <div className={`flex items-center gap-2 ${createStep >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                    createStep >= 2 ? "border-primary bg-primary/10" : "border-border"
                  }`}>2</div>
                  <span className="text-xs font-medium">Paste to Agent</span>
                </div>
              </div>
            </div>

            {/* Step 1: Name & Create */}
            {createStep === 1 && (
              <div className="px-6 pb-6 space-y-4">
                <p className="text-xs text-muted-foreground">Give your API key a name to identify it later.</p>
                <div className="space-y-2">
                  <Label className="label-upper">API Name</Label>
                  <Input
                    placeholder="e.g., My Trading Bot, Research Agent..."
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
                    Create API Key
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Show Prompt */}
            {createStep === 2 && (
              <div className="px-6 pb-6 space-y-4">
                <p className="text-xs text-muted-foreground">Copy the prompt below and paste it into your AI agent (ChatGPT / Claude / DeepSeek) to start using Otter Trading.</p>

                {/* Prompt preview */}
                <div>
                  <div className="p-4 rounded-xl bg-accent border border-border max-h-64 overflow-y-auto">
                    <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                      {buildPrompt(createdApiKey, SKILL_LATEST)}
                    </pre>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-amber-500">Important:</span> Save this prompt now. The API key will be masked after you close this dialog.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 border border-border text-muted-foreground hover:text-foreground"
                    onClick={handleFinishCreate}
                  >
                    Done
                  </button>
                  <button
                    className="h-9 px-6 rounded-full text-sm font-medium transition-all duration-200 bg-primary text-primary-foreground hover:brightness-110 btn-bounce flex items-center gap-2"
                    onClick={() => {
                      navigator.clipboard.writeText(buildPrompt(createdApiKey, SKILL_LATEST));
                      toast.success("Prompt copied to clipboard");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Prompt
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

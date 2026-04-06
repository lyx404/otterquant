/*
 * Account — Indigo/Sky + Slate Design System
 * Cards: rounded-2xl, p-6 | Buttons: rounded-full | Inputs: rounded-lg
 * Primary: Indigo | Success: Emerald
 * Pure Tailwind classes — zero inline styles
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  User, Key, Link2, Shield, Copy, Check,
  Eye, EyeOff, RefreshCw, Wifi, WifiOff, AlertTriangle, Compass,
  Bell, Mail, Send, Pencil, X,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { exchanges, type Exchange } from "@/lib/mockData";

type TabId = "profile" | "api";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "api", label: "API Keys", icon: Key },
];

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
      {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Account() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [showApiKey, setShowApiKey] = useState(false);
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
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [alphasNotify, setAlphasNotify] = useState(true);
  const [arenaNotify, setArenaNotify] = useState(true);
  const headerRef = useRef<HTMLDivElement>(null);

  // Edit mode states for each subsection
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);

  // Store original values to restore on cancel
  const [originalNickname, setOriginalNickname] = useState(nickname);

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

  const mockApiKey = "af_sk_live_7x9kM2nP4qR8sT6uW3yA1bC5dE0fG";
  const mockApiSecret = "af_ss_live_hJ2kL4mN6pQ8rS0tU2vW4xY6zA8bC0d";

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
    setAvatarPreview(null);
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

  // Shared disabled input style
  const disabledInputCls = "rounded-lg bg-accent border-border opacity-60 cursor-not-allowed";
  const activeInputCls = "rounded-lg bg-card border-border";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div ref={headerRef} className="reveal-clip">
        <div className="reveal-line">
          <h1 className="text-foreground">
            Account
          </h1>
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

      {/* Profile Tab */}
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
                {!editingProfile && (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => {
                      setOriginalNickname(nickname);
                      setEditingProfile(true);
                    }}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
                {editingProfile && (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-border text-muted-foreground hover:text-foreground hover:border-border"
                    onClick={handleCancelProfile}
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                )}
              </div>
              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div
                    className={`w-20 h-20 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors duration-200 ${
                      editingProfile
                        ? "border-primary/40 cursor-pointer hover:border-primary/60"
                        : "border-border cursor-default"
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
                  {editingProfile && (
                    <span className="text-[10px] text-muted-foreground">Click to upload</span>
                  )}
                </div>
                {/* Nickname */}
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
                      if (avatarPreview) { profileUpdates.avatar = avatarPreview; }
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
                {!editingEmail && (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => setEditingEmail(true)}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
                {editingEmail && (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-border text-muted-foreground hover:text-foreground hover:border-border"
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
                        onClick={() => {
                          setEmailCodeSent(true);
                          toast.success("Verification code sent to your current email");
                        }}
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
                    setEmailVerCode("");
                    setEmailCodeSent(false);
                    setNewEmail("");
                    setEditingEmail(false);
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
                {!editingPassword && (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10"
                    onClick={() => setEditingPassword(true)}
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                )}
                {editingPassword && (
                  <button
                    className="h-7 text-xs px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-in-out border border-border text-muted-foreground hover:text-foreground hover:border-border"
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
                        onClick={() => {
                          setPasswordCodeSent(true);
                          toast.success("Verification code sent to your email");
                        }}
                      >
                        <Send className="w-3 h-3" />
                        {passwordCodeSent ? "Resend Code" : "Send Code"}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="label-upper">New Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={activeInputCls}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="label-upper">Confirm New Password</Label>
                    <Input
                      type="password"
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={activeInputCls}
                    />
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
                    setPasswordVerCode("");
                    setPasswordCodeSent(false);
                    setNewPassword("");
                    setConfirmPassword("");
                    setEditingPassword(false);
                  }}
                >
                  Save Password
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === "api" && (
        <div className="space-y-6">
          <div className="surface-card">
            <div className="px-6 py-4 pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  <span className="text-base font-semibold text-foreground">API Credentials</span>
                </div>
                <button className="h-7 text-xs px-3 rounded-full flex items-center gap-1 transition-all duration-200 ease-in-out border border-primary/20 text-primary hover:bg-primary/10">
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="label-upper">API Key</Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent border border-border">
                  <code className="flex-1 font-mono text-sm text-primary">
                    {showApiKey ? mockApiKey : "\u2022".repeat(20) + "..."}
                  </code>
                  <button onClick={() => setShowApiKey(!showApiKey)} className="p-1 transition-colors duration-200 text-muted-foreground hover:text-foreground">
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <CopyBtn text={mockApiKey} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="label-upper">API Secret</Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent border border-border">
                  <code className="flex-1 font-mono text-sm text-muted-foreground">
                    {"\u2022".repeat(20)}...
                  </code>
                  <CopyBtn text={mockApiSecret} />
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500 dark:text-amber-400" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-amber-500 dark:text-amber-400">Security Notice:</span> Never share your API secret. It provides full access to your account. Rotate keys regularly.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-card">
            <div className="px-6 py-4 pb-3 border-b border-border">
              <span className="text-base font-semibold text-foreground">Usage & Rate Limits</span>
            </div>
            <div className="p-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl text-center bg-accent border border-border/60">
                  <div className="label-upper mb-1">Requests Today</div>
                  <div className="stat-value text-xl font-bold text-foreground">1,247</div>
                  <div className="text-xs mt-1 text-muted-foreground">of 10,000</div>
                </div>
                <div className="p-4 rounded-2xl text-center bg-accent border border-border/60">
                  <div className="label-upper mb-1">Rate Limit</div>
                  <div className="stat-value text-xl font-bold text-foreground">100</div>
                  <div className="text-xs mt-1 text-muted-foreground">req/min</div>
                </div>
                <div className="p-4 rounded-2xl text-center bg-accent border border-border/60">
                  <div className="label-upper mb-1">Plan</div>
                  <div className="stat-value text-xl font-bold text-primary">Pro</div>
                  <div className="text-xs mt-1 text-muted-foreground">unlimited factors</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Settings — always visible at bottom of profile tab */}
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
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                  alphasNotify ? "bg-primary" : "bg-muted"
                }`}
                onClick={() => { setAlphasNotify(!alphasNotify); toast.success(alphasNotify ? "Alphas notifications disabled" : "Alphas notifications enabled"); }}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                  alphasNotify ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div>
                <div className="text-sm font-medium text-foreground">Arena Notifications</div>
                <div className="text-xs text-muted-foreground">Get notified about competition rounds, rankings, and prize pool updates</div>
              </div>
              <button
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                  arenaNotify ? "bg-primary" : "bg-muted"
                }`}
                onClick={() => { setArenaNotify(!arenaNotify); toast.success(arenaNotify ? "Arena notifications disabled" : "Arena notifications enabled"); }}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ease-in-out ${
                  arenaNotify ? "translate-x-5" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

/*
 * Account — Amber/Orange + Warm Beige Design System
 * Cards: rounded-3xl, p-8 beige #F5F1E1 | Buttons: rounded-full | Inputs: rounded-xl
 * Primary: Amber | Secondary: Orange | Success: Emerald
 * Pure Tailwind classes — zero inline styles
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { toast } from "sonner";
import {
  User, Key, Link2, Shield, Bell, Copy, Check,
  Eye, EyeOff, RefreshCw, Wifi, WifiOff, AlertTriangle, Compass,
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { exchanges, type Exchange } from "@/lib/mockData";

type TabId = "profile" | "api" | "exchanges" | "notifications";

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "api", label: "API Keys", icon: Key },
  { id: "exchanges", label: "Exchanges", icon: Link2 },
  { id: "notifications", label: "Notifications", icon: Bell },
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
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [showApiKey, setShowApiKey] = useState(false);
  const [exchangeList, setExchangeList] = useState<Exchange[]>(exchanges);
  const headerRef = useRef<HTMLDivElement>(null);

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
                  : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-amber-100 dark:hover:bg-slate-800"
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
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="surface-card lg:col-span-2">
            <div className="px-6 py-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-base font-semibold text-foreground">Profile Information</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="label-upper">Username</Label>
                  <Input defaultValue="CryptoQuant_Pro" className="rounded-lg bg-card border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Display Name</Label>
                  <Input defaultValue="CryptoQuant Pro" className="rounded-lg bg-card border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Email</Label>
                  <Input defaultValue="quant@example.com" className="rounded-lg bg-card border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Timezone</Label>
                  <Input defaultValue="UTC+8" className="rounded-lg bg-card border-border" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="label-upper">Bio</Label>
                <textarea
                  defaultValue="Quantitative researcher specializing in crypto alpha factor mining. Building systematic strategies using AI-powered tools."
                  className="w-full h-20 px-3 py-2 rounded-lg text-sm resize-none focus:outline-none transition-all duration-200 ease-in-out bg-card border border-border text-foreground focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <button
                className="h-9 px-5 rounded-full text-sm font-medium transition-all duration-200 ease-in-out bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                onClick={() => toast.success("Profile updated")}
              >
                Save Changes
              </button>
            </div>
          </div>

          <div className="surface-card">
            <div className="px-6 py-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-base font-semibold text-foreground">Security</span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-foreground">Two-Factor Auth</div>
                  <div className="text-xs text-muted-foreground">TOTP authenticator</div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em] bg-success/10 text-success border border-success/20">
                  ENABLED
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <div className="text-sm font-medium text-foreground">Password</div>
                  <div className="text-xs text-muted-foreground">Last changed 30 days ago</div>
                </div>
                <button className="h-7 text-xs px-3 rounded-full transition-all duration-200 ease-in-out border border-border text-muted-foreground hover:text-foreground hover:border-primary/30">
                  Change
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <div className="text-sm font-medium text-foreground">Sessions</div>
                  <div className="text-xs text-muted-foreground">2 active sessions</div>
                </div>
                <button className="h-7 text-xs px-3 rounded-full transition-all duration-200 ease-in-out border border-border text-muted-foreground hover:text-foreground hover:border-primary/30">
                  Manage
                </button>
              </div>
            </div>
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

      {/* Exchanges Tab */}
      {activeTab === "exchanges" && (
        <div className="space-y-6">
          <div>
            <h3 className="label-upper mb-3 text-primary">Centralized Exchanges (CEX)</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exchangeList
                .filter((ex) => ex.type === "CEX")
                .map((ex) => {
                  const connected = ex.status === "connected";
                  return (
                    <div
                      key={ex.id}
                      className={`surface-card p-6 transition-all duration-200 ease-in-out ${
                        connected ? "border-success/20 dark:border-success/30" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold border ${
                            connected
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-accent text-muted-foreground border-border"
                          }`}>
                            {ex.logo}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{ex.name}</div>
                            <div className="text-[10px] text-muted-foreground">{ex.supportedPairs} pairs</div>
                          </div>
                        </div>
                        {connected ? (
                          <div className="flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-success" />
                            <span className="text-[10px] font-mono text-success">LIVE</span>
                          </div>
                        ) : (
                          <WifiOff className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs mb-3 line-clamp-2 text-muted-foreground">{ex.description}</p>
                      <button
                        className={`w-full h-7 text-xs rounded-full font-medium transition-all duration-200 ease-in-out ${
                          connected
                            ? "border border-border text-muted-foreground bg-transparent hover:text-foreground hover:border-primary/30"
                            : "bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                        }`}
                        onClick={() => handleConnect(ex.id)}
                      >
                        {connected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>

          <div>
            <h3 className="label-upper mb-3 text-purple-500 dark:text-purple-400">Decentralized Exchanges (DEX)</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exchangeList
                .filter((ex) => ex.type === "DEX")
                .map((ex) => {
                  const connected = ex.status === "connected";
                  return (
                    <div
                      key={ex.id}
                      className={`surface-card p-6 transition-all duration-200 ease-in-out ${
                        connected ? "border-success/20 dark:border-success/30" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold border ${
                            connected
                              ? "bg-success/10 text-success border-success/20"
                              : "bg-accent text-muted-foreground border-border"
                          }`}>
                            {ex.logo}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{ex.name}</div>
                            <div className="text-[10px] text-muted-foreground">{ex.supportedPairs} pairs</div>
                          </div>
                        </div>
                        {connected ? (
                          <div className="flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-success" />
                            <span className="text-[10px] font-mono text-success">LIVE</span>
                          </div>
                        ) : (
                          <WifiOff className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs mb-3 line-clamp-2 text-muted-foreground">{ex.description}</p>
                      <button
                        className={`w-full h-7 text-xs rounded-full font-medium transition-all duration-200 ease-in-out ${
                          connected
                            ? "border border-border text-muted-foreground bg-transparent hover:text-foreground hover:border-primary/30"
                            : "bg-primary text-primary-foreground hover:brightness-110 btn-bounce"
                        }`}
                        onClick={() => handleConnect(ex.id)}
                      >
                        {connected ? "Disconnect" : "Connect"}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="surface-card">
          <div className="px-6 py-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="text-base font-semibold text-foreground">Notification Preferences</span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: "Factor Test Results", desc: "Get notified when IS/OS tests complete", defaultChecked: true },
              { label: "Epoch Rewards", desc: "Reward distribution notifications", defaultChecked: true },
              { label: "Trade Execution", desc: "Real-time trade execution alerts", defaultChecked: false },
              { label: "New Subscribers", desc: "When someone subscribes to your strategies", defaultChecked: true },
              { label: "System Maintenance", desc: "Platform maintenance and downtime alerts", defaultChecked: true },
              { label: "Weekly Digest", desc: "Weekly summary of your factor performance", defaultChecked: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 last:border-0 border-b border-border">
                <div>
                  <div className="text-sm font-medium text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

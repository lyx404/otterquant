/*
 * Account — Katana Deep Navy Design System
 * bg-0: #0d111c | bg-1: #101631 | Primary: #0058ff | Success: #00ffc2
 * Text: rgba(236,238,243, 0.92/0.48/0.32) | Border: rgba(236,238,243, 0.08/0.12)
 */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { toast } from "sonner";
import {
  User,
  Key,
  Link2,
  Shield,
  Bell,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import { exchanges, type Exchange } from "@/lib/mockData";

/* ── color tokens ── */
const C = {
  bg0: "#0d111c",
  bg1: "#101631",
  card: "rgba(236,238,243,0.04)",
  cardHover: "rgba(236,238,243,0.06)",
  borderWeak: "rgba(236,238,243,0.08)",
  border: "rgba(236,238,243,0.12)",
  text1: "rgba(236,238,243,0.92)",
  text2: "rgba(236,238,243,0.48)",
  text3: "rgba(236,238,243,0.32)",
  primary: "#0058ff",
  primaryLight: "#4d94ff",
  primaryDim: "rgba(0,88,255,0.12)",
  primaryBorder: "rgba(0,88,255,0.30)",
  success: "#00ffc2",
  successDim: "rgba(0,255,194,0.10)",
  successBorder: "rgba(0,255,194,0.20)",
  danger: "#f12211",
  dangerDim: "rgba(241,34,17,0.10)",
  purple: "#a268ff",
  orange: "#db5e05",
};

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
    <button onClick={handleCopy} className="p-1.5 rounded-lg transition-colors" style={{ color: C.text3 }}>
      {copied ? <Check className="w-3.5 h-3.5" style={{ color: C.success }} /> : <Copy className="w-3.5 h-3.5" />}
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
    if (tab && tabs.some((t) => t.id === tab)) {
      setActiveTab(tab as TabId);
    }
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
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-none" style={{ color: C.text1 }}>
            Account
          </h1>
        </div>
        <div className="reveal-line mt-2">
          <p className="text-sm" style={{ color: C.text2 }}>
            Manage your profile, API keys, and exchange connections
          </p>
        </div>
      </div>

      {/* Tab Navigation — electric blue capsule active state */}
      <div className="flex items-center gap-1 p-1 rounded-2xl w-fit" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className="h-8 text-xs px-3 rounded-xl font-medium transition-all duration-250 flex items-center gap-1.5"
              style={{
                backgroundColor: isActive ? C.primaryDim : "transparent",
                color: isActive ? C.primaryLight : C.text2,
                border: isActive ? `1px solid ${C.primaryBorder}` : "1px solid transparent",
              }}
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
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="katana-card lg:col-span-2">
            <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${C.borderWeak}` }}>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" style={{ color: C.primaryLight }} />
                <span className="text-base font-semibold" style={{ color: C.text1 }}>Profile Information</span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="label-upper">Username</Label>
                  <Input defaultValue="CryptoQuant_Pro" className="rounded-xl" style={{ backgroundColor: C.card, borderColor: C.border }} />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Display Name</Label>
                  <Input defaultValue="CryptoQuant Pro" className="rounded-xl" style={{ backgroundColor: C.card, borderColor: C.border }} />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Email</Label>
                  <Input defaultValue="quant@example.com" className="rounded-xl" style={{ backgroundColor: C.card, borderColor: C.border }} />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Timezone</Label>
                  <Input defaultValue="UTC+8" className="rounded-xl" style={{ backgroundColor: C.card, borderColor: C.border }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="label-upper">Bio</Label>
                <textarea
                  defaultValue="Quantitative researcher specializing in crypto alpha factor mining. Building systematic strategies using AI-powered tools."
                  className="w-full h-20 px-3 py-2 rounded-xl text-sm resize-none focus:outline-none transition-all duration-250"
                  style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.text1 }}
                />
              </div>
              <button
                className="h-9 px-5 rounded-[9999px] text-sm font-medium transition-all duration-250"
                style={{ backgroundColor: C.primary, color: "#fff" }}
                onClick={() => toast.success("Profile updated")}
              >
                Save Changes
              </button>
            </div>
          </div>

          <div className="katana-card">
            <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${C.borderWeak}` }}>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: C.primaryLight }} />
                <span className="text-base font-semibold" style={{ color: C.text1 }}>Security</span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium" style={{ color: C.text1 }}>Two-Factor Auth</div>
                  <div className="text-xs" style={{ color: C.text2 }}>TOTP authenticator</div>
                </div>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-[0.15em]"
                  style={{ backgroundColor: C.successDim, color: C.success, border: `1px solid ${C.successBorder}` }}
                >
                  ENABLED
                </span>
              </div>
              <div className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${C.borderWeak}` }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: C.text1 }}>Password</div>
                  <div className="text-xs" style={{ color: C.text2 }}>Last changed 30 days ago</div>
                </div>
                <button className="h-7 text-xs px-3 rounded-xl transition-all duration-250" style={{ border: `1px solid ${C.border}`, color: C.text2 }}>
                  Change
                </button>
              </div>
              <div className="flex items-center justify-between py-2" style={{ borderTop: `1px solid ${C.borderWeak}` }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: C.text1 }}>Sessions</div>
                  <div className="text-xs" style={{ color: C.text2 }}>2 active sessions</div>
                </div>
                <button className="h-7 text-xs px-3 rounded-xl transition-all duration-250" style={{ border: `1px solid ${C.border}`, color: C.text2 }}>
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
          <div className="katana-card">
            <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${C.borderWeak}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4" style={{ color: C.primaryLight }} />
                  <span className="text-base font-semibold" style={{ color: C.text1 }}>API Credentials</span>
                </div>
                <button className="h-7 text-xs px-3 rounded-xl flex items-center gap-1 transition-all duration-250" style={{ border: `1px solid ${C.primaryBorder}`, color: C.primaryLight }}>
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="label-upper">API Key</Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                  <code className="flex-1 font-mono text-sm" style={{ color: C.primaryLight }}>
                    {showApiKey ? mockApiKey : "\u2022".repeat(20) + "..."}
                  </code>
                  <button onClick={() => setShowApiKey(!showApiKey)} className="p-1 transition-colors" style={{ color: C.text3 }}>
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <CopyBtn text={mockApiKey} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="label-upper">API Secret</Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                  <code className="flex-1 font-mono text-sm" style={{ color: C.text3 }}>
                    {"\u2022".repeat(20)}...
                  </code>
                  <CopyBtn text={mockApiSecret} />
                </div>
              </div>
              <div className="p-3 rounded-xl" style={{ backgroundColor: "rgba(219,94,5,0.06)", border: "1px solid rgba(219,94,5,0.20)" }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.orange }} />
                  <div className="text-xs" style={{ color: C.text2 }}>
                    <span className="font-medium" style={{ color: C.orange }}>Security Notice:</span> Never share your API secret. It provides full access to your account. Use environment variables to store credentials.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="katana-card">
            <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${C.borderWeak}` }}>
              <span className="text-base font-semibold" style={{ color: C.text1 }}>Usage & Rate Limits</span>
            </div>
            <div className="p-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: C.card, border: `1px solid ${C.borderWeak}` }}>
                  <div className="label-upper mb-1">Requests Today</div>
                  <div className="stat-value text-xl font-bold" style={{ color: C.text1 }}>1,247</div>
                  <div className="text-xs mt-1" style={{ color: C.text2 }}>of 10,000</div>
                </div>
                <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: C.card, border: `1px solid ${C.borderWeak}` }}>
                  <div className="label-upper mb-1">Rate Limit</div>
                  <div className="stat-value text-xl font-bold" style={{ color: C.text1 }}>100</div>
                  <div className="text-xs mt-1" style={{ color: C.text2 }}>req/min</div>
                </div>
                <div className="p-3 rounded-2xl text-center" style={{ backgroundColor: C.card, border: `1px solid ${C.borderWeak}` }}>
                  <div className="label-upper mb-1">Plan</div>
                  <div className="stat-value text-xl font-bold" style={{ color: C.primary }}>Pro</div>
                  <div className="text-xs mt-1" style={{ color: C.text2 }}>unlimited factors</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exchanges Tab */}
      {activeTab === "exchanges" && (
        <div className="space-y-4">
          <div>
            <h3 className="label-upper mb-3" style={{ color: C.primaryLight }}>Centralized Exchanges (CEX)</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {exchangeList
                .filter((ex) => ex.type === "CEX")
                .map((ex) => {
                  const connected = ex.status === "connected";
                  return (
                    <div
                      key={ex.id}
                      className="katana-card p-4 transition-all duration-250"
                      style={connected ? { borderColor: C.successBorder } : {}}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold"
                            style={{
                              backgroundColor: connected ? C.successDim : C.card,
                              color: connected ? C.success : C.text2,
                              border: `1px solid ${connected ? C.successBorder : C.border}`,
                            }}
                          >
                            {ex.logo}
                          </div>
                          <div>
                            <div className="text-sm font-medium" style={{ color: C.text1 }}>{ex.name}</div>
                            <div className="text-[10px]" style={{ color: C.text3 }}>{ex.supportedPairs} pairs</div>
                          </div>
                        </div>
                        {connected ? (
                          <div className="flex items-center gap-1">
                            <Wifi className="w-3 h-3" style={{ color: C.success }} />
                            <span className="text-[10px] font-mono" style={{ color: C.success }}>LIVE</span>
                          </div>
                        ) : (
                          <WifiOff className="w-3 h-3" style={{ color: C.text3 }} />
                        )}
                      </div>
                      <p className="text-xs mb-3 line-clamp-2" style={{ color: C.text2 }}>{ex.description}</p>
                      <button
                        className="w-full h-7 text-xs rounded-[9999px] font-medium transition-all duration-250"
                        style={connected
                          ? { border: `1px solid ${C.border}`, color: C.text2, backgroundColor: "transparent" }
                          : { backgroundColor: C.primary, color: "#fff" }
                        }
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
            <h3 className="label-upper mb-3" style={{ color: C.purple }}>Decentralized Exchanges (DEX)</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {exchangeList
                .filter((ex) => ex.type === "DEX")
                .map((ex) => {
                  const connected = ex.status === "connected";
                  return (
                    <div
                      key={ex.id}
                      className="katana-card p-4 transition-all duration-250"
                      style={connected ? { borderColor: C.successBorder } : {}}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-mono font-bold"
                            style={{
                              backgroundColor: connected ? C.successDim : C.card,
                              color: connected ? C.success : C.text2,
                              border: `1px solid ${connected ? C.successBorder : C.border}`,
                            }}
                          >
                            {ex.logo}
                          </div>
                          <div>
                            <div className="text-sm font-medium" style={{ color: C.text1 }}>{ex.name}</div>
                            <div className="text-[10px]" style={{ color: C.text3 }}>{ex.supportedPairs} pairs</div>
                          </div>
                        </div>
                        {connected ? (
                          <div className="flex items-center gap-1">
                            <Wifi className="w-3 h-3" style={{ color: C.success }} />
                            <span className="text-[10px] font-mono" style={{ color: C.success }}>LIVE</span>
                          </div>
                        ) : (
                          <WifiOff className="w-3 h-3" style={{ color: C.text3 }} />
                        )}
                      </div>
                      <p className="text-xs mb-3 line-clamp-2" style={{ color: C.text2 }}>{ex.description}</p>
                      <button
                        className="w-full h-7 text-xs rounded-[9999px] font-medium transition-all duration-250"
                        style={connected
                          ? { border: `1px solid ${C.border}`, color: C.text2, backgroundColor: "transparent" }
                          : { backgroundColor: C.primary, color: "#fff" }
                        }
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
        <div className="katana-card">
          <div className="p-4 pb-3" style={{ borderBottom: `1px solid ${C.borderWeak}` }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: C.primaryLight }} />
              <span className="text-base font-semibold" style={{ color: C.text1 }}>Notification Preferences</span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {[
              { label: "Factor Test Results", desc: "Get notified when IS/OS tests complete", defaultChecked: true },
              { label: "Epoch Rewards", desc: "Reward distribution notifications", defaultChecked: true },
              { label: "Trade Execution", desc: "Real-time trade execution alerts", defaultChecked: false },
              { label: "New Subscribers", desc: "When someone subscribes to your strategies", defaultChecked: true },
              { label: "System Maintenance", desc: "Platform maintenance and downtime alerts", defaultChecked: true },
              { label: "Weekly Digest", desc: "Weekly summary of your factor performance", defaultChecked: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 last:border-0" style={{ borderBottom: `1px solid ${C.borderWeak}` }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: C.text1 }}>{item.label}</div>
                  <div className="text-xs" style={{ color: C.text2 }}>{item.desc}</div>
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

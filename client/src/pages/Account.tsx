/*
 * Account — Acid Green Design System
 * #0B0B0B bg, #C5FF4A accent, white/10 borders, white/50 secondary
 * GSAP staggered reveal, tabs with acid green active state
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
    <button onClick={handleCopy} className="p-1.5 rounded-md transition-colors" style={{ color: "rgba(255,255,255,0.40)" }}>
      {copied ? <Check className="w-3.5 h-3.5" style={{ color: "#C5FF4A" }} /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Account() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [showApiKey, setShowApiKey] = useState(false);
  const [exchangeList, setExchangeList] = useState<Exchange[]>(exchanges);
  const headerRef = useRef<HTMLDivElement>(null);

  // GSAP staggered reveal for header
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
          <h1 className="text-5xl md:text-7xl font-medium tracking-tighter leading-none text-white">
            Account
          </h1>
        </div>
        <div className="reveal-line mt-2">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.50)" }}>
            Manage your profile, API keys, and exchange connections
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className="h-8 text-xs px-3 rounded-md font-medium transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: activeTab === tab.id ? "rgba(197,255,74,0.10)" : "transparent",
                color: activeTab === tab.id ? "#C5FF4A" : "rgba(255,255,255,0.50)",
                border: activeTab === tab.id ? "1px solid rgba(197,255,74,0.20)" : "1px solid transparent",
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
            <div className="p-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" style={{ color: "rgb(100,180,255)" }} />
                <span className="text-base font-semibold text-white">Profile Information</span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="label-upper">Username</Label>
                  <Input defaultValue="CryptoQuant_Pro" style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }} />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Display Name</Label>
                  <Input defaultValue="CryptoQuant Pro" style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }} />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Email</Label>
                  <Input defaultValue="quant@example.com" style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }} />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Timezone</Label>
                  <Input defaultValue="UTC+8" style={{ backgroundColor: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="label-upper">Bio</Label>
                <textarea
                  defaultValue="Quantitative researcher specializing in crypto alpha factor mining. Building systematic strategies using AI-powered tools."
                  className="w-full h-20 px-3 py-2 rounded-md text-sm text-white resize-none focus:outline-none"
                  style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                />
              </div>
              <button
                className="h-9 px-5 rounded-md text-sm font-medium transition-all"
                style={{ backgroundColor: "#C5FF4A", color: "#0B0B0B" }}
                onClick={() => toast.success("Profile updated")}
              >
                Save Changes
              </button>
            </div>
          </div>

          <div className="katana-card">
            <div className="p-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" style={{ color: "rgb(100,180,255)" }} />
                <span className="text-base font-semibold text-white">Security</span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium text-white">Two-Factor Auth</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>TOTP authenticator</div>
                </div>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono tracking-[0.15em]"
                  style={{ backgroundColor: "rgba(74,222,128,0.08)", color: "rgb(74,222,128)", border: "1px solid rgba(74,222,128,0.20)" }}
                >
                  ENABLED
                </span>
              </div>
              <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div className="text-sm font-medium text-white">Password</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>Last changed 30 days ago</div>
                </div>
                <button className="h-7 text-xs px-3 rounded-md transition-all" style={{ border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.50)" }}>
                  Change
                </button>
              </div>
              <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div className="text-sm font-medium text-white">Sessions</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>2 active sessions</div>
                </div>
                <button className="h-7 text-xs px-3 rounded-md transition-all" style={{ border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.50)" }}>
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
            <div className="p-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4" style={{ color: "#C5FF4A" }} />
                  <span className="text-base font-semibold text-white">API Credentials</span>
                </div>
                <button className="h-7 text-xs px-3 rounded-md flex items-center gap-1 transition-all" style={{ border: "1px solid rgba(197,255,74,0.20)", color: "#C5FF4A" }}>
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="label-upper">API Key</Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <code className="flex-1 font-mono text-sm" style={{ color: "rgb(100,180,255)" }}>
                    {showApiKey ? mockApiKey : "\u2022".repeat(20) + "..."}
                  </code>
                  <button onClick={() => setShowApiKey(!showApiKey)} className="p-1 transition-colors" style={{ color: "rgba(255,255,255,0.40)" }}>
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <CopyBtn text={mockApiKey} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="label-upper">API Secret</Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.10)" }}>
                  <code className="flex-1 font-mono text-sm" style={{ color: "rgba(255,255,255,0.40)" }}>
                    {"\u2022".repeat(20)}...
                  </code>
                  <CopyBtn text={mockApiSecret} />
                </div>
              </div>
              <div className="p-3 rounded-md" style={{ backgroundColor: "rgba(255,200,50,0.04)", border: "1px solid rgba(255,200,50,0.15)" }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "rgb(255,200,50)" }} />
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>
                    <span className="font-medium" style={{ color: "rgb(255,200,50)" }}>Security Notice:</span> Never share your API secret. It provides full access to your account. Use environment variables to store credentials.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="katana-card">
            <div className="p-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-base font-semibold text-white">Usage & Rate Limits</span>
            </div>
            <div className="p-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg text-center" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="label-upper mb-1">Requests Today</div>
                  <div className="stat-value text-xl font-bold text-white">1,247</div>
                  <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>of 10,000</div>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="label-upper mb-1">Rate Limit</div>
                  <div className="stat-value text-xl font-bold text-white">100</div>
                  <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>req/min</div>
                </div>
                <div className="p-3 rounded-lg text-center" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="label-upper mb-1">Plan</div>
                  <div className="stat-value text-xl font-bold" style={{ color: "#C5FF4A" }}>Pro</div>
                  <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.50)" }}>unlimited factors</div>
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
            <h3 className="label-upper mb-3" style={{ color: "rgb(100,180,255)" }}>Centralized Exchanges (CEX)</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {exchangeList
                .filter((ex) => ex.type === "CEX")
                .map((ex) => (
                  <div
                    key={ex.id}
                    className="katana-card p-4 transition-all duration-200"
                    style={ex.status === "connected" ? { borderColor: "rgba(197,255,74,0.15)" } : {}}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-bold"
                          style={{
                            backgroundColor: ex.status === "connected" ? "rgba(197,255,74,0.10)" : "rgba(255,255,255,0.05)",
                            color: ex.status === "connected" ? "#C5FF4A" : "rgba(255,255,255,0.50)",
                            border: `1px solid ${ex.status === "connected" ? "rgba(197,255,74,0.20)" : "rgba(255,255,255,0.10)"}`,
                          }}
                        >
                          {ex.logo}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{ex.name}</div>
                          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>{ex.supportedPairs} pairs</div>
                        </div>
                      </div>
                      {ex.status === "connected" ? (
                        <div className="flex items-center gap-1">
                          <Wifi className="w-3 h-3" style={{ color: "#C5FF4A" }} />
                          <span className="text-[10px] font-mono" style={{ color: "#C5FF4A" }}>LIVE</span>
                        </div>
                      ) : (
                        <WifiOff className="w-3 h-3" style={{ color: "rgba(255,255,255,0.30)" }} />
                      )}
                    </div>
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: "rgba(255,255,255,0.50)" }}>{ex.description}</p>
                    <button
                      className="w-full h-7 text-xs rounded-md font-medium transition-all"
                      style={ex.status === "connected"
                        ? { border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.50)", backgroundColor: "transparent" }
                        : { backgroundColor: "#C5FF4A", color: "#0B0B0B" }
                      }
                      onClick={() => handleConnect(ex.id)}
                    >
                      {ex.status === "connected" ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h3 className="label-upper mb-3" style={{ color: "#C5FF4A" }}>Decentralized Exchanges (DEX)</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {exchangeList
                .filter((ex) => ex.type === "DEX")
                .map((ex) => (
                  <div
                    key={ex.id}
                    className="katana-card p-4 transition-all duration-200"
                    style={ex.status === "connected" ? { borderColor: "rgba(197,255,74,0.15)" } : {}}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-bold"
                          style={{
                            backgroundColor: ex.status === "connected" ? "rgba(197,255,74,0.10)" : "rgba(255,255,255,0.05)",
                            color: ex.status === "connected" ? "#C5FF4A" : "rgba(255,255,255,0.50)",
                            border: `1px solid ${ex.status === "connected" ? "rgba(197,255,74,0.20)" : "rgba(255,255,255,0.10)"}`,
                          }}
                        >
                          {ex.logo}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{ex.name}</div>
                          <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>{ex.supportedPairs} pairs</div>
                        </div>
                      </div>
                      {ex.status === "connected" ? (
                        <div className="flex items-center gap-1">
                          <Wifi className="w-3 h-3" style={{ color: "#C5FF4A" }} />
                          <span className="text-[10px] font-mono" style={{ color: "#C5FF4A" }}>LIVE</span>
                        </div>
                      ) : (
                        <WifiOff className="w-3 h-3" style={{ color: "rgba(255,255,255,0.30)" }} />
                      )}
                    </div>
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: "rgba(255,255,255,0.50)" }}>{ex.description}</p>
                    <button
                      className="w-full h-7 text-xs rounded-md font-medium transition-all"
                      style={ex.status === "connected"
                        ? { border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.50)", backgroundColor: "transparent" }
                        : { backgroundColor: "#C5FF4A", color: "#0B0B0B" }
                      }
                      onClick={() => handleConnect(ex.id)}
                    >
                      {ex.status === "connected" ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="katana-card">
          <div className="p-4 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" style={{ color: "rgb(100,180,255)" }} />
              <span className="text-base font-semibold text-white">Notification Preferences</span>
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
              <div key={i} className="flex items-center justify-between py-2 last:border-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>{item.desc}</div>
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

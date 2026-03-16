/*
 * Account — Katana Network Style
 * Profile, API Keys, Exchange Connections, Notifications
 * Deep navy bg, lime accent, monospace data, minimal borders
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
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
    <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-lime" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function Account() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [showApiKey, setShowApiKey] = useState(false);
  const [exchangeList, setExchangeList] = useState<Exchange[]>(exchanges);

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
      <div>
        <h1 className="text-2xl font-heading font-bold">Account</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your profile, API keys, and exchange connections</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-secondary/40 p-1 rounded-lg border border-border/50 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              className={`h-8 text-xs px-3 gap-1.5 ${activeTab !== tab.id ? "text-muted-foreground" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="katana-card lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <User className="w-4 h-4 text-info" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="label-upper">Username</Label>
                  <Input defaultValue="CryptoQuant_Pro" className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Display Name</Label>
                  <Input defaultValue="CryptoQuant Pro" className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Email</Label>
                  <Input defaultValue="quant@example.com" className="bg-input border-border" />
                </div>
                <div className="space-y-2">
                  <Label className="label-upper">Timezone</Label>
                  <Input defaultValue="UTC+8" className="bg-input border-border" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="label-upper">Bio</Label>
                <textarea
                  defaultValue="Quantitative researcher specializing in crypto alpha factor mining. Building systematic strategies using AI-powered tools."
                  className="w-full h-20 px-3 py-2 rounded-md bg-input border border-border text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-lime/50"
                />
              </div>
              <Button className="bg-lime text-background hover:bg-lime/90 font-medium" onClick={() => toast.success("Profile updated")}>
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card className="katana-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Shield className="w-4 h-4 text-info" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-sm font-medium">Two-Factor Auth</div>
                  <div className="text-xs text-muted-foreground">TOTP authenticator</div>
                </div>
                <Badge variant="outline" className="bg-positive/8 text-positive border-positive/20 text-[10px] font-mono">
                  ENABLED
                </Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <div className="text-sm font-medium">Password</div>
                  <div className="text-xs text-muted-foreground">Last changed 30 days ago</div>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs border-border text-muted-foreground hover:text-foreground">
                  Change
                </Button>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border">
                <div>
                  <div className="text-sm font-medium">Sessions</div>
                  <div className="text-xs text-muted-foreground">2 active sessions</div>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs border-border text-muted-foreground hover:text-foreground">
                  Manage
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === "api" && (
        <div className="space-y-6">
          <Card className="katana-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <Key className="w-4 h-4 text-lime" />
                  API Credentials
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1 border-lime/20 text-lime hover:bg-lime/8">
                  <RefreshCw className="w-3 h-3" />
                  Regenerate
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="label-upper">API Key</Label>
                <div className="flex items-center gap-2 bg-[#080c16] border border-border rounded-md px-3 py-2">
                  <code className="flex-1 font-mono text-sm text-info">
                    {showApiKey ? mockApiKey : "\u2022".repeat(20) + "..."}
                  </code>
                  <button onClick={() => setShowApiKey(!showApiKey)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                    {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <CopyBtn text={mockApiKey} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="label-upper">API Secret</Label>
                <div className="flex items-center gap-2 bg-[#080c16] border border-border rounded-md px-3 py-2">
                  <code className="flex-1 font-mono text-sm text-muted-foreground">
                    {"\u2022".repeat(20)}...
                  </code>
                  <CopyBtn text={mockApiSecret} />
                </div>
              </div>
              <div className="bg-warning/5 border border-warning/15 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <span className="text-warning font-medium">Security Notice:</span> Never share your API secret. It provides full access to your account. Use environment variables to store credentials.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="katana-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-heading">Usage & Rate Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                  <div className="label-upper mb-1">Requests Today</div>
                  <div className="stat-value text-xl font-bold text-foreground">1,247</div>
                  <div className="text-xs text-muted-foreground mt-1">of 10,000</div>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                  <div className="label-upper mb-1">Rate Limit</div>
                  <div className="stat-value text-xl font-bold text-foreground">100</div>
                  <div className="text-xs text-muted-foreground mt-1">req/min</div>
                </div>
                <div className="p-3 bg-secondary/30 rounded-lg border border-border/50 text-center">
                  <div className="label-upper mb-1">Plan</div>
                  <div className="stat-value text-xl font-bold text-lime">Pro</div>
                  <div className="text-xs text-muted-foreground mt-1">unlimited factors</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Exchanges Tab */}
      {activeTab === "exchanges" && (
        <div className="space-y-4">
          <div>
            <h3 className="label-upper mb-3 text-info">Centralized Exchanges (CEX)</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {exchangeList
                .filter((ex) => ex.type === "CEX")
                .map((ex) => (
                  <Card key={ex.id} className={`katana-card transition-all duration-200 ${ex.status === "connected" ? "border-lime/15" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-bold ${ex.status === "connected" ? "bg-lime/10 text-lime border border-lime/20" : "bg-secondary text-muted-foreground border border-border"}`}>
                            {ex.logo}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{ex.name}</div>
                            <div className="text-[10px] text-muted-foreground">{ex.supportedPairs} pairs</div>
                          </div>
                        </div>
                        {ex.status === "connected" ? (
                          <div className="flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-lime" />
                            <span className="text-[10px] font-mono text-lime">LIVE</span>
                          </div>
                        ) : (
                          <WifiOff className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{ex.description}</p>
                      <Button
                        variant={ex.status === "connected" ? "outline" : "default"}
                        size="sm"
                        className={`w-full h-7 text-xs ${ex.status === "connected" ? "border-border text-muted-foreground hover:text-negative hover:border-negative/30" : "bg-lime text-background hover:bg-lime/90"}`}
                        onClick={() => handleConnect(ex.id)}
                      >
                        {ex.status === "connected" ? "Disconnect" : "Connect"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          <div>
            <h3 className="label-upper mb-3 text-lime">Decentralized Exchanges (DEX)</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {exchangeList
                .filter((ex) => ex.type === "DEX")
                .map((ex) => (
                  <Card key={ex.id} className={`katana-card transition-all duration-200 ${ex.status === "connected" ? "border-lime/15" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-bold ${ex.status === "connected" ? "bg-lime/10 text-lime border border-lime/20" : "bg-secondary text-muted-foreground border border-border"}`}>
                            {ex.logo}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{ex.name}</div>
                            <div className="text-[10px] text-muted-foreground">{ex.supportedPairs} pairs</div>
                          </div>
                        </div>
                        {ex.status === "connected" ? (
                          <div className="flex items-center gap-1">
                            <Wifi className="w-3 h-3 text-lime" />
                            <span className="text-[10px] font-mono text-lime">LIVE</span>
                          </div>
                        ) : (
                          <WifiOff className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{ex.description}</p>
                      <Button
                        variant={ex.status === "connected" ? "outline" : "default"}
                        size="sm"
                        className={`w-full h-7 text-xs ${ex.status === "connected" ? "border-border text-muted-foreground hover:text-negative hover:border-negative/30" : "bg-lime text-background hover:bg-lime/90"}`}
                        onClick={() => handleConnect(ex.id)}
                      >
                        {ex.status === "connected" ? "Disconnect" : "Connect"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <Card className="katana-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <Bell className="w-4 h-4 text-info" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Factor Test Results", desc: "Get notified when IS/OS tests complete", defaultChecked: true },
              { label: "Epoch Rewards", desc: "Reward distribution notifications", defaultChecked: true },
              { label: "Trade Execution", desc: "Real-time trade execution alerts", defaultChecked: false },
              { label: "New Subscribers", desc: "When someone subscribes to your strategies", defaultChecked: true },
              { label: "System Maintenance", desc: "Platform maintenance and downtime alerts", defaultChecked: true },
              { label: "Weekly Digest", desc: "Weekly summary of your factor performance", defaultChecked: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/*
 * Account - User account management
 * Terminal Noir: profile info, API key management, settings
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";
import {
  User,
  Mail,
  Key,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  RefreshCw,
  Shield,
  Clock,
  AlertTriangle,
  Save,
  Camera,
} from "lucide-react";
import { motion } from "framer-motion";

// Mock user data
const mockUser = {
  nickname: "CryptoQuant_Pro",
  email: "quant_pro@example.com",
  avatar: "CQ",
  joinedAt: "2025-10-15",
  tier: "Pro",
  factorsCreated: 42,
  totalRewards: "12,500 USDT",
};

// Mock API keys
const initialApiKeys = [
  {
    id: "key-001",
    name: "Production Key",
    key: "af_sk_prod_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    createdAt: "2025-12-01",
    lastUsed: "2 min ago",
    status: "active" as const,
    permissions: ["read", "write", "submit"],
  },
  {
    id: "key-002",
    name: "Codex Agent Key",
    key: "af_sk_agent_x9y8z7w6v5u4t3s2r1q0p9o8n7m6l5k4",
    createdAt: "2026-01-15",
    lastUsed: "5 min ago",
    status: "active" as const,
    permissions: ["read", "write", "submit"],
  },
  {
    id: "key-003",
    name: "Read-Only Analytics",
    key: "af_sk_read_j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6",
    createdAt: "2026-02-20",
    lastUsed: "3 days ago",
    status: "active" as const,
    permissions: ["read"],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded hover:bg-secondary/50">
      {copied ? <Check className="w-3.5 h-3.5 text-neon-green" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function MaskedKey({ apiKey }: { apiKey: string }) {
  const [visible, setVisible] = useState(false);
  const masked = apiKey.slice(0, 12) + "••••••••••••••••" + apiKey.slice(-4);
  return (
    <div className="flex items-center gap-1.5">
      <code className="font-mono text-xs text-neon-cyan bg-secondary/30 px-2 py-1 rounded">
        {visible ? apiKey : masked}
      </code>
      <button
        onClick={() => setVisible(!visible)}
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary/50"
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <CopyButton text={apiKey} />
    </div>
  );
}

export default function Account() {
  const [nickname, setNickname] = useState(mockUser.nickname);
  const [email, setEmail] = useState(mockUser.email);
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);

  const handleSaveProfile = () => {
    toast.success("Profile updated successfully");
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    const newKey = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      key: `af_sk_new_${Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")}`,
      createdAt: new Date().toISOString().split("T")[0],
      lastUsed: "Never",
      status: "active" as const,
      permissions: ["read", "write", "submit"],
    };
    setApiKeys([newKey, ...apiKeys]);
    setNewKeyName("");
    setShowNewKeyForm(false);
    toast.success("API key created successfully. Copy it now — it won't be shown again.");
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(apiKeys.filter((k) => k.id !== id));
    toast.success("API key revoked");
  };

  const handleRegenerateKey = (id: string) => {
    setApiKeys(
      apiKeys.map((k) =>
        k.id === id
          ? {
              ...k,
              key: `af_sk_regen_${Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")}`,
              lastUsed: "Just now",
            }
          : k
      )
    );
    toast.success("API key regenerated. Copy the new key — the old one is now invalid.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold">Account Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile, API keys, and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <User className="w-3.5 h-3.5 mr-1.5" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="api" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Key className="w-3.5 h-3.5 mr-1.5" />
            API Keys
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <Card className="terminal-card lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <User className="w-4 h-4 text-neon-cyan" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-2xl font-heading font-bold text-primary">
                      {mockUser.avatar}
                    </div>
                    <button className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{mockUser.nickname}</p>
                    <p className="text-xs text-muted-foreground">{mockUser.email}</p>
                    <Badge variant="outline" className="mt-1 bg-neon-amber/10 text-neon-amber border-neon-amber/20 text-[10px] font-mono">
                      {mockUser.tier} TIER
                    </Badge>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nickname" className="text-xs text-muted-foreground uppercase tracking-wider">
                      Nickname
                    </Label>
                    <Input
                      id="nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="bg-input border-border font-mono"
                      placeholder="Your display name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">
                      Email
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="bg-input border-border font-mono flex-1"
                        placeholder="your@email.com"
                      />
                      <Badge variant="outline" className="bg-neon-green/10 text-neon-green border-neon-green/20 text-[10px] font-mono self-center">
                        VERIFIED
                      </Badge>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveProfile} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>

            {/* Stats Card */}
            <Card className="terminal-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <Shield className="w-4 h-4 text-neon-green" />
                  Account Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Member Since</span>
                    <span className="text-sm font-mono">{mockUser.joinedAt}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Account Tier</span>
                    <Badge variant="outline" className="bg-neon-amber/10 text-neon-amber border-neon-amber/20 text-[10px] font-mono">
                      {mockUser.tier}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Factors Created</span>
                    <span className="text-sm font-mono text-neon-cyan">{mockUser.factorsCreated}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border/50">
                    <span className="text-xs text-muted-foreground">Total Rewards</span>
                    <span className="text-sm font-mono text-neon-green">{mockUser.totalRewards}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-muted-foreground">API Keys</span>
                    <span className="text-sm font-mono">{apiKeys.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-6">
          {/* Warning Banner */}
          <div className="bg-neon-amber/5 border border-neon-amber/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-neon-amber shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-neon-amber">Keep your API keys secure</p>
              <p className="text-xs text-muted-foreground mt-1">
                API keys grant access to your AlphaForge account. Never share them publicly or commit them to version control.
                Use environment variables or secret managers to store them safely.
              </p>
            </div>
          </div>

          {/* Create New Key */}
          <Card className="terminal-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <Key className="w-4 h-4 text-neon-cyan" />
                  API Keys
                  <Badge variant="outline" className="ml-2 text-[10px] font-mono border-border">
                    {apiKeys.length} keys
                  </Badge>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-neon-green/30 text-neon-green hover:bg-neon-green/10 text-xs"
                  onClick={() => setShowNewKeyForm(!showNewKeyForm)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New Key
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* New Key Form */}
              {showNewKeyForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="bg-secondary/30 border border-border rounded-lg p-4 space-y-3"
                >
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Key Name</Label>
                    <Input
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="bg-input border-border font-mono"
                      placeholder="e.g., Claude Code Agent, Production Key"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateKey} className="text-xs">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Create Key
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs border-border"
                      onClick={() => { setShowNewKeyForm(false); setNewKeyName(""); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Key List */}
              <div className="space-y-3">
                {apiKeys.map((apiKey, i) => (
                  <motion.div
                    key={apiKey.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border border-border rounded-lg p-4 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{apiKey.name}</span>
                          <Badge variant="outline" className="bg-neon-green/10 text-neon-green border-neon-green/20 text-[10px] font-mono">
                            ACTIVE
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Created {apiKey.createdAt}
                          </span>
                          <span>Last used: {apiKey.lastUsed}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-neon-amber"
                          onClick={() => handleRegenerateKey(apiKey.id)}
                          title="Regenerate key"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-neon-red"
                          onClick={() => handleRevokeKey(apiKey.id)}
                          title="Revoke key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Key value */}
                    <MaskedKey apiKey={apiKey.key} />

                    {/* Permissions */}
                    <div className="flex items-center gap-1.5 mt-3">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider mr-1">Permissions:</span>
                      {apiKey.permissions.map((perm) => (
                        <Badge
                          key={perm}
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            perm === "submit"
                              ? "border-neon-amber/30 text-neon-amber"
                              : perm === "write"
                              ? "border-neon-cyan/30 text-neon-cyan"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {perm.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Usage Example */}
              <div className="mt-4 bg-[#0a0f14] border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-secondary/20">
                  <div className="w-2.5 h-2.5 rounded-full bg-neon-red/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neon-amber/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-neon-green/60" />
                  <span className="text-xs text-muted-foreground font-mono ml-2">Usage Example</span>
                </div>
                <div className="p-3 space-y-1">
                  <code className="font-mono text-xs leading-relaxed block">
                    <span className="text-muted-foreground"># Set your API key as environment variable</span>
                  </code>
                  <code className="font-mono text-xs leading-relaxed block">
                    <span className="text-neon-green">export </span>
                    <span className="text-foreground">ALPHAFORGE_API_KEY</span>
                    <span className="text-muted-foreground">=</span>
                    <span className="text-neon-amber">"af_sk_prod_..."</span>
                  </code>
                  <code className="font-mono text-xs leading-relaxed block mt-2">
                    <span className="text-muted-foreground"># Use in your AI agent configuration</span>
                  </code>
                  <code className="font-mono text-xs leading-relaxed block">
                    <span className="text-neon-green">npx </span>
                    <span className="text-neon-cyan">alphaforge-skill</span>
                    <span className="text-foreground"> configure --key $ALPHAFORGE_API_KEY</span>
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

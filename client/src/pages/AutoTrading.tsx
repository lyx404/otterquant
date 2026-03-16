/*
 * AutoTrading - Exchange connection & strategy deployment
 * Terminal Noir: exchange cards, connection status, running strategies
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  Bot,
  Link2,
  Unlink,
  Shield,
  Activity,
  Settings,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  ArrowUpRight,
  Play,
  Pause,
  BarChart3,
} from "lucide-react";
import { exchanges, strategies, type Exchange } from "@/lib/mockData";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TRADING_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/YmxnXmKxyGfXhEgxEBqPXF/trading-visual-QFJrfiVQJMxppr4nrZLCSb.webp";

// Simulated running strategies
const runningStrategies = [
  { id: "RS-001", strategyName: "Cross-Exchange Arb Pro", exchange: "Binance", status: "running", pnl: "+$1,245.80", trades: 47, uptime: "3d 14h" },
  { id: "RS-002", strategyName: "Stable Yield Optimizer", exchange: "Binance", status: "running", pnl: "+$382.15", trades: 12, uptime: "7d 2h" },
  { id: "RS-003", strategyName: "BTC Alpha Composite", exchange: "Binance", status: "paused", pnl: "+$89.50", trades: 5, uptime: "1d 8h" },
];

export default function AutoTrading() {
  const [tab, setTab] = useState("exchanges");
  const [connectDialog, setConnectDialog] = useState<Exchange | null>(null);
  const [exchangeStates, setExchangeStates] = useState<Record<string, string>>(
    Object.fromEntries(exchanges.map((e) => [e.id, e.status]))
  );

  const handleConnect = (exchange: Exchange) => {
    setConnectDialog(exchange);
  };

  const handleConfirmConnect = () => {
    if (connectDialog) {
      setExchangeStates((prev) => ({ ...prev, [connectDialog.id]: "connected" }));
      toast.success(`Connected to ${connectDialog.name}`);
      setConnectDialog(null);
    }
  };

  const handleDisconnect = (id: string) => {
    setExchangeStates((prev) => ({ ...prev, [id]: "disconnected" }));
    toast.info("Exchange disconnected");
  };

  const cexExchanges = exchanges.filter((e) => e.type === "CEX");
  const dexExchanges = exchanges.filter((e) => e.type === "DEX");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-6">
        <div className="hidden lg:block w-24 h-16 rounded-lg overflow-hidden shrink-0 border border-border">
          <img src={TRADING_IMG} alt="Trading" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-neon-cyan" />
            Auto Trading
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect exchanges and deploy strategies for automated trading
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary/50 border border-border">
          <TabsTrigger value="exchanges" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
            <Link2 className="w-3 h-3" />
            Exchanges
          </TabsTrigger>
          <TabsTrigger value="running" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1">
            <Activity className="w-3 h-3" />
            Running Strategies
          </TabsTrigger>
        </TabsList>

        {/* Exchanges Tab */}
        <TabsContent value="exchanges" className="space-y-6">
          {/* CEX Section */}
          <div>
            <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Centralized Exchanges (CEX)
            </h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cexExchanges.map((ex, i) => {
                const status = exchangeStates[ex.id];
                return (
                  <motion.div
                    key={ex.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className={`terminal-card transition-all duration-300 ${status === "connected" ? "border-neon-green/30" : "hover:border-border"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-mono font-bold ${status === "connected" ? "bg-neon-green/10 text-neon-green" : "bg-secondary text-muted-foreground"}`}>
                              {ex.logo}
                            </div>
                            <div>
                              <div className="font-heading font-semibold text-sm">{ex.name}</div>
                              <div className="text-xs text-muted-foreground">{ex.supportedPairs} pairs</div>
                            </div>
                          </div>
                          {status === "connected" ? (
                            <Badge variant="outline" className="bg-neon-green/10 text-neon-green border-neon-green/20 gap-1">
                              <Wifi className="w-3 h-3" />
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground border-border gap-1">
                              <WifiOff className="w-3 h-3" />
                              Offline
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{ex.description}</p>
                        {status === "connected" ? (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-border" onClick={() => handleDisconnect(ex.id)}>
                              <Unlink className="w-3 h-3 mr-1" />
                              Disconnect
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs border-border">
                              <Settings className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" className="w-full h-8 text-xs bg-primary text-primary-foreground" onClick={() => handleConnect(ex)}>
                            <Link2 className="w-3 h-3 mr-1" />
                            Connect
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* DEX Section */}
          <div>
            <h2 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Decentralized Exchanges (DEX)
            </h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {dexExchanges.map((ex, i) => {
                const status = exchangeStates[ex.id];
                return (
                  <motion.div
                    key={ex.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card className={`terminal-card transition-all duration-300 ${status === "connected" ? "border-neon-green/30" : "hover:border-border"}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-mono font-bold ${status === "connected" ? "bg-neon-green/10 text-neon-green" : "bg-secondary text-muted-foreground"}`}>
                              {ex.logo}
                            </div>
                            <div>
                              <div className="font-heading font-semibold text-sm">{ex.name}</div>
                              <div className="text-xs text-muted-foreground">{ex.supportedPairs} pairs</div>
                            </div>
                          </div>
                          {status === "connected" ? (
                            <Badge variant="outline" className="bg-neon-green/10 text-neon-green border-neon-green/20 gap-1">
                              <Wifi className="w-3 h-3" />
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground border-border gap-1">
                              <WifiOff className="w-3 h-3" />
                              Offline
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{ex.description}</p>
                        {status === "connected" ? (
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-border" onClick={() => handleDisconnect(ex.id)}>
                              <Unlink className="w-3 h-3 mr-1" />
                              Disconnect
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs border-border">
                              <Settings className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" className="w-full h-8 text-xs bg-primary text-primary-foreground" onClick={() => handleConnect(ex)}>
                            <Link2 className="w-3 h-3 mr-1" />
                            Connect Wallet
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Running Strategies Tab */}
        <TabsContent value="running">
          <div className="space-y-4">
            {runningStrategies.map((rs, i) => (
              <motion.div
                key={rs.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`terminal-card ${rs.status === "running" ? "border-neon-green/20" : "border-neon-amber/20"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rs.status === "running" ? "bg-neon-green/10" : "bg-neon-amber/10"}`}>
                          {rs.status === "running" ? (
                            <Activity className="w-5 h-5 text-neon-green animate-pulse" />
                          ) : (
                            <Pause className="w-5 h-5 text-neon-amber" />
                          )}
                        </div>
                        <div>
                          <div className="font-heading font-semibold text-sm">{rs.strategyName}</div>
                          <div className="text-xs text-muted-foreground">{rs.exchange} · {rs.id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">PnL</div>
                          <div className="font-mono text-sm font-bold text-neon-green">{rs.pnl}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Trades</div>
                          <div className="font-mono text-sm">{rs.trades}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Uptime</div>
                          <div className="font-mono text-sm">{rs.uptime}</div>
                        </div>
                        <div className="flex gap-2">
                          {rs.status === "running" ? (
                            <Button variant="outline" size="sm" className="h-8 text-xs border-neon-amber/30 text-neon-amber" onClick={() => toast.info("Feature coming soon")}>
                              <Pause className="w-3 h-3 mr-1" />
                              Pause
                            </Button>
                          ) : (
                            <Button size="sm" className="h-8 text-xs bg-neon-green/20 text-neon-green" onClick={() => toast.info("Feature coming soon")}>
                              <Play className="w-3 h-3 mr-1" />
                              Resume
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-8 text-xs border-border" onClick={() => toast.info("Feature coming soon")}>
                            <BarChart3 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Connect Dialog */}
      <Dialog open={!!connectDialog} onOpenChange={() => setConnectDialog(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading">Connect to {connectDialog?.name}</DialogTitle>
            <DialogDescription>
              {connectDialog?.type === "CEX"
                ? "Enter your API Key and Secret to connect. We only require read and trade permissions."
                : "Connect your wallet to interact with this DEX."}
            </DialogDescription>
          </DialogHeader>
          {connectDialog?.type === "CEX" ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">API Key</Label>
                <Input placeholder="Enter your API key" className="mt-1 bg-secondary border-border font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">API Secret</Label>
                <Input type="password" placeholder="Enter your API secret" className="mt-1 bg-secondary border-border font-mono text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Passphrase (optional)</Label>
                <Input type="password" placeholder="If required by the exchange" className="mt-1 bg-secondary border-border font-mono text-sm" />
              </div>
              <div className="flex items-start gap-2 p-3 rounded-md bg-neon-amber/5 border border-neon-amber/20">
                <AlertCircle className="w-4 h-4 text-neon-amber shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Only grant <span className="text-neon-amber">read</span> and <span className="text-neon-amber">trade</span> permissions. Never enable withdrawal access.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center py-8">
                <Button size="lg" className="gap-2 bg-primary text-primary-foreground">
                  <Link2 className="w-4 h-4" />
                  Connect Wallet
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Supports MetaMask, WalletConnect, Phantom, and other major wallets.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)} className="border-border">
              Cancel
            </Button>
            {connectDialog?.type === "CEX" && (
              <Button onClick={handleConfirmConnect} className="bg-primary text-primary-foreground">
                <CheckCircle className="w-4 h-4 mr-1" />
                Connect
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

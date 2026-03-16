/*
 * Subscription - Plan management & payment
 * Terminal Noir: pricing card, account list, payment history
 * 5 CNY/month/account
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  CheckCircle,
  Zap,
  Shield,
  Bot,
  Clock,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const features = [
  { text: "Automated strategy execution", icon: Bot },
  { text: "Real-time PnL monitoring", icon: Zap },
  { text: "Multi-exchange support (CEX & DEX)", icon: Shield },
  { text: "Strategy file downloads", icon: ArrowUpRight },
  { text: "Priority factor testing queue", icon: Clock },
];

const connectedAccounts = [
  { id: "ACC-001", exchange: "Binance", label: "Main Trading", status: "active", since: "2026-01-15", nextBilling: "2026-04-15" },
  { id: "ACC-002", exchange: "Binance", label: "Arb Account", status: "active", since: "2026-02-01", nextBilling: "2026-04-01" },
  { id: "ACC-003", exchange: "OKX", label: "DeFi Bridge", status: "expired", since: "2025-12-10", nextBilling: "-" },
];

const paymentHistory = [
  { id: "PAY-001", date: "2026-03-15", amount: "¥10.00", accounts: 2, status: "paid", method: "WeChat Pay" },
  { id: "PAY-002", date: "2026-02-15", amount: "¥10.00", accounts: 2, status: "paid", method: "WeChat Pay" },
  { id: "PAY-003", date: "2026-01-15", amount: "¥5.00", accounts: 1, status: "paid", method: "Alipay" },
  { id: "PAY-004", date: "2025-12-15", amount: "¥5.00", accounts: 1, status: "paid", method: "USDT" },
];

export default function Subscription() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-neon-cyan" />
          Subscription
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your automated trading subscription
        </p>
      </div>

      {/* Pricing Card */}
      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-1"
        >
          <Card className="terminal-card border-primary/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full" />
            <CardContent className="p-6">
              <div className="mb-4">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mb-3">
                  Auto Trading Plan
                </Badge>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-mono font-bold text-primary glow-green">¥5</span>
                  <span className="text-muted-foreground text-sm">/ month / account</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {features.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-neon-green shrink-0" />
                      <span className="text-sm text-muted-foreground">{f.text}</span>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Button className="w-full bg-primary text-primary-foreground" onClick={() => toast.info("Feature coming soon — payment integration pending")}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Account
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  Supports WeChat Pay, Alipay, USDT
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Current Accounts */}
        <div className="lg:col-span-2">
          <Card className="terminal-card h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-heading flex items-center gap-2">
                  <Shield className="w-4 h-4 text-neon-cyan" />
                  Connected Accounts
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Active:</span>
                  <span className="font-mono text-sm text-neon-green font-bold">
                    {connectedAccounts.filter((a) => a.status === "active").length}
                  </span>
                  <span className="text-xs text-muted-foreground">/ {connectedAccounts.length}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {connectedAccounts.map((acc, i) => (
                  <motion.div
                    key={acc.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      acc.status === "active" ? "border-neon-green/20 bg-neon-green/[0.02]" : "border-border bg-secondary/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-mono font-bold ${
                        acc.status === "active" ? "bg-neon-green/10 text-neon-green" : "bg-secondary text-muted-foreground"
                      }`}>
                        {acc.exchange.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{acc.label}</div>
                        <div className="text-xs text-muted-foreground">{acc.exchange} · {acc.id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Next billing</div>
                        <div className="text-xs font-mono">{acc.nextBilling}</div>
                      </div>
                      <Badge variant="outline" className={
                        acc.status === "active"
                          ? "bg-neon-green/10 text-neon-green border-neon-green/20"
                          : "bg-neon-red/10 text-neon-red border-neon-red/20"
                      }>
                        {acc.status}
                      </Badge>
                      {acc.status === "expired" && (
                        <Button size="sm" className="h-7 text-xs bg-primary text-primary-foreground" onClick={() => toast.info("Feature coming soon")}>
                          Renew
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">Monthly Total</div>
                    <div className="text-lg font-mono font-bold text-foreground">
                      ¥{connectedAccounts.filter((a) => a.status === "active").length * 5}.00
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Active Accounts</div>
                    <div className="text-lg font-mono font-bold text-neon-green">
                      {connectedAccounts.filter((a) => a.status === "active").length}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment History */}
      <Card className="terminal-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <Clock className="w-4 h-4 text-neon-cyan" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">ID</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Accounts</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Method</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentHistory.map((p) => (
                <TableRow key={p.id} className="border-border hover:bg-secondary/20">
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.id}</TableCell>
                  <TableCell className="font-mono text-sm">{p.date}</TableCell>
                  <TableCell className="font-mono text-sm font-medium">{p.amount}</TableCell>
                  <TableCell className="font-mono text-sm">{p.accounts}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.method}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-neon-green/10 text-neon-green border-neon-green/20 text-xs">
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

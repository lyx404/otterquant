/*
 * Submissions - Factor submission pipeline status management
 * Terminal Noir: pipeline progress visualization, status tracking,
 * fail reasons, epoch qualification status
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from "wouter";
import { useState } from "react";
import {
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trophy,
  Zap,
  BarChart3,
  FlaskConical,
} from "lucide-react";
import {
  submissions,
  submissionPipeline,
  submissionStats,
  type Submission,
} from "@/lib/mockData";
import { motion } from "framer-motion";

export default function Submissions() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const filteredSubs = activeTab === "all"
    ? submissions
    : activeTab === "in_progress"
    ? submissions.filter((s) => ["queued", "backtesting", "is_testing", "os_testing"].includes(s.status))
    : activeTab === "passed"
    ? submissions.filter((s) => s.status === "passed")
    : submissions.filter((s) => s.status === "failed" || s.status === "rejected");

  const statusIcon = (status: Submission["status"]) => {
    switch (status) {
      case "passed": return <CheckCircle className="w-4 h-4 text-neon-green" />;
      case "failed": return <XCircle className="w-4 h-4 text-neon-red" />;
      case "rejected": return <AlertTriangle className="w-4 h-4 text-neon-red" />;
      case "queued": return <Clock className="w-4 h-4 text-muted-foreground" />;
      default: return <Loader2 className="w-4 h-4 text-neon-cyan animate-spin" />;
    }
  };

  const statusLabel = (status: Submission["status"]) => {
    const map: Record<string, { label: string; className: string }> = {
      queued: { label: "QUEUED", className: "bg-muted text-muted-foreground border-border" },
      backtesting: { label: "BACKTESTING", className: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30" },
      is_testing: { label: "IS TESTING", className: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30" },
      os_testing: { label: "OS TESTING", className: "bg-neon-purple/15 text-neon-purple border-neon-purple/30" },
      passed: { label: "PASSED", className: "bg-neon-green/15 text-neon-green border-neon-green/30" },
      failed: { label: "FAILED", className: "bg-neon-red/15 text-neon-red border-neon-red/30" },
      rejected: { label: "REJECTED", className: "bg-neon-red/15 text-neon-red border-neon-red/30" },
    };
    const s = map[status] || map.queued;
    return <Badge variant="outline" className={`${s.className} font-mono text-[10px]`}>{s.label}</Badge>;
  };

  const pipelineStepStatus = (sub: Submission, stepIndex: number) => {
    if (sub.status === "rejected" && stepIndex >= sub.currentStep) return "rejected";
    if (stepIndex < sub.currentStep) return "completed";
    if (stepIndex === sub.currentStep && !["passed", "failed", "rejected"].includes(sub.status)) return "active";
    if (stepIndex === sub.currentStep && sub.status === "passed") return "completed";
    if (stepIndex === sub.currentStep && sub.status === "failed") return "failed";
    return "pending";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Submission Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track factor submissions from queue to qualification
          </p>
        </div>
        <Link href="/alphas">
          <Button variant="outline" size="sm" className="border-border text-sm">
            <FlaskConical className="w-4 h-4 mr-1.5" />
            Back to Alphas
          </Button>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="terminal-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-2">
              <BarChart3 className="w-3.5 h-3.5" /> Total
            </div>
            <div className="font-mono text-2xl font-bold">{submissionStats.total}</div>
            <div className="text-xs text-muted-foreground mt-1">submissions</div>
          </CardContent>
        </Card>
        <Card className="terminal-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-neon-green uppercase tracking-wider mb-2">
              <CheckCircle className="w-3.5 h-3.5" /> Passed
            </div>
            <div className="font-mono text-2xl font-bold text-neon-green">{submissionStats.passed}</div>
            <div className="text-xs text-muted-foreground mt-1">pass rate: {submissionStats.passRate}</div>
          </CardContent>
        </Card>
        <Card className="terminal-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-neon-cyan uppercase tracking-wider mb-2">
              <Loader2 className="w-3.5 h-3.5" /> In Progress
            </div>
            <div className="font-mono text-2xl font-bold text-neon-cyan">{submissionStats.inProgress}</div>
            <div className="text-xs text-muted-foreground mt-1">avg time: {submissionStats.avgProcessingTime}</div>
          </CardContent>
        </Card>
        <Card className="terminal-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-neon-red uppercase tracking-wider mb-2">
              <XCircle className="w-3.5 h-3.5" /> Failed
            </div>
            <div className="font-mono text-2xl font-bold text-neon-red">{submissionStats.failed + 1}</div>
            <div className="text-xs text-muted-foreground mt-1">{submissionStats.rejected} rejected</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="all" className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            All ({submissions.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan">
            In Progress ({submissions.filter((s) => ["queued", "backtesting", "is_testing", "os_testing"].includes(s.status)).length})
          </TabsTrigger>
          <TabsTrigger value="passed" className="text-xs data-[state=active]:bg-neon-green/20 data-[state=active]:text-neon-green">
            Passed ({submissions.filter((s) => s.status === "passed").length})
          </TabsTrigger>
          <TabsTrigger value="failed" className="text-xs data-[state=active]:bg-neon-red/20 data-[state=active]:text-neon-red">
            Failed ({submissions.filter((s) => s.status === "failed" || s.status === "rejected").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 space-y-3">
          {filteredSubs.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Collapsible
                open={expandedId === sub.id}
                onOpenChange={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
              >
                <Card className="terminal-card overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="py-3 px-4 cursor-pointer hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {statusIcon(sub.status)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{sub.id}</span>
                              <span className="font-medium text-sm">{sub.factorName}</span>
                              <Badge variant="outline" className={`text-[10px] font-mono ${sub.market === "CEX" ? "border-neon-cyan/30 text-neon-cyan" : "border-neon-purple/30 text-neon-purple"}`}>
                                {sub.market}
                              </Badge>
                              {statusLabel(sub.status)}
                              {sub.epochQualified && (
                                <Badge variant="outline" className="bg-neon-amber/10 text-neon-amber border-neon-amber/30 text-[10px] font-mono">
                                  <Trophy className="w-2.5 h-2.5 mr-0.5" /> EPOCH QUALIFIED
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Submitted {sub.submittedAt}
                              {sub.estimatedTime && (
                                <span className="ml-2 text-neon-cyan">ETA: {sub.estimatedTime}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Quick stats */}
                          {sub.osSharpe !== undefined && (
                            <div className="hidden md:flex items-center gap-4 text-xs">
                              <div>
                                <span className="text-muted-foreground">OS Sharpe </span>
                                <span className={`font-mono ${sub.osSharpe >= 1 ? "text-neon-green" : sub.osSharpe >= 0.5 ? "text-neon-amber" : "text-neon-red"}`}>
                                  {sub.osSharpe.toFixed(2)}
                                </span>
                              </div>
                              {sub.fitness !== undefined && (
                                <div>
                                  <span className="text-muted-foreground">Fitness </span>
                                  <span className="font-mono">{sub.fitness.toFixed(2)}</span>
                                </div>
                              )}
                              {sub.returns && (
                                <div>
                                  <span className="text-muted-foreground">Returns </span>
                                  <span className="font-mono">{sub.returns}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Progress */}
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress
                              value={sub.progress}
                              className="h-1.5 bg-secondary"
                            />
                            <span className="font-mono text-[10px] text-muted-foreground w-8 text-right">{sub.progress}%</span>
                          </div>
                          {expandedId === sub.id ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4 space-y-4">
                      {/* Expression */}
                      <div className="bg-terminal-bg border border-terminal-border rounded-md p-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Expression</div>
                        <code className="font-mono text-xs text-neon-cyan">{sub.expression}</code>
                      </div>

                      {/* Pipeline steps */}
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Pipeline Progress</div>
                        <div className="flex items-center gap-0">
                          {submissionPipeline.map((step, idx) => {
                            const stepStatus = pipelineStepStatus(sub, idx);
                            return (
                              <div key={step.step} className="flex items-center flex-1">
                                <div className="flex flex-col items-center flex-1">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono border-2 ${
                                    stepStatus === "completed" ? "bg-neon-green/20 border-neon-green text-neon-green" :
                                    stepStatus === "active" ? "bg-neon-cyan/20 border-neon-cyan text-neon-cyan animate-pulse" :
                                    stepStatus === "failed" ? "bg-neon-red/20 border-neon-red text-neon-red" :
                                    stepStatus === "rejected" ? "bg-neon-red/20 border-neon-red text-neon-red" :
                                    "bg-secondary border-border text-muted-foreground"
                                  }`}>
                                    {stepStatus === "completed" ? <CheckCircle className="w-3.5 h-3.5" /> :
                                     stepStatus === "active" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                                     stepStatus === "failed" || stepStatus === "rejected" ? <XCircle className="w-3.5 h-3.5" /> :
                                     idx}
                                  </div>
                                  <span className={`text-[9px] mt-1 text-center leading-tight ${
                                    stepStatus === "completed" ? "text-neon-green" :
                                    stepStatus === "active" ? "text-neon-cyan" :
                                    stepStatus === "failed" || stepStatus === "rejected" ? "text-neon-red" :
                                    "text-muted-foreground"
                                  }`}>
                                    {step.label}
                                  </span>
                                </div>
                                {idx < submissionPipeline.length - 1 && (
                                  <div className={`h-0.5 flex-1 -mx-1 mt-[-14px] ${
                                    stepStatus === "completed" ? "bg-neon-green/50" :
                                    "bg-border"
                                  }`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Results grid (if available) */}
                      {(sub.isSharpe !== undefined || sub.osSharpe !== undefined) && (
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Results</div>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                            {sub.isSharpe !== undefined && (
                              <div className="bg-secondary/30 rounded-md p-2.5">
                                <div className="text-[10px] text-muted-foreground">IS Sharpe</div>
                                <div className="font-mono text-sm mt-0.5">{sub.isSharpe.toFixed(2)}</div>
                              </div>
                            )}
                            {sub.osSharpe !== undefined && (
                              <div className="bg-secondary/30 rounded-md p-2.5">
                                <div className="text-[10px] text-muted-foreground">OS Sharpe</div>
                                <div className={`font-mono text-sm mt-0.5 ${sub.osSharpe >= 1 ? "text-neon-green" : sub.osSharpe >= 0.5 ? "text-neon-amber" : "text-neon-red"}`}>
                                  {sub.osSharpe.toFixed(2)}
                                </div>
                              </div>
                            )}
                            {sub.fitness !== undefined && (
                              <div className="bg-secondary/30 rounded-md p-2.5">
                                <div className="text-[10px] text-muted-foreground">Fitness</div>
                                <div className="font-mono text-sm mt-0.5">{sub.fitness.toFixed(2)}</div>
                              </div>
                            )}
                            {sub.returns && (
                              <div className="bg-secondary/30 rounded-md p-2.5">
                                <div className="text-[10px] text-muted-foreground">Returns</div>
                                <div className="font-mono text-sm mt-0.5">{sub.returns}</div>
                              </div>
                            )}
                            {sub.turnover && (
                              <div className="bg-secondary/30 rounded-md p-2.5">
                                <div className="text-[10px] text-muted-foreground">Turnover</div>
                                <div className="font-mono text-sm mt-0.5">{sub.turnover}</div>
                              </div>
                            )}
                            {sub.drawdown && (
                              <div className="bg-secondary/30 rounded-md p-2.5">
                                <div className="text-[10px] text-muted-foreground">Drawdown</div>
                                <div className="font-mono text-sm mt-0.5 text-neon-red">{sub.drawdown}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Test results */}
                      {sub.testsPassed !== undefined && (
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-neon-green" />
                            <span className="text-neon-green font-mono">{sub.testsPassed} PASS</span>
                          </div>
                          {sub.testsFailed !== undefined && sub.testsFailed > 0 && (
                            <div className="flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-neon-red" />
                              <span className="text-neon-red font-mono">{sub.testsFailed} FAIL</span>
                            </div>
                          )}
                          {sub.testsPending !== undefined && sub.testsPending > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground font-mono">{sub.testsPending} PENDING</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Fail reasons */}
                      {sub.failReasons && sub.failReasons.length > 0 && (
                        <div className="bg-neon-red/5 border border-neon-red/20 rounded-md p-3">
                          <div className="text-[10px] uppercase tracking-wider text-neon-red mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Failure Reasons
                          </div>
                          <ul className="space-y-1">
                            {sub.failReasons.map((reason, idx) => (
                              <li key={idx} className="text-xs text-neon-red/80 flex items-start gap-1.5">
                                <span className="text-neon-red mt-0.5">•</span>
                                {reason}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <Link href={`/alphas/${sub.factorId}`}>
                          <Button variant="outline" size="sm" className="border-border text-xs">
                            <ArrowUpRight className="w-3.5 h-3.5 mr-1" />
                            View Alpha Detail
                          </Button>
                        </Link>
                        {sub.status === "failed" && (
                          <Button variant="outline" size="sm" className="border-neon-amber/30 text-neon-amber text-xs hover:bg-neon-amber/10">
                            <Zap className="w-3.5 h-3.5 mr-1" />
                            Resubmit
                          </Button>
                        )}
                        {sub.epochQualified && (
                          <Link href="/leaderboard">
                            <Button variant="outline" size="sm" className="border-neon-amber/30 text-neon-amber text-xs hover:bg-neon-amber/10">
                              <Trophy className="w-3.5 h-3.5 mr-1" />
                              View in Leaderboard
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

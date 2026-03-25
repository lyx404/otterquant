/*
 * NotificationPanel — Dropdown notification panel for AppLayout navbar
 * Shows two types: "alpha_test_result" and "epoch_reward"
 * Click alpha_test_result → navigate to /alphas with factorId
 * Click epoch_reward → navigate to /leaderboard with epochId
 */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  Trophy,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { notifications, type Notification } from "@/lib/mockData";

type FilterType = "all" | "alpha_test_result" | "epoch_reward";

export default function NotificationPanel() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [readIds, setReadIds] = useState<Set<number>>(() => {
    const stored = localStorage.getItem("otter_read_notifications");
    return stored ? new Set(JSON.parse(stored)) : new Set(notifications.filter(n => n.read).map(n => n.id));
  });
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const filtered = notifications.filter(n => {
    if (filter === "all") return true;
    return n.type === filter;
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    localStorage.setItem("otter_read_notifications", JSON.stringify(Array.from(allIds)));
  };

  const handleClick = (n: Notification) => {
    // Mark as read
    const newRead = new Set(readIds);
    newRead.add(n.id);
    setReadIds(newRead);
    localStorage.setItem("otter_read_notifications", JSON.stringify(Array.from(newRead)));

    setOpen(false);

    if (n.type === "alpha_test_result" && n.factorId) {
      navigate(`/alphas?highlight=${n.factorId}`);
    } else if (n.type === "epoch_reward" && n.epochId) {
      navigate(`/leaderboard?epoch=${encodeURIComponent(n.epochId)}`);
    }
  };

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    { key: "alpha_test_result", label: "Test Results" },
    { key: "epoch_reward", label: "Rewards" },
  ];

  return (
    <div ref={panelRef} className="relative">
      {/* Bell trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 rounded-full flex items-center justify-center border border-border bg-accent hover:bg-slate-200 dark:hover:bg-slate-800 transition-all duration-200 ease-in-out"
        title="Notifications"
      >
        <Bell className="w-3.5 h-3.5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-[360px] bg-white dark:bg-slate-900 border border-border rounded-xl shadow-xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="px-3 pt-2 pb-1 flex gap-1">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 ${
                  filter === tab.key
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div className="max-h-[340px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No notifications
              </div>
            ) : (
              filtered.map(n => {
                const isRead = readIds.has(n.id);
                const isTestResult = n.type === "alpha_test_result";
                const isPassed = n.testResult === "passed";

                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-150 hover:bg-accent/60 border-b border-border/50 last:border-0 ${
                      !isRead ? "bg-primary/[0.03]" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                      isTestResult
                        ? isPassed
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500"
                        : "bg-amber-500/10 text-amber-500"
                    }`}>
                      {isTestResult ? (
                        isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <Trophy className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {!isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        <span className={`text-xs font-semibold truncate ${!isRead ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50 shrink-0 ml-auto">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 leading-snug">
                        {n.message}
                      </p>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 mt-1.5 shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * NotificationPanel — Bottom-left popup notification panel for Sidebar
 * Pops up from the bell icon at the sidebar bottom, expanding upward
 * Two tabs: "互动消息" (Interactive Messages) and "公告" (Announcements)
 * Reference: AnyGen-style notification panel
 */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Bell,
  Trophy,
  CheckCircle2,
  XCircle,
  ChevronRight,
  X,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import { notifications, type Notification } from "@/lib/mockData";

type TabType = "interactive" | "announcements";

/* Mock announcements data */
const announcements = [
  {
    id: 101,
    title: "Alpha Arena Season 3 Now Live",
    message: "Submit your best alphas and compete for the $50K prize pool. New evaluation metrics and expanded asset coverage.",
    time: "Apr 12",
    read: false,
  },
  {
    id: 102,
    title: "Platform Maintenance Complete",
    message: "All systems are back online. Backtest engine performance improved by 40%.",
    time: "Apr 10",
    read: true,
  },
  {
    id: 103,
    title: "New Feature: AI Factor Mining",
    message: "Create alpha factors through natural language conversation with our built-in AI agent. Try it now in the Launch Guide.",
    time: "Apr 8",
    read: true,
  },
  {
    id: 104,
    title: "Official Library Expanded",
    message: "15 new graduated factors added to the Official Library. Browse proven trading signals and use them in your strategies.",
    time: "Apr 5",
    read: true,
  },
];

export default function NotificationPanel() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabType>("interactive");
  const [readIds, setReadIds] = useState<Set<number>>(() => {
    const stored = localStorage.getItem("otter_read_notifications");
    return stored ? new Set(JSON.parse(stored)) : new Set(notifications.filter(n => n.read).map(n => n.id));
  });
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<number>>(() => {
    const stored = localStorage.getItem("otter_read_announcements");
    return stored ? new Set(JSON.parse(stored)) : new Set(announcements.filter(a => a.read).map(a => a.id));
  });
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadNotifCount = notifications.filter(n => !readIds.has(n.id)).length;
  const unreadAnnouncementCount = announcements.filter(a => !readAnnouncementIds.has(a.id)).length;
  const totalUnread = unreadNotifCount + unreadAnnouncementCount;

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
    if (tab === "interactive") {
      const allIds = new Set(notifications.map(n => n.id));
      setReadIds(allIds);
      localStorage.setItem("otter_read_notifications", JSON.stringify(Array.from(allIds)));
    } else {
      const allIds = new Set(announcements.map(a => a.id));
      setReadAnnouncementIds(allIds);
      localStorage.setItem("otter_read_announcements", JSON.stringify(Array.from(allIds)));
    }
  };

  const handleNotifClick = (n: Notification) => {
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

  const handleAnnouncementClick = (a: typeof announcements[0]) => {
    const newRead = new Set(readAnnouncementIds);
    newRead.add(a.id);
    setReadAnnouncementIds(newRead);
    localStorage.setItem("otter_read_announcements", JSON.stringify(Array.from(newRead)));
  };

  const currentUnread = tab === "interactive" ? unreadNotifCount : unreadAnnouncementCount;

  return (
    <div ref={panelRef} className="relative">
      {/* Bell trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center border border-border hover:bg-accent transition-all duration-200 ease-in-out"
        title="Notifications"
      >
        <Bell className="w-3.5 h-3.5 text-muted-foreground" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center leading-none">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* Popup panel — positioned above the bell, anchored to bottom-left */}
      {open && (
        <div
          className="absolute left-0 bottom-full mb-2 w-[380px] bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">All Notifications</span>
            <div className="flex items-center gap-2">
              {currentUnread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tabs: 互动消息 / 公告 */}
          <div className="px-3 pt-2 pb-1 flex border-b border-border/50">
            <button
              onClick={() => setTab("interactive")}
              className={`flex-1 py-1.5 text-xs font-medium text-center rounded-md transition-all duration-150 ${
                tab === "interactive"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <MessageCircle className="w-3 h-3" />
                Interactive
                {unreadNotifCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center">
                    {unreadNotifCount}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => setTab("announcements")}
              className={`flex-1 py-1.5 text-xs font-medium text-center rounded-md transition-all duration-150 ${
                tab === "announcements"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Megaphone className="w-3 h-3" />
                Announcements
                {unreadAnnouncementCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center">
                    {unreadAnnouncementCount}
                  </span>
                )}
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="max-h-[400px] overflow-y-auto">
            {tab === "interactive" ? (
              /* Interactive Messages */
              notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No messages yet
                </div>
              ) : (
                notifications.map(n => {
                  const isRead = readIds.has(n.id);
                  const isTestResult = n.type === "alpha_test_result";
                  const isPassed = n.testResult === "passed";

                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors duration-150 hover:bg-accent/60 border-b border-border/30 last:border-0 ${
                        !isRead ? "bg-primary/[0.03]" : ""
                      }`}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isTestResult
                          ? isPassed
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-red-500/10 text-red-500"
                          : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {isTestResult ? (
                          isPassed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />
                        ) : (
                          <Trophy className="w-4 h-4" />
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
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                          {n.message}
                        </p>
                        <span className="text-[10px] text-muted-foreground/50 mt-1 block">{n.time}</span>
                      </div>

                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 mt-2 shrink-0" />
                    </button>
                  );
                })
              )
            ) : (
              /* Announcements */
              announcements.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  No announcements
                </div>
              ) : (
                announcements.map(a => {
                  const isRead = readAnnouncementIds.has(a.id);

                  return (
                    <div
                      key={a.id}
                      onClick={() => handleAnnouncementClick(a)}
                      className={`px-4 py-3.5 border-b border-border/30 last:border-0 cursor-pointer transition-colors duration-150 hover:bg-accent/60 ${
                        !isRead ? "bg-primary/[0.03]" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary mt-0.5">
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {!isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            )}
                            <span className={`text-xs font-semibold ${!isRead ? "text-foreground" : "text-muted-foreground"}`}>
                              {a.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                            {a.message}
                          </p>
                          <span className="text-[10px] text-muted-foreground/50 mt-1.5 block">{a.time}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

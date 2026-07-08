/*
 * NotificationPanel — Quandora 2.0 notification center
 * Keeps notification data, read-state persistence, and routing behavior intact.
 */
import { useState, useRef, useEffect, useMemo, useId, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { useAppLanguage } from "@/contexts/AppLanguageContext";
import {
  Bell,
  CheckCircle2,
  XCircle,
  ChevronRight,
  X,
  Megaphone,
  MessageCircle,
} from "lucide-react";
import { notifications, type Notification } from "@/lib/mockData";

type TabType = "interactive" | "announcements";

type AnnouncementItem = {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  source: "announcement" | "skill_update";
};

type NotificationPanelProps = {
  triggerClassName?: string;
  iconClassName?: string;
  iconSrc?: string;
  panelStyle?: CSSProperties;
  showBadge?: boolean;
};

/* Mock announcements data */
const announcements = [
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
    message: "Create factors through natural language conversations with the built-in AI agent. Try it now in the Launch Guide.",
    time: "Apr 8",
    read: true,
  },
  {
    id: 104,
    title: "Official Library Expanded",
    message: "15 new graduated factors have been added to the Official Library. Browse validated trading signals and use them in your strategies.",
    time: "Apr 5",
    read: true,
  },
];

export default function NotificationPanel({
  triggerClassName,
  iconClassName,
  iconSrc,
  panelStyle,
  showBadge = true,
}: NotificationPanelProps = {}) {
  const [, navigate] = useLocation();
  const { uiLang } = useAppLanguage();
  const tr = (en: string, zh: string) => (uiLang === "zh" ? zh : en);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabType>("interactive");
  const panelId = useId();
  const interactiveNotifications = useMemo(
    () => notifications.filter((n) => n.type !== "skill_update" && n.type !== "epoch_reward"),
    []
  );
  const announcementItems = useMemo<AnnouncementItem[]>(
    () => [
      ...notifications
        .filter((n) => n.type === "skill_update")
        .map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: n.time,
          read: n.read,
          source: "skill_update" as const,
        })),
      ...announcements.map((a) => ({
        ...a,
        source: "announcement" as const,
      })),
    ],
    []
  );
  const translateAnnouncement = (item: AnnouncementItem) => {
    if (uiLang !== "zh") return item;
    const map: Record<number, { title: string; message: string; time?: string }> = {
      9: {
        title: "技能更新：Momentum Scanner",
        message: "Momentum Scanner 已更新至 v2.3，信号准确率提升，延迟降低。",
      },
      10: {
        title: "新技能上线：Whale Tracker",
        message: "Whale Tracker 已上线，可追踪主流 DEX 的大额钱包资金流。",
      },
      11: {
        title: "技能下线：Legacy RSI",
        message: "Legacy RSI 将于 4 月 30 日下线。请迁移至 RSI Pro，以获得更强的信号能力。",
      },
      102: {
        title: "平台维护已完成",
        message: "所有系统已恢复在线，回测引擎性能提升 40%。",
        time: "4 月 10 日",
      },
      103: {
        title: "新功能：AI 因子挖掘",
        message: "通过自然语言与内置 AI Agent 对话来创建因子。现在即可在启动指引中体验。",
        time: "4 月 8 日",
      },
      104: {
        title: "官方库已扩容",
        message: "官方库新增 15 个毕业因子。浏览经过验证的交易信号，并将其用于你的策略。",
        time: "4 月 5 日",
      },
    };
    const translated = map[item.id];
    return translated ? { ...item, ...translated } : item;
  };
  const translateInteractiveNotification = (item: Notification) => {
    if (uiLang !== "zh") return item;
    const map: Record<number, { title: string; message: string }> = {
      1: {
        title: "测试通过",
        message: "BTC Momentum RSI Cross 已通过样本外测试，夏普比率为 1.15",
      },
      2: {
        title: "奖励已发放",
        message: "第 3 轮奖励已发放，你获得了 720 USDT",
      },
      3: {
        title: "测试失败",
        message: "DeFi TVL Alpha 未通过样本内测试，夏普比率低于阈值",
      },
      4: {
        title: "奖励已发放",
        message: "第 2 轮奖励已发放，你获得了 450 USDT",
      },
      5: {
        title: "测试通过",
        message: "Cross-Exchange Spread 已通过全部测试，夏普比率为 1.85",
      },
      6: {
        title: "测试失败",
        message: "Uniswap LP Flow 未通过样本外测试，回撤过高",
      },
      7: {
        title: "奖励已发放",
        message: "第 1 轮奖励已发放，你获得了 310 USDT",
      },
      8: {
        title: "测试通过",
        message: "OI Delta Momentum 已通过样本外测试，夏普比率为 1.55",
      },
    };
    const translated = map[item.id];
    return translated ? { ...item, ...translated } : item;
  };
  const translateTimeLabel = (value: string) => {
    if (uiLang !== "zh") return value;
    return value
      .replace(" min ago", " 分钟前")
      .replace(" mins ago", " 分钟前")
      .replace(" hour ago", " 小时前")
      .replace(" hours ago", " 小时前")
      .replace(" day ago", " 天前")
      .replace(" days ago", " 天前")
      .replace(/^Apr (\d+)$/, "4 月 $1 日");
  };
  const [readIds, setReadIds] = useState<Set<number>>(() => {
    const stored = localStorage.getItem("otter_read_notifications");
    return stored
      ? new Set(JSON.parse(stored))
      : new Set(interactiveNotifications.filter((n) => n.read).map((n) => n.id));
  });
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<number>>(() => {
    const stored = localStorage.getItem("otter_read_announcements");
    return stored
      ? new Set(JSON.parse(stored))
      : new Set(announcementItems.filter((a) => a.read).map((a) => a.id));
  });
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadNotifCount = interactiveNotifications.filter((n) => !readIds.has(n.id)).length;
  const unreadAnnouncementCount = announcementItems.filter((a) => !readAnnouncementIds.has(a.id)).length;
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const markAllRead = () => {
    if (tab === "interactive") {
      const allIds = new Set(interactiveNotifications.map((n) => n.id));
      setReadIds(allIds);
      localStorage.setItem("otter_read_notifications", JSON.stringify(Array.from(allIds)));
    } else {
      const allIds = new Set(announcementItems.map((a) => a.id));
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
    }
  };

  const currentUnread = tab === "interactive" ? unreadNotifCount : unreadAnnouncementCount;
  const panelPositionStyle = panelStyle ?? { position: "fixed", top: "52px", right: "21px", width: "390px" };

  return (
    <div ref={panelRef} className="relative oq-notification">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${triggerClassName ?? "relative w-8 h-8 rounded-lg flex items-center justify-center border border-border"} oq-notification-trigger ${open ? "is-open" : ""}`}
        title={tr("Notifications", "通知")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        {iconSrc ? (
          <img src={iconSrc} alt="" className={iconClassName ?? "w-3.5 h-3.5"} />
        ) : (
          <Bell className={iconClassName ?? "w-3.5 h-3.5 text-muted-foreground"} />
        )}
        {showBadge && totalUnread > 0 && (
          <span className="oq-notification-trigger-badge" aria-label={tr(`${totalUnread} unread notifications`, `${totalUnread} 条未读通知`)}>
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={tr("All notifications", "全部通知")}
          style={panelPositionStyle}
          className="oq-notification-panel"
        >
          <div className="oq-notification-header">
            <div className="oq-notification-header-main">
              <span className="oq-notification-header-icon" aria-hidden="true">
                <Bell className="h-5 w-5" />
              </span>
              <div className="oq-notification-heading-group">
                <h2 className="oq-notification-heading">{tr("Notifications", "全部通知")}</h2>
              </div>
            </div>
            <div className="oq-notification-header-actions">
              {currentUnread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="oq-notification-mark-read"
                >
                  {tr("Mark all read", "全部标记为已读")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="oq-notification-close"
                aria-label={tr("Close notifications", "关闭通知")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="oq-notification-tabs" role="tablist" aria-label={tr("Notification categories", "通知分类")}>
            <button
              id={`${panelId}-interactive-tab`}
              type="button"
              role="tab"
              aria-selected={tab === "interactive"}
              aria-controls={`${panelId}-interactive-panel`}
              onClick={() => setTab("interactive")}
              className={`oq-notification-tab ${tab === "interactive" ? "is-active" : ""}`}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{tr("Interactive", "互动消息")}</span>
              {unreadNotifCount > 0 && (
                <span className="oq-notification-tab-count">
                  {unreadNotifCount}
                </span>
              )}
            </button>
            <button
              id={`${panelId}-announcements-tab`}
              type="button"
              role="tab"
              aria-selected={tab === "announcements"}
              aria-controls={`${panelId}-announcements-panel`}
              onClick={() => setTab("announcements")}
              className={`oq-notification-tab ${tab === "announcements" ? "is-active" : ""}`}
            >
              <Megaphone className="h-3.5 w-3.5" />
              <span>{tr("Announcements", "公告")}</span>
              {unreadAnnouncementCount > 0 && (
                <span className="oq-notification-tab-count">
                  {unreadAnnouncementCount}
                </span>
              )}
            </button>
          </div>

          <div
            id={`${panelId}-${tab}-panel`}
            role="tabpanel"
            aria-labelledby={`${panelId}-${tab}-tab`}
            className="oq-notification-scroll"
          >
            {tab === "interactive" ? (
              interactiveNotifications.length === 0 ? (
                <div className="oq-notification-empty">
                  <div className="oq-notification-empty-icon">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <p>{tr("No messages yet", "暂无消息")}</p>
                </div>
              ) : (
                <div className="oq-notification-list">
                  {interactiveNotifications.map(rawNotification => {
                    const n = translateInteractiveNotification(rawNotification);
                    const isRead = readIds.has(n.id);
                    const isPassed = n.testResult === "passed";

                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleNotifClick(n)}
                        className={`oq-notification-item ${!isRead ? "is-unread" : ""}`}
                      >
                        <span className={`oq-notification-item-icon ${isPassed ? "is-success" : "is-risk"}`}>
                          {isPassed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </span>
                        <span className="oq-notification-item-main">
                          <span className="oq-notification-item-head">
                            <span className="oq-notification-item-title">{n.title}</span>
                            {!isRead && <span className="oq-notification-unread-pill">{tr("New", "新")}</span>}
                          </span>
                          <span className="oq-notification-item-message">{n.message}</span>
                          <span className="oq-notification-item-time">{translateTimeLabel(n.time)}</span>
                        </span>
                        <ChevronRight className="oq-notification-chevron" />
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              announcementItems.length === 0 ? (
                <div className="oq-notification-empty">
                  <div className="oq-notification-empty-icon">
                    <Megaphone className="h-4 w-4" />
                  </div>
                  <p>{tr("No announcements", "暂无公告")}</p>
                </div>
              ) : (
                <div className="oq-notification-list">
                  {announcementItems.map(rawItem => {
                    const a = translateAnnouncement(rawItem);
                    const isRead = readAnnouncementIds.has(a.id);

                    return (
                      <div
                        key={a.id}
                        className={`oq-notification-item oq-notification-announcement ${!isRead ? "is-unread" : ""}`}
                      >
                        <span className="oq-notification-item-icon is-announcement">
                          <Megaphone className="h-4 w-4" />
                        </span>
                        <span className="oq-notification-item-main">
                          <span className="oq-notification-item-head">
                            <span className="oq-notification-item-title">{a.title}</span>
                            {!isRead && <span className="oq-notification-unread-pill">{tr("New", "新")}</span>}
                          </span>
                          <span className="oq-notification-item-message">{a.message}</span>
                          <span className="oq-notification-item-time">{translateTimeLabel(a.time)}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

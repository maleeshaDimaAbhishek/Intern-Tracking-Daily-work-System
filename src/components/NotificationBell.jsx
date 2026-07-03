import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getMyNotifications, markNotificationsRead } from "../api/notifications";
import "./NotificationBell.css";

// Maps notification "type" to an icon — matches the types
// defined in app/model/notification.py on the backend.
const TYPE_ICON = {
  leave_submitted:    "📝",
  leave_approved:     "✅",
  leave_rejected:     "❌",
  medical_reminder_1: "⏰",
  medical_reminder_2: "⚠️",
  medical_overdue:    "🚨",
  medical_submitted:  "📎",
};

// How often to check for new notifications while the app is open.
const POLL_INTERVAL_MS = 30000;   // 30 seconds

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isOpen, setIsOpen]               = useState(false);
  const [loading, setLoading]             = useState(true);

  const dropdownRef = useRef(null);
  const navigate    = useNavigate();

  // ── Initial load + polling ────────────────────────────────────
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);   // cleanup on unmount
  }, []);

  // ── Close dropdown when clicking outside it ───────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await getMyNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      // Silent fail — a failed notification poll shouldn't show
      // an error toast and interrupt whatever the user is doing.
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  // ── Mark all as read when opening the dropdown ────────────────
  const handleOpen = async () => {
    const wasAlreadyOpen = isOpen;
    toggleDropdown();

    if (!wasAlreadyOpen && unreadCount > 0) {
      try {
        await markNotificationsRead([]);   // empty list = mark all
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      } catch {
        // If marking-as-read fails, badge just stays — not critical
      }
    }
  };

  // ── Clicking a notification navigates to the related leave ───
  const handleNotificationClick = (notif) => {
    setIsOpen(false);
    if (notif.type=="leave_submitted") {
      navigate(`/leave/approvals`);   // simplest target — could deep-link later
    }
    else if (notif.type=="leave_approved" || notif.type=="leave_rejected") {
      navigate(`/leave/my`);   // simplest target — could deep-link later
    }
    else if (notif.type.startsWith("medical_")) {
      navigate(`/leave/all`);
    }
  };

  const formatRelativeTime = (dateStr) => {
    const date  = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1)   return "just now";
    if (diffMin < 60)  return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24)   return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  return (
    <div className="notif-bell-wrapper" ref={dropdownRef}>
      <button className="notif-bell-btn" onClick={handleOpen} aria-label="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <p>Notifications</p>
          </div>

          <div className="notif-list">
            {loading ? (
              <p className="notif-empty">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="notif-empty">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.is_read ? "unread" : ""}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span className="notif-item-icon">{TYPE_ICON[n.type] || "🔔"}</span>
                  <div className="notif-item-content">
                    <p className="notif-item-title">{n.title}</p>
                    <p className="notif-item-message">{n.message}</p>
                    <p className="notif-item-time">{formatRelativeTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && <span className="notif-unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
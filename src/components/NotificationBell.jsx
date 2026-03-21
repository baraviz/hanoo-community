import { useState, useEffect, useRef } from "react";
import { Bell, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function NotificationBell({ userEmail }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userEmail) return;
    loadNotifications();

    // Real-time subscription
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data?.user_email === userEmail) {
        setNotifications(prev => [event.data, ...prev]);
      } else if (event.type === "update") {
        setNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
      } else if (event.type === "delete") {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });
    return () => unsub();
  }, [userEmail]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function loadNotifications() {
    const data = await base44.entities.Notification.filter({ user_email: userEmail }, "-created_date", 20);
    setNotifications(data);
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  async function markRead(id) {
    await base44.entities.Notification.update(id, { read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const typeIcon = {
    booking_received: "🅿️",
    booking_ending_soon: "⏰",
    booking_starting_soon: "🚗",
    parking_cancelled: "⚠️",
  };

  async function handleNotificationClick(n) {
    await markRead(n.id);
    if (n.type === "parking_cancelled" && n.action_url) {
      setOpen(false);
      const url = new URL(n.action_url);
      navigate(`/FindParking${url.search}`);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        aria-label={`התראות${unreadCount > 0 ? `, ${unreadCount} לא נקראו` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative w-11 h-11 flex items-center justify-center rounded-2xl"
        style={{ background: "rgba(255,255,255,0.2)" }}
      >
        <Bell size={18} className="text-white" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: "var(--hanoo-red)", fontSize: 9 }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-12 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{ maxHeight: "70vh", background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--surface-card-border)" }}>
            <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>התראות</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium px-3 py-2 rounded-lg min-h-[44px]"
                  style={{ color: "var(--hanoo-blue)", background: "var(--hanoo-blue-light)" }}
                >
                  סמן הכל כנקרא
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="סגור התראות"
                className="w-11 h-11 flex items-center justify-center rounded-full"
                style={{ background: "var(--btn-secondary-bg)" }}
              >
                <X size={13} style={{ color: "var(--text-secondary)" }} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 56px)" }}>
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-sm" style={{ color: "var(--text-tertiary)" }}>אין התראות</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && handleNotificationClick(n)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b last:border-0"
                  style={{
                    borderColor: "var(--surface-card-border)",
                    background: n.read
                      ? "var(--surface-card)"
                      : n.type === "parking_cancelled"
                        ? "var(--hanoo-orange-light)"
                        : "var(--hanoo-blue-light)",
                  }}
                >
                  <span className="text-xl flex-none mt-0.5">{typeIcon[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight" style={{ color: "var(--text-primary)" }}>{n.title}</p>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: "var(--text-secondary)" }}>{n.body}</p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                      {formatDistanceToNow(new Date(n.created_date), { addSuffix: true, locale: he })}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full flex-none mt-1.5" style={{ background: "var(--hanoo-blue)" }} />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
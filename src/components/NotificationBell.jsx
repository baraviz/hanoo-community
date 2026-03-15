import { useState, useEffect, useRef } from "react";
import { Bell, X, Check } from "lucide-react";
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
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative w-9 h-9 flex items-center justify-center rounded-2xl"
        style={{ background: "rgba(255,255,255,0.2)" }}
      >
        <Bell size={18} className="text-white" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: "#FF3B30", fontSize: 9 }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-12 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{ maxHeight: "70vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-bold text-gray-800 text-sm">התראות</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium px-2 py-1 rounded-lg"
                  style={{ color: "#007AFF", background: "#EBF4FF" }}
                >
                  סמן הכל כנקרא
                </button>
              )}
              <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100">
                <X size={13} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(70vh - 56px)" }}>
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">אין התראות</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  style={{ background: n.read ? "white" : "#F0F7FF" }}
                >
                  <span className="text-xl flex-none mt-0.5">{typeIcon[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm leading-tight">{n.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5 leading-snug">{n.body}</p>
                    <p className="text-gray-300 text-xs mt-1">
                      {formatDistanceToNow(new Date(n.created_date), { addSuffix: true, locale: he })}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full flex-none mt-1.5" style={{ background: "#007AFF" }} />
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
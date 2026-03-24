import { useState, useEffect, useRef } from "react";
import { X, Car, ParkingSquare, ChevronLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format, startOfDay, isToday } from "date-fns";
import { useNavigate } from "react-router-dom";

const LAST_SEEN_KEY = "hanoo_daily_modal_date";

export default function DailyUpdateModal({ user, resident }) {
  const [show, setShow] = useState(false);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user || !resident) return;
    const today = new Date().toDateString();
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
    if (lastSeen === today) return; // already shown today
    loadData();
  }, [user, resident]);

  async function loadData() {
    const todayStart = startOfDay(new Date()).toISOString();

    const [bookingsAsRenter, bookingsAsOwner, mySlots] = await Promise.all([
      base44.entities.Booking.filter({ renter_email: user.email }),
      base44.entities.Booking.filter({ owner_email: user.email }),
      base44.entities.WeeklyAvailability.filter({ owner_email: user.email }),
    ]);

    // Bookings received today (active bookings on my spot with start_time today)
    const receivedToday = bookingsAsOwner.filter(b =>
      b.status === "active" && b.start_time && isToday(new Date(b.start_time))
    );

    // My bookings completed today
    const completedToday = bookingsAsRenter.filter(b => b.status === "completed" && b.updated_date && isToday(new Date(b.updated_date)));

    // Active/upcoming slots today
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const recurringToday = mySlots.filter(s => s.slot_type === "recurring" && (s.days_of_week || []).includes(dayOfWeek));
    const tempToday = mySlots.filter(s => s.slot_type === "temp" && s.end_at && new Date(s.end_at) > now);

    const summary = {
      points: resident.points || 0,
      league: resident.league || "Bronze",
      receivedToday,
      completedToday,
      recurringToday,
      tempToday,
    };

    // Only show if there's something interesting
    const hasContent = receivedToday.length > 0 || completedToday.length > 0 || recurringToday.length > 0 || tempToday.length > 0;
    if (!hasContent) {
      localStorage.setItem(LAST_SEEN_KEY, new Date().toDateString());
      return;
    }

    setData(summary);
    setShow(true);
  }

  const navigate = useNavigate();

  const [closing, setClosing] = useState(false);

  function dismiss() {
    setClosing(true);
    setTimeout(() => {
      localStorage.setItem(LAST_SEEN_KEY, new Date().toDateString());
      setShow(false);
      setClosing(false);
    }, 260);
  }

  function goTo(path) {
    dismiss();
    setTimeout(() => navigate(path), 260);
  }

  if (!show || !data) return null;

  const leagueIcon = { Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎", Diamond: "👑" }[data.league] || "🥉";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.45)", animation: closing ? "fadeOut 0.26s ease-in forwards" : "fadeIn 0.26s ease-out" }}
      onClick={dismiss}
    >
      <style>{`
        @keyframes slideUp   { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut   { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
      <div
        className="rounded-t-3xl w-full p-6 max-w-[430px]"
        style={{ background: "var(--sheet-bg)", paddingBottom: "calc(80px + 1.5rem)", animation: closing ? "slideDown 0.26s ease-in forwards" : "slideUp 0.26s ease-out" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--sheet-handle)" }} />
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 id="daily-modal-title" className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>בוקר טוב! ☀️</h2>
          <button onClick={dismiss} aria-label="סגור עדכון יומי" className="w-11 h-11 flex items-center justify-center rounded-full" style={{ background: "var(--btn-secondary-bg)" }}>
            <X size={16} style={{ color: "var(--text-secondary)" }} aria-hidden="true" />
          </button>
        </div>
        <p className="text-sm mb-5" style={{ color: "var(--text-tertiary)" }}>הנה מה שקרה מאז הביקור האחרון שלך</p>

        <div className="space-y-3">
          {/* Points & League */}
          <button onClick={() => goTo("/Profile")} className="w-full flex items-center gap-3 p-3 rounded-2xl text-right" style={{ background: "var(--hanoo-blue-light)" }}>
            <span className="text-2xl">{leagueIcon}</span>
            <div className="flex-1">
              <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>ליגת {data.league}</p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>יש לך {data.points} נקודות</p>
            </div>
            <ChevronLeft size={18} style={{ color: "var(--hanoo-blue)" }} />
          </button>

          {/* Bookings received today */}
          {data.receivedToday.length > 0 && (
            <button onClick={() => goTo("/Bookings")} className="w-full flex items-start gap-3 p-3 rounded-2xl text-right" style={{ background: "var(--hanoo-blue-light)" }}>
              <span className="text-2xl mt-0.5">🎉</span>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                  {data.receivedToday.length === 1
                    ? "הזמנה אחת נכנסה לחניה שלך"
                    : `${data.receivedToday.length} הזמנות נכנסו לחניה שלך`}
                </p>
                {data.receivedToday.map(b => {
                  const start = b.start_time ? new Date(b.start_time) : null;
                  const end = b.end_time ? new Date(b.end_time) : null;
                  const now = new Date();
                  const diffDays = start ? Math.round((start - now) / 86400000) : null;
                  let whenLabel = diffDays === null ? "" : diffDays <= 0 ? "היום" : diffDays === 1 ? "מחר" : `בעוד ${diffDays} ימים`;
                  const timeRange = [start ? format(start, "HH:mm") : "", end ? format(end, "HH:mm") : ""].filter(Boolean).join("–");
                  return (
                    <p key={b.id} className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      {b.renter_name} · {whenLabel}{timeRange ? `, ${timeRange}` : ""}
                    </p>
                  );
                })}
              </div>
              <ChevronLeft size={18} className="flex-none" style={{ color: "var(--hanoo-blue)" }} />
            </button>
          )}

          {/* Completed bookings */}
          {data.completedToday.length > 0 && (
            <button onClick={() => goTo("/Bookings")} className="w-full flex items-start gap-3 p-3 rounded-2xl text-right" style={{ background: "var(--hanoo-blue-light)" }}>
              <Car size={20} className="flex-none" style={{ color: "var(--hanoo-blue)" }} />
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                  {data.completedToday.length === 1 ? "הזמנה אחת הושלמה" : `${data.completedToday.length} הזמנות הושלמו`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>+{data.completedToday.length * 5} נקודות נצברו</p>
              </div>
              <ChevronLeft size={18} className="flex-none" style={{ color: "var(--hanoo-blue)" }} />
            </button>
          )}

          {/* Today's availability */}
          {(data.recurringToday.length > 0 || data.tempToday.length > 0) && (
            <button onClick={() => goTo("/MyParking")} className="w-full flex items-center gap-3 p-3 rounded-2xl text-right" style={{ background: "var(--hanoo-blue-light)" }}>
              <ParkingSquare size={20} className="flex-none" style={{ color: "var(--hanoo-blue)" }} />
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>החניה שלך היום</p>
                {data.recurringToday.map((s, i) => {
                  const h1 = Math.floor(s.time_start / 60), m1 = s.time_start % 60;
                  const h2 = Math.floor(s.time_end / 60), m2 = s.time_end % 60;
                  const t1 = `${String(h1).padStart(2,"0")}:${String(m1).padStart(2,"0")}`;
                  const t2 = `${String(h2).padStart(2,"0")}:${String(m2).padStart(2,"0")}`;
                  return <p key={i} className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>זמינה בין {t1} ל-{t2}</p>;
                })}
                {data.tempToday.map((s, i) => (
                  <p key={i} className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>זמינה עד {format(new Date(s.end_at), "HH:mm")} (חד פעמי)</p>
                ))}
              </div>
              <ChevronLeft size={18} className="flex-none" style={{ color: "var(--hanoo-blue)" }} />
            </button>
          )}
        </div>

        <button
          onClick={dismiss}
          className="mt-5 w-full py-3 rounded-2xl font-bold text-white"
          style={{ background: "var(--hanoo-blue)" }}
        >
          בואו נתחיל!
        </button>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { X, Star, Car, ParkingSquare } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format, startOfDay, isToday } from "date-fns";

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

    // Bookings received today (others booked my spot)
    const receivedToday = bookingsAsOwner.filter(b => b.created_date && isToday(new Date(b.created_date)));

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

  function dismiss() {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toDateString());
    setShow(false);
  }

  if (!show || !data) return null;

  const leagueIcon = { Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎", Diamond: "👑" }[data.league] || "🥉";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white rounded-t-3xl w-full p-6 pb-10 max-w-[430px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-gray-800">בוקר טוב! ☀️</h2>
          <button onClick={dismiss} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <p className="text-gray-400 text-sm mb-5">הנה מה שקרה מאז הביקור האחרון שלך</p>

        <div className="space-y-3">
          {/* Points & League */}
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "#EBF4FF" }}>
            <span className="text-2xl">{leagueIcon}</span>
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-sm">ליגת {data.league}</p>
              <p className="text-xs text-gray-500">יש לך {data.points} נקודות</p>
            </div>
            <Star size={18} style={{ color: "#007AFF" }} />
          </div>

          {/* Bookings received today */}
          {data.receivedToday.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "#E8F8EF" }}>
              <span className="text-2xl">🎉</span>
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-sm">
                  {data.receivedToday.length === 1
                    ? "הזמנה אחת נכנסה לחניה שלך"
                    : `${data.receivedToday.length} הזמנות נכנסו לחניה שלך`}
                </p>
                {data.receivedToday.map(b => (
                  <p key={b.id} className="text-xs text-gray-500">{b.renter_name} · {b.start_time ? format(new Date(b.start_time), "HH:mm") : ""}</p>
                ))}
              </div>
            </div>
          )}

          {/* Completed bookings */}
          {data.completedToday.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "#EBF4FF" }}>
              <Car size={20} style={{ color: "#007AFF" }} />
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-sm">
                  {data.completedToday.length === 1 ? "הזמנה אחת הושלמה" : `${data.completedToday.length} הזמנות הושלמו`}
                </p>
                <p className="text-xs text-gray-500">+{data.completedToday.length * 5} נקודות נצברו</p>
              </div>
            </div>
          )}

          {/* Today's availability */}
          {(data.recurringToday.length > 0 || data.tempToday.length > 0) && (
            <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "#F5F5F5" }}>
              <ParkingSquare size={20} style={{ color: "#007AFF" }} />
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-sm">החניה שלך היום</p>
                {data.recurringToday.map((s, i) => {
                  const h1 = Math.floor(s.time_start / 60), m1 = s.time_start % 60;
                  const h2 = Math.floor(s.time_end / 60), m2 = s.time_end % 60;
                  return <p key={i} className="text-xs text-gray-500">{`${String(h1).padStart(2,"0")}:${String(m1).padStart(2,"0")} – ${String(h2).padStart(2,"0")}:${String(m2).padStart(2,"0")}`}</p>;
                })}
                {data.tempToday.map((s, i) => (
                  <p key={i} className="text-xs text-gray-500">עד {format(new Date(s.end_at), "HH:mm")} (חד פעמי)</p>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={dismiss}
          className="mt-5 w-full py-3 rounded-2xl font-bold text-white"
          style={{ background: "#007AFF" }}
        >
          בואו נתחיל!
        </button>
      </div>
    </div>
  );
}
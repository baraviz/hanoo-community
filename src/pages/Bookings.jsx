import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Car, Clock, CalendarDays, Menu } from "lucide-react";
import SideMenu from "@/components/SideMenu";
import { format, isPast, isFuture, differenceInMinutes } from "date-fns";
import { he } from "date-fns/locale";

const fmt = (dt) => format(new Date(dt), "dd/MM HH:mm");

function formatBookingTime(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const startDay = days[start.getDay()];
  const sameDay = start.toDateString() === end.toDateString();
  
  if (sameDay) {
    return `${format(start, "dd/MM")}, יום ${startDay}, ${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
  } else {
    const endDay = days[end.getDay()];
    return `${format(start, "dd/MM")}, יום ${startDay}, ${format(start, "HH:mm")} - ${format(end, "dd/MM")}, יום ${endDay}, ${format(end, "HH:mm")}`;
  }
}

function BookingCard({ booking, isOwner }) {
  const isPastBooking = isPast(new Date(booking.end_time));
  const hours = Math.round(differenceInMinutes(new Date(booking.end_time), new Date(booking.start_time)) / 60 * 10) / 10;
  
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-none"
          style={{ background: isPastBooking ? "#F3F4F6" : "#EBF4FF" }}
        >
          <Car size={20} style={{ color: isPastBooking ? "#9CA3AF" : "#007AFF" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 text-sm">
            {isOwner ? `הזמין ${booking.renter_name || booking.renter_email}` : `הזמנתי חניה`}
          </p>
          <p className="text-gray-500 text-xs truncate">
            {isOwner ? "חניה" : `של ${booking.owner_name || booking.owner_email}`} #{booking.spot_number || "?"}
          </p>
        </div>
        <div className="text-left flex-none">
          <p
            className="text-sm font-bold"
            style={{ color: isPastBooking ? "#9CA3AF" : "#007AFF" }}
          >
            {hours} שעות
          </p>
          <p className="text-xs text-gray-400">
            {booking.status === "cancelled" ? "בוטל" : isPastBooking ? "הושלם" : "פעיל"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
        <Clock size={12} />
        <span>{formatBookingTime(booking.start_time, booking.end_time)}</span>
      </div>
    </div>
  );
}

function SectionLabel({ label }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 border-t border-gray-200" />
      <span className="text-xs text-gray-400 font-medium px-1">{label}</span>
      <div className="flex-1 border-t border-gray-200" />
    </div>
  );
}

export default function Bookings() {
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [tab, setTab] = useState("mine"); // "mine" | "theirs"
  const [myBookings, setMyBookings] = useState([]);
  const [theirBookings, setTheirBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const u = await base44.auth.me();
    setUser(u);
    const res = await base44.entities.Resident.filter({ user_email: u.email });
    if (res.length > 0) setResident(res[0]);

    const [mine, theirs] = await Promise.all([
      base44.entities.Booking.filter({ renter_email: u.email }),
      base44.entities.Booking.filter({ owner_email: u.email }),
    ]);

    setMyBookings(mine.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)));
    setTheirBookings(theirs.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)));
    setLoading(false);
  }

  const now = new Date();

  const current = tab === "mine" ? myBookings : theirBookings;
  const upcoming = current.filter(b => !isPast(new Date(b.end_time)));
  const past = current.filter(b => isPast(new Date(b.end_time)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#007AFF" }}>
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}
      {/* Header */}
      <div className="pt-12 pb-4 px-5" style={{ background: "#007AFF" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-white text-xl font-bold">הזמנות</h1>
            <p className="text-blue-200 text-xs mt-0.5">היסטוריית החניות שלך</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
              <CalendarDays size={20} className="text-white" />
            </div>
            <button onClick={() => setMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.2)" }}>
              <Menu size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white bg-opacity-20 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setTab("mine")}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: tab === "mine" ? "white" : "transparent", color: tab === "mine" ? "#007AFF" : "white" }}
          >
            אני הזמנתי
          </button>
          <button
            onClick={() => setTab("theirs")}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: tab === "theirs" ? "white" : "transparent", color: tab === "theirs" ? "#007AFF" : "white" }}
          >
            הזמינו ממני
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4 pb-6 space-y-2">
        {upcoming.length === 0 && past.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">🅿️</div>
            <p className="text-gray-500 font-medium">אין הזמנות עדיין</p>
          </div>
        )}

        {upcoming.length > 0 && (
          <>
            <SectionLabel label="עתידיות ופעילות" />
            <div className="space-y-3">
              {upcoming.map(b => (
                <BookingCard key={b.id} booking={b} isOwner={tab === "theirs"} />
              ))}
            </div>
          </>
        )}

        {past.length > 0 && (
          <>
            <SectionLabel label="עבר" />
            <div className="space-y-3">
              {past.map(b => (
                <BookingCard key={b.id} booking={b} isOwner={tab === "theirs"} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
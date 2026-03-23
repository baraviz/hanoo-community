// Bookings page — cache bust 2
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
const statusLabel = booking.status === "cancelled" ? "בוטל" : isPastBooking ? "הושלם" : "פעיל";

return (
  <div
    className="card p-4"
    role="article"
    aria-label={`הזמנה חניה ${booking.spot_number || ""}, ${statusLabel}, ${hours} שעות`}
  >
    <div className="flex items-center gap-3">
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-none"
        style={{ background: isPastBooking ? "var(--btn-secondary-bg)" : "var(--hanoo-blue-light)" }}
      >
        <Car size={20} style={{ color: isPastBooking ? "var(--text-tertiary)" : "var(--hanoo-blue)" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
          {isOwner ? `הזמין ${booking.renter_name || booking.renter_email}` : `הזמנתי חניה`}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
          {isOwner ? "חניה" : `של ${booking.owner_name || booking.owner_email}`} #{booking.spot_number || "?"}
        </p>
      </div>
      <div className="text-left flex-none">
        <p
          className="text-sm font-bold"
          style={{ color: isPastBooking ? "var(--text-tertiary)" : "var(--hanoo-blue)" }}
        >
          {hours} שעות
        </p>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {booking.status === "cancelled" ? "בוטל" : isPastBooking ? "הושלם" : "פעיל"}
        </p>
      </div>
    </div>
    <div className="mt-3 flex items-center gap-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
      <Clock size={12} />
      <span>{formatBookingTime(booking.start_time, booking.end_time)}</span>
    </div>
  </div>
);
}

function SectionLabel({ label }) {
return (
  <div className="flex items-center gap-2 py-1">
    <div className="flex-1 border-t" style={{ borderColor: "var(--surface-card-border)" }} />
    <span className="text-xs font-medium px-1" style={{ color: "var(--text-tertiary)" }}>{label}</span>
    <div className="flex-1 border-t" style={{ borderColor: "var(--surface-card-border)" }} />
  </div>
);
}

export default function Bookings() {
  const navigate = useNavigate();
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface-header)" }}>
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>
      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}
      {/* Header */}
      <div className="pt-safe pb-4 px-5" style={{ background: "var(--surface-header)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-right">
            <h1 className="text-white text-xl font-bold">הזמנות</h1>
            <p className="text-blue-200 text-xs mt-0.5">היסטוריית החניות שלך</p>
          </div>
          <button aria-label="פתח תפריט" onClick={() => setMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.2)" }}>
            <Menu size={18} className="text-white" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white bg-opacity-20 rounded-2xl p-1 gap-1" role="tablist" aria-label="סוג הזמנות">
          <button
            role="tab"
            aria-selected={tab === "mine"}
            aria-controls="bookings-panel"
            onClick={() => setTab("mine")}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: tab === "mine" ? "white" : "transparent", color: tab === "mine" ? "var(--hanoo-blue)" : "white" }}
          >
            אני הזמנתי
          </button>
          <button
            role="tab"
            aria-selected={tab === "theirs"}
            aria-controls="bookings-panel"
            onClick={() => setTab("theirs")}
            className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: tab === "theirs" ? "white" : "transparent", color: tab === "theirs" ? "var(--hanoo-blue)" : "white" }}
          >
            הזמינו ממני
          </button>
        </div>
      </div>

      {/* Content */}
      <div id="bookings-panel" role="tabpanel" aria-live="polite" aria-label={tab === "mine" ? "אני הזמנתי" : "הזמינו ממני"} className="px-4 pt-4 pb-6 space-y-2">
        {tab === "mine" && (upcoming.length > 0 || past.length > 0) && (
          <div className="flex justify-center py-1">
            <button
              onClick={() => navigate("/FindParking")}
              className="text-sm font-regular"
              style={{ color: "var(--hanoo-blue)", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              הזמן חניה +
            </button>
          </div>
        )}
        {upcoming.length === 0 && past.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <img
              src="https://media.base44.com/images/public/69b1df337f72186a6fd4c0c7/1c0461427_ChatGPTImageMar23202611_25_48AM.png"
              alt="אין הזמנות"
              className="w-56 h-56 object-contain mb-2"
            />
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>עדיין אין לך הזמנות</h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              כשתזמין חניה, כל ההזמנות שלך ייפיעו כאן מחר.
            </p>
            {tab === "mine" && (
              <>
                <button
                  onClick={() => navigate("/FindParking")}
                  className="w-full py-4 rounded-2xl font-bold text-white text-base mb-3"
                  style={{ background: "var(--hanoo-blue)" }}
                >
                  מצא חניה עכשיו
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="text-sm font-medium"
                  style={{ color: "var(--hanoo-blue)" }}
                >
                  איך זה עובד?
                </button>
              </>
            )}
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
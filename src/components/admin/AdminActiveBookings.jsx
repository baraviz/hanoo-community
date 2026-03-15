import { Car, Clock } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

export default function AdminActiveBookings({ bookings }) {
  const active = bookings
    .filter(b => b.status === "active")
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const fmt = (dt) => format(new Date(dt), "dd/MM HH:mm");
  const hours = (b) => {
    const mins = differenceInMinutes(new Date(b.end_time), new Date(b.start_time));
    return Math.round(mins / 60 * 10) / 10;
  };

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">הזמנות פעילות ({active.length})</h2>
      {active.length === 0 ? (
        <div className="rounded-2xl border border-gray-800 p-8 text-center text-gray-500" style={{ background: "rgba(255,255,255,0.03)" }}>
          אין הזמנות פעילות כרגע
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-800 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="divide-y divide-gray-800">
            {active.map(b => (
              <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: "rgba(245,158,11,0.15)" }}>
                  <Car size={16} style={{ color: "#F59E0B" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">{b.renter_name || b.renter_email}</span>
                    <span className="text-gray-600 text-xs">→</span>
                    <span className="text-gray-300 text-sm">{b.owner_name || b.owner_email}</span>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">חנייה #{b.spot_number || "?"}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-gray-500 text-xs">
                    <Clock size={10} />
                    <span>{fmt(b.start_time)} – {fmt(b.end_time)}</span>
                  </div>
                </div>
                <div className="text-right flex-none">
                  <p className="text-sm font-bold" style={{ color: "#8B5CF6" }}>{b.total_credits}</p>
                  <p className="text-gray-600 text-[10px]">{hours(b)}h</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
import { format, parseISO } from "date-fns";
import { Car } from "lucide-react";

const POINT_EVENTS = {
  booking_completed: { label: "השלמת הזמנה", icon: "🚗", points: 15 },
  slot_shared:       { label: "שיתוף חניה",  icon: "🅿️", points: 10 },
  first_availability:{ label: "פרסום ראשון", icon: "🎉", points: 20 },
  positive_rating:   { label: "דירוג חיובי", icon: "⭐", points: 25 },
};

export default function ActivityHistory({ bookings }) {
  // Build activity list from bookings (completed = earned points)
  const activities = bookings
    .filter(b => b.status === "completed")
    .slice(0, 8)
    .map(b => ({
      id: b.id,
      label: "השלמת הזמנה",
      icon: "🚗",
      points: 15,
      sub: `חניה #${b.spot_number || "?"}`,
      date: b.end_time || b.start_time,
    }));

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-4xl mb-2">🏆</p>
        <p className="text-gray-400 text-sm">עדיין אין פעילות — השלם הזמנה ראשונה לצבור נקודות!</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {activities.map(a => (
        <div key={a.id} className="flex items-center gap-3 py-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg bg-gray-50 flex-none">
            {a.icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">{a.label}</p>
            <p className="text-xs text-gray-400">
              {a.sub} · {a.date ? format(new Date(a.date), "dd/MM HH:mm") : ""}
            </p>
          </div>
          <span className="text-sm font-bold text-green-600">+{a.points}</span>
        </div>
      ))}
    </div>
  );
}
const LEAGUES = [
  { name: "Bronze",   min: 0,    next: 150,  icon: "🥉", color: "#007AFF", bg: "#EBF4FF", bar: "#007AFF",  discount: 0  },
  { name: "Silver",   min: 150,  next: 400,  icon: "🥈", color: "#0056CC", bg: "#DDEEFF", bar: "#0056CC",  discount: 5  },
  { name: "Gold",     min: 400,  next: 900,  icon: "🥇", color: "#004AAD", bg: "#CCE3FF", bar: "#004AAD",  discount: 10 },
  { name: "Platinum", min: 900,  next: 2000, icon: "💎", color: "#003A8C", bg: "#BBCFFF", bar: "#003A8C",  discount: 15 },
  { name: "Diamond",  min: 2000, next: null, icon: "👑", color: "#002266", bg: "#AAC0FF", bar: "#002266",  discount: 20 },
];

const REASON_LABELS = {
  booking_completed: { label: "השלמת הזמנה", icon: "🚗" },
  slot_shared:       { label: "שיתוף חניה",   icon: "🅿️" },
  first_availability:{ label: "פרסום ראשון",  icon: "🎉" },
  positive_rating:   { label: "דירוג חיובי",  icon: "⭐" },
  manual:            { label: "בונוס",         icon: "🎁" },
};

export default function LeagueCard({ resident }) {
  const points = resident?.points || 0;
  const leagueName = resident?.league || "Bronze";
  const league = LEAGUES.find(l => l.name === leagueName) || LEAGUES[0];
  const nextLeague = LEAGUES[LEAGUES.indexOf(league) + 1] || null;

  const progressPct = nextLeague
    ? Math.min(100, Math.round(((points - league.min) / (nextLeague.min - league.min)) * 100))
    : 100;

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: league.bg, border: `1.5px solid ${league.color}22` }}>
      {/* Top: league badge */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <div className="text-4xl">{league.icon}</div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: league.color }}>ליגה נוכחית</p>
          <p className="text-xl font-bold text-gray-800">{leagueName}</p>
          {league.discount > 0 && (
            <p className="text-xs font-bold mt-0.5" style={{ color: league.color }}>🎟️ {league.discount}% הנחה על חניות</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-800">{points}</p>
          <p className="text-xs text-gray-400">נקודות</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-4">
        {nextLeague ? (
          <>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{leagueName} ({league.min})</span>
              <span>{nextLeague.icon} {nextLeague.name} ({nextLeague.min})</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-white bg-opacity-60" style={{ border: `1px solid ${league.color}33` }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: league.bar }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5 text-center">
              עוד <span className="font-bold" style={{ color: league.color }}>{nextLeague.min - points}</span> נקודות לליגת {nextLeague.name} {nextLeague.icon}
            </p>
          </>
        ) : (
          <p className="text-center text-sm font-bold" style={{ color: league.color }}>הגעת לדרגה הגבוהה ביותר! 🎊</p>
        )}
      </div>
    </div>
  );
}
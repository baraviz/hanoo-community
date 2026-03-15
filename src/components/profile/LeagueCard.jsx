import { useState } from "react";
import { X, Info } from "lucide-react";

const LEAGUES = [
  { name: "Bronze",   min: 0,    next: 150,  icon: "🥉", color: "#007AFF", bg: "#EBF4FF", bar: "#007AFF",  discount: 0  },
  { name: "Silver",   min: 150,  next: 400,  icon: "🥈", color: "#0056CC", bg: "#DDEEFF", bar: "#0056CC",  discount: 5  },
  { name: "Gold",     min: 400,  next: 900,  icon: "🥇", color: "#004AAD", bg: "#CCE3FF", bar: "#004AAD",  discount: 10 },
  { name: "Platinum", min: 900,  next: 2000, icon: "💎", color: "#003A8C", bg: "#BBCFFF", bar: "#003A8C",  discount: 15 },
  { name: "Diamond",  min: 2000, next: null, icon: "👑", color: "#002266", bg: "#AAC0FF", bar: "#002266",  discount: 20 },
];

function LeagueInfoModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full p-6 pb-10 max-w-[430px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-lg">הטבות לפי ליגה</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-3">
          {LEAGUES.map(l => (
            <div key={l.name} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: l.bg }}>
              <span className="text-2xl">{l.icon}</span>
              <div className="flex-1">
                <p className="font-bold text-gray-800 text-sm">{l.name}</p>
                <p className="text-xs text-gray-500">מ-{l.min} נקודות</p>
              </div>
              <div className="text-left">
                {l.discount > 0
                  ? <span className="text-sm font-bold" style={{ color: l.color }}>🎟️ {l.discount}% הנחה</span>
                  : <span className="text-xs text-gray-400">ללא הנחה</span>
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LeagueCard({ resident }) {
  const [showInfo, setShowInfo] = useState(false);
  const points = resident?.points || 0;
  const leagueName = resident?.league || "Bronze";
  const league = LEAGUES.find(l => l.name === leagueName) || LEAGUES[0];
  const nextLeague = LEAGUES[LEAGUES.indexOf(league) + 1] || null;

  const progressPct = nextLeague
    ? Math.min(100, Math.round(((points - league.min) / (nextLeague.min - league.min)) * 100))
    : 100;

  return (
    <>
      {showInfo && <LeagueInfoModal onClose={() => setShowInfo(false)} />}
      <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: league.bg, border: `1.5px solid ${league.color}33` }}>
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
          <div className="flex flex-col items-end gap-1">
            <button onClick={() => setShowInfo(true)} className="w-7 h-7 flex items-center justify-center rounded-full" style={{ background: `${league.color}22` }}>
              <Info size={14} style={{ color: league.color }} />
            </button>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800">{points}</p>
              <p className="text-xs text-gray-500">נקודות</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-4">
          {nextLeague ? (
            <>
              <div className="w-full h-2.5 rounded-full" style={{ background: `${league.color}33` }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: league.bar }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1.5 text-center">
                עוד <span className="font-bold" style={{ color: league.color }}>{nextLeague.min - points}</span> נקודות לליגת {nextLeague.name} {nextLeague.icon}
              </p>
            </>
          ) : (
            <p className="text-center text-sm font-bold" style={{ color: league.color }}>הגעת לדרגה הגבוהה ביותר! 🎊</p>
          )}
        </div>
      </div>
    </>
  );
}
import { useState } from "react";
import { Share2, UserCheck, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

export default function AdminReferralFunnel({ referrals, residents }) {
  const [expanded, setExpanded] = useState(false);

  const opens = referrals.filter(r => r.event_type === "link_opened").length;
  const joins = referrals.filter(r => r.event_type === "joined").length;
  const convRate = opens > 0 ? Math.round((joins / opens) * 100) : 0;

  // Top referrers
  const referrerMap = {};
  referrals.forEach(r => {
    if (!referrerMap[r.referrer_email]) referrerMap[r.referrer_email] = { opens: 0, joins: 0, email: r.referrer_email };
    if (r.event_type === "link_opened") referrerMap[r.referrer_email].opens++;
    if (r.event_type === "joined") referrerMap[r.referrer_email].joins++;
  });
  const topReferrers = Object.values(referrerMap)
    .sort((a, b) => b.joins - a.joins || b.opens - a.opens)
    .slice(0, 5);

  // Map email to name via residents
  const nameMap = {};
  residents.forEach(r => { nameMap[r.user_email] = r.user_name || r.user_email; });

  return (
    <div className="rounded-2xl border border-gray-800 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
      <button
        onClick={() => setExpanded(p => !p)}
        aria-expanded={expanded}
        aria-controls="referral-funnel-body"
        aria-label={expanded ? "כווץ פאנל הפניות" : "הרחב פאנל הפניות"}
        className="w-full px-6 py-4 min-h-[56px] flex items-center justify-between focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400 rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-none" style={{ background: "var(--hanoo-green-light)" }}>
            <Share2 size={18} style={{ color: "var(--hanoo-green)" }} />
          </div>
          <div className="text-right">
            <p className="text-white font-bold">פאנל שיתוף — הפניות</p>
            <p className="text-gray-400 text-xs">{opens} פתיחות · {joins} הצטרפויות · {convRate}% המרה</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp size={18} className="text-gray-300" aria-hidden="true" />
          : <ChevronDown size={18} className="text-gray-300" aria-hidden="true" />}
      </button>

      {expanded && (
        <div id="referral-funnel-body" className="px-6 pb-6 space-y-5 border-t border-gray-800">
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3 pt-4">
            {[
              { label: "קישורים נפתחו", value: opens, icon: Share2, color: "var(--hanoo-blue)", bg: "var(--hanoo-blue-light)" },
              { label: "הצטרפו דרך קישור", value: joins, icon: UserCheck, color: "var(--hanoo-green)", bg: "var(--hanoo-green-light)" },
              { label: "אחוז המרה", value: `${convRate}%`, icon: TrendingUp, color: "var(--hanoo-orange)", bg: "var(--hanoo-orange-light)" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-xl p-4 flex flex-col items-center text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: bg }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <p className="text-white text-xl font-bold">{value}</p>
                <p className="text-gray-400 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Top referrers */}
          {topReferrers.length > 0 && (
            <div>
              <p className="text-gray-200 font-bold text-sm mb-3">שיאני הפניות</p>
              <div className="space-y-2">
                {topReferrers.map((r, idx) => (
                  <div key={r.email} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <span className="text-gray-500 text-xs w-5 text-center font-bold">#{idx + 1}</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{nameMap[r.email] || r.email}</p>
                      <p className="text-gray-300 text-xs">{r.email}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-gray-400">
                        <span style={{ color: "var(--hanoo-green)" }} className="font-bold">{r.joins}</span> הצטרפו ·{" "}
                        <span style={{ color: "var(--hanoo-blue)" }}>{r.opens}</span> פתחו
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {topReferrers.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">עדיין אין נתוני הפניות</p>
          )}
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useAppNavigation } from "@/lib/NavigationContext";
import { Car, CheckCircle, ChevronRight, Gift, ParkingSquare } from "lucide-react";

export default function PublishParking() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [pricePerHour, setPricePerHour] = useState("10");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.Resident.filter({ user_email: u.email }).then(res => {
        if (res.length > 0) setResident(res[0]);
      });
    });
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const later = new Date(now.getTime() + 4 * 3600000);
    setFromTime(toLocalInput(now));
    setToTime(toLocalInput(later));
  }, []);

  function toLocalInput(d) {
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d - off).toISOString().slice(0, 16);
  }

  async function publish() {
    if (!fromTime || !toTime) return;
    const from = new Date(fromTime);
    const to = new Date(toTime);
    const hours = (to - from) / 3600000;
    if (hours < 0.5) { alert("זמן מינימלי: חצי שעה"); return; }

    setLoading(true);
    await base44.entities.WeeklyAvailability.create({
      resident_id: resident.id,
      building_id: resident.building_id,
      owner_email: user.email,
      slot_type: "temp",
      start_at: from.toISOString(),
      end_at: to.toISOString(),
    });

    // בונוס 100 קרדיטים בפרסום ראשון של 2+ שעות
    if (!resident.bonus_credits_received && hours >= 2) {
      await base44.entities.Resident.update(resident.id, {
        credits: (resident.credits || 0) + 100,
        initial_availability_published: true,
        bonus_credits_received: true,
      });
    }

    setLoading(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: "#E8F8EF" }}>
          <CheckCircle size={44} style={{ color: "#34C759" }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">פורסם! 🎉</h2>
        <p className="text-gray-500 mb-2">החניה שלך זמינה לשכנים</p>
        {resident && !resident.bonus_credits_received && <p className="text-green-600 font-bold mb-6">+100 קרדיטים בונוס נוספו לחשבונך!</p>}
        <button
          onClick={() => navigate(createPageUrl("Home"))}
          className="w-full py-4 rounded-2xl font-bold text-white"
          style={{ background: "#007AFF" }}
        >
          חזור לבית
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-12 pb-6 px-5" style={{ background: "#007AFF" }}>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white opacity-80 mb-3">
          <ChevronRight size={20} />
          <span className="text-sm">חזרה</span>
        </button>
        <h1 className="text-white text-xl font-bold flex items-center gap-2"><ParkingSquare size={22} />פרסם את החניה שלך</h1>
        <p className="text-blue-200 text-sm">שתף עם שכנים וצבור קרדיטים</p>
      </div>

      <div className="px-5 py-5 space-y-4">
        {!resident?.bonus_credits_received && (
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "#E8F8EF", border: "1px solid #34C759" }}>
            <Gift size={20} className="text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-green-700">פרסם 2+ שעות בפעם הראשונה</p>
              <p className="text-green-600 text-sm">וקבל 100 קרדיטים בונוס! (כבר קיבלת 50 בהצטרפות)</p>
            </div>
          </div>
        )}

        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">זמין מ</label>
              <input
                type="datetime-local"
                value={fromTime}
                onChange={e => setFromTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-blue-400 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">זמין עד</label>
              <input
                type="datetime-local"
                value={toTime}
                onChange={e => setToTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-blue-400 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מחיר לשעה (קרדיטים)</label>
            <div className="w-full border border-gray-100 rounded-xl px-3 py-3 bg-gray-50 text-gray-500 text-sm">
              10 קרדיטים לשעה
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">הערות (אופציונלי)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="לדוגמה: חניה מקורה, מקום גדול..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        <button
          onClick={publish}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
          style={{ background: "#007AFF", opacity: loading ? 0.7 : 1 }}
        >
          <Car size={20} />
          {loading ? "מפרסם..." : "פרסם חניה"}
        </button>
      </div>
    </div>
  );
}
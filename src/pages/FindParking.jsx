import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Car, Search, CheckCircle } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import ThankYouWhatsApp from "@/components/ThankYouWhatsApp";

export default function FindParking() {
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [thankYouSlot, setThankYouSlot] = useState(null); // { ownerName, ownerPhone, spotNumber }

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.Resident.filter({ user_email: u.email }).then(res => {
        if (res.length > 0) setResident(res[0]);
      });
    });
    // defaults
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const later = new Date(now.getTime() + 2 * 3600000);
    setFromTime(toLocalInput(now));
    setToTime(toLocalInput(later));
  }, []);

  function toLocalInput(d) {
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d - off).toISOString().slice(0, 16);
  }

  async function searchParking() {
    if (!fromTime || !toTime) return;
    setLoading(true); setSearched(true);

    const fromDate = new Date(fromTime);
    const toDate = new Date(toTime);
    const fromMins = fromDate.getHours() * 60 + fromDate.getMinutes();
    const toMins = toDate.getHours() * 60 + toDate.getMinutes();
    const dayOfWeek = fromDate.getDay(); // 0=Sunday

    // Get all availability entries for this building (excluding self)
    const allAvail = await base44.entities.WeeklyAvailability.filter({
      building_id: resident.building_id,
    });

    // Get residents for owner info
    const residents = await base44.entities.Resident.filter({ building_id: resident.building_id });
    const residentMap = {};
    residents.forEach(r => { residentMap[r.user_email] = r; });

    // Check active bookings to exclude already-booked slots
    const activeBookings = await base44.entities.Booking.filter({
      building_id: resident.building_id,
      status: "active",
    });

    const bookedAvailIds = new Set(activeBookings.map(b => b.parking_slot_id));

    const available = allAvail.filter(a => {
      if (a.owner_email === user.email) return false;
      if (bookedAvailIds.has(a.id)) return false;

      if (a.slot_type === "recurring") {
        // Check day and time range
        return (a.days_of_week || []).includes(dayOfWeek) &&
          (a.time_start ?? 0) <= fromMins &&
          (a.time_end ?? 1440) >= toMins;
      }

      if (a.slot_type === "temp") {
        // Check date range
        return new Date(a.start_at) <= fromDate && new Date(a.end_at) >= toDate;
      }

      return false;
    });

    // Attach owner resident info
    const enriched = available.map(a => ({
      ...a,
      ownerResident: residentMap[a.owner_email] || null,
    }));

    setResults(enriched);
    setLoading(false);
  }

  async function bookSlot(slot) {
    const from = new Date(fromTime).toISOString();
    const to = new Date(toTime).toISOString();
    const hours = differenceInMinutes(new Date(to), new Date(from)) / 60;
    const cost = Math.round(hours * 10);

    if ((resident.credits || 0) < cost) {
      alert(`אין מספיק קרדיטים. יש לך ${resident.credits}, נדרש ${cost}`);
      return;
    }

    // Deduct credits from renter
    await base44.entities.Resident.update(resident.id, {
      credits: (resident.credits || 0) - cost,
    });
    // Add credits to owner
    const ownerRes = await base44.entities.Resident.filter({ user_email: slot.owner_email });
    if (ownerRes.length > 0) {
      await base44.entities.Resident.update(ownerRes[0].id, {
        credits: (ownerRes[0].credits || 0) + cost,
      });
    }

    const ownerResident = slot.ownerResident;
    await base44.entities.Booking.create({
      parking_slot_id: slot.id,
      building_id: slot.building_id,
      renter_email: user.email,
      renter_name: user.full_name,
      owner_email: slot.owner_email,
      owner_name: ownerResident?.user_name || slot.owner_email,
      spot_number: ownerResident?.parking_spot || "?",
      start_time: from,
      end_time: to,
      total_credits: cost,
      status: "active",
    });

    setBookingId(slot.id);

    // Show thank-you WhatsApp prompt
    setThankYouSlot({
      ownerName: ownerResident?.user_name || slot.owner_email,
      ownerPhone: ownerResident?.phone || null,
      spotNumber: ownerResident?.parking_spot || "?",
    });

    // Update local resident credits
    setResident(prev => ({ ...prev, credits: (prev.credits || 0) - cost }));
    setResults([]);
  }

  if (bookingId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        {thankYouSlot && (
          <ThankYouWhatsApp
            ownerName={thankYouSlot.ownerName}
            ownerPhone={thankYouSlot.ownerPhone}
            spotNumber={thankYouSlot.spotNumber}
            onClose={() => setThankYouSlot(null)}
          />
        )}
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: "#E8F8EF" }}>
          <CheckCircle size={44} style={{ color: "#34C759" }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">הוזמן! 🎉</h2>
        <p className="text-gray-500 mb-6">החניה שלך מוכנה מ-{format(new Date(fromTime), "HH:mm")} עד {format(new Date(toTime), "HH:mm")}</p>
        <button
          onClick={() => { setBookingId(null); setSearched(false); setResults([]); }}
          className="w-full py-4 rounded-2xl font-bold text-white"
          style={{ background: "#007AFF" }}
        >
          חזור לחיפוש
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-12 pb-6 px-5" style={{ background: "#007AFF" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-white text-xl font-bold">מצא חניה</h1>
            <p className="text-blue-200 text-sm">יתרת קרדיטים: {resident?.credits || 0}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
            <Search size={28} className="text-white" />
          </div>
        </div>

        {/* Search inputs in header */}
        <div className="space-y-2">
          <div className="bg-white bg-opacity-20 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-blue-200 text-xs font-bold w-16">משעה</span>
            <input
              type="datetime-local"
              value={fromTime}
              onChange={e => setFromTime(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm font-medium outline-none"
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div className="bg-white bg-opacity-20 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-blue-200 text-xs font-bold w-16">עד שעה</span>
            <input
              type="datetime-local"
              value={toTime}
              onChange={e => setToTime(e.target.value)}
              className="flex-1 bg-transparent text-white text-sm font-medium outline-none"
              style={{ colorScheme: "dark" }}
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        <button
          onClick={searchParking}
          disabled={loading || !resident}
          className="w-full py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 mb-4"
          style={{ background: "#007AFF", opacity: loading ? 0.7 : 1 }}
        >
          <Search size={18} />
          {loading ? "מחפש..." : "חפש חניה"}
        </button>

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🅿️</div>
            <p className="text-gray-500 font-medium">אין חניות פנויות בזמן זה</p>
            <p className="text-gray-400 text-sm mt-1">נסה שעה אחרת</p>
          </div>
        )}

        <div className="space-y-3">
          {results.map(slot => {
            const hours = differenceInMinutes(new Date(toTime), new Date(fromTime)) / 60;
            const cost = Math.round(hours * 10);
            const owner = slot.ownerResident;
            return (
              <div key={slot.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#EBF4FF" }}>
                    <Car size={24} style={{ color: "#007AFF" }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">חניה #{owner?.parking_spot || "?"}</p>
                    <p className="text-gray-500 text-sm">של {owner?.user_name || slot.owner_email}</p>
                    {owner?.parking_floor && <p className="text-gray-400 text-xs">קומה {owner.parking_floor}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg" style={{ color: "#007AFF" }}>{cost}</p>
                    <p className="text-gray-400 text-xs">קרדיטים</p>
                  </div>
                </div>
                <button
                  onClick={() => bookSlot(slot)}
                  className="w-full py-3 rounded-xl font-bold text-white"
                  style={{ background: "#007AFF" }}
                >
                  הזמן עכשיו
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
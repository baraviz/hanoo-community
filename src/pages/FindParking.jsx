import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Car, Clock, Coins, Search, CheckCircle } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";

export default function FindParking() {
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);

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
    const from = new Date(fromTime).toISOString();
    const to = new Date(toTime).toISOString();

    const slots = await base44.entities.ParkingSlot.filter({
      building_id: resident.building_id,
      status: "available",
    });

    const available = slots.filter(s =>
      s.owner_email !== user.email &&
      new Date(s.available_from) <= new Date(from) &&
      new Date(s.available_until) >= new Date(to)
    );

    setResults(available);
    setLoading(false);
  }

  async function bookSlot(slot) {
    const from = new Date(fromTime).toISOString();
    const to = new Date(toTime).toISOString();
    const hours = differenceInMinutes(new Date(to), new Date(from)) / 60;
    const cost = Math.round(hours * (slot.price_per_hour || 10));

    if ((resident.credits || 0) < cost) {
      alert(`אין מספיק קרדיטים. יש לך ${resident.credits}, נדרש ${cost}`);
      return;
    }

    // Deduct credits from renter
    await base44.entities.Resident.update(resident.id, {
      credits: (resident.credits || 0) - cost,
    });
    // Add credits to owner (will be finalized on checkout)
    const ownerRes = await base44.entities.Resident.filter({ user_email: slot.owner_email });
    if (ownerRes.length > 0) {
      await base44.entities.Resident.update(ownerRes[0].id, {
        credits: (ownerRes[0].credits || 0) + cost,
      });
    }

    const booking = await base44.entities.Booking.create({
      parking_slot_id: slot.id,
      building_id: slot.building_id,
      renter_email: user.email,
      renter_name: user.full_name,
      owner_email: slot.owner_email,
      owner_name: slot.owner_name,
      spot_number: slot.spot_number,
      start_time: from,
      end_time: to,
      total_credits: cost,
      status: "active",
    });

    await base44.entities.ParkingSlot.update(slot.id, { status: "booked" });
    setBookingId(booking.id);

    // Update local resident credits
    setResident(prev => ({ ...prev, credits: (prev.credits || 0) - cost }));
    setResults([]);
  }

  if (bookingId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
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
        <h1 className="text-white text-xl font-bold mb-1">מצא חניה 🔍</h1>
        <p className="text-blue-200 text-sm">יתרת קרדיטים: {resident?.credits || 0}</p>
      </div>

      <div className="px-5 py-5">
        <div className="card p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">מ</label>
              <input
                type="datetime-local"
                value={fromTime}
                onChange={e => setFromTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">עד</label>
              <input
                type="datetime-local"
                value={toTime}
                onChange={e => setToTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
          </div>
          <button
            onClick={searchParking}
            disabled={loading || !resident}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "#007AFF", opacity: loading ? 0.7 : 1 }}
          >
            <Search size={18} />
            {loading ? "מחפש..." : "חפש חניה"}
          </button>
        </div>

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
            const cost = Math.round(hours * (slot.price_per_hour || 10));
            return (
              <div key={slot.id} className="card p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#EBF4FF" }}>
                    <Car size={24} style={{ color: "#007AFF" }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">חניה #{slot.spot_number || "?"}</p>
                    <p className="text-gray-500 text-sm">של {slot.owner_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg" style={{ color: "#007AFF" }}>{cost}</p>
                    <p className="text-gray-400 text-xs">קרדיטים</p>
                  </div>
                </div>
                {slot.notes && <p className="text-gray-500 text-sm mb-3">{slot.notes}</p>}
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
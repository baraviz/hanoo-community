import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Car, CheckCircle, Clock, ArrowLeft, Search, Menu } from "lucide-react";
import SideMenu from "@/components/SideMenu";
import { format, differenceInMinutes } from "date-fns";
import ThankYouWhatsApp from "@/components/ThankYouWhatsApp";

export default function FindParking() {
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [results, setResults] = useState([]); // full-coverage slots
  const [combos, setCombos] = useState([]);   // partial combos
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [thankYouSlots, setThankYouSlots] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [autoSearch, setAutoSearch] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.Resident.filter({ user_email: u.email }).then(res => {
        if (res.length > 0) setResident(res[0]);
      });
    });

    // Support pre-filled times from URL params (e.g. from WhatsApp apology link)
    const urlParams = new URLSearchParams(window.location.search);
    const urlFrom = urlParams.get("from");
    const urlTo = urlParams.get("to");
    if (urlFrom && urlTo) {
      setFromTime(toLocalInput(new Date(urlFrom)));
      setToTime(toLocalInput(new Date(urlTo)));
      setAutoSearch(true);
    } else {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const later = new Date(now.getTime() + 2 * 3600000);
      setFromTime(toLocalInput(now));
      setToTime(toLocalInput(later));
    }
  }, []);

  // Auto-search when arriving from WhatsApp link (after resident loads)
  useEffect(() => {
    if (autoSearch && resident && fromTime && toTime) {
      setAutoSearch(false);
      searchParking();
    }
  }, [autoSearch, resident, fromTime, toTime]);

  function toLocalInput(d) {
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d - off).toISOString().slice(0, 16);
  }

  // Returns [start, end] coverage of a slot in minutes relative to day
  function localDay(d) {
    // Parse as local time to get correct day-of-week
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getDay();
  }

  function slotCoverage(a, fromDate, toDate) {
    const fromMins = fromDate.getHours() * 60 + fromDate.getMinutes();
    const toMins = toDate.getHours() * 60 + toDate.getMinutes();
    const dayOfWeek = localDay(fromDate);

    if (a.slot_type === "recurring") {
      if (!(a.days_of_week || []).includes(dayOfWeek)) return null;
      const s = Math.max(a.time_start ?? 0, fromMins);
      const e = Math.min(a.time_end ?? 1440, toMins);
      if (e <= s) return null;
      return [s, e];
    }
    if (a.slot_type === "temp") {
      const slotStart = new Date(a.start_at);
      const slotEnd = new Date(a.end_at);
      if (slotEnd <= fromDate || slotStart >= toDate) return null;
      const s = Math.max(
        slotStart.getHours() * 60 + slotStart.getMinutes(),
        fromDate.getHours() * 60 + fromDate.getMinutes()
      );
      const e = Math.min(
        slotEnd.getHours() * 60 + slotEnd.getMinutes(),
        toDate.getHours() * 60 + toDate.getMinutes()
      );
      if (e <= s) return null;
      return [s, e];
    }
    return null;
  }

  async function searchParking() {
    if (!fromTime || !toTime) return;
    setLoading(true); setSearched(true);

    const fromDate = new Date(fromTime);
    const toDate = new Date(toTime);
    const fromMins = fromDate.getHours() * 60 + fromDate.getMinutes();
    const toMins = toDate.getHours() * 60 + toDate.getMinutes();

    const [allAvail, residents, activeBookings] = await Promise.all([
      base44.entities.WeeklyAvailability.filter({ building_id: resident.building_id }),
      base44.entities.Resident.filter({ building_id: resident.building_id }),
      base44.entities.Booking.filter({ building_id: resident.building_id, status: "active" }),
    ]);

    const residentMap = {};
    residents.forEach(r => { residentMap[r.user_email] = r; });
    const bookedAvailIds = new Set(activeBookings.map(b => b.parking_slot_id));

    // Filter out self and booked, attach coverage
    console.log("=== SEARCH DEBUG ===");
    console.log("fromDate:", fromDate.toISOString(), "day:", fromDate.getDay(), "fromMins:", fromMins, "toMins:", toMins);
    console.log("allAvail count:", allAvail.length);
    allAvail.forEach(a => {
      console.log(`  slot owner:${a.owner_email} type:${a.slot_type} days:${JSON.stringify(a.days_of_week)} start:${a.time_start} end:${a.time_end}`);
    });

    const candidates = allAvail
      .filter(a => a.owner_email !== user.email && !bookedAvailIds.has(a.id))
      .map(a => {
        const cov = slotCoverage(a, fromDate, toDate);
        console.log(`  coverage for ${a.owner_email} slot_type:${a.slot_type}:`, cov);
        return cov ? { ...a, covStart: cov[0], covEnd: cov[1], ownerResident: residentMap[a.owner_email] || null } : null;
      })
      .filter(Boolean);

    console.log("candidates after coverage:", candidates.map(c => `${c.owner_email} [${c.covStart}-${c.covEnd}]`));

    // Full coverage slots
    const full = candidates.filter(a => a.covStart <= fromMins && a.covEnd >= toMins);

    // Combos: pairs that together cover [fromMins, toMins] with no gap
    const partial = candidates.filter(a => !(a.covStart <= fromMins && a.covEnd >= toMins));
    const allForCombos = candidates; // include full ones too as potential combo partners
    const foundCombos = [];
    for (let i = 0; i < allForCombos.length; i++) {
      for (let j = i + 1; j < allForCombos.length; j++) {
        const a = allForCombos[i];
        const b = allForCombos[j];
        // They must be different owners
        if (a.owner_email === b.owner_email) continue;
        // Check if together they cover [fromMins, toMins] with no gap
        // Sort by start
        const [first, second] = a.covStart <= b.covStart ? [a, b] : [b, a];
        if (
          first.covStart <= fromMins &&
          second.covEnd >= toMins &&
          second.covStart <= first.covEnd // no gap
        ) {
          // Skip if first alone covers everything (already in full results)
          const firstAlone = first.covStart <= fromMins && first.covEnd >= toMins;
          const secondAlone = second.covStart <= fromMins && second.covEnd >= toMins;
          if (!firstAlone && !secondAlone) {
            foundCombos.push({ first, second });
          }
        }
      }
    }

    setResults(full);
    setCombos(foundCombos);
    setLoading(false);
  }

  function getDiscount() {
    const league = resident?.league;
    if (league === "Silver")   return 0.05;
    if (league === "Gold")     return 0.10;
    if (league === "Platinum") return 0.15;
    if (league === "Diamond")  return 0.20;
    return 0;
  }

  function calcCost(startMins, endMins) {
    const base = ((endMins - startMins) / 60) * 10;
    return Math.round(base * (1 - getDiscount()));
  }

  async function bookSlot(slot, startMins, endMins) {
    const fromDate = new Date(fromTime);
    const toDate = new Date(toTime);

    // Build actual start/end datetimes from minutes
    const startDt = new Date(fromDate);
    startDt.setHours(Math.floor(startMins / 60), startMins % 60, 0, 0);
    const endDt = new Date(fromDate);
    endDt.setHours(Math.floor(endMins / 60), endMins % 60, 0, 0);

    const cost = calcCost(startMins, endMins);
    const owner = slot.ownerResident;

    await base44.entities.Booking.create({
      parking_slot_id: slot.id,
      building_id: slot.building_id,
      renter_email: user.email,
      renter_name: user.full_name,
      owner_email: slot.owner_email,
      owner_name: owner?.user_name || slot.owner_email,
      spot_number: owner?.parking_spot || "?",
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
      total_credits: cost,
      status: "active",
    });

    return cost;
  }

  async function handleBookSingle(slot) {
    const fromMins = new Date(fromTime).getHours() * 60 + new Date(fromTime).getMinutes();
    const toMins = new Date(toTime).getHours() * 60 + new Date(toTime).getMinutes();
    const cost = calcCost(fromMins, toMins);

    if ((resident.credits || 0) < cost) {
      alert(`אין מספיק קרדיטים. יש לך ${resident.credits}, נדרש ${cost}`);
      return;
    }

    // Deduct from renter
    await base44.entities.Resident.update(resident.id, { credits: (resident.credits || 0) - cost });
    // Add to owner
    const ownerRes = await base44.entities.Resident.filter({ user_email: slot.owner_email });
    if (ownerRes.length > 0) {
      await base44.entities.Resident.update(ownerRes[0].id, { credits: (ownerRes[0].credits || 0) + cost });
    }

    await bookSlot(slot, fromMins, toMins);
    setResident(prev => ({ ...prev, credits: (prev.credits || 0) - cost }));
    setBookingId(slot.id);
    setThankYouSlots([{ ownerName: slot.ownerResident?.user_name || slot.owner_email, ownerPhone: slot.ownerResident?.phone || null, spotNumber: slot.ownerResident?.parking_spot || "?" }]);
    setResults([]);
    setCombos([]);
  }

  async function handleBookCombo(combo) {
    const { first, second } = combo;
    const fromMins = new Date(fromTime).getHours() * 60 + new Date(fromTime).getMinutes();
    const toMins = new Date(toTime).getHours() * 60 + new Date(toTime).getMinutes();

    // Determine actual split point
    const splitPoint = first.covEnd; // first ends, second takes over
    const cost1 = calcCost(fromMins, splitPoint);
    const cost2 = calcCost(splitPoint, toMins);
    const totalCost = cost1 + cost2;

    if ((resident.credits || 0) < totalCost) {
      alert(`אין מספיק קרדיטים. יש לך ${resident.credits}, נדרש ${totalCost}`);
      return;
    }

    await base44.entities.Resident.update(resident.id, { credits: (resident.credits || 0) - totalCost });

    // Add credits to both owners
    const [owner1Res, owner2Res] = await Promise.all([
      base44.entities.Resident.filter({ user_email: first.owner_email }),
      base44.entities.Resident.filter({ user_email: second.owner_email }),
    ]);
    await Promise.all([
      owner1Res.length > 0 && base44.entities.Resident.update(owner1Res[0].id, { credits: (owner1Res[0].credits || 0) + cost1 }),
      owner2Res.length > 0 && base44.entities.Resident.update(owner2Res[0].id, { credits: (owner2Res[0].credits || 0) + cost2 }),
    ]);

    await Promise.all([
      bookSlot(first, fromMins, splitPoint),
      bookSlot(second, splitPoint, toMins),
    ]);

    setResident(prev => ({ ...prev, credits: (prev.credits || 0) - totalCost }));
    setBookingId(`${first.id}-${second.id}`);
    setThankYouSlots([
      { ownerName: first.ownerResident?.user_name || first.owner_email, ownerPhone: first.ownerResident?.phone || null, spotNumber: first.ownerResident?.parking_spot || "?" },
      { ownerName: second.ownerResident?.user_name || second.owner_email, ownerPhone: second.ownerResident?.phone || null, spotNumber: second.ownerResident?.parking_spot || "?" },
    ]);
    setResults([]);
    setCombos([]);
  }

  const fmtMins = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  if (bookingId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        {thankYouSlots.map((s, i) => (
          <ThankYouWhatsApp
            key={i}
            ownerName={s.ownerName}
            ownerPhone={s.ownerPhone}
            spotNumber={s.spotNumber}
            onClose={() => setThankYouSlots(prev => prev.filter((_, idx) => idx !== i))}
          />
        ))}
        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: "var(--hanoo-green-light)" }}>
          <CheckCircle size={44} style={{ color: "var(--hanoo-green)" }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>הוזמן! 🎉</h2>
        <p className="mb-6" style={{ color: "var(--text-secondary)" }}>החניה שלך מוכנה מ-{format(new Date(fromTime), "HH:mm")} עד {format(new Date(toTime), "HH:mm")}</p>
        <button
          onClick={() => { setBookingId(null); setSearched(false); setResults([]); setCombos([]); }}
          className="w-full py-4 rounded-2xl font-bold text-white"
          style={{ background: "var(--hanoo-blue)" }}
        >
          חזור לחיפוש
        </button>
      </div>
    );
  }

  const hasAnyResults = results.length > 0 || combos.length > 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>
      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}
      <div className="pt-12 pb-6 px-5" style={{ background: "var(--surface-header)" }}>
        <div className="flex items-center justify-between">
          <div className="text-right">
            <h1 className="text-white text-xl font-bold">מצא חניה</h1>
            <p className="text-blue-200 text-sm">יתרת קרדיטים: {resident?.credits || 0}</p>
          </div>
          <button onClick={() => setMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.2)" }}>
            <Menu size={18} className="text-white" />
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="card p-3 mb-4 space-y-2">
          <label className="relative flex items-center gap-3 rounded-xl px-3 py-3 cursor-pointer overflow-hidden" style={{ background: "var(--btn-secondary-bg)" }}>
            <Clock size={16} style={{ color: "var(--text-secondary)" }} className="flex-none" />
            <span className="text-xs font-bold flex-none" style={{ color: "var(--text-secondary)" }}>ממתי?</span>
            <span className="flex-1 text-sm font-medium text-left" style={{ color: "var(--text-primary)" }}>
              {fromTime ? new Date(fromTime).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
            </span>
            <input type="datetime-local" value={fromTime} onChange={e => setFromTime(e.target.value)} className="absolute inset-0 w-full h-full cursor-pointer" style={{ opacity: 0 }} />
          </label>
          <div className="border-t mx-3" style={{ borderColor: "var(--surface-card-border)" }} />
          <label className="relative flex items-center gap-3 rounded-xl px-3 py-3 cursor-pointer overflow-hidden" style={{ background: "var(--btn-secondary-bg)" }}>
            <Clock size={16} style={{ color: "var(--text-secondary)" }} className="flex-none" />
            <span className="text-xs font-bold flex-none" style={{ color: "var(--text-secondary)" }}>עד מתי?</span>
            <span className="flex-1 text-sm font-medium text-left" style={{ color: "var(--text-primary)" }}>
              {toTime ? new Date(toTime).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
            </span>
            <input type="datetime-local" value={toTime} onChange={e => setToTime(e.target.value)} className="absolute inset-0 w-full h-full cursor-pointer" style={{ opacity: 0 }} />
          </label>
        </div>

        <button
          onClick={searchParking}
          disabled={loading || !resident}
          className="w-full py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 mb-4"
          style={{ background: "var(--hanoo-blue)", opacity: loading ? 0.7 : 1 }}
        >
          <Search size={18} />
          {loading ? "מחפש..." : "חפש חניה"}
        </button>

        {searched && !loading && !hasAnyResults && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🅿️</div>
          <p className="font-medium" style={{ color: "var(--text-secondary)" }}>אין חניות פנויות בזמן זה</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>נסה שעה אחרת</p>
        </div>
        )}

        {/* Single-slot results */}
        <div className="space-y-3">
          {results.map(slot => {
            const fromMins = new Date(fromTime).getHours() * 60 + new Date(fromTime).getMinutes();
            const toMins = new Date(toTime).getHours() * 60 + new Date(toTime).getMinutes();
            const cost = calcCost(fromMins, toMins);
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
                    {getDiscount() > 0 && (
                      <p className="text-xs font-bold text-green-600">{getDiscount() * 100}% הנחה 🎟️</p>
                    )}
                  </div>
                </div>
                <button onClick={() => handleBookSingle(slot)} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: "#007AFF" }}>
                  הזמן עכשיו
                </button>
              </div>
            );
          })}

          {/* Combo results */}
          {combos.map((combo, idx) => {
            const { first, second } = combo;
            const fromMins = new Date(fromTime).getHours() * 60 + new Date(fromTime).getMinutes();
            const toMins = new Date(toTime).getHours() * 60 + new Date(toTime).getMinutes();
            const splitPoint = first.covEnd;
            const cost1 = calcCost(fromMins, splitPoint);
            const cost2 = calcCost(splitPoint, toMins);
            const totalCost = cost1 + cost2;

            return (
              <div key={idx} className="card overflow-hidden">
                {/* Header */}
                <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-500">שילוב חניות</span>
                  <div className="text-right">
                    <span className="font-bold text-lg" style={{ color: "#007AFF" }}>{totalCost}</span>
                    <span className="text-gray-400 text-xs"> קרדיטים</span>
                  </div>
                </div>

                {/* First slot */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none" style={{ background: "#EBF4FF" }}>
                    <Car size={18} style={{ color: "#007AFF" }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">חניה #{first.ownerResident?.parking_spot || "?"}</p>
                    <p className="text-gray-500 text-xs">של {first.ownerResident?.user_name || first.owner_email}</p>
                  </div>
                  <div className="text-left flex-none">
                    <p className="text-sm font-bold text-gray-700">{fmtMins(fromMins)} – {fmtMins(splitPoint)}</p>
                    <p className="text-xs text-gray-400">{cost1} קרדיטים</p>
                  </div>
                </div>

                {/* Arrow divider */}
                <div className="flex items-center gap-2 px-4 py-1">
                  <div className="flex-1 border-t border-dashed border-gray-200" />
                  <ArrowLeft size={12} className="text-gray-300" />
                  <div className="flex-1 border-t border-dashed border-gray-200" />
                </div>

                {/* Second slot */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none" style={{ background: "#EBF4FF" }}>
                    <Car size={18} style={{ color: "#007AFF" }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800 text-sm">חניה #{second.ownerResident?.parking_spot || "?"}</p>
                    <p className="text-gray-500 text-xs">של {second.ownerResident?.user_name || second.owner_email}</p>
                  </div>
                  <div className="text-left flex-none">
                    <p className="text-sm font-bold text-gray-700">{fmtMins(splitPoint)} – {fmtMins(toMins)}</p>
                    <p className="text-xs text-gray-400">{cost2} קרדיטים</p>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <button onClick={() => handleBookCombo(combo)} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: "#007AFF" }}>
                    הזמן את השילוב
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
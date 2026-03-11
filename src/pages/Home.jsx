import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Car, Plus, Clock, Coins, ChevronLeft, Bell } from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [building, setBuilding] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [myActiveSlot, setMyActiveSlot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const u = await base44.auth.me();
      setUser(u);

      const residents = await base44.entities.Resident.filter({ user_email: u.email });
      if (residents.length === 0) {
        navigate(createPageUrl("Onboarding"));
        return;
      }
      const r = residents[0];
      setResident(r);

      if (r.status !== "approved") {
        setLoading(false);
        return;
      }

      const [buildings, bookings, slots] = await Promise.all([
        base44.entities.Building.filter({ id: r.building_id }),
        base44.entities.Booking.filter({ renter_email: u.email, status: "active" }),
        base44.entities.ParkingSlot.filter({ owner_email: u.email, status: "available" }),
      ]);

      if (buildings.length > 0) setBuilding(buildings[0]);
      if (bookings.length > 0) setActiveBooking(bookings[0]);
      if (slots.length > 0) setMyActiveSlot(slots[0]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function endBooking(booking) {
    const now = new Date().toISOString();
    await base44.entities.Booking.update(booking.id, { status: "completed", end_time: now });

    // Return credits proportionally
    const start = parseISO(booking.start_time);
    const end = new Date();
    const hours = Math.max(0.5, (end - start) / 3600000);
    const slotData = await base44.entities.ParkingSlot.filter({ id: booking.parking_slot_id });
    const pricePerHour = slotData[0]?.price_per_hour || 10;
    const actualCost = Math.round(hours * pricePerHour);
    const originalCost = booking.total_credits;
    const refund = originalCost - actualCost;

    if (refund > 0) {
      const renterRes = await base44.entities.Resident.filter({ user_email: booking.renter_email });
      if (renterRes.length > 0) {
        await base44.entities.Resident.update(renterRes[0].id, {
          credits: (renterRes[0].credits || 0) + refund,
        });
      }
    }

    await base44.entities.ParkingSlot.update(booking.parking_slot_id, { status: "available" });
    loadData();
  }

  async function deactivateSlot(slot) {
    await base44.entities.ParkingSlot.update(slot.id, { status: "completed" });
    loadData();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#007AFF" }}>
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="pacifico text-2xl" style={{ fontFamily: "Pacifico, cursive" }}>Hanoo</p>
        </div>
      </div>
    );
  }

  if (resident?.status === "pending") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "#EBF4FF" }}>
          <Clock size={36} style={{ color: "#007AFF" }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ממתין לאישור</h2>
        <p className="text-gray-500">בעל הבניין עדיין לא אישר את בקשתך. נעדכן אותך ברגע שיאושר!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="pt-12 pb-6 px-5" style={{ background: "#007AFF" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-200 text-sm">שלום,</p>
            <h1 className="text-white text-xl font-bold">{user?.full_name || "שכן יקר"}</h1>
          </div>
          <span className="pacifico text-white text-2xl" style={{ fontFamily: "Pacifico, cursive" }}>Hanoo</span>
        </div>

        {/* Credits Card */}
        <div className="bg-white bg-opacity-20 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-xs mb-1">יתרת קרדיטים</p>
            <p className="text-white text-3xl font-bold">{resident?.credits || 0}</p>
            <p className="text-blue-200 text-xs">קרדיטים זמינים</p>
          </div>
          <div className="w-14 h-14 bg-white bg-opacity-25 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl">₪</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Bonus credits alert */}
        {resident && !resident.bonus_credits_received && (
          <div className="rounded-2xl p-4" style={{ background: "#FFF8E7", border: "1px solid #FFD700" }}>
            <p className="font-bold text-amber-800 mb-1">🎁 קבל 200 קרדיטים!</p>
            <p className="text-amber-700 text-sm">פרסם זמינות של לפחות שעתיים השבוע וקבל 200 קרדיטים מתנה</p>
            <button
              onClick={() => navigate(createPageUrl("PublishParking"))}
              className="mt-3 w-full py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "#F59E0B" }}
            >
              פרסם עכשיו
            </button>
          </div>
        )}

        {/* Active booking */}
        {activeBooking && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <p className="font-bold text-gray-800">חניה פעילה</p>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "#EBF4FF" }}>
                <Car size={24} style={{ color: "#007AFF" }} />
              </div>
              <div>
                <p className="font-bold text-gray-800">חניה #{activeBooking.spot_number}</p>
                <p className="text-gray-500 text-sm">של {activeBooking.owner_name}</p>
                <p className="text-gray-400 text-xs">עד {format(parseISO(activeBooking.end_time), "HH:mm")}</p>
              </div>
            </div>
            <button
              onClick={() => endBooking(activeBooking)}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: "#FF3B30" }}
            >
              סיים שימוש בחניה
            </button>
          </div>
        )}

        {/* My slot status */}
        {myActiveSlot && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
              <p className="font-bold text-gray-800">החניה שלי - פרסמתי</p>
            </div>
            <p className="text-gray-500 text-sm mb-3">
              פתוחה {format(parseISO(myActiveSlot.available_from), "HH:mm")} – {format(parseISO(myActiveSlot.available_until), "HH:mm")}
            </p>
            <button
              onClick={() => deactivateSlot(myActiveSlot)}
              className="w-full py-3 rounded-xl font-semibold"
              style={{ background: "#EBF4FF", color: "#007AFF" }}
            >
              הסר פרסום
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate(createPageUrl("FindParking"))}
            className="card p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#007AFF" }}>
              <Car size={22} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">מצא חניה</span>
          </button>
          <button
            onClick={() => navigate(createPageUrl("PublishParking"))}
            className="card p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#34C759" }}>
              <Plus size={22} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">פרסם חניה</span>
          </button>
        </div>

        {/* Building info */}
        {building && (
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-1">הבניין שלי</p>
            <p className="font-bold text-gray-800">{building.name}</p>
            <p className="text-gray-500 text-sm">{building.address}, {building.city}</p>
          </div>
        )}
      </div>
    </div>
  );
}
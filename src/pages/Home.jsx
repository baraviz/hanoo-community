import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Car, Plus, Clock, Gift, AlertTriangle, ParkingSquare, Menu } from "lucide-react";
import SideMenu from "@/components/SideMenu";
import TimeWheelPicker from "@/components/TimeWheelPicker";
import DailyUpdateModal from "@/components/DailyUpdateModal";
import CancelAvailabilitySheet from "@/components/CancelAvailabilitySheet";
import PullToRefreshWrapper from "@/components/PullToRefreshWrapper";
import { format, isAfter, isBefore, parseISO } from "date-fns";

export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [building, setBuilding] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [myActiveSlot, setMyActiveSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recurringSlots, setRecurringSlots] = useState([]);
  const [removingSlot, setRemovingSlot] = useState(false);
  const [endingBooking, setEndingBooking] = useState(false);
  const [showStatusDrawer, setShowStatusDrawer] = useState(false);
  const [closingDrawer, setClosingDrawer] = useState(false);
  const [availUntilMinutes, setAvailUntilMinutes] = useState(null);
  const [blockUntilHour, setBlockUntilHour] = useState(null);
  const [activeBlocks, setActiveBlocks] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelSheet, setCancelSheet] = useState(null); // { blockInfo, onConfirm }

  function closeStatusDrawer() {
    setClosingDrawer(true);
    setTimeout(() => { setShowStatusDrawer(false); setClosingDrawer(false); }, 280);
  }

  function isAvailableNow() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    // Check temp slot
    if (myActiveSlot && new Date(myActiveSlot.start_at) <= now && new Date(myActiveSlot.end_at) > now) return true;
    // Check recurring (but not if blocked)
    const recurring = recurringSlots.find(s => s.days_of_week?.includes(dayOfWeek) && s.time_start <= minutes && s.time_end > minutes);
    if (!recurring) return false;
    // Check if there's an active block
    const blocked = activeBlocks.some(b => new Date(b.start_at) <= now && new Date(b.end_at) > now);
    return !blocked;
  }

  function getActiveBlock() {
    const now = new Date();
    return activeBlocks.find(b => new Date(b.start_at) <= now && new Date(b.end_at) > now) || null;
  }

  function isRecurringActiveNow() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return !!recurringSlots.find(s => s.days_of_week?.includes(dayOfWeek) && s.time_start <= minutes && s.time_end > minutes);
  }

  function getBlockUntilOptions() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const recurring = recurringSlots.find(s => s.days_of_week?.includes(dayOfWeek) && s.time_start <= minutes && s.time_end > minutes);
    if (!recurring) return [];
    const options = [];
    let t = Math.ceil((minutes + 1) / 15) * 15;
    while (t <= recurring.time_end) {
      options.push(t);
      t += 15;
    }
    return options;
  }

  function getNextAvailableText() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    // Check upcoming temp
    const upcomingTemp = myActiveSlot && new Date(myActiveSlot.start_at) > now ? myActiveSlot : null;
    if (upcomingTemp) {
      return `זמין מ-${format(parseISO(upcomingTemp.start_at), "HH:mm")}`;
    }
    // Check if there's an active block that ends inside a recurring slot → resume at block end
    const activeBlock = activeBlocks.find(b => new Date(b.start_at) <= now && new Date(b.end_at) > now);
    if (activeBlock) {
      const blockEnd = new Date(activeBlock.end_at);
      const blockEndMinutes = blockEnd.getHours() * 60 + blockEnd.getMinutes();
      const blockEndDay = blockEnd.getDay();
      const coveredByRecurring = recurringSlots.find(s =>
        s.days_of_week?.includes(blockEndDay) &&
        s.time_start <= blockEndMinutes &&
        s.time_end > blockEndMinutes
      );
      if (coveredByRecurring) {
        return `זמין היום מ-${format(blockEnd, "HH:mm")}`;
      }
    }
    // Check recurring today later
    const todayRecurring = recurringSlots.filter(s => s.days_of_week?.includes(dayOfWeek) && s.time_start > minutes);
    if (todayRecurring.length > 0) {
      const next = todayRecurring.sort((a, b) => a.time_start - b.time_start)[0];
      const h = Math.floor(next.time_start / 60), m = next.time_start % 60;
      return `זמין היום מ-${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
    }
    // Check future days
    for (let i = 1; i <= 7; i++) {
      const day = (dayOfWeek + i) % 7;
      const daySlots = recurringSlots.filter(s => s.days_of_week?.includes(day));
      if (daySlots.length > 0) {
        const next = daySlots.sort((a, b) => a.time_start - b.time_start)[0];
        const days = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];
        const h = Math.floor(next.time_start / 60), m = next.time_start % 60;
        return `זמין ביום ${days[day]} מ-${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
      }
    }
    return null;
  }

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

      const [buildings, bookings, tempSlots, recurring, blocks] = await Promise.all([
        base44.entities.Building.filter({ id: r.building_id }),
        base44.entities.Booking.filter({ renter_email: u.email, status: "active" }),
        base44.entities.WeeklyAvailability.filter({ owner_email: u.email, slot_type: "temp" }),
        base44.entities.WeeklyAvailability.filter({ owner_email: u.email, slot_type: "recurring" }),
        base44.entities.WeeklyAvailability.filter({ owner_email: u.email, slot_type: "block" }),
      ]);

      if (buildings.length > 0) setBuilding(buildings[0]);
      if (bookings.length > 0) setActiveBooking(bookings[0]);
      setRecurringSlots(recurring);
      setActiveBlocks(blocks.filter(b => new Date(b.end_at) > new Date()));
      // Show active temp slot (end_at in the future)
      const activeTemp = tempSlots.find(s => new Date(s.end_at) > new Date());
      if (activeTemp) setMyActiveSlot(activeTemp);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function endBooking(booking) {
    setEndingBooking(true);
    setActiveBooking(null); // חיווי מיידי
    const now = new Date().toISOString();
    await base44.entities.Booking.update(booking.id, { status: "completed", end_time: now });

    // Return credits proportionally
    const start = parseISO(booking.start_time);
    const end = new Date();
    const hours = Math.max(0.5, (end - start) / 3600000);
    const actualCost = Math.round(hours * 10);
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
    setEndingBooking(false);
    loadData();
  }

  async function confirmDeactivate() {
    setRemovingSlot(true);
    // Always delete temp if exists
    if (myActiveSlot) {
      setMyActiveSlot(null);
      await base44.entities.WeeklyAvailability.delete(myActiveSlot.id);
    }
    // If recurring is active, create a block until chosen hour
    const effectiveBlockUntil = blockUntilHour ?? getBlockUntilOptions()[0];
    if (isRecurringActiveNow() && effectiveBlockUntil != null) {
      const now = new Date();
      const blockEnd = new Date(now);
      blockEnd.setHours(Math.floor(effectiveBlockUntil / 60), effectiveBlockUntil % 60, 0, 0);
      await base44.entities.WeeklyAvailability.create({
        resident_id: resident.id,
        owner_email: user.email,
        building_id: resident.building_id,
        slot_type: "block",
        start_at: now.toISOString(),
        end_at: blockEnd.toISOString(),
      });
    }
    setRemovingSlot(false);
    loadData();
  }

  function getAvailUntilOptions() {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const options = [];
    let t = Math.ceil((currentMinutes + 1) / 15) * 15;
    while (t <= 24 * 60) {
      options.push(t);
      t += 15;
    }
    return options;
  }

  async function makeAvailable() {
    if (!resident) return;
    closeStatusDrawer();
    const now = new Date();

    // If there's an active block suppressing a recurring slot → delete the block to resume
    const currentBlock = getActiveBlock();
    if (currentBlock && isRecurringActiveNow()) {
      await base44.entities.WeeklyAvailability.delete(currentBlock.id);
      setActiveBlocks(prev => prev.filter(b => b.id !== currentBlock.id));
      loadData();
      return;
    }

    const end = new Date(now);
    end.setHours(Math.floor(availUntilMinutes / 60), availUntilMinutes % 60, 0, 0);
    const rec = await base44.entities.WeeklyAvailability.create({
      resident_id: resident.id,
      owner_email: user.email,
      building_id: resident.building_id,
      slot_type: "temp",
      start_at: now.toISOString(),
      end_at: end.toISOString(),
    });
    setMyActiveSlot(rec);
    loadData();
  }

  function getResumeUntilText() {
    // When unblocking a recurring slot, find when the recurring slot ends
    const currentBlock = getActiveBlock();
    if (!currentBlock) return null;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const recurring = recurringSlots.find(s => s.days_of_week?.includes(dayOfWeek) && s.time_start <= minutes && s.time_end > minutes);
    if (!recurring) return null;
    const h = Math.floor(recurring.time_end / 60), m = recurring.time_end % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
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
      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}
      <DailyUpdateModal user={user} resident={resident} />
      {cancelSheet && (
        <CancelAvailabilitySheet
          blockInfo={cancelSheet.blockInfo}
          ownerEmail={user?.email}
          onConfirm={cancelSheet.onConfirm}
          onClose={() => setCancelSheet(null)}
        />
      )}
      {/* Status drawer */}
      {showStatusDrawer && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.4)", animation: closingDrawer ? "fadeOut 0.22s ease-in forwards" : "fadeIn 0.22s ease-out" }}
          onClick={closeStatusDrawer}
        >
          <div
            className="bg-white rounded-t-3xl w-full p-6 space-y-4"
            style={{ paddingBottom: "calc(80px + 1.5rem)", animation: closingDrawer ? "slideDown 0.22s ease-in forwards" : "slideUp 0.22s ease-out" }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`
              @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
              @keyframes slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            `}</style>
            <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mb-2" />
            {isAvailableNow() ? (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "#FEE2E2" }}>
                  <AlertTriangle size={24} style={{ color: "#EF4444" }} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 text-center">השבתת זמינות</h2>
                {!resident?.bonus_credits_received && (
                  <div className="rounded-2xl p-3 text-center" style={{ background: "#FFF8E7", border: "1px solid #FFD700" }}>
                    <p className="text-amber-700 text-sm font-medium">⚠️ זהו הפרסום הראשון שלך — הסרה תמנע ממך לקבל 100 קרדיטים בונוס</p>
                  </div>
                )}
                {myActiveSlot && new Date(myActiveSlot.start_at) <= new Date() && new Date(myActiveSlot.end_at) > new Date() ? (
                  <p className="text-gray-500 text-center text-sm">
                    הזמינות שנקבעה עד השעה <span className="font-bold text-gray-700">{format(parseISO(myActiveSlot.end_at), "HH:mm")}</span> תוסר
                  </p>
                ) : null}
                {isRecurringActiveNow() && (() => {
                  const opts = getBlockUntilOptions();
                  if (opts.length === 0) return null;
                  return (
                    <div>
                      <p className="text-gray-500 text-center text-sm mb-2">עד מתי להשבית?</p>
                      <TimeWheelPicker
                        options={opts}
                        value={blockUntilHour ?? opts[0]}
                        onChange={setBlockUntilHour}
                        color="#FF3B30"
                      />
                    </div>
                  );
                })()}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={closeStatusDrawer} className="py-3 rounded-2xl font-bold text-gray-700" style={{ background: "#F3F4F6" }}>ביטול</button>
                  <button
                   onClick={() => {
                     // Build blockInfo for the current active availability window
                     const now = new Date();
                     const effectiveEnd = blockUntilHour ?? getBlockUntilOptions()[0];
                     const endDate = effectiveEnd != null
                       ? (() => { const d = new Date(now); d.setHours(Math.floor(effectiveEnd / 60), effectiveEnd % 60, 0, 0); return d; })()
                       : myActiveSlot ? new Date(myActiveSlot.end_at) : new Date(now.getTime() + 3600000);
                     closeStatusDrawer();
                     setTimeout(() => {
                       setCancelSheet({
                         blockInfo: { type: "temp", start_at: now.toISOString(), end_at: endDate.toISOString() },
                         onConfirm: () => { setCancelSheet(null); confirmDeactivate(); }
                       });
                     }, 300);
                   }}
                   className="py-3 rounded-2xl font-bold text-white"
                   style={{ background: "#FF3B30" }}
                  >
                   השבת
                  </button>
                </div>
                {(() => {
                  const nextText = getNextAvailableText();
                  if (!nextText) return null;
                  return (
                    <p className="text-gray-400 text-center text-xs pt-1">
                      לפי{" "}
                      <span
                        className="underline cursor-pointer text-blue-500"
                        onClick={() => { closeStatusDrawer(); navigate(createPageUrl("MyParking")); }}
                      >
                        יומן הזמינות
                      </span>
                      , החניה תהיה זמינה שוב {nextText.replace("זמין היום מ-", "היום מ-").replace("זמין מ-", "מ-").replace("ביום ", "ביום ").replace(/^זמין /, "")}
                    </p>
                  );
                })()}
              </>
            ) : getActiveBlock() && isRecurringActiveNow() ? (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "#EBF4FF" }}>
                  <ParkingSquare size={24} style={{ color: "#007AFF" }} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 text-center">פתיחת חניה מחדש</h2>
                {(() => {
                  const until = getResumeUntilText();
                  return until ? (
                    <p className="text-gray-500 text-center text-sm">
                      החניה תהיה זמינה עד השעה <span className="font-bold text-gray-700">{until}</span>
                    </p>
                  ) : null;
                })()}
                <p className="text-gray-400 text-center text-xs pt-1">
                  לפי{" "}
                  <span
                    className="underline cursor-pointer text-blue-500"
                    onClick={() => { closeStatusDrawer(); navigate(createPageUrl("MyParking")); }}
                  >
                    יומן הזמינות
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={closeStatusDrawer} className="py-3 rounded-2xl font-bold text-gray-700" style={{ background: "#F3F4F6" }}>ביטול</button>
                  <button onClick={makeAvailable} className="py-3 rounded-2xl font-bold text-white" style={{ background: "#007AFF" }}>פתח חניה</button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "#EBF4FF" }}>
                  <ParkingSquare size={24} style={{ color: "#007AFF" }} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 text-center">הפוך את החניה לזמינה</h2>
                <p className="text-gray-500 text-center text-sm">עד איזו שעה?</p>
                <TimeWheelPicker
                  options={getAvailUntilOptions()}
                  value={availUntilMinutes}
                  onChange={setAvailUntilMinutes}
                  color="#007AFF"
                />
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={closeStatusDrawer} className="py-3 rounded-2xl font-bold text-gray-700" style={{ background: "#F3F4F6" }}>ביטול</button>
                  <button
                    onClick={makeAvailable}
                    disabled={availUntilMinutes === null}
                    className="py-3 rounded-2xl font-bold text-white"
                    style={{ background: "#007AFF", opacity: availUntilMinutes === null ? 0.4 : 1 }}
                  >פתח חניה</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="pt-12 pb-6 px-5" style={{ background: "#007AFF" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-right">
            <p className="text-blue-200 text-sm">שלום,</p>
            <h1 className="text-white text-xl font-bold">{user?.full_name || "שכן יקר"}</h1>
          </div>
          <button onClick={() => setMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.2)" }}>
            <Menu size={18} className="text-white" />
          </button>
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

      <PullToRefreshWrapper onRefresh={loadData} className="px-5 py-5 space-y-4">
        {/* Action buttons — TOP */}
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
            onClick={() => navigate("/MyParking?view=list")}
            className="card p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#007AFF" }}>
              <Plus size={22} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">פרסם חניה</span>
          </button>
        </div>

        {/* Bonus credits alert */}
        {resident && !resident.bonus_credits_received && (
          <div className="rounded-2xl p-4" style={{ background: "#FFF8E7", border: "1px solid #FFD700" }}>
            <div className="flex items-center gap-2 mb-1">
              <Gift size={16} className="text-amber-700" />
              <p className="font-bold text-amber-800">קבל 100 קרדיטים בונוס!</p>
            </div>
            <p className="text-amber-700 text-sm">פרסם זמינות של לפחות שעתיים בפעם הראשונה וקבל 100 קרדיטים (כבר קיבלת 50 בהצטרפות)</p>
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
              disabled={endingBooking}
              className="w-full py-3 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: "#FF3B30", opacity: endingBooking ? 0.6 : 1 }}
            >
              {endingBooking ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />מסיים...</>
              ) : "סיים שימוש בחניה"}
            </button>
          </div>
        )}

        {/* Parking status card — BOTTOM */}
        {(recurringSlots.length > 0 || myActiveSlot) && (() => {
          const available = isAvailableNow();
          const nextText = !available ? getNextAvailableText() : null;
          let activeUntil = null;
          if (available) {
            if (myActiveSlot && new Date(myActiveSlot.start_at) <= new Date()) {
              activeUntil = format(parseISO(myActiveSlot.end_at), "HH:mm");
            } else {
              const now = new Date();
              const dayOfWeek = now.getDay();
              const minutes = now.getHours() * 60 + now.getMinutes();
              const rec = recurringSlots.find(s => s.days_of_week?.includes(dayOfWeek) && s.time_start <= minutes && s.time_end > minutes);
              if (rec) {
                const h = Math.floor(rec.time_end / 60), m = rec.time_end % 60;
                activeUntil = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
              }
            }
          }
          return (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ParkingSquare size={18} style={{ color: "#007AFF" }} />
                  <p className="font-bold text-gray-800">החניה שלי</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: available ? "#D1FAE5" : "#FEE2E2", color: available ? "#059669" : "#DC2626" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: available ? "#34C759" : "#EF4444" }} />
                  {available ? "זמינה כעת" : "לא זמינה כעת"}
                </div>
              </div>
              {available && activeUntil && (
                <p className="text-gray-500 text-sm mb-3">זמין עד {activeUntil}</p>
              )}
              {!available && nextText && (
                <p className="text-gray-400 text-sm mb-3">{nextText}</p>
              )}
              <button
                onClick={() => { setBlockUntilHour(null); const opts = (() => { const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes(); const o = []; let t = Math.ceil((cur + 1) / 15) * 15; while (t <= 24 * 60) { o.push(t); t += 15; } return o; })(); setAvailUntilMinutes(opts[0] ?? null); setShowStatusDrawer(true); }}
                disabled={removingSlot}
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ background: available ? "#FEE2E2" : "#EBF4FF", color: available ? "#DC2626" : "#007AFF", opacity: removingSlot ? 0.6 : 1 }}
              >
                {removingSlot
                  ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />טוען...</>
                  : available ? "השבת זמינות" : "הפוך את החניה לזמינה"}
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
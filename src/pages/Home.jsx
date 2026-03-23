// Home page — cache bust 2
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, Plus, Clock, Car, Gift, AlertTriangle, ParkingSquare, Menu, ChevronLeft } from "lucide-react";
import SideMenu from "@/components/SideMenu";
import { useAppNavigation } from "@/lib/NavigationContext";
import TimeWheelPicker from "@/components/TimeWheelPicker";
import DailyUpdateModal from "@/components/DailyUpdateModal";
import CancelAvailabilitySheet from "@/components/CancelAvailabilitySheet";
import PullToRefreshWrapper from "@/components/PullToRefreshWrapper";
import { format, isAfter, isBefore, parseISO } from "date-fns";

export default function Home() {
  const navigate = useNavigate();
  const { push } = useAppNavigation();
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [building, setBuilding] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [myActiveSlot, setMyActiveSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recurringSlots, setRecurringSlots] = useState([]);
  const [removingSlot, setRemovingSlot] = useState(false);
  const [showStatusDrawer, setShowStatusDrawer] = useState(false);
  const [closingDrawer, setClosingDrawer] = useState(false);
  const [availUntilMinutes, setAvailUntilMinutes] = useState(null);
  const [blockUntilHour, setBlockUntilHour] = useState(null);
  const [activeBlocks, setActiveBlocks] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelSheet, setCancelSheet] = useState(null); // { blockInfo, onConfirm }
  const [displayedCredits, setDisplayedCredits] = useState(0);


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
        navigate("/Onboarding");
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

      // Check for expired bookings (still "active" but end_time passed)
      const now = new Date();
      const expiredBookings = bookings.filter(b => new Date(b.end_time) < now);
      const validBookings = bookings.filter(b => new Date(b.end_time) >= now);

      if (validBookings.length > 0) setActiveBooking(validBookings[0]);

      // Mark expired bookings as completed in background
      expiredBookings.forEach(b => {
        base44.entities.Booking.update(b.id, { status: "completed" }).catch(() => {});
      });

      // Animate credits counter
      const targetCredits = r.credits || 0;
      if (targetCredits > 0) {
        const duration = 900;
        const steps = 30;
        const increment = targetCredits / steps;
        let current = 0;
        const interval = setInterval(() => {
          current += increment;
          if (current >= targetCredits) {
            setDisplayedCredits(targetCredits);
            clearInterval(interval);
          } else {
            setDisplayedCredits(Math.floor(current));
          }
        }, duration / steps);
      }
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface-header)" }}>
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="pacifico text-2xl">Hanoo</p>
        </div>
      </div>
    );
  }

  if (resident?.status === "pending") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: "var(--surface-page)" }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--hanoo-blue-light)" }}>
          <Clock size={36} style={{ color: "var(--hanoo-blue)" }} />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>ממתין לאישור</h2>
        <p style={{ color: "var(--text-secondary)" }}>בעל הבניין עדיין לא אישר את בקשתך. נעדכן אותך ברגע שיאושר!</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>
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
            className="rounded-t-3xl w-full p-6 space-y-4"
            style={{ background: "var(--sheet-bg)", paddingBottom: "calc(80px + 1.5rem)", animation: closingDrawer ? "slideDown 0.22s ease-in forwards" : "slideUp 0.22s ease-out" }}
            onClick={e => e.stopPropagation()}
          >
            <style>{`
              @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
              @keyframes slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            `}</style>
            <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: "var(--sheet-handle)" }} />
            {isAvailableNow() ? (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--hanoo-red-light)" }}>
                  <AlertTriangle size={24} style={{ color: "var(--hanoo-red)" }} />
                </div>
                <h2 className="text-xl font-bold text-center" style={{ color: "var(--text-primary)" }}>השבתת זמינות</h2>
                {!resident?.bonus_credits_received && (
                  <div className="rounded-2xl p-3 text-center" style={{ background: "#FFF8E7", border: "1px solid #FFD700" }}>
                    <p className="text-amber-700 text-sm font-medium">⚠️ זהו הפרסום הראשון שלך — הסרה תמנע ממך לקבל 100 קרדיטים בונוס</p>
                  </div>
                )}
                {myActiveSlot && new Date(myActiveSlot.start_at) <= new Date() && new Date(myActiveSlot.end_at) > new Date() ? (
                  <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                    הזמינות שנקבעה עד השעה <span className="font-bold" style={{ color: "var(--text-primary)" }}>{format(parseISO(myActiveSlot.end_at), "HH:mm")}</span> תוסר
                  </p>
                ) : null}
                {isRecurringActiveNow() && (() => {
                  const opts = getBlockUntilOptions();
                  if (opts.length === 0) return null;
                  return (
                    <div>
                      <p className="text-center text-sm mb-2" style={{ color: "var(--text-secondary)" }}>עד מתי להשבית?</p>
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
                  <button onClick={closeStatusDrawer} className="py-3 rounded-2xl font-bold" style={{ background: "var(--btn-secondary-bg)", color: "var(--btn-secondary-text)" }}>ביטול</button>
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
                   style={{ background: "var(--hanoo-red)" }}
                   >
                    השבת
                   </button>
                </div>
                {(() => {
                  const nextText = getNextAvailableText();
                  if (!nextText) return null;
                  return (
                    <p className="text-center text-xs pt-1" style={{ color: "var(--text-tertiary)" }}>
                      לפי{" "}
                      <span
                        className="underline cursor-pointer"
                        style={{ color: "var(--hanoo-blue)" }}
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
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--hanoo-blue-light)" }}>
                  <ParkingSquare size={24} style={{ color: "var(--hanoo-blue)" }} />
                </div>
                <h2 className="text-xl font-bold text-center" style={{ color: "var(--text-primary)" }}>פתיחת חניה מחדש</h2>
                {(() => {
                  const until = getResumeUntilText();
                  return until ? (
                    <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                      החניה תהיה זמינה עד השעה <span className="font-bold" style={{ color: "var(--text-primary)" }}>{until}</span>
                    </p>
                  ) : null;
                })()}
                <p className="text-center text-xs pt-1" style={{ color: "var(--text-tertiary)" }}>
                  לפי{" "}
                  <span
                    className="underline cursor-pointer"
                    style={{ color: "var(--hanoo-blue)" }}
                    onClick={() => { closeStatusDrawer(); navigate(createPageUrl("MyParking")); }}
                  >
                    יומן הזמינות
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={closeStatusDrawer} className="py-3 rounded-2xl font-bold" style={{ background: "var(--btn-secondary-bg)", color: "var(--btn-secondary-text)" }}>ביטול</button>
                  <button onClick={makeAvailable} className="py-3 rounded-2xl font-bold text-white" style={{ background: "var(--hanoo-blue)" }}>פתח חניה</button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "var(--hanoo-blue-light)" }}>
                  <ParkingSquare size={24} style={{ color: "var(--hanoo-blue)" }} />
                </div>
                <h2 className="text-xl font-bold text-center" style={{ color: "var(--text-primary)" }}>הפוך את החניה לזמינה</h2>
                <p className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>עד איזו שעה?</p>
                <TimeWheelPicker
                  options={getAvailUntilOptions()}
                  value={availUntilMinutes}
                  onChange={setAvailUntilMinutes}
                  color="#007AFF"
                />
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button onClick={closeStatusDrawer} className="py-3 rounded-2xl font-bold" style={{ background: "var(--btn-secondary-bg)", color: "var(--btn-secondary-text)" }}>ביטול</button>
                  <button
                    onClick={makeAvailable}
                    disabled={availUntilMinutes === null}
                    className="py-3 rounded-2xl font-bold text-white"
                    style={{ background: "var(--hanoo-blue)", opacity: availUntilMinutes === null ? 0.4 : 1 }}
                  >פתח חניה</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}


      {/* Header */}
      <div className="pt-safe pb-6 px-5" style={{ background: "var(--surface-header)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="text-right">
            <p className="text-blue-200 text-sm">שלום,</p>
            <h1 className="text-white text-xl font-bold">{user?.full_name || "שכן יקר"}</h1>
          </div>
          <button aria-label="פתח תפריט" onClick={() => setMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.18)" }}>
            <Menu size={18} className="text-white" aria-hidden="true" />
          </button>
        </div>

        {/* Credits Card */}
        {(() => {
          const credits = resident?.credits || 0;
          const league = resident?.league || "Bronze";
          const discountMap = { Bronze: 1, Silver: 0.9, Gold: 0.8, Platinum: 0.7, Diamond: 0.6 };
          const pricePerHour = 10;
          const effectivePrice = pricePerHour * (discountMap[league] || 1);
          const hours = effectivePrice > 0 ? (credits / effectivePrice).toFixed(1) : 0;
          return (
            <div className="bg-white bg-opacity-20 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs mb-1">יתרת קרדיטים</p>
                <p className="text-white text-3xl font-bold">{displayedCredits}</p>
                <p className="text-blue-200 text-xs">שווה ערך ל-{hours} שעות חניה</p>
              </div>
              <div className="w-14 h-14 bg-white bg-opacity-25 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl">₪</span>
              </div>
            </div>
          );
        })()}
      </div>

      <PullToRefreshWrapper onRefresh={loadData}>
      <div className="px-5 py-5 space-y-4">
        {/* Action buttons — TOP */}
        <div className="grid grid-cols-2 gap-3">
          <button
            aria-label="מצא חניה פנויה"
            onClick={() => push("/FindParking")}
            className="card p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform select-none"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--hanoo-blue)" }}>
              <Search size={22} className="text-white" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold select-none" style={{ color: "var(--text-primary)" }}>מצא חניה</span>
          </button>
          <button
            aria-label="פרסם את החניה שלך"
            onClick={() => push("/MyParking")}
            className="card p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform select-none"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--hanoo-blue)" }}>
              <Plus size={22} className="text-white" />
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>פרסם חניה</span>
          </button>
        </div>

        {/* Bonus credits alert */}
        {resident && !resident.bonus_credits_received && (
          <div className="rounded-2xl p-4" style={{ background: "var(--hanoo-orange-light)", border: "1px solid var(--hanoo-yellow)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Gift size={16} style={{ color: "var(--hanoo-orange)" }} />
              <p className="font-bold" style={{ color: "var(--hanoo-orange)" }}>קבל 100 קרדיטים בונוס!</p>
            </div>
            <p className="text-sm" style={{ color: "var(--hanoo-orange)" }}>פרסם זמינות של לפחות שעתיים בפעם הראשונה וקבל 100 קרדיטים (כבר קיבלת 50 בהצטרפות)</p>
            <button
              onClick={() => navigate(createPageUrl("PublishParking"))}
              className="mt-3 w-full py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: "var(--hanoo-orange)" }}
            >
              פרסם עכשיו
            </button>
          </div>
        )}

        {/* Upcoming bookings */}
        {activeBooking && (() => {
          const now = new Date();
          const isActive = new Date(activeBooking.start_time) <= now && now < new Date(activeBooking.end_time);
          return (
            <div>
              <h3 className="text-sm font-normal mb-3 px-1" style={{ color: "var(--text-primary)" }}>הזמנות קרובות</h3>
              <button
                onClick={() => push(`/BookingDetails/${activeBooking.id}`)}
                className="card flex flex-col gap-3 active:opacity-75 transition-opacity w-full"
                style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)", padding: "1rem" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-right flex-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none" style={{ background: "var(--hanoo-blue-light)" }}>
                      <Car size={18} style={{ color: "var(--hanoo-blue)" }} />
                    </div>
                    <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                      חניה #{activeBooking.spot_number}
                    </p>
                  </div>
                  {isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-none" style={{ background: "var(--hanoo-green-light)", color: "var(--hanoo-green)" }}>
                      פעיל כעת
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    של {activeBooking.owner_name} · {format(parseISO(activeBooking.start_time), "HH:mm")}–{format(parseISO(activeBooking.end_time), "HH:mm")}
                  </p>
                  <ChevronLeft size={20} style={{ color: "var(--text-tertiary)" }} />
                </div>
              </button>
            </div>
          );
        })()}

        {/* Parking status — title and card */}
        {(recurringSlots.length > 0 || myActiveSlot) && (
          <div>
            <h3 className="text-sm font-normal mb-3 px-1" style={{ color: "var(--text-primary)" }}>החניה שלי</h3>
            {(() => {
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
                <div></div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: available ? "var(--hanoo-green-light)" : "var(--hanoo-red-light)", color: available ? "var(--hanoo-green)" : "var(--hanoo-red)" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: available ? "var(--hanoo-green)" : "var(--hanoo-red)" }} />
                  {available ? "זמינה כעת" : "לא זמינה כעת"}
                </div>
              </div>
              {available && activeUntil && (
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>זמין עד {activeUntil}</p>
              )}
              {!available && nextText && (
                <p className="text-sm mb-3" style={{ color: "var(--text-tertiary)" }}>{nextText}</p>
              )}
              <button
                onClick={() => { setBlockUntilHour(null); const opts = (() => { const now = new Date(); const cur = now.getHours() * 60 + now.getMinutes(); const o = []; let t = Math.ceil((cur + 1) / 15) * 15; while (t <= 24 * 60) { o.push(t); t += 15; } return o; })(); setAvailUntilMinutes(opts[0] ?? null); setShowStatusDrawer(true); }}
                disabled={removingSlot}
                className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ background: available ? "var(--hanoo-red-light)" : "var(--hanoo-blue-light)", color: available ? "var(--hanoo-red)" : "var(--hanoo-blue)", opacity: removingSlot ? 0.6 : 1 }}
              >
                {removingSlot
                  ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />טוען...</>
                  : available ? "השבת זמינות" : "הפוך את החניה לזמינה"}
              </button>
            </div>
          );
           })()}
          </div>
          )}
          </div>
          </PullToRefreshWrapper>
    </div>
  );
}
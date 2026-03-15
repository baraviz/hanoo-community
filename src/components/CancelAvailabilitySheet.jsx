import { useState, useEffect } from "react";
import { X, MessageCircle, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

// Given a recurring block (dayIndex, start, end in mins) or a temp slot (start_at, end_at),
// returns any active bookings that overlap with it.
async function findAffectedBookings(ownerEmail, blockInfo) {
  const bookings = await base44.entities.Booking.filter({ owner_email: ownerEmail, status: "active" });
  return bookings.filter(b => {
    if (!b.start_time || !b.end_time) return false;
    const bStart = new Date(b.start_time);
    const bEnd = new Date(b.end_time);

    if (blockInfo.type === "recurring") {
      // Check every occurrence of this day
      const bDay = bStart.getDay();
      if (bDay !== blockInfo.dayIndex) return false;
      const bStartMins = bStart.getHours() * 60 + bStart.getMinutes();
      const bEndMins = bEnd.getHours() * 60 + bEnd.getMinutes();
      return bStartMins < blockInfo.end && bEndMins > blockInfo.start;
    } else {
      // temp slot: absolute time range
      return bStart < new Date(blockInfo.end_at) && bEnd > new Date(blockInfo.start_at);
    }
  });
}

export default function CancelAvailabilitySheet({ blockInfo, ownerEmail, onConfirm, onClose }) {
  const [closing, setClosing] = useState(false);
  const [affected, setAffected] = useState(null); // null = loading
  const [sending, setSending] = useState(false);

  useEffect(() => {
    findAffectedBookings(ownerEmail, blockInfo).then(setAffected);
  }, []);

  function close() {
    setClosing(true);
    setTimeout(onClose, 230);
  }

  function doConfirm() {
    setClosing(true);
    setTimeout(onConfirm, 230);
  }

  function buildWhatsAppMsg(booking) {
    const startFmt = format(new Date(booking.start_time), "HH:mm");
    const endFmt = format(new Date(booking.end_time), "HH:mm");
    const dateFmt = format(new Date(booking.start_time), "dd/MM");
    const deepLink = `${window.location.origin}/FindParking?from=${encodeURIComponent(booking.start_time)}&to=${encodeURIComponent(booking.end_time)}`;
    return `היי ${booking.renter_name}, אני מצטער אבל נאלצתי לבטל את זמינות החניה שלי ב-${dateFmt} בין ${startFmt} ל-${endFmt}.\nהנה קישור למציאת חניה חלופית באותו זמן:\n${deepLink}`;
  }

  async function handleSendWhatsApp(booking) {
    setSending(true);
    const renters = await base44.entities.Resident.filter({ user_email: booking.renter_email });
    const phone = renters[0]?.phone;
    const msg = buildWhatsAppMsg(booking);

    // Send in-app notification to renter with deep link
    const deepLink = `${window.location.origin}/FindParking?from=${encodeURIComponent(booking.start_time)}&to=${encodeURIComponent(booking.end_time)}`;
    await base44.entities.Notification.create({
      user_email: booking.renter_email,
      title: "החניה שלך בוטלה ⚠️",
      body: `בעל החניה ביטל את זמינותו ב-${format(new Date(booking.start_time), "dd/MM")} בין ${format(new Date(booking.start_time), "HH:mm")} ל-${format(new Date(booking.end_time), "HH:mm")}. לחץ כאן למציאת חניה חלופית.`,
      type: "parking_cancelled",
      booking_id: booking.id || "",
      action_url: deepLink,
      read: false,
    }).catch(() => {});

    // Award 5 points to owner for notifying
    const owners = await base44.entities.Resident.filter({ user_email: ownerEmail });
    if (owners.length > 0) {
      await base44.functions.invoke("awardPoints", {
        resident_id: owners[0].id,
        reason: "whatsapp_apology",
        points: 5,
      }).catch(() => {});
    }

    const phoneClean = (phone || "").replace(/\D/g, "");
    const waPhone = phoneClean.startsWith("0") ? "972" + phoneClean.slice(1) : phoneClean;
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    setSending(false);
    doConfirm();
  }

  const anim = closing
    ? { backdrop: "fadeOut 0.23s ease-in forwards", sheet: "slideDown 0.23s ease-in forwards" }
    : { backdrop: "fadeIn 0.23s ease-out", sheet: "slideUp 0.23s ease-out" };

  const loading = affected === null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.4)", animation: anim.backdrop }}
      onClick={close}
    >
      <style>{`
        @keyframes slideUp   { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut   { from { opacity: 1; } to { opacity: 0; } }
      `}</style>

      <div
        className="bg-white rounded-t-3xl p-6 space-y-5 max-w-[430px] w-full"
        style={{ paddingBottom: "calc(80px + 1.5rem)", animation: anim.sheet }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto" />

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : affected.length === 0 ? (
          /* No affected bookings — simple confirm */
          <>
            <h2 className="text-xl font-bold text-gray-800 text-center">מחיקת זמינות</h2>
            <p className="text-gray-500 text-sm text-center">אין הזמנות פעילות בטווח זה. ניתן למחוק בבטחה.</p>
            <div className="flex gap-3">
              <button
                onClick={close}
                className="flex-1 py-3 rounded-2xl font-bold text-gray-700"
                style={{ background: "#F3F4F6" }}
              >
                ביטול
              </button>
              <button
                onClick={doConfirm}
                className="flex-1 py-3 rounded-2xl font-bold text-white"
                style={{ background: "#EF4444" }}
              >
                מחק
              </button>
            </div>
          </>
        ) : (
          /* Has affected bookings */
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">⚠️ קיימות הזמנות פעילות</h2>
              <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            <p className="text-gray-500 text-sm">
              ביטול זמינות זו יפגע ב-{affected.length === 1 ? "הזמנה אחת" : `${affected.length} הזמנות`}:
            </p>

            <div className="space-y-2">
              {affected.map(b => (
                <div key={b.id} className="rounded-2xl p-3" style={{ background: "#FFF4E5", border: "1px solid #FFD580" }}>
                  <p className="font-bold text-gray-800 text-sm">{b.renter_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(b.start_time), "dd/MM")} · {format(new Date(b.start_time), "HH:mm")}–{format(new Date(b.end_time), "HH:mm")}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {/* Send WhatsApp apology — shown for each affected booking with a phone */}
              {affected.map(b => (
                <button
                  key={b.id}
                  onClick={() => handleSendWhatsApp(b)}
                  disabled={sending}
                  className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2"
                  style={{ background: "#25D366", color: "white", opacity: sending ? 0.7 : 1 }}
                >
                  <MessageCircle size={18} />
                  שלח עדכון ל{b.renter_name} בוואטסאפ
                </button>
              ))}

              <button
                onClick={doConfirm}
                className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2"
                style={{ background: "#FEE2E2", color: "#EF4444" }}
              >
                <Trash2 size={16} />
                בטל בכל זאת
              </button>

              <button
                onClick={close}
                className="w-full py-3 rounded-2xl font-bold text-gray-600"
                style={{ background: "#F3F4F6" }}
              >
                השאר את הזמינות
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { motion, animate } from "framer-motion";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

// WhatsApp SVG icon
function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.121 1.526 5.853L0 24l6.33-1.499A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.003-1.369l-.359-.213-3.754.889.939-3.648-.234-.374A9.772 9.772 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
    </svg>
  );
}

// ── Animated circle-check ────────────────────────────────────────────────────
function AnimatedCircleCheck({ size = 80 }) {
  return (
    <svg
      fill="none"
      height={size}
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.5"
      viewBox="0 0 24 24"
    >
      <motion.circle
        r="10" cx="12" cy="12"
        initial={{ pathLength: 0, pathOffset: 1 }}
        animate={{ pathLength: 1, pathOffset: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      />
      <motion.path
        d="m9 12 2 2 4-4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.65 }}
      />
    </svg>
  );
}

// ── Animated credit counter ───────────────────────────────────────────────────
function AnimatedCredits({ from, to }) {
  const [display, setDisplay] = useState(from);
  useEffect(() => {
    const controls = animate(from, to, {
      duration: 1.2,
      ease: "easeOut",
      delay: 0.8,
      onUpdate: v => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [from, to]);
  return <span>{display}</span>;
}

// ── Thank-you bottom sheet ────────────────────────────────────────────────────
function ThankYouSheet({ slot, fromTime, toTime, renterApartment, onClose }) {
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState(() => buildMessage(slot, fromTime, toTime, renterApartment));
  const [sending, setSending] = useState(false);

  function buildMessage(slot, fromTime, toTime, apartment) {
    const firstName = (slot.ownerName || "").split(" ")[0] || slot.ownerName;
    const fromStr = fromTime ? format(new Date(fromTime), "HH:mm") : "";
    const toStr = toTime ? format(new Date(toTime), "HH:mm") : "";
    return `היי ${firstName}! תודה רבה על החניה שפירסמת באפליקציית Hanoo!\nאני אחנה שם היום בין ${fromStr}-${toStr}, יעזור לי מאוד! 🙏\n\nהשכן/ה מדירה ${apartment || "?"}`;
  }

  function close() {
    setClosing(true);
    setTimeout(() => onClose(), 230);
  }

  async function sendWhatsApp() {
    setSending(true);
    const phone = slot.ownerPhone?.replace(/\D/g, "").replace(/^0/, "972");
    const encoded = encodeURIComponent(message);
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");

    await base44.functions.invoke("awardPoints", {
      user_email: (await base44.auth.me()).email,
      reason: "whatsapp_thanks",
    });

    setSending(false);
    close();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.5)", animation: closing ? "fadeOut 0.22s ease-in forwards" : "fadeIn 0.22s ease-out" }}
      onClick={close}
    >
      <style>{`
        @keyframes slideUp   { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(0); }   to { transform: translateY(100%); } }
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut   { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
      <div
        className="rounded-t-3xl p-6 space-y-5"
        style={{
          background: "var(--sheet-bg)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
          maxHeight: "90vh",
          animation: closing ? "slideDown 0.22s ease-in forwards" : "slideUp 0.22s ease-out",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: "var(--sheet-handle)" }} />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "#E8F8EF" }}>
              <WhatsAppIcon size={22} color="#25D366" />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>שלח תודה לשכן</h3>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{slot.ownerName} · תרוויח 10 נקודות ⭐️</p>
            </div>
          </div>
          <button onClick={close} className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "var(--btn-secondary-bg)" }}>
            <X size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* Message textarea */}
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={5}
          className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
          style={{
            border: "1px solid var(--surface-card-border)",
            background: "var(--btn-secondary-bg)",
            color: "var(--text-primary)",
            lineHeight: 1.6,
          }}
          placeholder="כתוב הודעת תודה..."
        />

        {!slot.ownerPhone && (
          <p className="text-xs text-center" style={{ color: "var(--hanoo-orange)" }}>לשכן אין מספר טלפון — תוכל לשלוח ידנית</p>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <button
            onClick={sendWhatsApp}
            disabled={sending}
            className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "#25D366", opacity: sending ? 0.7 : 1 }}
          >
            <WhatsAppIcon size={20} />
            {sending ? "שולח..." : "שלח הודעה"}
          </button>
          <button
            onClick={close}
            className="w-full py-3 rounded-2xl font-bold text-sm"
            style={{ background: "var(--btn-secondary-bg)", color: "var(--btn-secondary-text)" }}
          >
            דלג
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main success screen ───────────────────────────────────────────────────────
export default function BookingSuccessScreen({
  fromTime,
  toTime,
  thankYouSlots,
  creditsBeforeBooking,
  creditsAfterBooking,
  renterApartment,
  onBack,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);

  const fromStr = fromTime ? format(new Date(fromTime), "HH:mm") : "";
  const toStr   = toTime   ? format(new Date(toTime),   "HH:mm") : "";
  const spent = (creditsBeforeBooking ?? creditsAfterBooking) - creditsAfterBooking;
  const hasThankYou = thankYouSlots?.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col px-6 pt-16 pb-10"
      style={{ background: "var(--surface-page)" }}
    >
      {/* Top success section */}
      <div className="flex flex-col items-center text-center flex-1">
        {/* Animated check circle */}
        <motion.div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
          style={{ background: "var(--hanoo-green-light)", color: "var(--hanoo-green)" }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        >
          <AnimatedCircleCheck size={56} />
        </motion.div>

        <motion.h2
          className="text-3xl font-bold mb-1"
          style={{ color: "var(--text-primary)" }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          הוזמן בהצלחה!
        </motion.h2>

        <motion.p
          className="text-base mb-8"
          style={{ color: "var(--text-secondary)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {fromStr} – {toStr}
        </motion.p>

        {/* Credits card */}
        <motion.div
          className="w-full rounded-3xl p-5 mb-6"
          style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-xs mb-2" style={{ color: "var(--text-tertiary)" }}>יתרת קרדיטים</p>
          <p className="text-4xl font-bold mb-1" style={{ color: "var(--hanoo-blue)" }}>
            <AnimatedCredits from={creditsBeforeBooking ?? creditsAfterBooking} to={creditsAfterBooking} />
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ background: "var(--hanoo-red-light)", color: "var(--hanoo-red)" }}>
              -{spent} קרדיטים
            </span>
          </div>
        </motion.div>

        {/* Thank you CTA */}
        {hasThankYou && (
          <motion.div
            className="w-full rounded-3xl p-5 mb-6"
            style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-none" style={{ background: "#E8F8EF" }}>
                <WhatsAppIcon size={20} />
              </div>
              <div className="text-right">
                <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>שלח תודה ל{thankYouSlots[0]?.ownerName?.split(" ")[0]}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>תרוויח 10 נקודות לדירוג הליגה ⭐️</p>
              </div>
            </div>
            <button
              onClick={() => { setSheetIndex(0); setSheetOpen(true); }}
              className="w-full py-3 rounded-2xl font-bold flex items-center justify-center gap-2"
              style={{ background: "#25D366", color: "white" }}
            >
              <WhatsAppIcon size={18} />
              שלח הודעת תודה בוואטסאפ
            </button>
          </motion.div>
        )}
      </div>

      {/* Thank-you sheet */}
      {sheetOpen && thankYouSlots?.[sheetIndex] && (
        <ThankYouSheet
          slot={thankYouSlots[sheetIndex]}
          fromTime={fromTime}
          toTime={toTime}
          renterApartment={renterApartment}
          onClose={() => {
            const next = sheetIndex + 1;
            if (next < thankYouSlots.length) {
              setSheetIndex(next);
            } else {
              setSheetOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}
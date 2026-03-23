import { useState, useEffect, useRef } from "react";
import { motion, animate } from "framer-motion";
import { MessageCircle, X, Send, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

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
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <motion.circle
        r="10" cx="12" cy="12"
        initial={{ pathLength: 0, pathOffset: 1 }}
        animate={{ pathLength: 1, pathOffset: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      />
      <motion.path
        d="m9 12 2 2 4-4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: 0.5 }}
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
      delay: 0.7,
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
      style={{ background: "rgba(0,0,0,0.45)", animation: closing ? "fadeOut 0.22s ease-in forwards" : "fadeIn 0.22s ease-out" }}
      onClick={close}
    >
      <style>{`
        @keyframes slideUp   { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(0); }   to { transform: translateY(100%); } }
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut   { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
      <div
        className="rounded-t-3xl p-6 space-y-4"
        style={{
          background: "var(--sheet-bg)",
          paddingBottom: "calc(80px + 1.5rem)",
          animation: closing ? "slideDown 0.22s ease-in forwards" : "slideUp 0.22s ease-out",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: "var(--sheet-handle)" }} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#E8F8EF" }}>
              <MessageCircle size={20} style={{ color: "#25D366" }} />
            </div>
            <div>
              <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>שלח תודה לשכן</h3>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{slot.ownerName}</p>
            </div>
          </div>
          <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "var(--btn-secondary-bg)" }}>
            <X size={16} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-none"
          style={{
            border: "1px solid var(--surface-card-border)",
            background: "var(--btn-secondary-bg)",
            color: "var(--text-primary)",
          }}
          placeholder="כתוב הודעת תודה..."
        />

        {!slot.ownerPhone && (
          <p className="text-xs text-amber-600 text-center">לשכן אין מספר טלפון — תוכל לשלוח ידנית</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={close}
            className="py-3 rounded-2xl font-bold text-sm"
            style={{ background: "var(--btn-secondary-bg)", color: "var(--btn-secondary-text)" }}
          >
            דלג
          </button>
          <button
            onClick={sendWhatsApp}
            disabled={sending}
            className="py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-1.5"
            style={{ background: "#25D366", opacity: sending ? 0.6 : 1 }}
          >
            <Send size={15} />
            {sending ? "שולח..." : "שלח בוואטסאפ +10 נק׳"}
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
  thankYouSlots,       // [{ ownerName, ownerPhone, spotNumber }]
  creditsBeforeBooking,
  creditsAfterBooking,
  renterApartment,
  onBack,
}) {
  const [sheetIndex, setSheetIndex] = useState(-1); // which slot's sheet is open

  // Auto-pop the first thank-you sheet after 2.5s
  useEffect(() => {
    if (thankYouSlots?.length > 0) {
      const t = setTimeout(() => setSheetIndex(0), 2500);
      return () => clearTimeout(t);
    }
  }, [thankYouSlots]);

  const fromStr = fromTime ? format(new Date(fromTime), "HH:mm") : "";
  const toStr   = toTime   ? format(new Date(toTime),   "HH:mm") : "";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--surface-page)" }}
    >
      {/* Animated check */}
      <motion.div
        className="w-28 h-28 rounded-full flex items-center justify-center mb-6"
        style={{ background: "var(--hanoo-green-light)", color: "var(--hanoo-green)" }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      >
        <AnimatedCircleCheck size={64} />
      </motion.div>

      <motion.h2
        className="text-2xl font-bold mb-1"
        style={{ color: "var(--text-primary)" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        הוזמן! 🎉
      </motion.h2>

      <motion.p
        className="text-base mb-6"
        style={{ color: "var(--text-secondary)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        {fromStr} – {toStr}
      </motion.p>

      {/* Animated credits */}
      <motion.div
        className="rounded-2xl px-6 py-4 mb-8 text-center"
        style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
      >
        <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>יתרת קרדיטים</p>
        <p className="text-3xl font-bold" style={{ color: "var(--hanoo-blue)" }}>
          <AnimatedCredits from={creditsBeforeBooking ?? creditsAfterBooking} to={creditsAfterBooking} />
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
          -{(creditsBeforeBooking ?? creditsAfterBooking) - creditsAfterBooking} קרדיטים
        </p>
      </motion.div>

      <motion.button
        onClick={onBack}
        className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
        style={{ background: "var(--hanoo-blue)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.65 }}
      >
        <Search size={18} />
        חפש חניה נוספת
      </motion.button>

      {/* Thank-you sheet (auto-pops) */}
      {sheetIndex >= 0 && thankYouSlots?.[sheetIndex] && (
        <ThankYouSheet
          slot={thankYouSlots[sheetIndex]}
          fromTime={fromTime}
          toTime={toTime}
          renterApartment={renterApartment}
          onClose={() => {
            const next = sheetIndex + 1;
            setSheetIndex(next < thankYouSlots.length ? next : -1);
          }}
        />
      )}
    </div>
  );
}
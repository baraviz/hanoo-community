import { useState, useEffect } from "react";
import { motion, animate, useAnimation } from "framer-motion";
import { X, Car, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

// ── WhatsApp SVG icon ─────────────────────────────────────────────────────────
function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.121 1.526 5.853L0 24l6.33-1.499A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.8 9.8 0 01-5.003-1.369l-.359-.213-3.754.889.939-3.648-.234-.374A9.772 9.772 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182S21.818 6.58 21.818 12 17.42 21.818 12 21.818z"/>
    </svg>
  );
}

// ── Animated circle-check ─────────────────────────────────────────────────────
function AnimatedCircleCheck({ size = 40 }) {
  return (
    <svg fill="none" height={size} width={size} stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
      <motion.circle r="10" cx="12" cy="12"
        initial={{ pathLength: 0, pathOffset: 1 }}
        animate={{ pathLength: 1, pathOffset: 0 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
      />
      <motion.path d="m9 12 2 2 4-4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.65 }}
      />
    </svg>
  );
}

// ── Animated credit counter ───────────────────────────────────────────────────
function AnimatedCredits({ from, to, startDelay = 0 }) {
  const [display, setDisplay] = useState(from);
  useEffect(() => {
    const controls = animate(from, to, {
      duration: 1.2, ease: "easeOut", delay: startDelay,
      onUpdate: v => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [from, to, startDelay]);
  return <span>{display}</span>;
}

// ── Date label helper ─────────────────────────────────────────────────────────
function dateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "היום";
  if (d.toDateString() === tomorrow.toDateString()) return "מחר";
  return d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
}

// ── Duration label helper ─────────────────────────────────────────────────────
function durationLabel(fromTime, toTime) {
  if (!fromTime || !toTime) return "";
  const mins = Math.round((new Date(toTime) - new Date(fromTime)) / 60000);
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m} דקות`;
  if (h === 1 && m === 0) return "שעה";
  if (h === 2 && m === 0) return "שעתיים";
  if (m === 0) return `${h} שעות`;
  return `${h} שעות ו-${m} דקות`;
}

// ── Thank-you bottom sheet ────────────────────────────────────────────────────
function ThankYouSheet({ slot, fromTime, toTime, renterApartment, renterName, onClose }) {
  const [closing, setClosing] = useState(false);
  const [sending, setSending] = useState(false);

  const ownerFirstName = (slot.ownerName || "").split(" ")[0] || slot.ownerName;
  const renterFirstName = (renterName || "").split(" ")[0] || renterName;
  const fromStr = fromTime ? format(new Date(fromTime), "HH:mm") : "";
  const toStr   = toTime   ? format(new Date(toTime),   "HH:mm") : "";
  const dayLbl  = dateLabel(fromTime);

  const [message, setMessage] = useState(
    `היי ${ownerFirstName}! תודה רבה על החניה שפירסמת באפליקציית Hanoo!\nאני אחנה שם ${dayLbl} בין ${fromStr}-${toStr}, יעזור לי מאוד! 🙏\n\n${renterFirstName || "השכן/ה"}, מדירה ${renterApartment || "?"}`
  );

  function close() {
    setClosing(true);
    setTimeout(() => onClose(), 230);
  }

  async function sendWhatsApp() {
    setSending(true);
    const phone = slot.ownerPhone?.replace(/\D/g, "").replace(/^0/, "972");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");

    try {
      const me = await base44.auth.me();
      await base44.functions.invoke("awardPoints", { user_email: me.email, reason: "whatsapp_thanks" });
    } catch (_) {}

    setSending(false);
    close();
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex flex-col justify-end"
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom))", background: "rgba(0,0,0,0.5)", animation: closing ? "fadeOut 0.22s ease-in forwards" : "fadeIn 0.22s ease-out" }}
      onClick={close}
    >
      <style>{`
        @keyframes slideUp   { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(0); }   to { transform: translateY(100%); } }
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut   { from { opacity: 1; } to { opacity: 0; } }
      `}</style>
      <div
        className="rounded-t-3xl overflow-y-auto"
        style={{
          background: "var(--sheet-bg)",
          maxHeight: "calc(85dvh - 64px)",
          animation: closing ? "slideDown 0.22s ease-in forwards" : "slideUp 0.22s ease-out",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 rounded-t-3xl" style={{ background: "var(--hanoo-blue)" }}>
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: "rgba(255,255,255,0.4)" }} />
          <div className="flex justify-end mb-2">
            <button onClick={close} className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
              <X size={16} className="text-white" />
            </button>
          </div>
          <div className="text-center">
            <h3 className="font-bold text-lg text-white">שלח תודה ל{ownerFirstName} בוואטסאפ 🙌</h3>
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>תרוויח 10 נקודות לדירוג הליגה ⭐️</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={6}
            className="w-full rounded-2xl px-4 py-3 outline-none resize-none"
            style={{
              border: "1px solid var(--surface-card-border)",
              background: "var(--btn-secondary-bg)",
              color: "var(--text-primary)",
              lineHeight: 1.7,
              fontSize: 16,
            }}
          />

          {!slot.ownerPhone && (
            <p className="text-xs text-center" style={{ color: "var(--hanoo-orange)" }}>
              ⚠️ לשכן אין מספר טלפון — תוכל לשלוח ידנית
            </p>
          )}

          <button
            onClick={sendWhatsApp}
            disabled={sending}
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: "var(--hanoo-blue)", opacity: sending ? 0.7 : 1 }}
          >
            {sending ? "שולח..." : "שלח תודה"}
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
  renterName,
  onBack,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetIndex, setSheetIndex] = useState(0);
  // Phase: "splash" = full-screen blue, "settled" = compact header + content
  const [phase, setPhase] = useState("splash");

  const fromStr  = fromTime ? format(new Date(fromTime), "HH:mm") : "";
  const toStr    = toTime   ? format(new Date(toTime),   "HH:mm") : "";
  const dayLbl   = dateLabel(fromTime);
  const duration = durationLabel(fromTime, toTime);
  const spent    = Math.max(0, (creditsBeforeBooking ?? creditsAfterBooking) - creditsAfterBooking);
  const hasSlots = thankYouSlots?.length > 0;
  const firstSlot = thankYouSlots?.[0];

  // After 2.5s in splash phase, transition to settled
  useEffect(() => {
    const t = setTimeout(() => setPhase("settled"), 2500);
    return () => clearTimeout(t);
  }, []);

  const isSplash = phase === "splash";

  // Header height: full-screen in splash, compact in settled
  const headerVariants = {
    splash: { height: "100vh" },
    settled: { height: "auto" },
  };

  // Icon size wrapper: big in splash, small in settled
  const iconWrapVariants = {
    splash: { width: 96, height: 96 },
    settled: { width: 48, height: 48 },
  };

  // Layout of icon+text row: centered in splash, RTL row in settled
  const rowVariants = {
    splash: { flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 },
    settled: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "flex-end", gap: 12 },
  };

  // Text alignment
  const textVariants = {
    splash: { textAlign: "center" },
    settled: { textAlign: "right" },
  };

  // Title size
  const titleVariants = {
    splash: { fontSize: "2rem" },
    settled: { fontSize: "1.5rem" },
  };

  const transition = { duration: 0.65, ease: [0.4, 0, 0.2, 1] };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--surface-page)" }}>

      {/* ── Animated blue header ── */}
      <motion.div
        variants={headerVariants}
        initial={{ height: 0, opacity: 0 }}
        animate={{ opacity: 1, ...(phase === "splash" ? { height: "100vh" } : { height: "auto" }) }}
        transition={phase === "splash" ? { duration: 0.5, ease: "easeOut" } : transition}
        style={{ background: "var(--surface-header)", overflow: "hidden", flexShrink: 0 }}
        className="flex flex-col"
      >
        {/* Padded inner area */}
        <motion.div
          variants={{
            splash: { paddingTop: "calc(env(safe-area-inset-top) + 2rem)", paddingBottom: "2rem", paddingLeft: "1.25rem", paddingRight: "1.25rem", flex: 1 },
            settled: { paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)", paddingBottom: "1.25rem", paddingLeft: "1.25rem", paddingRight: "1.25rem", flex: 0 },
          }}
          initial="splash"
          animate={phase}
          transition={transition}
          className="flex flex-col"
          style={{ justifyContent: isSplash ? "center" : "flex-start" }}
        >
          {/* Icon + text row */}
          <motion.div
            variants={rowVariants}
            initial="splash"
            animate={phase}
            transition={transition}
            style={{ display: "flex" }}
          >
            {/* Icon circle */}
            <motion.div
              variants={iconWrapVariants}
              initial="splash"
              animate={phase}
              transition={transition}
              className="rounded-full flex items-center justify-center flex-none"
              style={{ background: "rgba(255,255,255,0.2)" }}
            >
              <motion.div
                variants={{
                  splash: { width: 64, height: 64 },
                  settled: { width: 32, height: 32 },
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, ...(phase === "settled" ? { width: 32, height: 32 } : { width: 64, height: 64 }) }}
                transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.1 }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <AnimatedCircleCheck size={isSplash ? 64 : 32} />
              </motion.div>
            </motion.div>

            {/* Text */}
            <motion.div
              variants={textVariants}
              initial="splash"
              animate={phase}
              transition={transition}
            >
              <motion.h2
                className="font-bold text-white leading-tight"
                variants={titleVariants}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, ...(phase === "settled" ? { fontSize: "1.5rem" } : { fontSize: "2rem" }) }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
              >
                הוזמן בהצלחה!
              </motion.h2>
              <motion.p
                className="text-sm mt-1"
                style={{ color: "rgba(255,255,255,0.75)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {duration} · {dayLbl} {fromStr}–{toStr}
              </motion.p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── Content — revealed after transition ── */}
      <motion.div
        className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
        style={{ paddingBottom: "calc(80px + 1.5rem)" }}
        initial={{ opacity: 0, y: 30 }}
        animate={phase === "settled" ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.45, ease: "easeOut", delay: 0.2 }}
      >
        {/* Parking details card */}
        {hasSlots && (
          <div className="app-card p-4">
            <p className="text-xs font-bold mb-3" style={{ color: "var(--text-tertiary)" }}>פרטי החניה</p>
            {thankYouSlots.map((slot, i) => (
              <div key={i} className={i > 0 ? "pt-3 mt-3 border-t" : ""} style={{ borderColor: "var(--surface-card-border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-none" style={{ background: "var(--hanoo-blue-light)" }}>
                    <Car size={20} style={{ color: "var(--hanoo-blue)" }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                      חניה #{slot.spotNumber || "?"}
                      {slot.parkingFloor ? `, קומה ${slot.parkingFloor}` : ""}
                      {thankYouSlots.length > 1 && <span className="text-xs font-normal mr-1" style={{ color: "var(--text-tertiary)" }}>{i === 0 ? " (ראשונה)" : " (שנייה)"}</span>}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>של {slot.ownerName}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Time row */}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t" style={{ borderColor: "var(--surface-card-border)" }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-none" style={{ background: "var(--hanoo-blue-light)" }}>
                <Clock size={18} style={{ color: "var(--hanoo-blue)" }} />
              </div>
              <div>
                <p className="font-bold" style={{ color: "var(--text-primary)" }}>{dayLbl}, {fromStr}–{toStr}</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{duration}</p>
              </div>
            </div>
          </div>
        )}

        {/* Credits card */}
        <div className="app-card p-4">
          <p className="text-xs font-bold mb-3" style={{ color: "var(--text-tertiary)" }}>קרדיטים</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold" style={{ color: "var(--hanoo-blue)" }}>
                <AnimatedCredits from={creditsBeforeBooking ?? creditsAfterBooking} to={creditsAfterBooking} startDelay={0.3} />
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>יתרה נוכחית</p>
            </div>
            <span className="text-sm font-bold px-4 py-2 rounded-full" style={{ background: "var(--hanoo-red-light)", color: "var(--hanoo-red)" }}>
              -{spent} קרדיטים
            </span>
          </div>
        </div>

        {/* Thank you CTA */}
        {hasSlots && (
          <div className="app-card overflow-hidden">
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
              <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                שלח תודה ל{firstSlot?.ownerName?.split(" ")[0]} בוואטסאפ
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                תרוויח 10 נקודות לדירוג הליגה
              </p>
            </div>
            <div className="px-4 py-3">
              <button
                onClick={() => { setSheetIndex(0); setSheetOpen(true); }}
                className="w-full py-3.5 rounded-2xl font-bold text-white"
                style={{ background: "var(--hanoo-blue)" }}
              >
                שלח תודה
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Thank-you sheet */}
      {sheetOpen && thankYouSlots?.[sheetIndex] && (
        <ThankYouSheet
          slot={thankYouSlots[sheetIndex]}
          fromTime={fromTime}
          toTime={toTime}
          renterApartment={renterApartment}
          renterName={renterName}
          onClose={() => {
            const next = sheetIndex + 1;
            if (next < thankYouSlots.length) setSheetIndex(next);
            else setSheetOpen(false);
          }}
        />
      )}
    </div>
  );
}
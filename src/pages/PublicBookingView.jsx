import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { MapPin, Clock, AlertTriangle, Camera, Phone, Mail, ExternalLink } from "lucide-react";

/**
 * Public view of booking details — accessible without login
 * Guest can view parking details, navigate, report issues, and see Hanoo info
 */
export default function PublicBookingView() {
  const { token } = useParams();
  const [booking, setBooking] = useState(null);
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportImage, setReportImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

  async function loadData() {
    try {
      // Decode token to get booking ID (simple base64 for now)
      const bookingId = atob(token);
      
      const [bookings, buildings] = await Promise.all([
        base44.entities.Booking.filter({ id: bookingId }),
        base44.entities.Building.list(),
      ]);

      if (bookings.length === 0) {
        setError("לא נמצאה הזמנה");
        setLoading(false);
        return;
      }

      const b = bookings[0];
      setBooking(b);
      
      const bld = buildings.find(bd => bd.id === b.building_id);
      if (bld) setBuilding(bld);
    } catch (e) {
      console.error(e);
      setError("שגיאה בטעינת נתונים");
    }
    setLoading(false);
  }

  function fileToBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  async function handleReport() {
    setSubmitting(true);
    try {
      let imageUrl = null;
      if (reportImage) {
        const base64 = await fileToBase64(reportImage);
        const uploadRes = await base44.functions.invoke("uploadReportImage", { file: base64 });
        imageUrl = uploadRes.data?.url;
      }

      await base44.functions.invoke("sendReportEmail", {
        user_email: "guest@anonymous.local",
        user_name: "אורח",
        booking_id: booking.id,
        report_text: reportText,
        image_url: imageUrl,
      });

      setShowReport(false);
      setReportText("");
      setReportImage(null);
      alert("תודה על הדיווח!");
    } catch (e) {
      console.error(e);
      alert("שגיאה בשליחת הדיווח");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface-page)" }}>
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: "var(--surface-page)" }}>
        <p style={{ color: "var(--text-secondary)" }}>{error || "לא נמצאה הזמנה"}</p>
      </div>
    );
  }

  const startTime = format(parseISO(booking.start_time), "HH:mm");
  const endTime = format(parseISO(booking.end_time), "HH:mm");
  const dayLabel = format(parseISO(booking.start_time), "d.M.yyyy");

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>
      {/* Header */}
      <div className="pt-safe pb-4 px-5" style={{ background: "var(--surface-header)" }}>
        <h1 className="text-white text-xl font-bold">פרטי החניה</h1>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Parking details card */}
        <div className="app-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--hanoo-blue-light)" }}>
              <MapPin size={24} style={{ color: "var(--hanoo-blue)" }} />
            </div>
            <div>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>חניה #{booking.spot_number}</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>של {booking.owner_name}</p>
            </div>
          </div>

          {building && (
            <div className="flex items-start gap-3 pt-2 border-t" style={{ borderColor: "var(--surface-card-border)" }}>
              <MapPin size={18} style={{ color: "var(--hanoo-blue)", marginTop: 3 }} className="flex-none" />
              <div className="flex-1">
                <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{building.name}</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{building.address}, {building.city}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: "var(--surface-card-border)" }}>
            <Clock size={18} style={{ color: "var(--hanoo-blue)" }} className="flex-none" />
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {dayLabel}, {startTime}–{endTime}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => {
              if (building) {
                const url = `https://maps.google.com/?q=${encodeURIComponent(building.address + " " + building.city)}`;
                window.open(url, "_blank");
              }
            }}
            className="w-full py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "var(--hanoo-blue)" }}
          >
            <MapPin size={18} />
            נווט למקום
          </button>

          <button
            onClick={() => setShowReport(true)}
            className="w-full py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "var(--hanoo-orange)" }}
          >
            <AlertTriangle size={18} />
            דווח על בעיה
          </button>
        </div>

        {/* Hanoo info panel */}
        <div className="app-card p-4 space-y-3" style={{ background: "var(--hanoo-blue-light)", border: "none" }}>
          <p className="text-sm font-bold" style={{ color: "var(--hanoo-blue)" }}>רוצים את Hanoo גם בבניין שלכם?</p>
          <p className="text-xs" style={{ color: "var(--hanoo-blue)" }}>
            Hanoo עוזרת לשכנים להשתף מקומות חניה בקלות. הרשמו היום!
          </p>
          <a
            href="/Onboarding"
            className="block w-full py-2.5 rounded-2xl font-bold text-white text-center flex items-center justify-center gap-2"
            style={{ background: "var(--hanoo-blue)" }}
          >
            הצטרפו עכשיו
            <ExternalLink size={16} />
          </a>
        </div>

        {/* Contact info */}
        <div className="app-card p-4 space-y-2 text-center">
          <p className="text-xs font-bold" style={{ color: "var(--text-tertiary)" }}>יש שאלות?</p>
          <div className="flex flex-col gap-2">
            <a
              href="tel:+972123456789"
              className="text-sm font-bold flex items-center justify-center gap-1"
              style={{ color: "var(--hanoo-blue)" }}
            >
              <Phone size={16} />
              צרו קשר
            </a>
            <a
              href="mailto:info@hanoo.co.il"
              className="text-sm font-bold flex items-center justify-center gap-1"
              style={{ color: "var(--hanoo-blue)" }}
            >
              <Mail size={16} />
              info@hanoo.co.il
            </a>
          </div>
        </div>
      </div>

      {/* Report sheet */}
      {showReport && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowReport(false)}
        >
          <div
            className="rounded-t-3xl p-6 space-y-4"
            style={{ background: "var(--sheet-bg)", paddingBottom: "calc(2rem)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: "var(--sheet-handle)" }} />
            <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>דיווח על בעיה</h3>

            <textarea
              placeholder="תאר לנו מה קרה..."
              value={reportText}
              onChange={e => setReportText(e.target.value)}
              rows={4}
              className="w-full rounded-2xl px-4 py-3 resize-none"
              style={{
                border: "1px solid var(--surface-card-border)",
                background: "var(--btn-secondary-bg)",
                color: "var(--text-primary)",
              }}
            />

            <label className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer" style={{ background: "var(--btn-secondary-bg)" }}>
              <Camera size={18} style={{ color: "var(--hanoo-blue)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                {reportImage ? "תמונה צולמה" : "צלם תמונה"}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={e => setReportImage(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowReport(false)}
                className="py-3 rounded-2xl font-bold"
                style={{ background: "var(--btn-secondary-bg)", color: "var(--btn-secondary-text)" }}
              >
                ביטול
              </button>
              <button
                onClick={handleReport}
                disabled={!reportText.trim() || submitting}
                className="py-3 rounded-2xl font-bold text-white"
                style={{
                  background: "var(--hanoo-orange)",
                  opacity: !reportText.trim() || submitting ? 0.5 : 1,
                }}
              >
                {submitting ? "שולח..." : "שלח"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
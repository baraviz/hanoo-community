import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { ArrowRight, Car, Clock, MapPin, AlertTriangle, Camera, MessageCircle } from "lucide-react";

export default function BookingDetails() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [building, setBuilding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reportImage, setReportImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [bookingId]);

  async function loadData() {
    try {
      const [bookings, buildings] = await Promise.all([
        base44.entities.Booking.filter({ id: bookingId }),
        base44.entities.Building.list(),
      ]);
      if (bookings.length > 0) {
        const b = bookings[0];
        setBooking(b);
        const bld = buildings.find(bd => bd.id === b.building_id);
        if (bld) setBuilding(bld);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleReport() {
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      let imageUrl = null;
      
      // Upload image if provided
      if (reportImage) {
        const formData = new FormData();
        formData.append('file', reportImage);
        const uploadRes = await base44.functions.invoke("uploadReportImage", formData);
        imageUrl = uploadRes.data?.url;
      }
      
      // Send report email
      await base44.functions.invoke("sendReportEmail", {
        user_email: user.email,
        user_name: user.full_name,
        booking_id: bookingId,
        report_text: reportText,
        image_url: imageUrl,
      });

      setShowReport(false);
      setReportText("");
      setReportImage(null);
      alert("תודה על הדיווח! אנחנו בדרך לחפש לך חניה חלופית");
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

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: "var(--surface-page)" }}>
        <p style={{ color: "var(--text-secondary)" }}>לא נמצאה הזמנה</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-6 py-2 rounded-2xl font-bold text-white"
          style={{ background: "var(--hanoo-blue)" }}
        >
          חזור
        </button>
      </div>
    );
  }

  const startTime = format(parseISO(booking.start_time), "HH:mm");
  const endTime = format(parseISO(booking.end_time), "HH:mm");
  const dayLabel = format(parseISO(booking.start_time), "d.M");

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>
      {/* Header */}
      <div className="pt-safe pb-4 px-5" style={{ background: "var(--surface-header)" }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-white text-sm font-bold mb-3"
        >
          <ArrowRight size={18} />
          חזור
        </button>
        <h1 className="text-white text-xl font-bold">פרטי החניה</h1>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Parking card */}
        <div className="app-card p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "var(--hanoo-blue-light)" }}>
              <Car size={24} style={{ color: "var(--hanoo-blue)" }} />
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
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {Math.round((new Date(booking.end_time) - new Date(booking.start_time)) / 3600000)} שעות
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
            onClick={() => {
              const token = btoa(booking.id);
              const publicUrl = `${window.location.origin}/booking/${token}`;
              const msg = `היי, הנה הפרטים של החניה שלי: ${publicUrl}`;
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
              window.open(whatsappUrl, "_blank");
            }}
            className="w-full py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "#25D366" }}
          >
            <MessageCircle size={18} />
            שתף בוואטסאפ
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

        {/* Report sheet */}
        {showReport && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end"
            style={{ background: "rgba(0,0,0,0.4)" }}
            onClick={() => setShowReport(false)}
          >
            <div
              className="rounded-t-3xl p-6 space-y-4"
              style={{ background: "var(--sheet-bg)", paddingBottom: "calc(80px + 1.5rem)" }}
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
    </div>
  );
}
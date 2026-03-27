// ReportBug — iOS style
import { useState } from "react";
import { useAppNavigation } from "@/lib/NavigationContext";
import { ChevronRight, Send, CheckCircle, ChevronLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";

const FAQ = [
  { q: "איך אני פרסם זמינות לחניה שלי?", a: "נכנסים ל'החניה שלי' ומגדירים זמינות קבועה או חד-פעמית." },
  { q: "למה לא מוצאים לי חניה?", a: "ייתכן שאין שכנים שפרסמו זמינות בשעות הרצויות. אפשר לבקש התראה כשיתפנה מקום." },
  { q: "איך עובדים המטבעות?", a: "כל שעת חניה עולה 10 מטבעות. אתה מרוויח מטבעות כשמישהו חונה אצלך." },
  { q: "איך מגדילים ליגה?", a: "צוברים נקודות על ידי שיתוף חניה, הזמנת חניות ועוד." },
  { q: "איך מבטלים זמינות?", a: "ב'החניה שלי' ניתן לסמן חסימה או למחוק זמינות קיימת." },
];

export default function ReportBug() {
  const { back } = useAppNavigation();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [view, setView] = useState("main"); // "main" | "form"

  async function sendReport() {
    if (!text.trim()) return;
    setSending(true);
    const user = await base44.auth.me().catch(() => null);
    await Promise.all([
      base44.integrations.Core.SendEmail({
        to: "Info@hanoo.co.il",
        subject: `[Hanoo] דיווח תקלה מ-${user?.email || "משתמש לא מזוהה"}`,
        body: `דיווח תקלה:\n\n${text}\n\nמשתמש: ${user?.full_name || ""} (${user?.email || ""})\nתאריך: ${new Date().toLocaleString("he-IL")}`,
      }),
      base44.entities.BugReport.create({
        description: text.trim(),
        user_email: user?.email || "unknown",
        user_name: user?.full_name || "",
        status: "open",
      }),
    ]);
    setSending(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>
      {/* Header */}
      <div className="pt-safe px-5 pb-4 flex items-center gap-3" style={{ background: "var(--surface-header)" }}>
        <button onClick={() => view === "form" ? setView("main") : back()}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.2)" }}>
          <ChevronRight size={18} className="text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1 text-center">
          {view === "form" ? "פנייה חדשה" : "עזרה ותמיכה"}
        </h1>
        {view === "main" && (
          <button onClick={() => setView("form")}
            className="text-white text-sm font-bold px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.2)" }}>
            פנייה חדשה
          </button>
        )}
        {view === "form" && <div className="w-9" />}
      </div>

      <div className="px-5 py-5 space-y-4">

        {/* MAIN VIEW */}
        {view === "main" && !sent && (
          <>
            {/* Contact via email */}
            <div>
              <p className="text-xs font-bold px-1 mb-2" style={{ color: "var(--text-tertiary)" }}>איך נוכל לעזור?</p>
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
                <button
                  onClick={() => setView("form")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-60"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--hanoo-blue-light)" }}>
                    <Send size={15} style={{ color: "var(--hanoo-blue)" }} />
                  </div>
                  <span className="flex-1 text-sm font-medium text-right" style={{ color: "var(--text-primary)" }}>צור קשר במייל</span>
                  <ChevronLeft size={16} style={{ color: "var(--text-tertiary)" }} />
                </button>
              </div>
            </div>

            {/* FAQ */}
            <div>
              <p className="text-xs font-bold px-1 mb-2" style={{ color: "var(--text-tertiary)" }}>שאלות נפוצות</p>
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
                {FAQ.map((item, i) => (
                  <div key={i} style={{ borderTop: i > 0 ? "1px solid var(--surface-card-border)" : "none" }}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-right active:opacity-60"
                    >
                      <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{item.q}</span>
                      <ChevronLeft size={16}
                        style={{ color: "var(--text-tertiary)", transform: openFaq === i ? "rotate(-90deg)" : "none", transition: "transform 0.2s" }} />
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-3.5">
                        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* FORM VIEW */}
        {view === "form" && !sent && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>תאר את התקלה שנתקלת בה ונטפל בה בהקדם.</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="תאר את הבעיה..."
                rows={7}
                className="w-full text-sm px-4 py-4 outline-none resize-none bg-transparent"
                style={{ color: "var(--text-primary)", fontFamily: "Heebo, sans-serif" }}
              />
            </div>
            <button
              onClick={sendReport}
              disabled={!text.trim() || sending}
              className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
              style={{ background: "var(--hanoo-blue)", opacity: !text.trim() || sending ? 0.5 : 1 }}
            >
              <Send size={16} />
              {sending ? "שולח..." : "שלח"}
            </button>
            <p className="text-center text-xs" style={{ color: "var(--text-tertiary)" }}>הדיווח יישלח ל-Info@hanoo.co.il</p>
          </div>
        )}

        {/* SUCCESS */}
        {sent && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--hanoo-green-light)" }}>
              <CheckCircle size={32} style={{ color: "var(--hanoo-green)" }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>הדיווח נשלח, תודה!</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>נחזור אליך בהקדם.</p>
            <button onClick={() => back()}
              className="mt-2 px-8 py-3 rounded-2xl font-bold text-white"
              style={{ background: "var(--hanoo-blue)" }}>
              חזור
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
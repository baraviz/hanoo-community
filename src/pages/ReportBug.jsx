import { useState } from "react";
import { useAppNavigation } from "@/lib/NavigationContext";
import { ChevronRight, Send, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ReportBug() {
  const { back } = useAppNavigation();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

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
    <div className="min-h-screen bg-white" dir="rtl">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 z-10">
        <button onClick={() => back()} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
          <ChevronRight size={18} className="text-gray-600" />
        </button>
        <h1 className="font-bold text-gray-800 text-base">דיווח על תקלה</h1>
      </div>

      <div className="px-5 py-6 max-w-lg mx-auto">
        {sent ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <CheckCircle size={56} className="text-green-500" />
            <h2 className="text-xl font-bold text-gray-800">הדיווח נשלח, תודה!</h2>
            <p className="text-gray-500 text-sm">נחזור אליך בהקדם.</p>
            <button
              onClick={() => back()}
              className="mt-4 px-8 py-3 rounded-2xl font-bold text-white text-sm"
              style={{ background: "#007AFF" }}
            >
              חזור
            </button>
          </div>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-5">תאר את התקלה שנתקלת בה ונטפל בה בהקדם.</p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="תאר את התקלה בפירוט..."
              rows={6}
              className="w-full text-sm border border-gray-200 rounded-2xl px-4 py-3 outline-none resize-none focus:border-blue-400 transition-colors"
              style={{ fontFamily: "Heebo, sans-serif" }}
            />
            <button
              onClick={sendReport}
              disabled={!text.trim() || sending}
              className="mt-4 w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
              style={{ background: "#007AFF", opacity: !text.trim() || sending ? 0.5 : 1 }}
            >
              <Send size={16} />
              {sending ? "שולח..." : "שלח דיווח"}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">הדיווח יישלח ל-Info@hanoo.co.il</p>
          </>
        )}
      </div>
    </div>
  );
}
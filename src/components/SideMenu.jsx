import { useState } from "react";
import { Link } from "react-router-dom";
import { X, LogOut, AlertTriangle, Shield, FileText, Accessibility } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SideMenu({ onClose }) {
  const [reportSent, setReportSent] = useState(false);
  const [reportText, setReportText] = useState("");
  const [showReport, setShowReport] = useState(false);

  async function sendReport() {
    if (!reportText.trim()) return;
    const user = await base44.auth.me().catch(() => null);
    await base44.integrations.Core.SendEmail({
      to: "bar.avizemer@gmail.com",
      subject: `[Hanoo] דיווח תקלה מ-${user?.email || "משתמש לא מזוהה"}`,
      body: `דיווח תקלה:\n\n${reportText}\n\nמשתמש: ${user?.full_name || ""} (${user?.email || ""})\nתאריך: ${new Date().toLocaleString("he-IL")}`,
    });
    setReportSent(true);
    setReportText("");
  }

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-40" onClick={onClose} />

      {/* Drawer */}
      <div
        className="relative mr-auto w-72 h-full bg-white flex flex-col shadow-2xl"
        style={{ animation: "slideInRight 0.25s ease-out" }}
      >
        <style>{`
          @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-base">תפריט</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto py-3">
          {/* Report Bug */}
          <button
            onClick={() => setShowReport(prev => !prev)}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-right"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: "#FFF3CD" }}>
              <AlertTriangle size={18} style={{ color: "#F59E0B" }} />
            </div>
            <span className="text-gray-800 font-medium text-sm">דיווח על תקלה</span>
          </button>

          {showReport && (
            <div className="mx-4 mb-2 p-3 bg-gray-50 rounded-2xl space-y-2">
              {reportSent ? (
                <p className="text-green-600 text-sm text-center font-medium py-2">✓ הדיווח נשלח, תודה!</p>
              ) : (
                <>
                  <textarea
                    value={reportText}
                    onChange={e => setReportText(e.target.value)}
                    placeholder="תאר את התקלה..."
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none resize-none"
                  />
                  <button
                    onClick={sendReport}
                    disabled={!reportText.trim()}
                    className="w-full py-2 rounded-xl text-sm font-bold text-white"
                    style={{ background: "#007AFF", opacity: reportText.trim() ? 1 : 0.5 }}
                  >
                    שלח דיווח
                  </button>
                </>
              )}
            </div>
          )}

          <div className="h-px bg-gray-100 mx-4 my-1" />

          <Link
            to="/PrivacyPolicy"
            onClick={onClose}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: "#EBF4FF" }}>
              <Shield size={18} style={{ color: "#007AFF" }} />
            </div>
            <span className="text-gray-800 font-medium text-sm">מדיניות פרטיות</span>
          </Link>

          <Link
            to="/TermsOfService"
            onClick={onClose}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: "#EBF4FF" }}>
              <FileText size={18} style={{ color: "#007AFF" }} />
            </div>
            <span className="text-gray-800 font-medium text-sm">תנאי שימוש</span>
          </Link>

          <Link
            to="/Accessibility"
            onClick={onClose}
            className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-none" style={{ background: "#E8F8EF" }}>
              <Accessibility size={18} style={{ color: "#34C759" }} />
            </div>
            <span className="text-gray-800 font-medium text-sm">הצהרת נגישות</span>
          </Link>
        </div>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-gray-100">
          <button
            onClick={() => base44.auth.logout()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
            style={{ background: "#FFE5E5", color: "#FF3B30" }}
          >
            <LogOut size={16} />
            התנתק
          </button>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, LogOut, AlertTriangle, Shield, FileText, Accessibility } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SideMenu({ onClose }) {
  const [closing, setClosing] = useState(false);
  const navigate = useNavigate();

  function close() {
    setClosing(true);
    setTimeout(() => onClose(), 250);
  }

  function handleLinkClick(path) {
    setClosing(true);
    setTimeout(() => { onClose(); navigate(path); }, 250);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-start" dir="rtl">
      <style>{`
        @keyframes slideInFromLeft  { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes slideOutToLeft   { from { transform: translateX(0); }   to { transform: translateX(-100%); } }
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        style={{ animation: closing ? "fadeOut 0.25s ease-in forwards" : "fadeIn 0.25s ease-out" }}
        onClick={close}
      />

      {/* Drawer — slides from the right edge (visually right side of screen) */}
      <div
        className="absolute top-0 left-0 bottom-0 w-64 bg-white flex flex-col shadow-2xl"
        style={{ animation: closing ? "slideOutToLeft 0.25s ease-in forwards" : "slideInFromLeft 0.25s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-base">תפריט</h2>
          <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto py-2">
          <button
            onClick={() => handleLinkClick("/ReportBug")}
            className="w-full flex items-center justify-end gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-right"
          >
            <span className="text-gray-700 font-medium text-sm">דיווח על תקלה</span>
            <AlertTriangle size={17} className="text-gray-800 flex-none" />
          </button>

          <button
            onClick={() => handleLinkClick("/PrivacyPolicy")}
            className="w-full flex items-center justify-end gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-right"
          >
            <span className="text-gray-700 font-medium text-sm">מדיניות פרטיות</span>
            <Shield size={17} className="text-gray-800 flex-none" />
          </button>

          <button
            onClick={() => handleLinkClick("/TermsOfService")}
            className="w-full flex items-center justify-end gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-right"
          >
            <span className="text-gray-700 font-medium text-sm">תנאי שימוש</span>
            <FileText size={17} className="text-gray-800 flex-none" />
          </button>

          <button
            onClick={() => handleLinkClick("/Accessibility")}
            className="w-full flex items-center justify-end gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-right"
          >
            <span className="text-gray-700 font-medium text-sm">הצהרת נגישות</span>
            <Accessibility size={17} className="text-gray-800 flex-none" />
          </button>
        </div>

        {/* Logout — sits above the bottom nav (80px) */}
        <div className="px-4 border-t border-gray-100" style={{ paddingBottom: "calc(80px + 1rem)", paddingTop: "1rem" }}>
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
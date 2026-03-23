import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, LogOut, AlertTriangle, Shield, FileText, Accessibility, CalendarDays } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ThemeToggle from "@/components/ThemeToggle";

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

      {/* Drawer */}
      <div
        className="absolute top-0 left-0 bottom-0 w-64 flex flex-col shadow-2xl"
        style={{
          background: "var(--surface-card)",
          animation: closing ? "slideOutToLeft 0.25s ease-in forwards" : "slideInFromLeft 0.25s ease-out",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: "var(--surface-card-border)" }}
        >
          <h2 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>תפריט</h2>
          <div className="flex items-center gap-2">
            <ThemeToggle className="!bg-transparent" />
            <button
              onClick={close}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: "var(--btn-secondary-bg)" }}
            >
              <X size={16} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto py-2">
          {[
            { label: "הזמנות",           icon: CalendarDays,  path: "/Bookings" },
            { label: "דיווח על תקלה",    icon: AlertTriangle, path: "/ReportBug" },
            { label: "מדיניות פרטיות",   icon: Shield,        path: "/PrivacyPolicy" },
            { label: "תנאי שימוש",       icon: FileText,      path: "/TermsOfService" },
            { label: "הצהרת נגישות",     icon: Accessibility, path: "/Accessibility" },
          ].map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              onClick={() => handleLinkClick(path)}
              className="w-full flex items-center justify-end gap-3 px-5 py-3 transition-colors text-right"
              style={{ color: "var(--text-primary)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--btn-secondary-bg)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span className="font-medium text-sm">{label}</span>
              <Icon size={17} style={{ color: "var(--text-primary)" }} className="flex-none" />
            </button>
          ))}
        </div>

        {/* Logout */}
        <div
          className="px-4 border-t"
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom) + 80px + 1rem)",
            paddingTop: "1rem",
            borderColor: "var(--surface-card-border)",
          }}
        >
          <button
            onClick={() => base44.auth.logout()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm"
            style={{ background: "var(--hanoo-red-light)", color: "var(--hanoo-red)" }}
          >
            <LogOut size={16} />
            התנתק
          </button>
        </div>
      </div>
    </div>
  );
}
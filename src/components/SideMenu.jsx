import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, LogOut, AlertTriangle, Shield, FileText, Accessibility, CalendarDays } from "lucide-react";
import { base44 } from "@/api/base44Client";

function WhatsAppIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
import ThemeToggle from "@/components/ThemeToggle";
import AgentOnboarding from "@/components/AgentOnboarding";

const WHATSAPP_BOT_PHONE = "16186212393";

export default function SideMenu({ onClose }) {
  const [closing, setClosing] = useState(false);
  const [showAgentSheet, setShowAgentSheet] = useState(false);
  const agentActivated = localStorage.getItem("hanoo_agent_activated") === "1";
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

          {/* WhatsApp Agent */}
          <div className="px-4 py-2 mt-1">
            <div className="h-px" style={{ background: "var(--surface-card-border)" }} />
          </div>
          <button
            onClick={() => {
              if (agentActivated) {
                window.open(`https://wa.me/${WHATSAPP_BOT_PHONE}`, "_blank");
              } else {
                setShowAgentSheet(true);
              }
            }}
            className="w-full flex items-center justify-end gap-3 px-5 py-3 transition-colors text-right"
            style={{ color: "var(--text-primary)", background: "transparent", border: "none" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--btn-secondary-bg)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">סוכן WhatsApp</span>
              {agentActivated && (
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: "var(--hanoo-green-light)", color: "var(--hanoo-green)" }}
                >
                  הופעל
                </span>
              )}
            </div>
            <WhatsAppIcon size={17} />
          </button>

          {showAgentSheet && (
            <AgentOnboarding onClose={() => setShowAgentSheet(false)} />
          )}
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
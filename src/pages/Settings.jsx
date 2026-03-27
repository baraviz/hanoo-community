// Settings page — iOS style
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ChevronLeft, ChevronRight, Shield, FileText, AlertTriangle,
  LogOut, MessageCircle, HelpCircle, Info
} from "lucide-react";

function SettingsRow({ icon, label, onPress, danger, chevron = true }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-right transition-opacity active:opacity-60"
      style={{ background: "transparent", border: "none" }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-none"
        style={{ background: danger ? "var(--hanoo-red-light)" : "var(--hanoo-blue-light)" }}>
        <span style={{ color: danger ? "var(--hanoo-red)" : "var(--hanoo-blue)" }}>{icon}</span>
      </div>
      <span className="flex-1 text-sm font-medium text-right"
        style={{ color: danger ? "var(--hanoo-red)" : "var(--text-primary)" }}>
        {label}
      </span>
      {chevron && <ChevronLeft size={16} style={{ color: "var(--text-tertiary)" }} />}
    </button>
  );
}

function SettingsSection({ title, children }) {
  return (
    <div>
      {title && <p className="text-xs font-bold px-1 mb-2" style={{ color: "var(--text-tertiary)" }}>{title}</p>}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--surface-card-border)", marginRight: 52 }} />;
}

export default function Settings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>
      {/* Header */}
      <div className="pt-safe px-5 pb-4 flex items-center gap-3" style={{ background: "var(--surface-header)" }}>
        <button onClick={() => navigate("/Profile")}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.2)" }}>
          <ChevronRight size={18} className="text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1 text-center">הגדרות</h1>
        <div className="w-9" />
      </div>

      <div className="px-5 py-5 space-y-5">

        {/* Support */}
        <SettingsSection title="תמיכה">
          <SettingsRow icon={<AlertTriangle size={16} />} label="דיווח על תקלה" onPress={() => navigate("/ReportBug")} />
          <Divider />
          <SettingsRow icon={<HelpCircle size={16} />} label="עזרה ושאלות נפוצות" onPress={() => navigate("/ReportBug")} />
        </SettingsSection>

        {/* Services */}
        <SettingsSection title="שירותים">
          <SettingsRow
            icon={<MessageCircle size={16} />}
            label="סוכן WhatsApp"
            onPress={() => {
              const activated = localStorage.getItem("hanoo_agent_activated") === "1";
              window.open(activated ? "https://wa.me/16186212393" : "/Profile", "_blank");
            }}
          />
        </SettingsSection>

        {/* Legal */}
        <SettingsSection title="משפטי">
          <SettingsRow icon={<Shield size={16} />} label="מדיניות פרטיות" onPress={() => navigate("/PrivacyPolicy")} />
          <Divider />
          <SettingsRow icon={<FileText size={16} />} label="תנאי שימוש" onPress={() => navigate("/TermsOfService")} />
          <Divider />
          <SettingsRow icon={<Info size={16} />} label="הצהרת נגישות" onPress={() => navigate("/Accessibility")} />
        </SettingsSection>

        {/* Account */}
        <SettingsSection title="חשבון">
          <SettingsRow
            icon={<LogOut size={16} />}
            label="התנתק"
            onPress={() => base44.auth.logout()}
            danger
            chevron={false}
          />
        </SettingsSection>

      </div>
    </div>
  );
}
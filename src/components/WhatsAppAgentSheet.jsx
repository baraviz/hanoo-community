import { useState } from "react";
import { base44 } from "@/api/base44Client";

const examples = [
  { emoji: "🔍", text: "מה הזמנות הפעילות שלי?" },
  { emoji: "🅿️", text: "יש חניה פנויה מחר ב-8 בבוקר?" },
  { emoji: "❌", text: "בטל לי את ההזמנה להיום" },
  { emoji: "📅", text: "הזמן לי חניה מחר מ-9 עד 11" },
];

export default function WhatsAppAgentSheet({ onClose }) {
  const [closing, setClosing] = useState(false);

  function close() {
    setClosing(true);
    setTimeout(onClose, 230);
  }

  function openAgent() {
    setClosing(true);
    setTimeout(() => {
      onClose();
      window.open(base44.agents.getWhatsAppConnectURL("parking_agent"), "_blank");
    }, 230);
  }

  const anim = closing
    ? { backdrop: "fadeOut 0.23s ease-in forwards", sheet: "slideDown 0.23s ease-in forwards" }
    : { backdrop: "fadeIn 0.23s ease-out", sheet: "slideUp 0.23s ease-out" };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.4)", animation: anim.backdrop }}
      onClick={close}
    >
      <style>{`
        @keyframes slideUp   { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(0); }   to { transform: translateY(100%); } }
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut   { from { opacity: 1; } to { opacity: 0; } }
      `}</style>

      <div
        className="rounded-t-3xl p-6 space-y-5 max-w-[430px] w-full"
        style={{
          background: "var(--surface-card)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 80px + 1.5rem)",
          animation: anim.sheet,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: "var(--sheet-handle)" }} />

        {/* Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ background: "var(--hanoo-green-light)" }}
          >
            🤖
          </div>
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            עוזר החניה החכם
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            שוחח איתו בוואטסאפ בעברית רגילה — הוא מבין אותך ויעזור לך לנהל את החניות שלך
          </p>
        </div>

        {/* Examples */}
        <div className="space-y-2">
          <p className="text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>
            לדוגמה, תוכל לשאול:
          </p>
          {examples.map((ex, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "var(--surface-page)", border: "1px solid var(--surface-card-border)" }}
            >
              <span className="text-lg">{ex.emoji}</span>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                "{ex.text}"
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={openAgent}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 text-base"
          style={{ background: "#25D366" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          פתח בוואטסאפ
        </button>

        <button
          onClick={close}
          className="w-full py-3 rounded-2xl font-bold text-sm"
          style={{ background: "var(--btn-secondary-bg)", color: "var(--text-secondary)" }}
        >
          סגור
        </button>
      </div>
    </div>
  );
}
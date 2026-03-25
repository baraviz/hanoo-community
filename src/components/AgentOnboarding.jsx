import { useState } from "react";
import { base44 } from "@/api/base44Client";

const WHATSAPP_BOT_PHONE = "972XXXXXXXXX"; // יש להחליף במספר הבוט

const slides = [
  {
    image: "https://media.base44.com/images/public/69b1df337f72186a6fd4c0c7/9132fa191_ChatGPTImageMar25202602_32_52PM1.png",
    title: "היי, אני הבוט של Hanoo 👋",
    subtitle: "עוזר החניה החכם שלך בוואטסאפ",
    description: "אני זמין 24/7 ויכול לעזור לך לנהל את החניה שלך ישירות מהוואטסאפ — בלי לפתוח את האפליקציה.",
    action: null,
  },
  {
    image: null,
    emoji: "💬",
    title: "מה אני יכול לעשות?",
    subtitle: null,
    description: null,
    examples: [
      { emoji: "🔍", text: "מה הזמנות הפעילות שלי?" },
      { emoji: "📅", text: "הזמן לי חניה מחר מ-9 עד 11" },
      { emoji: "❌", text: "בטל לי את ההזמנה להיום" },
      { emoji: "🅿️", text: "יש חניה פנויה ב-8 בבוקר?" },
    ],
    action: null,
  },
  {
    image: null,
    emoji: "📱",
    title: "שמור אותי באנשי קשר",
    subtitle: "כדי שתמיד תדע עם מי אתה מדבר",
    description: 'שמור אותי בשם "Hanoo Bot 🤖" כדי שההודעות שלי יגיעו בצורה ברורה ומזוהה.',
    action: "contact",
  },
];

function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function AgentOnboarding({ onClose }) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);

  const isLast = step === slides.length - 1;
  const slide = slides[step];

  function close() {
    setClosing(true);
    setTimeout(onClose, 230);
  }

  function next() {
    if (isLast) {
      // open WhatsApp agent
      setClosing(true);
      setTimeout(() => {
        onClose();
        window.open(base44.agents.getWhatsAppConnectURL("parking_agent"), "_blank");
      }, 230);
    } else {
      setStep(s => s + 1);
    }
  }

  function saveContact() {
    // vCard download
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:Hanoo Bot 🤖\nTEL;TYPE=CELL:+${WHATSAPP_BOT_PHONE}\nEND:VCARD`;
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Hanoo-Bot.vcf";
    a.click();
    URL.revokeObjectURL(url);
    setContactSaved(true);
  }

  const anim = closing
    ? { backdrop: "fadeOut 0.23s ease-in forwards", sheet: "slideDown 0.23s ease-in forwards" }
    : { backdrop: "fadeIn 0.23s ease-out", sheet: "slideUp 0.23s ease-out" };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.5)", animation: anim.backdrop }}
      onClick={close}
    >
      <style>{`
        @keyframes slideUp   { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideDown { from { transform: translateY(0); }   to { transform: translateY(100%); } }
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut   { from { opacity: 1; } to { opacity: 0; } }
        @keyframes popIn     { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      <div
        className="rounded-t-3xl max-w-[430px] w-full overflow-hidden"
        style={{
          background: "var(--surface-card)",
          animation: anim.sheet,
          paddingBottom: "calc(env(safe-area-inset-bottom) + 80px + 1rem)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: "var(--sheet-handle)" }} />
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mb-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 8,
                height: 8,
                background: i === step ? "var(--hanoo-blue)" : "var(--surface-card-border)",
              }}
            />
          ))}
        </div>

        {/* Slide content */}
        <div className="px-6 pt-2 pb-4 text-center" key={step} style={{ animation: "popIn 0.3s ease-out" }}>

          {/* Slide 0 — image */}
          {slide.image && (
            <img
              src={slide.image}
              alt="Hanoo Bot"
              className="mx-auto mb-4 object-contain"
              style={{ height: 200, width: "auto" }}
            />
          )}

          {/* Slide 1 — examples */}
          {slide.examples && (
            <div className="space-y-2 mb-4 text-right">
              {slide.examples.map((ex, i) => (
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
          )}

          {/* Slide 2 — contact */}
          {!slide.image && !slide.examples && (
            <div
              className="mx-auto mb-4 w-20 h-20 rounded-3xl flex items-center justify-center text-4xl"
              style={{ background: "var(--hanoo-blue-light)" }}
            >
              {slide.emoji}
            </div>
          )}

          {!slide.examples && (
            <>
              <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                {slide.title}
              </h2>
              {slide.subtitle && (
                <p className="text-sm font-medium mb-2" style={{ color: "var(--hanoo-blue)" }}>
                  {slide.subtitle}
                </p>
              )}
              {slide.description && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {slide.description}
                </p>
              )}
            </>
          )}

          {slide.examples && (
            <h2 className="text-xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
              {slide.title}
            </h2>
          )}

          {/* Contact action */}
          {slide.action === "contact" && (
            <button
              onClick={saveContact}
              className="mt-4 w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: contactSaved ? "var(--hanoo-green-light)" : "var(--hanoo-blue-light)",
                color: contactSaved ? "var(--hanoo-green)" : "var(--hanoo-blue)",
              }}
            >
              {contactSaved ? "✅ נשמר בהצלחה!" : "📲 הוסף לאנשי קשר"}
            </button>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 space-y-2">
          <button
            onClick={next}
            className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 text-base"
            style={{ background: isLast ? "#25D366" : "var(--hanoo-blue)" }}
          >
            {isLast ? (
              <>
                <WhatsAppIcon size={20} />
                פתח שיחה בוואטסאפ
              </>
            ) : (
              "הבא ←"
            )}
          </button>

          <button
            onClick={close}
            className="w-full py-2 text-sm font-medium"
            style={{ color: "var(--text-tertiary)", background: "transparent" }}
          >
            {isLast ? "סגור" : "דלג"}
          </button>
        </div>
      </div>
    </div>
  );
}
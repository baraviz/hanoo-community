import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

export default function ThankYouWhatsApp({ ownerName, ownerPhone, spotNumber, onClose }) {
  const [message, setMessage] = useState(`היי ${ownerName}! תודה רבה על חניה מספר ${spotNumber}, זה עזר לי מאוד 🙏`);

  function sendWhatsApp() {
    const phone = ownerPhone?.replace(/\D/g, "").replace(/^0/, "972");
    const encoded = encodeURIComponent(message);
    const url = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl p-6 space-y-4"
        style={{ paddingBottom: "calc(80px + 1.5rem)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#E8F8EF" }}>
              <MessageCircle size={20} style={{ color: "#25D366" }} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">שלח תודה לשכן</h3>
              <p className="text-xs text-gray-400">{ownerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 outline-none resize-none focus:border-blue-400"
          placeholder="כתוב הודעת תודה..."
        />

        {!ownerPhone && (
          <p className="text-xs text-amber-600 text-center">לשכן אין מספר טלפון — תוכל לשלוח ידנית</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-3 rounded-2xl font-bold text-gray-700"
            style={{ background: "#F3F4F6" }}
          >
            דלג
          </button>
          <button
            onClick={sendWhatsApp}
            className="py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "#25D366" }}
          >
            <Send size={16} />
            שלח בוואטסאפ
          </button>
        </div>
      </div>
    </div>
  );
}
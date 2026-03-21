import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Send, ChevronRight, MessageCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function Chat() {
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [neighbors, setNeighbors] = useState([]);
  const [selectedNeighbor, setSelectedNeighbor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadInit();
  }, []);

  useEffect(() => {
    if (selectedNeighbor && user) loadMessages(selectedNeighbor);
  }, [selectedNeighbor]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time subscription instead of polling
  useEffect(() => {
    if (!selectedNeighbor || !user) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      const convId = getConversationId(user.email, selectedNeighbor.user_email);
      if (event.type === "create" && event.data?.conversation_id === convId) {
        setMessages(prev => {
          if (prev.some(m => m.id === event.data.id)) return prev;
          return [...prev, event.data];
        });
        if (event.data.receiver_email === user.email) {
          base44.entities.Message.update(event.data.id, { read: true });
        }
      }
    });
    return () => unsub();
  }, [selectedNeighbor, user]);

  async function loadInit() {
    const u = await base44.auth.me();
    setUser(u);
    const res = await base44.entities.Resident.filter({ user_email: u.email });
    if (res.length > 0) {
      const r = res[0];
      setResident(r);
      const allResidents = await base44.entities.Resident.filter({
        building_id: r.building_id,
        status: "approved",
      });
      setNeighbors(allResidents.filter(n => n.user_email !== u.email));
    }
    setLoading(false);
  }

  function getConversationId(email1, email2) {
    return [email1, email2].sort().join("__");
  }

  async function loadMessages(neighbor) {
    const convId = getConversationId(user.email, neighbor.user_email);
    const msgs = await base44.entities.Message.filter({ conversation_id: convId });
    msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    setMessages(msgs);
    // Mark as read in batch
    const unread = msgs.filter(m => m.receiver_email === user.email && !m.read);
    if (unread.length > 0) {
      Promise.all(unread.map(m => base44.entities.Message.update(m.id, { read: true })));
    }
  }

  async function sendMessage() {
    if (!newMsg.trim() || !selectedNeighbor) return;
    const text = newMsg.trim();
    setNewMsg("");
    const convId = getConversationId(user.email, selectedNeighbor.user_email);
    const msg = await base44.entities.Message.create({
      building_id: resident.building_id,
      sender_email: user.email,
      sender_name: user.full_name,
      receiver_email: selectedNeighbor.user_email,
      receiver_name: selectedNeighbor.user_name,
      content: text,
      read: false,
      conversation_id: convId,
    });
    setMessages(prev => [...prev, msg]);
    inputRef.current?.focus();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--surface-page)" }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: "var(--surface-card-border)", borderTopColor: "var(--hanoo-blue)" }} />
      </div>
    );
  }

  if (selectedNeighbor) {
    return (
      <div className="flex flex-col" style={{ height: "calc(100vh - 64px)", background: "var(--surface-page)" }}>
        {/* Header */}
        <div className="flex-none pt-safe pb-4 px-5 flex items-center gap-3" style={{ background: "var(--surface-header)" }}>
          <button
            onClick={() => { setSelectedNeighbor(null); setMessages([]); }}
            aria-label="חזור לרשימת שכנים"
            className="w-11 h-11 flex items-center justify-center rounded-2xl flex-none"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            <ChevronRight size={22} className="text-white" aria-hidden="true" />
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-none" style={{ background: "rgba(255,255,255,0.3)" }}>
            <span className="text-white font-bold text-base">{(selectedNeighbor.user_name || "?")[0]}</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">{selectedNeighbor.user_name}</p>
            <p className="text-xs" style={{ color: "var(--surface-header-sub)" }}>דירה {selectedNeighbor.apartment_number}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ paddingBottom: 16 }}>
          {messages.length === 0 && (
            <div className="text-center py-8" style={{ color: "var(--text-tertiary)" }}>
              <MessageCircle size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">שלח הודעה ראשונה!</p>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_email === user.email;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                <div
                  className="max-w-xs px-4 py-2 rounded-2xl text-sm"
                  style={isMe
                    ? { background: "var(--hanoo-blue)", color: "white", borderBottomRightRadius: 4 }
                    : { background: "var(--surface-card)", color: "var(--text-primary)", borderBottomLeftRadius: 4, border: "1px solid var(--surface-card-border)" }
                  }
                >
                  <p>{msg.content}</p>
                  <p className="text-xs mt-1" style={{ color: isMe ? "rgba(255,255,255,0.6)" : "var(--text-tertiary)" }}>
                    {msg.created_date ? format(parseISO(msg.created_date), "HH:mm") : ""}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input — pinned above nav bar */}
        <div
          className="flex-none px-4 py-3 flex gap-2 border-t"
          style={{
            background: "var(--surface-card)",
            borderColor: "var(--surface-nav-border)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
          }}
        >
          <input
            ref={inputRef}
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="הקלד הודעה..."
            aria-label="הודעה חדשה"
            className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
            style={{
              background: "var(--btn-secondary-bg)",
              color: "var(--text-primary)",
              border: "1px solid var(--surface-card-border)",
              minHeight: 44,
            }}
          />
          <button
            onClick={sendMessage}
            aria-label="שלח הודעה"
            disabled={!newMsg.trim()}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-none"
            style={{ background: "var(--hanoo-blue)", opacity: newMsg.trim() ? 1 : 0.4 }}
          >
            <Send size={16} className="text-white" style={{ transform: "scaleX(-1)" }} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>
      <div className="pt-safe pb-6 px-5" style={{ background: "var(--surface-header)" }}>
        <h1 className="text-white text-xl font-bold">צ'אט שכנים 💬</h1>
        <p className="text-sm" style={{ color: "var(--surface-header-sub)" }}>דבר עם השכנים בבניין</p>
      </div>

      <div className="px-5 py-4">
        {neighbors.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--text-tertiary)" }}>
            <MessageCircle size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">אין שכנים מאושרים בבניין עדיין</p>
          </div>
        ) : (
          <div className="space-y-2">
            {neighbors.map(n => (
              <button
                key={n.id}
                onClick={() => setSelectedNeighbor(n)}
                aria-label={`פתח שיחה עם ${n.user_name}`}
                className="app-card w-full p-4 flex items-center gap-3 active:scale-95 transition-transform text-right"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-none"
                  style={{ background: "var(--hanoo-blue)" }}
                >
                  {(n.user_name || "?")[0]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{n.user_name}</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>דירה {n.apartment_number || "?"}</p>
                </div>
                <ChevronRight size={18} style={{ color: "var(--text-tertiary)", transform: "scaleX(-1)" }} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
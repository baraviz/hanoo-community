import { useState, useEffect, useRef } from "react";
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

  useEffect(() => {
    loadInit();
  }, []);

  useEffect(() => {
    if (selectedNeighbor) loadMessages(selectedNeighbor);
  }, [selectedNeighbor]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll messages every 5s
  useEffect(() => {
    if (!selectedNeighbor) return;
    const interval = setInterval(() => loadMessages(selectedNeighbor), 5000);
    return () => clearInterval(interval);
  }, [selectedNeighbor]);

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
    // Mark as read
    const unread = msgs.filter(m => m.receiver_email === user.email && !m.read);
    for (const m of unread) {
      base44.entities.Message.update(m.id, { read: true });
    }
  }

  async function sendMessage() {
    if (!newMsg.trim() || !selectedNeighbor) return;
    const convId = getConversationId(user.email, selectedNeighbor.user_email);
    const msg = await base44.entities.Message.create({
      building_id: resident.building_id,
      sender_email: user.email,
      sender_name: user.full_name,
      receiver_email: selectedNeighbor.user_email,
      receiver_name: selectedNeighbor.user_name,
      content: newMsg.trim(),
      read: false,
      conversation_id: convId,
    });
    setMessages(prev => [...prev, msg]);
    setNewMsg("");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (selectedNeighbor) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="pt-12 pb-4 px-5 flex items-center gap-3" style={{ background: "#007AFF" }}>
          <button onClick={() => setSelectedNeighbor(null)} className="text-white">
            <ChevronRight size={24} />
          </button>
          <div className="w-10 h-10 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
            <span className="text-white font-bold">{(selectedNeighbor.user_name || "?")[0]}</span>
          </div>
          <div>
            <p className="text-white font-bold">{selectedNeighbor.user_name}</p>
            <p className="text-blue-200 text-xs">דירה {selectedNeighbor.apartment_number}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ paddingBottom: 80 }}>
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <MessageCircle size={40} className="mx-auto mb-2 opacity-30" />
              <p>שלח הודעה ראשונה!</p>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.sender_email === user.email;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${isMe ? "text-white" : "bg-white text-gray-800 shadow-sm"}`}
                  style={isMe ? { background: "#007AFF", borderBottomRightRadius: 4 } : { borderBottomLeftRadius: 4 }}
                >
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                    {msg.created_date ? format(parseISO(msg.created_date), "HH:mm") : ""}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2" style={{ maxWidth: 430, margin: "0 auto" }}>
          <input
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="הקלד הודעה..."
            className="flex-1 border border-gray-200 rounded-full px-4 py-2 outline-none focus:border-blue-400 text-sm"
          />
          <button
            onClick={sendMessage}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "#007AFF" }}
          >
            <Send size={16} className="text-white" style={{ transform: "scaleX(-1)" }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-12 pb-6 px-5" style={{ background: "#007AFF" }}>
        <h1 className="text-white text-xl font-bold">צ'אט שכנים 💬</h1>
        <p className="text-blue-200 text-sm">דבר עם השכנים בבניין</p>
      </div>

      <div className="px-5 py-4">
        {neighbors.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">אין שכנים מאושרים בבניין עדיין</p>
          </div>
        ) : (
          <div className="space-y-2">
            {neighbors.map(n => (
              <button
                key={n.id}
                onClick={() => setSelectedNeighbor(n)}
                className="card w-full p-4 flex items-center gap-3 active:scale-98 transition-transform text-right"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: "#007AFF" }}>
                  {(n.user_name || "?")[0]}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-800">{n.user_name}</p>
                  <p className="text-gray-500 text-sm">דירה {n.apartment_number || "?"}</p>
                </div>
                <ChevronRight size={18} className="text-gray-300" style={{ transform: "scaleX(-1)" }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { LogOut, Copy, CheckCircle, Car, Phone, Pencil, Menu } from "lucide-react";
import SideMenu from "@/components/SideMenu";
import { format, parseISO } from "date-fns";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [building, setBuilding] = useState(null);
  const [pendingResidents, setPendingResidents] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const u = await base44.auth.me().catch(() => null);
    if (!u) { base44.auth.redirectToLogin(createPageUrl("Profile")); return; }
    setUser(u);
    const res = await base44.entities.Resident.filter({ user_email: u.email });
    if (res.length === 0) return;
    const r = res[0];
    setResident(r);

    const [buildings, bookings] = await Promise.all([
      base44.entities.Building.filter({ id: r.building_id }),
      base44.entities.Booking.filter({ renter_email: u.email }),
    ]);
    if (buildings.length > 0) {
      const b = buildings[0];
      setBuilding(b);
      setIsOwner(b.owner_email === u.email);

      if (b.owner_email === u.email) {
        const allResidents = await base44.entities.Resident.filter({
          building_id: b.id,
        });
        setPendingResidents(allResidents.filter(r => r.user_email !== u.email));
      }
    }
    setMyBookings(bookings.slice(0, 5));
    setPhone(r.phone || u.phone || "");
  }

  async function savePhone() {
    if (!phone.trim()) return;
    setSavingPhone(true);
    await Promise.all([
      base44.entities.Resident.update(resident.id, { phone: phone.trim() }),
      base44.auth.updateMe({ phone: phone.trim() }),
    ]);
    setSavingPhone(false);
    setPhoneSaved(true);
    setTimeout(() => setPhoneSaved(false), 2000);
  }

  async function approveResident(r) {
    await base44.entities.Resident.update(r.id, { status: "approved" });
    setPendingResidents(prev => prev.filter(p => p.id !== r.id));
  }

  async function rejectResident(r) {
    await base44.entities.Resident.update(r.id, { status: "rejected" });
    setPendingResidents(prev => prev.filter(p => p.id !== r.id));
  }

  function copyCode() {
    if (building?.invite_code) {
      navigator.clipboard.writeText(building.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function logout() {
    base44.auth.logout();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}
      <div className="pt-12 pb-6 px-5" style={{ background: "#007AFF" }}>
        <div className="flex items-center justify-start mb-4">
          <button onClick={() => setMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-2xl" style={{ background: "rgba(255,255,255,0.2)" }}>
            <Menu size={18} className="text-white" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white bg-opacity-30 flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{(user?.full_name || "?")[0]}</span>
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{user?.full_name}</h1>
            <p className="text-blue-200 text-sm">{user?.email}</p>
            {isOwner && <span className="text-xs bg-white bg-opacity-20 text-white px-2 py-0.5 rounded-full">👑 בעל בניין</span>}
          </div>
        </div>

        <div className="mt-4 bg-white bg-opacity-20 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-blue-200 text-xs">קרדיטים</p>
            <p className="text-white text-2xl font-bold">{resident?.credits || 0}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs">דירה</p>
            <p className="text-white font-bold">{resident?.apartment_number || "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs">חניה</p>
            <p className="text-white font-bold">{resident?.parking_spot || "—"}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Phone number */}
        {resident && (
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-2">מספר טלפון (לוואטסאפ עם שכנים)</p>
            {resident.phone && !editingPhone ? (
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-gray-400 flex-none" />
                <span className="flex-1 text-sm font-medium text-gray-800" dir="ltr">{resident.phone}</span>
                <button onClick={() => setEditingPhone(true)} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "#EBF4FF" }}>
                  <Pencil size={14} style={{ color: "#007AFF" }} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
                  <Phone size={16} className="text-gray-400 flex-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="050-0000000"
                    className="flex-1 text-sm font-medium text-gray-800 outline-none bg-transparent"
                    dir="ltr"
                    autoFocus={!!resident.phone}
                  />
                </div>
                <button
                  onClick={async () => { await savePhone(); setResident(prev => ({ ...prev, phone: phone.trim() })); setEditingPhone(false); }}
                  disabled={savingPhone}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: phoneSaved ? "#34C759" : "#007AFF", opacity: savingPhone ? 0.6 : 1 }}
                >
                  {phoneSaved ? "✓" : "שמור"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* My parking */}
        {resident && (resident.parking_spot || resident.parking_floor) && (
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-1">החניה שלי</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#EBF4FF" }}>
                <Car size={20} style={{ color: "#007AFF" }} />
              </div>
              <div>
                <p className="font-bold text-gray-800">חניה {resident.parking_spot || "—"}</p>
                {resident.parking_floor && <p className="text-gray-500 text-sm">קומה {resident.parking_floor}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Building code */}
        {building && (
          <div className="card p-4">
            <p className="text-xs text-gray-400 mb-1">הבניין שלי</p>
            <p className="font-bold text-gray-800 mb-1">{building.name}</p>
            <p className="text-gray-500 text-sm mb-3">{building.address}, {building.city}</p>
            {isOwner && (
              <div>
                <p className="text-xs text-gray-400 mb-1">קוד הצטרפות לשכנים</p>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold tracking-widest"
                  style={{ background: "#EBF4FF", color: "#007AFF" }}
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  {building.invite_code}
                </button>
              </div>
            )}
          </div>
        )}

        {/* All residents (owner only) */}
        {isOwner && pendingResidents.length > 0 && (
          <div className="card p-4">
            <p className="font-bold text-gray-800 mb-3">דיירים בבניין ({pendingResidents.length})</p>
            <div className="space-y-3">
              {pendingResidents.map(r => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: "#007AFF" }}>
                    {(r.user_name || "?")[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">{r.user_name}</p>
                    <p className="text-gray-400 text-xs">דירה {r.apartment_number || "?"}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${r.status === "approved" ? "bg-green-500" : r.status === "pending" ? "bg-amber-500" : "bg-red-500"}`}></div>
                      <span className="text-xs text-gray-400">
                        {r.status === "approved" ? "פעיל" : r.status === "pending" ? "בהמתנה" : "דחוי"}
                      </span>
                    </div>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => rejectResident(r)} className="px-2 py-1 rounded-lg text-xs font-medium" style={{ background: "#FFE5E5", color: "#FF3B30" }}>דחה</button>
                      <button onClick={() => approveResident(r)} className="px-2 py-1 rounded-lg text-xs font-medium text-white" style={{ background: "#34C759" }}>אשר</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent bookings */}
        {myBookings.length > 0 && (
          <div className="card p-4">
            <p className="font-bold text-gray-800 mb-3">הזמנות אחרונות</p>
            <div className="space-y-2">
              {myBookings.map(b => (
                <div key={b.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: b.status === "active" ? "#EBF4FF" : "#F5F5F5" }}>
                    <Car size={16} style={{ color: b.status === "active" ? "#007AFF" : "#999" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">חניה #{b.spot_number}</p>
                    <p className="text-xs text-gray-400">{b.start_time ? format(parseISO(b.start_time), "dd/MM HH:mm") : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: "#007AFF" }}>-{b.total_credits}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${b.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {b.status === "active" ? "פעיל" : "הושלם"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
          style={{ background: "#FFE5E5", color: "#FF3B30" }}
        >
          <LogOut size={18} />
          התנתק
        </button>
      </div>
    </div>
  );
}
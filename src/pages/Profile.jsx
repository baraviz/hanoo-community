// Profile page — minimal iOS style (avatar + info card)
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Camera, ChevronRight, Pencil, CheckCircle } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser]             = useState(null);
  const [resident, setResident]     = useState(null);
  const [building, setBuilding]     = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [phone, setPhone]           = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const u = await base44.auth.me().catch(() => null);
    if (!u) { base44.auth.redirectToLogin("/Profile"); return; }
    setUser(u);
    const res = await base44.entities.Resident.filter({ user_email: u.email });
    if (res.length === 0) return;
    const r = res[0];
    setResident(r);
    setPhone(r.phone || "");
    const buildings = await base44.entities.Building.filter({ id: r.building_id });
    if (buildings.length > 0) setBuilding(buildings[0]);
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ avatar_url: file_url });
    setUser(prev => ({ ...prev, avatar_url: file_url }));
    setUploadingAvatar(false);
  }

  async function savePhone() {
    if (!phone.trim()) return;
    setSavingPhone(true);
    await Promise.all([
      base44.entities.Resident.update(resident.id, { phone: phone.trim() }),
      base44.auth.updateMe({ phone: phone.trim() }),
    ]);
    setResident(prev => ({ ...prev, phone: phone.trim() }));
    setSavingPhone(false);
    setPhoneSaved(true);
    setTimeout(() => { setPhoneSaved(false); setEditingPhone(false); }, 1500);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>

      {/* Header */}
      <div className="pt-safe px-5 py-4 flex items-center justify-between" style={{ background: "var(--surface-page)" }}>
        <button
          onClick={() => navigate("/Settings")}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: "var(--btn-secondary-bg)" }}
          aria-label="הגדרות"
        >
          <ChevronRight size={18} style={{ color: "var(--text-secondary)" }} />
        </button>
        <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>פרופיל</p>
        <div className="w-9" />
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-col items-center px-5 pt-4 pb-6">
        <div className="relative mb-4">
          <div
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: "var(--btn-secondary-bg)", border: "3px solid var(--surface-card-border)" }}
          >
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="פרופיל" className="w-full h-full object-cover" />
              : <span className="text-4xl font-bold" style={{ color: "var(--text-tertiary)" }}>{(user?.full_name || "?")[0]}</span>}
          </div>
          <label
            className="absolute bottom-0 left-0 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: "var(--hanoo-blue)", border: "2px solid var(--surface-page)" }}
          >
            {uploadingAvatar
              ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera size={13} className="text-white" />}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
        </div>

        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{user?.full_name || "..."}</h1>
        {building && <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{building.name}</p>}
      </div>

      {/* Info sections */}
      <div className="px-5 space-y-5">

        {/* Personal info */}
        <div>
          <p className="text-xs font-bold px-1 mb-2" style={{ color: "var(--text-tertiary)" }}>פרטים אישיים</p>
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
            {/* Name */}
            <div className="flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
              <span className="text-sm font-medium flex-none" style={{ color: "var(--text-tertiary)", minWidth: 48 }}>שם</span>
              <span className="flex-1 text-sm text-left" style={{ color: "var(--text-primary)" }}>{user?.full_name || "—"}</span>
            </div>
            {/* Email */}
            <div className="flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
              <span className="text-sm font-medium flex-none" style={{ color: "var(--text-tertiary)", minWidth: 48 }}>אימייל</span>
              <span className="flex-1 text-sm text-left" dir="ltr" style={{ color: "var(--text-primary)", fontSize: 12 }}>{user?.email || "—"}</span>
            </div>
            {/* Phone */}
            <div className="flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
              <span className="text-sm font-medium flex-none" style={{ color: "var(--text-tertiary)", minWidth: 48 }}>טלפון</span>
              {!editingPhone ? (
                <>
                  <span className="flex-1 text-sm text-left" dir="ltr" style={{ color: "var(--text-primary)" }}>{resident?.phone || "—"}</span>
                  <button onClick={() => setEditingPhone(true)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg flex-none"
                    style={{ background: "var(--hanoo-blue-light)" }}>
                    <Pencil size={13} style={{ color: "var(--hanoo-blue)" }} />
                  </button>
                </>
              ) : (
                <>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="050-0000000" dir="ltr" autoFocus
                    className="flex-1 text-sm outline-none bg-transparent text-left"
                    style={{ color: "var(--text-primary)" }} />
                  <button onClick={savePhone} disabled={savingPhone || !phone.trim()}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white flex-none"
                    style={{ background: phoneSaved ? "var(--hanoo-green)" : "var(--hanoo-blue)", opacity: savingPhone ? 0.6 : 1 }}>
                    {phoneSaved ? "✓" : "שמור"}
                  </button>
                </>
              )}
            </div>
            {/* Apartment */}
            {resident?.apartment_number && (
              <div className="flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
                <span className="text-sm font-medium flex-none" style={{ color: "var(--text-tertiary)", minWidth: 48 }}>דירה</span>
                <span className="flex-1 text-sm text-left" style={{ color: "var(--text-primary)" }}>{resident.apartment_number}</span>
              </div>
            )}
            {/* Parking */}
            {resident?.parking_spot && (
              <div className="flex items-center px-4 py-3.5">
                <span className="text-sm font-medium flex-none" style={{ color: "var(--text-tertiary)", minWidth: 48 }}>חניה</span>
                <span className="flex-1 text-sm text-left" style={{ color: "var(--text-primary)" }}>
                  {resident.parking_spot}{resident.parking_floor ? ` · קומה ${resident.parking_floor}` : ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* League quick row */}
        {resident && (
          <div>
            <p className="text-xs font-bold px-1 mb-2" style={{ color: "var(--text-tertiary)" }}>ליגה</p>
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
              <button
                onClick={() => navigate("/Settings")}
                className="w-full flex items-center px-4 py-3.5 active:opacity-60"
              >
                <span className="text-sm font-medium flex-none" style={{ color: "var(--text-tertiary)", minWidth: 48 }}>ליגה</span>
                <span className="flex-1 text-sm text-left font-medium" style={{ color: "var(--text-primary)" }}>
                  {{ Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎", Diamond: "👑" }[resident.league] || "🥉"} {resident.league || "Bronze"}
                </span>
                <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{resident.points || 0} נקודות</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
// Profile page — iOS style redesign
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  LogOut, Copy, CheckCircle, Car, Phone, Pencil, User, Trophy,
  Building2, Share2, Trash2, Camera, Settings, ChevronLeft
} from "lucide-react";
import LeagueCard from "@/components/profile/LeagueCard";
import ActivityHistory from "@/components/profile/ActivityHistory";
import ResidentsManager from "@/components/profile/ResidentsManager";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";
import { format } from "date-fns";

const TABS = [
  { id: "personal", label: "פרטים",  icon: User },
  { id: "league",   label: "ליגה",   icon: Trophy },
  { id: "building", label: "בניין",  icon: Building2 },
];

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser]               = useState(null);
  const [resident, setResident]       = useState(null);
  const [building, setBuilding]       = useState(null);
  const [allResidents, setAllResidents] = useState([]);
  const [myBookings, setMyBookings]   = useState([]);
  const [copied, setCopied]           = useState(false);
  const [isOwner, setIsOwner]         = useState(false);
  const [phone, setPhone]             = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved]   = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [activeTab, setActiveTab]     = useState("personal");
  const [shareCopied, setShareCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep]   = useState(1);
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const u = await base44.auth.me().catch(() => null);
    if (!u) { base44.auth.redirectToLogin("/Profile"); return; }
    setUser(u);
    const res = await base44.entities.Resident.filter({ user_email: u.email });
    if (res.length === 0) return;
    const r = res[0];
    setResident(r);
    setPhone(r.phone || u.phone || "");

    const [buildings, bookings] = await Promise.all([
      base44.entities.Building.filter({ id: r.building_id }),
      base44.entities.Booking.filter({ renter_email: u.email }),
    ]);

    if (buildings.length > 0) {
      const b = buildings[0];
      setBuilding(b);
      const ownerFlag = b.owner_email === u.email;
      setIsOwner(ownerFlag);
      if (ownerFlag) {
        const allRes = await base44.entities.Resident.filter({ building_id: b.id });
        setAllResidents(allRes.filter(x => x.user_email !== u.email));
      }
    }
    setMyBookings(bookings.sort((a, b) => new Date(b.start_time) - new Date(a.start_time)).slice(0, 10));
  }

  async function handleShare() {
    const link = `${window.location.origin}/JoinViaLink?bid=${resident?.building_id}&ref=${encodeURIComponent(user?.email || "")}`;
    if (navigator.share) {
      try { await navigator.share({ title: "הצטרף לחניה השיתופית שלנו!", url: link }); return; } catch (_) {}
    }
    navigator.clipboard.writeText(link);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
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
    setAllResidents(prev => prev.map(x => x.id === r.id ? { ...x, status: "approved" } : x));
  }

  async function rejectResident(r) {
    await base44.entities.Resident.update(r.id, { status: "rejected" });
    setAllResidents(prev => prev.map(x => x.id === r.id ? { ...x, status: "rejected" } : x));
  }

  async function deleteAccount() {
    setDeleting(true); setDeleteError(null);
    const [rb, ob] = await Promise.all([
      base44.entities.Booking.filter({ renter_email: user.email, status: "active" }),
      base44.entities.Booking.filter({ owner_email: user.email, status: "active" }),
    ]);
    await Promise.all([...rb, ...ob].map(b => base44.entities.Booking.update(b.id, { status: "cancelled" })));
    const mySlots = await base44.entities.WeeklyAvailability.filter({ owner_email: user.email });
    await Promise.all(mySlots.map(s => base44.entities.WeeklyAvailability.delete(s.id)));
    if (resident) await base44.entities.Resident.delete(resident.id);
    setDeleting(false); setDeleteStep(3);
    setTimeout(() => base44.auth.logout("/"), 2000);
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

  function copyCode() {
    if (building?.invite_code) {
      navigator.clipboard.writeText(building.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const tabs = isOwner ? TABS : TABS.filter(t => t.id !== "building");

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>

      {/* ── Header ── */}
      <div className="pt-safe px-5 pb-5" style={{ background: "var(--surface-header)" }}>
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => navigate("/Settings")}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.2)" }}
            aria-label="הגדרות"
          >
            <Settings size={17} className="text-white" />
          </button>
          <h1 className="text-white font-bold text-base">פרופיל</h1>
          <div className="w-9" /> {/* spacer */}
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.25)", border: "3px solid rgba(255,255,255,0.4)" }}>
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="פרופיל" className="w-full h-full object-cover" />
                : <span className="text-white text-3xl font-bold">{(user?.full_name || "?")[0]}</span>}
            </div>
            <label className="absolute bottom-0 left-0 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "var(--hanoo-blue)", border: "2px solid white" }}>
              {uploadingAvatar
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={13} className="text-white" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <h2 className="text-white text-xl font-bold">{user?.full_name}</h2>
          {building && <p className="text-blue-200 text-sm mt-0.5">{building.name}</p>}
          {isOwner && <span className="text-xs mt-1.5 px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}>👑 בעל בניין</span>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-0 rounded-2xl overflow-hidden mb-5" style={{ background: "rgba(255,255,255,0.15)" }}>
          {[
            { label: "דירה", value: resident?.apartment_number || "—" },
            { label: "חניה", value: resident?.parking_spot || "—" },
            { label: "מטבעות", value: resident?.credits || 0 },
          ].map((item, i) => (
            <div key={i} className="py-3 text-center"
              style={{ borderRight: i < 2 ? "1px solid rgba(255,255,255,0.2)" : "none" }}>
              <p className="text-blue-200 text-xs mb-0.5">{item.label}</p>
              <p className="text-white text-lg font-bold">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.15)" }} role="tablist">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: activeTab === id ? "white" : "transparent",
                color: activeTab === id ? "var(--hanoo-blue)" : "rgba(255,255,255,0.75)",
              }}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-5 py-5 space-y-3">

        {/* PERSONAL TAB */}
        {activeTab === "personal" && (
          <>
            {/* Personal info card */}
            {resident && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
                <p className="text-xs font-bold px-4 pt-3 pb-1" style={{ color: "var(--text-tertiary)" }}>פרטים אישיים</p>

                {/* Name row */}
                <div className="flex items-center px-4 py-3" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
                  <User size={16} style={{ color: "var(--text-tertiary)" }} className="flex-none ml-3" />
                  <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{user?.full_name || "—"}</span>
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>שם</span>
                </div>

                {/* Phone row */}
                {resident.phone && !editingPhone ? (
                  <div className="flex items-center px-4 py-3">
                    <Phone size={16} style={{ color: "var(--text-tertiary)" }} className="flex-none ml-3" />
                    <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }} dir="ltr">{resident.phone}</span>
                    <button onClick={() => setEditingPhone(true)} aria-label="ערוך טלפון"
                      className="w-7 h-7 flex items-center justify-center rounded-lg"
                      style={{ background: "var(--hanoo-blue-light)" }}>
                      <Pencil size={13} style={{ color: "var(--hanoo-blue)" }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-3">
                    <Phone size={16} style={{ color: "var(--text-tertiary)" }} className="flex-none" />
                    <input
                      type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="050-0000000" dir="ltr" autoFocus={!!resident.phone}
                      className="flex-1 text-sm outline-none bg-transparent"
                      style={{ color: "var(--text-primary)" }}
                    />
                    <button
                      onClick={async () => { await savePhone(); setResident(prev => ({ ...prev, phone: phone.trim() })); setEditingPhone(false); }}
                      disabled={savingPhone}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: phoneSaved ? "var(--hanoo-green)" : "var(--hanoo-blue)", opacity: savingPhone ? 0.6 : 1 }}>
                      {phoneSaved ? "✓" : "שמור"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Parking card */}
            {resident && (resident.parking_spot || resident.parking_floor) && (
              <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
                <p className="text-xs font-bold mb-2" style={{ color: "var(--text-tertiary)" }}>החניה שלי</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--hanoo-blue-light)" }}>
                    <Car size={20} style={{ color: "var(--hanoo-blue)" }} />
                  </div>
                  <div>
                    <p className="font-bold" style={{ color: "var(--text-primary)" }}>חניה {resident.parking_spot || "—"}</p>
                    {resident.parking_floor && <p className="text-sm" style={{ color: "var(--text-secondary)" }}>קומה {resident.parking_floor}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Recent bookings */}
            {myBookings.length > 0 && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
                <p className="text-xs font-bold px-4 pt-3 pb-1" style={{ color: "var(--text-tertiary)" }}>הזמנות אחרונות</p>
                {myBookings.slice(0, 5).map((b, i) => (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderTop: i > 0 ? "1px solid var(--surface-card-border)" : "none" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-none"
                      style={{ background: b.status === "active" ? "var(--hanoo-blue-light)" : "var(--btn-secondary-bg)" }}>
                      <Car size={15} style={{ color: b.status === "active" ? "var(--hanoo-blue)" : "var(--text-tertiary)" }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>חניה #{b.spot_number}</p>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{b.start_time ? format(new Date(b.start_time), "dd/MM HH:mm") : ""}</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: "var(--hanoo-blue)" }}>-{b.total_credits}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Invite card */}
            {resident?.building_id && (
              <button onClick={handleShare}
                className="w-full rounded-2xl p-4 flex items-center gap-3 text-right"
                style={{ background: "var(--hanoo-blue-light)", border: "1px solid rgba(0,122,255,0.15)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-none" style={{ background: "var(--hanoo-blue)" }}>
                  <Share2 size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>הזמן שכן לבניין</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>קבל +10 נקודות על כל שכן שמצטרף</p>
                </div>
                {shareCopied
                  ? <CheckCircle size={18} style={{ color: "var(--hanoo-green)" }} />
                  : <ChevronLeft size={18} style={{ color: "var(--hanoo-blue)" }} />}
              </button>
            )}

            {/* Logout */}
            <button onClick={() => base44.auth.logout()}
              className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
              style={{ background: "var(--hanoo-red-light)", color: "var(--hanoo-red)" }}>
              <LogOut size={18} />
              התנתק
            </button>

            {/* Delete account */}
            <button onClick={() => { setDeleteStep(1); setShowDeleteConfirm(true); }}
              className="w-full py-3 rounded-2xl font-medium flex items-center justify-center gap-2 text-sm"
              style={{ background: "transparent", color: "var(--text-tertiary)", border: "1px solid var(--surface-card-border)" }}>
              <Trash2 size={15} />
              מחק חשבון
            </button>
          </>
        )}

        {showDeleteConfirm && (
          <DeleteAccountModal
            step={deleteStep} credits={resident?.credits || 0}
            deleting={deleting} deleteError={deleteError}
            onClose={() => { if (!deleting) setShowDeleteConfirm(false); }}
            onNext={() => setDeleteStep(2)}
            onConfirm={deleteAccount}
          />
        )}

        {/* LEAGUE TAB */}
        {activeTab === "league" && (
          <>
            <LeagueCard resident={resident} />
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
              <p className="text-xs font-bold px-4 pt-3 pb-1" style={{ color: "var(--text-tertiary)" }}>איך צוברים נקודות?</p>
              {[
                { icon: "🚗", label: "השלמת הזמנה (שוכר)", pts: 5 },
                { icon: "🅿️", label: "שיתוף חניה (לשעה)", pts: 10 },
                { icon: "🎉", label: "פרסום זמינות ראשון", pts: 20 },
                { icon: "💬", label: "שליחת תודה בוואטסאפ", pts: 10 },
                { icon: "🔗", label: "הפניית שכן שהצטרף", pts: 10 },
              ].map(({ icon, label, pts }, i) => (
                <div key={label} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--surface-card-border)" : "none" }}>
                  <span className="text-lg">{icon}</span>
                  <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
                  <span className="text-sm font-bold" style={{ color: "var(--hanoo-blue)" }}>+{pts}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
              <p className="font-bold mb-1" style={{ color: "var(--text-primary)" }}>היסטוריית פעילות</p>
              <ActivityHistory bookings={myBookings} />
            </div>
          </>
        )}

        {/* BUILDING TAB */}
        {activeTab === "building" && isOwner && (
          <>
            {building && (
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
                <p className="text-xs font-bold px-4 pt-3 pb-1" style={{ color: "var(--text-tertiary)" }}>הבניין שלי</p>
                <div className="px-4 py-3" style={{ borderTop: "1px solid var(--surface-card-border)" }}>
                  <p className="font-bold" style={{ color: "var(--text-primary)" }}>{building.name}</p>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{building.address}, {building.city}</p>
                </div>
                <div className="px-4 py-3" style={{ borderTop: "1px solid var(--surface-card-border)" }}>
                  <p className="text-xs mb-1.5" style={{ color: "var(--text-tertiary)" }}>קוד הצטרפות</p>
                  <button onClick={copyCode}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold tracking-widest"
                    style={{ background: "var(--hanoo-blue-light)", color: "var(--hanoo-blue)" }}>
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    {building.invite_code}
                  </button>
                </div>
              </div>
            )}
            <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold" style={{ color: "var(--text-primary)" }}>דיירים בבניין</p>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ color: "var(--text-tertiary)", background: "var(--btn-secondary-bg)" }}>
                  {allResidents.length}
                </span>
              </div>
              <ResidentsManager residents={allResidents} onApprove={approveResident} onReject={rejectResident} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
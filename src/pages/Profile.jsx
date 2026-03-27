// Profile page — iOS Settings style with bottom sheets
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Camera, ChevronLeft, Phone, Car, Trophy, Share2, Users,
  LogOut, Trash2, Shield, FileText, AlertTriangle, CheckCircle,
  Pencil, Copy
} from "lucide-react";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";
import LeagueCard from "@/components/profile/LeagueCard";
import ResidentsManager from "@/components/profile/ResidentsManager";
import ActivityHistory from "@/components/profile/ActivityHistory";
import { format } from "date-fns";

// ── Generic Bottom Sheet ──────────────────────────────────────────────────────
function BottomSheet({ open, onClose, children, title }) {
  const [closing, setClosing] = useState(false);

  function close() {
    setClosing(true);
    setTimeout(() => { setClosing(false); onClose(); }, 260);
  }

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.45)", animation: closing ? "fadeOut 0.26s ease-in forwards" : "fadeIn 0.26s ease-out" }}
      onClick={close}
    >
      <style>{`
        @keyframes slideUp   { from { transform:translateY(100%); } to { transform:translateY(0); } }
        @keyframes slideDown { from { transform:translateY(0); }   to { transform:translateY(100%); } }
        @keyframes fadeIn    { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeOut   { from { opacity:1; } to { opacity:0; } }
      `}</style>
      <div
        className="rounded-t-3xl w-full max-w-[430px] mx-auto"
        style={{
          background: "var(--sheet-bg)",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 1rem)",
          animation: closing ? "slideDown 0.26s ease-in forwards" : "slideUp 0.26s ease-out",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-4" style={{ background: "var(--sheet-handle)" }} />
        {title && <p className="text-center font-bold text-base mb-4 px-5" style={{ color: "var(--text-primary)" }}>{title}</p>}
        {typeof children === "function" ? children(close) : children}
      </div>
    </div>
  );
}

// ── Row Component ─────────────────────────────────────────────────────────────
function Row({ icon, label, value, onPress, danger, last }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-right active:opacity-60 transition-opacity"
      style={{
        borderBottom: last ? "none" : "1px solid var(--surface-card-border)",
        background: "transparent",
      }}
    >
      <span style={{ color: danger ? "var(--hanoo-red)" : "var(--hanoo-blue)", fontSize: 20, lineHeight: 1 }}>{icon}</span>
      <span className="flex-1 text-sm font-medium" style={{ color: danger ? "var(--hanoo-red)" : "var(--text-primary)" }}>{label}</span>
      {value && <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{value}</span>}
      {onPress && !danger && <ChevronLeft size={15} style={{ color: "var(--text-tertiary)" }} />}
    </button>
  );
}

function Section({ title, children }) {
  return (
    <div>
      {title && <p className="text-xs font-bold px-1 mb-2" style={{ color: "var(--text-tertiary)" }}>{title}</p>}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
        {children}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser]             = useState(null);
  const [resident, setResident]     = useState(null);
  const [building, setBuilding]     = useState(null);
  const [allResidents, setAllResidents] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [isOwner, setIsOwner]       = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Bottom sheet states
  const [sheet, setSheet] = useState(null); // "personal" | "parking" | "league" | "bookings" | "building" | "residents" | "invite" | "delete"

  // Sub-states for personal sheet
  const [phone, setPhone]           = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  // Delete account
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState(null);

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
      try { await navigator.share({ title: "הצטרף ל-Hanoo!", url: link }); return; } catch (_) {}
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
    setResident(prev => ({ ...prev, phone: phone.trim() }));
    setSavingPhone(false);
    setPhoneSaved(true);
    setTimeout(() => { setPhoneSaved(false); setEditingPhone(false); }, 1500);
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
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }

  const leagueIcon = { Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎", Diamond: "👑" }[resident?.league] || "🥉";

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>

      {/* ── User card at top ── */}
      <div className="pt-safe px-5 pb-6" style={{ background: "var(--surface-header)" }}>
        <div className="flex items-center gap-4 mt-2">
          {/* Avatar */}
          <div className="relative flex-none">
            <div className="w-16 h-16 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.3)", border: "2px solid rgba(255,255,255,0.5)" }}>
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                    {(user?.full_name || "?")[0]}
                  </div>}
            </div>
            <label className="absolute -bottom-0.5 -left-0.5 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: "var(--hanoo-blue)", border: "2px solid white" }}>
              {uploadingAvatar
                ? <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera size={11} className="text-white" />}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>

          {/* Name + building */}
          <div className="flex-1 text-right">
            <p className="text-white font-bold text-lg leading-tight">{user?.full_name || "..."}</p>
            <p className="text-blue-200 text-sm mt-0.5">
              {building?.name || ""}
              {resident?.apartment_number ? ` · דירה ${resident.apartment_number}` : ""}
            </p>
            {isOwner && <span className="text-xs mt-1 inline-block" style={{ color: "rgba(255,255,255,0.7)" }}>👑 בעל בניין</span>}
          </div>

          {/* Coins badge */}
          <button
            onClick={() => setSheet("league")}
            className="flex flex-col items-center px-3 py-2 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.18)" }}
          >
            <span className="text-white text-lg font-bold">{resident?.credits || 0}</span>
            <span className="text-blue-200 text-xs">מטבעות</span>
          </button>
        </div>
      </div>

      {/* ── Sections list ── */}
      <div className="px-5 py-5 space-y-5">

        {/* פרטים אישיים */}
        <Section title="פרטים אישיים">
          <Row icon="👤" label="שם" value={user?.full_name} onPress={() => {}} />
          <Row icon="📱" label="טלפון" value={resident?.phone || "הוסף טלפון"}
            onPress={() => { setEditingPhone(false); setSheet("personal"); }} />
          <Row icon="📧" label="אימייל" value={user?.email} last />
        </Section>

        {/* החניה שלי */}
        {resident && (resident.parking_spot || resident.parking_floor) && (
          <Section title="החניה שלי">
            <Row icon="🅿️" label={`חניה ${resident.parking_spot || "—"}`}
              value={resident.parking_floor ? `קומה ${resident.parking_floor}` : undefined}
              onPress={() => setSheet("parking")} last />
          </Section>
        )}

        {/* ליגה */}
        <Section title="ליגה ונקודות">
          <Row icon={leagueIcon} label={`ליגת ${resident?.league || "Bronze"}`}
            value={`${resident?.points || 0} נקודות`}
            onPress={() => setSheet("league")} />
          <Row icon="📋" label="היסטוריית הזמנות" value={`${myBookings.length} הזמנות`}
            onPress={() => setSheet("bookings")} last />
        </Section>

        {/* בניין */}
        {building && (
          <Section title="הבניין">
            <Row icon="🏢" label={building.name} value={building.address}
              onPress={() => setSheet("building")} />
            <Row icon="🔗" label="הזמן שכן" value="קבל נקודות"
              onPress={handleShare} />
            {isOwner && (
              <Row icon="👥" label="ניהול דיירים" value={`${allResidents.length} דיירים`}
                onPress={() => setSheet("residents")} last />
            )}
            {!isOwner && <Row icon="🔗" label="" onPress={handleShare} last />}
          </Section>
        )}

        {/* תמיכה */}
        <Section title="תמיכה ומידע">
          <Row icon="🐛" label="דיווח על תקלה" onPress={() => navigate("/ReportBug")} />
          <Row icon="🔒" label="מדיניות פרטיות" onPress={() => navigate("/PrivacyPolicy")} />
          <Row icon="📄" label="תנאי שימוש" onPress={() => navigate("/TermsOfService")} />
          <Row icon="♿" label="הצהרת נגישות" onPress={() => navigate("/Accessibility")} last />
        </Section>

        {/* חשבון */}
        <Section title="חשבון">
          <Row icon="🚪" label="התנתק" onPress={() => base44.auth.logout()} danger />
          <Row icon="🗑️" label="מחק חשבון" onPress={() => { setDeleteStep(1); setSheet("delete"); }} danger last />
        </Section>

      </div>

      {/* ── Bottom Sheets ── */}

      {/* Personal / Phone sheet */}
      <BottomSheet open={sheet === "personal"} onClose={() => setSheet(null)} title="פרטים אישיים">
        {close => (
          <div className="px-5 space-y-4 pb-4">
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--btn-secondary-bg)" }}>
              <div className="flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
                <span className="flex-none ml-3 text-base">👤</span>
                <span className="flex-1 text-sm" style={{ color: "var(--text-secondary)" }}>שם</span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{user?.full_name}</span>
              </div>
              <div className="flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
                <span className="flex-none ml-3 text-base">📧</span>
                <span className="flex-1 text-sm" style={{ color: "var(--text-secondary)" }}>אימייל</span>
                <span className="text-sm font-medium" dir="ltr" style={{ color: "var(--text-primary)" }}>{user?.email}</span>
              </div>
              <div className="flex items-center px-4 py-3.5">
                <span className="flex-none ml-3 text-base">📱</span>
                <span className="flex-none text-sm ml-3" style={{ color: "var(--text-secondary)" }}>טלפון</span>
                {!editingPhone ? (
                  <>
                    <span className="flex-1 text-sm font-medium text-left" dir="ltr" style={{ color: resident?.phone ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                      {resident?.phone || "לא הוגדר"}
                    </span>
                    <button onClick={() => setEditingPhone(true)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg"
                      style={{ background: "var(--hanoo-blue-light)" }}>
                      <Pencil size={13} style={{ color: "var(--hanoo-blue)" }} />
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="050-0000000" dir="ltr" autoFocus
                      className="flex-1 text-sm outline-none bg-transparent text-left"
                      style={{ color: "var(--text-primary)" }}
                    />
                    <button
                      onClick={savePhone} disabled={savingPhone || !phone.trim()}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white ml-0"
                      style={{ background: phoneSaved ? "var(--hanoo-green)" : "var(--hanoo-blue)", opacity: savingPhone ? 0.6 : 1 }}>
                      {phoneSaved ? "✓" : "שמור"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Parking sheet */}
      <BottomSheet open={sheet === "parking"} onClose={() => setSheet(null)} title="החניה שלי">
        <div className="px-5 pb-4">
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--btn-secondary-bg)" }}>
            <div className="flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
              <span className="flex-none ml-3 text-base">🅿️</span>
              <span className="flex-1 text-sm" style={{ color: "var(--text-secondary)" }}>מספר חניה</span>
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{resident?.parking_spot || "—"}</span>
            </div>
            {resident?.parking_floor && (
              <div className="flex items-center px-4 py-3.5">
                <span className="flex-none ml-3 text-base">🏢</span>
                <span className="flex-1 text-sm" style={{ color: "var(--text-secondary)" }}>קומה</span>
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{resident.parking_floor}</span>
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* League sheet */}
      <BottomSheet open={sheet === "league"} onClose={() => setSheet(null)} title="ליגה ונקודות">
        <div className="px-5 pb-4 space-y-4">
          <LeagueCard resident={resident} />
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
            <p className="text-xs font-bold px-4 pt-3 pb-1" style={{ color: "var(--text-tertiary)" }}>איך צוברים נקודות?</p>
            {[
              { icon: "🚗", label: "השלמת הזמנה", pts: 5 },
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
        </div>
      </BottomSheet>

      {/* Bookings sheet */}
      <BottomSheet open={sheet === "bookings"} onClose={() => setSheet(null)} title="הזמנות אחרונות">
        <div className="px-5 pb-4">
          {myBookings.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>אין הזמנות עדיין</p>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}>
              {myBookings.slice(0, 8).map((b, i) => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? "1px solid var(--surface-card-border)" : "none" }}>
                  <span className="text-lg">{b.status === "active" ? "🟢" : "✅"}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>חניה #{b.spot_number}</p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {b.start_time ? format(new Date(b.start_time), "dd/MM HH:mm") : ""}
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: "var(--hanoo-blue)" }}>-{b.total_credits}</p>
                </div>
              ))}
            </div>
          )}
          <ActivityHistory bookings={myBookings} />
        </div>
      </BottomSheet>

      {/* Building sheet */}
      <BottomSheet open={sheet === "building"} onClose={() => setSheet(null)} title="הבניין שלי">
        <div className="px-5 pb-4 space-y-3">
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--btn-secondary-bg)" }}>
            <div className="flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
              <span className="flex-none ml-3 text-base">🏢</span>
              <span className="flex-1 text-sm" style={{ color: "var(--text-secondary)" }}>שם הבניין</span>
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{building?.name}</span>
            </div>
            <div className="flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
              <span className="flex-none ml-3 text-base">📍</span>
              <span className="flex-1 text-sm" style={{ color: "var(--text-secondary)" }}>כתובת</span>
              <span className="text-sm font-medium text-left" style={{ color: "var(--text-primary)", maxWidth: "55%" }}>{building?.address}</span>
            </div>
            {isOwner && building?.invite_code && (
              <button onClick={copyCode}
                className="w-full flex items-center px-4 py-3.5 active:opacity-60">
                <span className="flex-none ml-3 text-base">🔑</span>
                <span className="flex-1 text-sm" style={{ color: "var(--text-secondary)" }}>קוד הצטרפות</span>
                <span className="text-sm font-bold ml-2" style={{ color: "var(--hanoo-blue)" }}>{building.invite_code}</span>
                {codeCopied ? <CheckCircle size={16} style={{ color: "var(--hanoo-green)" }} /> : <Copy size={16} style={{ color: "var(--text-tertiary)" }} />}
              </button>
            )}
          </div>

          {/* Share invite */}
          <button onClick={handleShare}
            className="w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-white"
            style={{ background: "var(--hanoo-blue)" }}>
            <Share2 size={18} />
            {shareCopied ? "הקישור הועתק!" : "הזמן שכן לבניין"}
          </button>
        </div>
      </BottomSheet>

      {/* Residents sheet (owner only) */}
      <BottomSheet open={sheet === "residents"} onClose={() => setSheet(null)} title="ניהול דיירים">
        <div className="px-5 pb-4">
          <ResidentsManager residents={allResidents} onApprove={approveResident} onReject={rejectResident} />
        </div>
      </BottomSheet>

      {/* Delete account */}
      {sheet === "delete" && (
        <DeleteAccountModal
          step={deleteStep} credits={resident?.credits || 0}
          deleting={deleting} deleteError={deleteError}
          onClose={() => { if (!deleting) setSheet(null); }}
          onNext={() => setDeleteStep(2)}
          onConfirm={deleteAccount}
        />
      )}

    </div>
  );
}
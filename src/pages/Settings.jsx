// Settings page — iOS settings list style
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ChevronLeft, ChevronRight, Shield, FileText, AlertTriangle,
  LogOut, MessageCircle, HelpCircle, Info, Share2, Users,
  Trophy, Car, Copy, CheckCircle, Trash2
} from "lucide-react";
import DeleteAccountModal from "@/components/profile/DeleteAccountModal";
import LeagueCard from "@/components/profile/LeagueCard";
import ResidentsManager from "@/components/profile/ResidentsManager";
import ActivityHistory from "@/components/profile/ActivityHistory";
import { format } from "date-fns";

// ── Bottom Sheet ──────────────────────────────────────────────────────────────
function BottomSheet({ open, onClose, children, title }) {
  const [closing, setClosing] = useState(false);
  function close() { setClosing(true); setTimeout(() => { setClosing(false); onClose(); }, 260); }
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.45)", animation: closing ? "fadeOut 0.26s ease-in forwards" : "fadeIn 0.26s ease-out" }}
      onClick={close}
    >
      <style>{`
        @keyframes slideUp   { from{transform:translateY(100%)}to{transform:translateY(0)} }
        @keyframes slideDown { from{transform:translateY(0)}to{transform:translateY(100%)} }
        @keyframes fadeIn    { from{opacity:0}to{opacity:1} }
        @keyframes fadeOut   { from{opacity:1}to{opacity:0} }
      `}</style>
      <div
        className="rounded-t-3xl w-full max-w-[430px] mx-auto"
        style={{
          background: "var(--sheet-bg)",
          paddingBottom: "calc(64px + env(safe-area-inset-bottom) + 1rem)",
          animation: closing ? "slideDown 0.26s ease-in forwards" : "slideUp 0.26s ease-out",
          maxHeight: "88vh", overflowY: "auto",
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

// ── Row ───────────────────────────────────────────────────────────────────────
function Row({ icon, label, value, onPress, danger, last, noChevron }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-right active:opacity-60 transition-opacity"
      style={{ borderBottom: last ? "none" : "1px solid var(--surface-card-border)", background: "transparent" }}
    >
      <span style={{ fontSize: 19, lineHeight: 1, color: danger ? "var(--hanoo-red)" : "var(--hanoo-blue)", flexShrink: 0 }}>{icon}</span>
      <span className="flex-1 text-sm font-medium" style={{ color: danger ? "var(--hanoo-red)" : "var(--text-primary)" }}>{label}</span>
      {value && <span className="text-xs ml-1" style={{ color: "var(--text-tertiary)" }}>{value}</span>}
      {onPress && !danger && !noChevron && <ChevronLeft size={15} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />}
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser]             = useState(null);
  const [resident, setResident]     = useState(null);
  const [building, setBuilding]     = useState(null);
  const [allResidents, setAllResidents] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [isOwner, setIsOwner]       = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [sheet, setSheet]           = useState(null);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const u = await base44.auth.me().catch(() => null);
    if (!u) return;
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
    if (navigator.share) { try { await navigator.share({ title: "הצטרף ל-Hanoo!", url: link }); return; } catch (_) {} }
    navigator.clipboard.writeText(link);
    setShareCopied(true); setTimeout(() => setShareCopied(false), 2500);
  }

  function copyCode() {
    if (building?.invite_code) {
      navigator.clipboard.writeText(building.invite_code);
      setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000);
    }
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

  const leagueIcon = { Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎", Diamond: "👑" }[resident?.league] || "🥉";

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-page)" }}>

      {/* Header with user card */}
      <div className="pt-safe px-5 pb-5" style={{ background: "var(--surface-page)" }}>
        <div className="flex items-center justify-between mb-5 mt-2">
          <div className="w-9" />
          <p className="font-bold text-xl" style={{ color: "var(--text-primary)" }}>הגדרות</p>
          <button
            onClick={() => navigate("/Profile")}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: "var(--btn-secondary-bg)" }}
          >
            <ChevronRight size={18} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* User card */}
        <button
          onClick={() => navigate("/Profile")}
          className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 active:opacity-70 text-right"
          style={{ background: "var(--surface-card)", border: "1px solid var(--surface-card-border)" }}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-none"
            style={{ background: "var(--btn-secondary-bg)" }}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-xl font-bold" style={{ color: "var(--text-tertiary)" }}>{(user?.full_name || "?")[0]}</span>}
          </div>
          <div className="flex-1 text-right">
            <p className="font-bold text-base" style={{ color: "var(--text-primary)" }}>{user?.full_name || "..."}</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{building?.name || user?.email || ""}</p>
          </div>
          <ChevronLeft size={16} style={{ color: "var(--text-tertiary)" }} />
        </button>
      </div>

      {/* Sections */}
      <div className="px-5 space-y-5 pb-8">

        {/* ליגה */}
        <Section title="ליגה ונקודות">
          <Row icon={leagueIcon} label={`ליגת ${resident?.league || "Bronze"}`}
            value={`${resident?.points || 0} נקודות`}
            onPress={() => setSheet("league")} />
          <Row icon="📋" label="היסטוריית הזמנות" value={`${myBookings.length}`}
            onPress={() => setSheet("bookings")} last />
        </Section>

        {/* הבניין */}
        {building && (
          <Section title="הבניין">
            <Row icon="🏢" label={building.name} value={building.city} onPress={() => setSheet("building")} />
            <Row icon="🔗" label={shareCopied ? "הקישור הועתק!" : "הזמן שכן לבניין"}
              value="קבל +10 נקודות" onPress={handleShare} />
            {isOwner && (
              <Row icon="👥" label="ניהול דיירים" value={`${allResidents.length}`}
                onPress={() => setSheet("residents")} last />
            )}
            {!isOwner && <Row icon="🔗" label="" last noChevron />}
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
          <Row icon="🗑️" label="מחק חשבון"
            onPress={() => { setDeleteStep(1); setSheet("delete"); }} danger last />
        </Section>

      </div>

      {/* ── Bottom Sheets ── */}

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

      <BottomSheet open={sheet === "bookings"} onClose={() => setSheet(null)} title="הזמנות אחרונות">
        <div className="px-5 pb-4">
          {myBookings.length === 0
            ? <p className="text-center py-8 text-sm" style={{ color: "var(--text-tertiary)" }}>אין הזמנות עדיין</p>
            : (
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
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "building"} onClose={() => setSheet(null)} title="הבניין שלי">
        <div className="px-5 pb-4 space-y-3">
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--btn-secondary-bg)" }}>
            <div className="flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
              <span className="text-sm flex-none ml-3" style={{ color: "var(--text-tertiary)", minWidth: 56 }}>שם</span>
              <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{building?.name}</span>
            </div>
            <div className="flex items-center px-4 py-3.5" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
              <span className="text-sm flex-none ml-3" style={{ color: "var(--text-tertiary)", minWidth: 56 }}>כתובת</span>
              <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{building?.address}</span>
            </div>
            {isOwner && building?.invite_code && (
              <button onClick={copyCode} className="w-full flex items-center px-4 py-3.5 active:opacity-60">
                <span className="text-sm flex-none ml-3" style={{ color: "var(--text-tertiary)", minWidth: 56 }}>קוד</span>
                <span className="flex-1 text-sm font-bold" style={{ color: "var(--hanoo-blue)" }}>{building.invite_code}</span>
                {codeCopied ? <CheckCircle size={16} style={{ color: "var(--hanoo-green)" }} /> : <Copy size={16} style={{ color: "var(--text-tertiary)" }} />}
              </button>
            )}
          </div>
          <button onClick={handleShare}
            className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "var(--hanoo-blue)" }}>
            🔗 {shareCopied ? "הקישור הועתק!" : "הזמן שכן לבניין"}
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={sheet === "residents"} onClose={() => setSheet(null)} title="ניהול דיירים">
        <div className="px-5 pb-4">
          <ResidentsManager residents={allResidents} onApprove={async r => {
            await base44.entities.Resident.update(r.id, { status: "approved" });
            setAllResidents(prev => prev.map(x => x.id === r.id ? { ...x, status: "approved" } : x));
          }} onReject={async r => {
            await base44.entities.Resident.update(r.id, { status: "rejected" });
            setAllResidents(prev => prev.map(x => x.id === r.id ? { ...x, status: "rejected" } : x));
          }} />
        </div>
      </BottomSheet>

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
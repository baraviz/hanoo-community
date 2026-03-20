import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppNavigation } from "@/lib/NavigationContext";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { LogOut, Copy, CheckCircle, Car, Phone, Pencil, Menu, User, Trophy, Users, Building2, Share2, Trash2, AlertTriangle } from "lucide-react";
import SideMenu from "@/components/SideMenu";
import LeagueCard from "@/components/profile/LeagueCard";
import ActivityHistory from "@/components/profile/ActivityHistory";
import ResidentsManager from "@/components/profile/ResidentsManager";
import { format, parseISO } from "date-fns";

const TABS = [
  { id: "personal", label: "פרטים", icon: User },
  { id: "league",   label: "ליגה",  icon: Trophy },
  { id: "building", label: "בניין", icon: Building2 },
];

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [resident, setResident] = useState(null);
  const [building, setBuilding] = useState(null);
  const [allResidents, setAllResidents] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [copied, setCopied] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [shareLink, setShareLink] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1); // 1=confirm, 2=final, 3=done
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const u = await base44.auth.me().catch(() => null);
    if (!u) { base44.auth.redirectToLogin(createPageUrl("Profile")); return; }
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

  function buildShareLink() {
    if (!resident?.building_id || !user?.email) return "";
    return `${window.location.origin}/JoinViaLink?bid=${resident.building_id}&ref=${encodeURIComponent(user.email)}`;
  }

  function handleShare() {
    const link = buildShareLink();
    if (navigator.share) {
      navigator.share({ title: "הצטרף לחניה השיתופית שלנו!", text: "שכן שלך הזמין אותך להצטרף ל-Hanoo — שיתוף חניות חכם בין שכנים", url: link });
    } else {
      navigator.clipboard.writeText(link);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
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
    setDeleting(true);
    setDeleteError(null);
    // Step 1 — cancel active bookings where user is renter
    const activeRenterBookings = await base44.entities.Booking.filter({ renter_email: user.email, status: "active" });
    await Promise.all(activeRenterBookings.map(b => base44.entities.Booking.update(b.id, { status: "cancelled" })));
    // Step 2 — cancel active bookings where user is owner (notify renters implicitly via status)
    const activeOwnerBookings = await base44.entities.Booking.filter({ owner_email: user.email, status: "active" });
    await Promise.all(activeOwnerBookings.map(b => base44.entities.Booking.update(b.id, { status: "cancelled" })));
    // Step 3 — delete all availability slots
    const mySlots = await base44.entities.WeeklyAvailability.filter({ owner_email: user.email });
    await Promise.all(mySlots.map(s => base44.entities.WeeklyAvailability.delete(s.id)));
    // Step 4 — delete resident record
    if (resident) await base44.entities.Resident.delete(resident.id);
    // Step 5 — show done state before logging out
    setDeleting(false);
    setDeleteStep(3);
    // Give the user 2s to see the confirmation, then logout
    setTimeout(() => base44.auth.logout("/"), 2000);
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
      {menuOpen && <SideMenu onClose={() => setMenuOpen(false)} />}

      {/* Header */}
      <div className="pt-safe pb-5 px-5" style={{ background: "var(--surface-header)" }}>
        {/* Avatar + name + hamburger on same row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-white bg-opacity-30 flex items-center justify-center flex-none">
            <span className="text-white text-2xl font-bold">{(user?.full_name || "?")[0]}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">{user?.full_name}</h1>
            <p className="text-blue-200 text-sm">{user?.email}</p>
            {isOwner && <span className="text-xs bg-white bg-opacity-20 text-white px-2 py-0.5 rounded-full mt-1 inline-block">👑 בעל בניין</span>}
          </div>
          <button onClick={() => setMenuOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-2xl flex-none" style={{ background: "rgba(255,255,255,0.2)" }}>
            <Menu size={18} className="text-white" />
          </button>
        </div>

        {/* Stats row */}
        <div className="bg-white bg-opacity-20 rounded-2xl p-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-blue-200 text-xs">דירה</p>
            <p className="text-white text-xl font-bold">{resident?.apartment_number || "—"}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">חניה</p>
            <p className="text-white text-xl font-bold">{resident?.parking_spot || "—"}</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">קרדיטים</p>
            <p className="text-white text-xl font-bold">{resident?.credits || 0}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-white bg-opacity-15 rounded-2xl p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: activeTab === id ? "white" : "transparent",
                color: activeTab === id ? "#007AFF" : "rgba(255,255,255,0.8)",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-5 py-5 space-y-4">

        {/* ── PERSONAL TAB ── */}
        {activeTab === "personal" && (
          <>
            {/* Phone */}
            {resident && (
              <div className="card p-4">
                <p className="text-xs font-bold mb-2" style={{ color: "var(--text-tertiary)" }}>מספר טלפון</p>
                {resident.phone && !editingPhone ? (
                  <div className="flex items-center gap-2">
                    <Phone size={16} style={{ color: "var(--text-tertiary)" }} className="flex-none" />
                    <span className="flex-1 text-sm font-medium" style={{ color: "var(--text-primary)" }} dir="ltr">{resident.phone}</span>
                    <button onClick={() => setEditingPhone(true)} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: "var(--hanoo-blue-light)" }}>
                      <Pencil size={14} style={{ color: "var(--hanoo-blue)" }} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ border: "1px solid var(--surface-card-border)" }}>
                      <Phone size={16} style={{ color: "var(--text-tertiary)" }} className="flex-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="050-0000000"
                        className="flex-1 text-sm font-medium outline-none bg-transparent"
                        style={{ color: "var(--text-primary)" }}
                        dir="ltr"
                        autoFocus={!!resident.phone}
                      />
                    </div>
                    <button
                      onClick={async () => { await savePhone(); setResident(prev => ({ ...prev, phone: phone.trim() })); setEditingPhone(false); }}
                      disabled={savingPhone}
                      className="px-4 py-2 rounded-xl text-sm font-bold text-white"
                      style={{ background: phoneSaved ? "var(--hanoo-green)" : "var(--hanoo-blue)", opacity: savingPhone ? 0.6 : 1 }}
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
              <div className="card p-4">
                <p className="font-bold mb-3" style={{ color: "var(--text-primary)" }}>הזמנות אחרונות</p>
                <div className="space-y-1">
                  {myBookings.slice(0, 5).map(b => (
                    <div key={b.id} className="flex items-center gap-3 py-2 last:border-0" style={{ borderBottom: "1px solid var(--surface-card-border)" }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-none" style={{ background: b.status === "active" ? "var(--hanoo-blue-light)" : "var(--btn-secondary-bg)" }}>
                        <Car size={15} style={{ color: b.status === "active" ? "var(--hanoo-blue)" : "var(--text-tertiary)" }} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>חניה #{b.spot_number}</p>
                        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{b.start_time ? format(new Date(b.start_time), "dd/MM HH:mm") : ""}</p>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold" style={{ color: "var(--hanoo-blue)" }}>-{b.total_credits}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: b.status === "active" ? "var(--hanoo-green-light)" : "var(--btn-secondary-bg)", color: b.status === "active" ? "var(--hanoo-green)" : "var(--text-tertiary)" }}>
                          {b.status === "active" ? "פעיל" : "הושלם"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Share invite card */}
            {resident?.building_id && (
              <div className="card p-4" style={{ background: "var(--hanoo-blue-light)", border: "1px solid var(--hanoo-blue-dark)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Share2 size={16} style={{ color: "var(--hanoo-blue)" }} />
                  <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>הזמן שכן לבניין</p>
                </div>
                <p className="text-xs mb-3" style={{ color: "var(--text-secondary)" }}>שתף קישור ישיר לדף ההצטרפות לבניין שלך. כשהם מצטרפים — אתה מקבל <span className="font-bold" style={{ color: "var(--hanoo-blue)" }}>+10 נקודות</span>! 🎁</p>
                <button
                  onClick={handleShare}
                  className="w-full py-2.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2"
                  style={{ background: "var(--hanoo-blue)" }}
                >
                  {shareCopied ? <><CheckCircle size={16} /> הקישור הועתק!</> : <><Share2 size={16} /> שתף קישור הצטרפות</>}
                </button>
              </div>
            )}

            <button
              onClick={() => base44.auth.logout()}
              className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
              style={{ background: "var(--hanoo-red-light)", color: "var(--hanoo-red)" }}
            >
              <LogOut size={18} />
              התנתק
            </button>

            <button
              onClick={() => { setDeleteStep(1); setShowDeleteConfirm(true); }}
              className="w-full py-3 rounded-2xl font-medium flex items-center justify-center gap-2 text-sm"
              style={{ background: "transparent", color: "var(--text-tertiary)", border: "1px solid var(--surface-card-border)" }}
            >
              <Trash2 size={15} />
              מחק חשבון
            </button>
          </>
        )}

        {/* Delete account confirmation modal */}
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-50 flex flex-col justify-end"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div
              className="bg-white rounded-t-3xl p-6 space-y-4"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto" />
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "#FEE2E2" }}>
                <AlertTriangle size={28} style={{ color: "#EF4444" }} />
              </div>

              {deleteStep === 1 ? (
                <>
                  <h2 className="text-xl font-bold text-gray-800 text-center">מחיקת חשבון</h2>
                  <p className="text-gray-500 text-sm text-center">
                    פעולה זו תמחק את כל הנתונים שלך לצמיתות — פרופיל, זמינויות, והזמנות. לא ניתן לבטל פעולה זו.
                  </p>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 rounded-2xl font-bold text-gray-700"
                      style={{ background: "#F3F4F6" }}
                    >
                      ביטול
                    </button>
                    <button
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 py-3 rounded-2xl font-bold text-white"
                      style={{ background: "#EF4444" }}
                    >
                      המשך
                    </button>
                  </div>
                </>
              ) : deleteStep === 3 ? (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#D1FAE5" }}>
                    <CheckCircle size={28} style={{ color: "#059669" }} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 text-center">החשבון נמחק</h2>
                  <p className="text-gray-500 text-sm text-center">כל הנתונים שלך הוסרו בהצלחה. מתנתק...</p>
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-800 text-center">אתה בטוח לחלוטין?</h2>
                  <p className="text-gray-500 text-sm text-center">
                    כל ה-<span className="font-bold text-gray-700">{resident?.credits || 0} קרדיטים</span> והנתונים שלך יימחקו לצמיתות.
                  </p>
                  {deleteError && (
                    <p className="text-red-500 text-xs text-center bg-red-50 rounded-xl p-2">{deleteError}</p>
                  )}
                  <button
                    aria-label="אשר מחיקת חשבון לצמיתות"
                    onClick={deleteAccount}
                    disabled={deleting}
                    className="w-full py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                    style={{ background: "#EF4444", opacity: deleting ? 0.6 : 1 }}
                  >
                    {deleting ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" /> מוחק נתונים...</>
                    ) : (
                      <><Trash2 size={16} aria-hidden="true" /> כן, מחק את החשבון שלי</>
                    )}
                  </button>
                  <button
                    aria-label="בטל מחיקת חשבון"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full py-3 rounded-2xl font-bold text-gray-600"
                    style={{ background: "#F3F4F6" }}
                  >
                    ביטול
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── LEAGUE TAB ── */}
        {activeTab === "league" && (
          <>
            <LeagueCard resident={resident} />

            {/* How to earn */}
            <div className="card p-4">
              <p className="font-bold mb-3" style={{ color: "var(--text-primary)" }}>איך צוברים נקודות?</p>
              <div className="space-y-2">
                {[
                  { icon: "🚗", label: "השלמת הזמנה (שוכר)", pts: 5 },
                  { icon: "🅿️", label: "שיתוף חניה (לשעה)", pts: 10 },
                  { icon: "🎉", label: "פרסום זמינות ראשון", pts: 20 },
                  { icon: "💬", label: "שליחת תודה בוואטסאפ", pts: 10 },
                  { icon: "🔗", label: "הפניית שכן שהצטרף", pts: 10 },
                ].map(({ icon, label, pts }) => (
                  <div key={label} className="flex items-center gap-3 py-1.5">
                    <span className="text-lg">{icon}</span>
                    <span className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
                    <span className="text-sm font-bold" style={{ color: "var(--hanoo-blue)" }}>+{pts}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity history */}
            <div className="card p-4">
              <p className="font-bold mb-1" style={{ color: "var(--text-primary)" }}>היסטוריית פעילות</p>
              <ActivityHistory bookings={myBookings} />
            </div>
          </>
        )}

        {/* ── BUILDING TAB (owner only) ── */}
        {activeTab === "building" && isOwner && (
          <>
            {/* Building info + invite code */}
            {building && (
              <div className="card p-4">
                <p className="text-xs font-bold mb-1" style={{ color: "var(--text-tertiary)" }}>הבניין שלי</p>
                <p className="font-bold" style={{ color: "var(--text-primary)" }}>{building.name}</p>
                <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{building.address}, {building.city}</p>
                <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>קוד הצטרפות לשכנים</p>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold tracking-widest"
                  style={{ background: "var(--hanoo-blue-light)", color: "var(--hanoo-blue)" }}
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  {building.invite_code}
                </button>
              </div>
            )}

            {/* Residents list */}
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold" style={{ color: "var(--text-primary)" }}>דיירים בבניין</p>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: "var(--text-tertiary)", background: "var(--btn-secondary-bg)" }}>{allResidents.length}</span>
              </div>
              <ResidentsManager
                residents={allResidents}
                onApprove={approveResident}
                onReject={rejectResident}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Building2, Key, ChevronRight, CheckCircle2, Pencil, Car, Layers, MapPin, User } from "lucide-react";

function StepDots({ current, total }) {
  return (
    <div className="flex gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-2 rounded-full transition-all"
          style={{
            width: i === current ? 24 : 8,
            background: i === current ? "#007AFF" : "#D1D5DB",
          }}
        />
      ))}
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-gray-500 mb-6">
      <ChevronRight size={20} />
      <span>חזרה</span>
    </button>
  );
}

function SummaryCard({ icon: Icon, title, onEdit, children }) {
  return (
    <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid #E5E7EB" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: "#007AFF" }} />
          <p className="text-sm font-semibold text-gray-700">{title}</p>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-xl"
          style={{ background: "#EBF4FF", color: "#007AFF" }}
        >
          <Pencil size={12} />
          ערוך
        </button>
      </div>
      {children}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Join flow
  const [inviteCode, setInviteCode] = useState("");
  const [foundBuilding, setFoundBuilding] = useState(null);
  const [apartment, setApartment] = useState("");
  const [parkingSpot, setParkingSpot] = useState("");
  const [joinFloor, setJoinFloor] = useState("");
  const [joinPhone, setJoinPhone] = useState("");
  const [duplicateResident, setDuplicateResident] = useState(null); // existing resident with same spot/apt
  const [joiningDuplicate, setJoiningDuplicate] = useState(false); // user chose to request join to same unit

  // Create flow
  const [buildingName, setBuildingName] = useState("");
  const [buildingAddress, setBuildingAddress] = useState("");
  const [buildingCity, setBuildingCity] = useState("");
  const [undergroundParking, setUndergroundParking] = useState(false);
  const [ownerApartment, setOwnerApartment] = useState("");
  const [ownerParking, setOwnerParking] = useState("");
  const [ownerFloor, setOwnerFloor] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Support direct link via /Onboarding?bid=...&ref=...
      const params = new URLSearchParams(window.location.search);
      const bid = params.get("bid");
      if (bid && u) {
        base44.entities.Building.filter({ id: bid }).then(buildings => {
          if (buildings.length > 0) {
            setFoundBuilding(buildings[0]);
            setStep("join2");
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  async function handleCheckCode() {
    if (!inviteCode.trim()) { setError("נא להזין קוד הצטרפות"); return; }
    setLoading(true); setError("");
    const buildings = await base44.entities.Building.filter({ invite_code: inviteCode.trim().toUpperCase() });
    if (buildings.length === 0) { setError("קוד שגוי, נסה שוב"); setLoading(false); return; }
    setFoundBuilding(buildings[0]);
    setLoading(false);
    setStep("join2");
  }

  async function checkDuplicate() {
    if (!foundBuilding || !apartment) return false;
    // Check if another resident already has the same apartment or parking spot
    const existingResidents = await base44.entities.Resident.filter({ building_id: foundBuilding.id });
    const dup = existingResidents.find(r =>
      r.user_email !== user.email && (
        (apartment && r.apartment_number === apartment) ||
        (parkingSpot && r.parking_spot === parkingSpot)
      )
    );
    if (dup) {
      setDuplicateResident(dup);
      return true;
    }
    return false;
  }

  async function completeJoin() {
    if (!foundBuilding) return;
    setLoading(true);

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");

    // Record referral event if came via share link
    if (ref) {
      base44.entities.ReferralEvent.create({
        referrer_email: ref,
        referrer_name: "",
        building_id: foundBuilding.id,
        event_type: "joined",
        new_resident_email: user.email,
      }).catch(() => {});

      // Award 10 points to the referrer
      const referrers = await base44.entities.Resident.filter({ user_email: ref, building_id: foundBuilding.id });
      if (referrers.length > 0) {
        base44.functions.invoke("awardPoints", {
          resident_id: referrers[0].id,
          reason: "referral",
          points: 10,
        }).catch(() => {});
      }
    }

    // If joining same apartment as existing resident → pending (owner must approve)
    const needsApproval = !!duplicateResident;

    await base44.entities.Resident.create({
      user_email: user.email,
      user_name: user.full_name,
      building_id: foundBuilding.id,
      apartment_number: apartment,
      parking_spot: parkingSpot,
      parking_floor: foundBuilding.underground_parking ? joinFloor : "",
      phone: joinPhone,
      credits: 50,
      status: needsApproval ? "pending" : "approved",
      referred_by: ref || "",
    });

    // Notify the existing resident of same apartment to approve
    if (needsApproval && duplicateResident) {
      base44.entities.Notification.create({
        user_email: duplicateResident.user_email,
        title: "בקשת הצטרפות לדירתך 🏠",
        body: `${user.full_name} ביקש/ה להצטרף כדייר/ת נוסף/ת בדירה ${apartment}. אשר/י בפרופיל.`,
        type: "booking_received",
        read: false,
      }).catch(() => {});
    }
    setLoading(false);
    navigate(createPageUrl("Home"));
  }

  async function handleCreateBuilding() {
    if (!buildingName || !buildingAddress || !buildingCity) { setError("נא למלא את כל השדות"); return; }
    setError("");
    setStep("create2");
  }

  async function completeCreateBuilding() {
    setLoading(true); setError("");
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const building = await base44.entities.Building.create({
      name: buildingName,
      address: buildingAddress,
      city: buildingCity,
      owner_email: user.email,
      invite_code: code,
      underground_parking: undergroundParking,
    });
    await base44.entities.Resident.create({
      user_email: user.email,
      user_name: user.full_name,
      building_id: building.id,
      apartment_number: ownerApartment,
      parking_spot: ownerParking,
      parking_floor: undergroundParking ? ownerFloor : "",
      phone: ownerPhone,
      credits: 50,
      status: "approved",
    });
    setLoading(false);
    navigate(createPageUrl("Home"));
  }

  // ── CHOOSE ──
  if (step === "choose") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#007AFF" }}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
          <h1 className="pacifico text-5xl text-white mb-2" style={{ fontFamily: "Pacifico, cursive" }}>Hanoo</h1>
          <p className="text-blue-200 mb-10">Community</p>
          <img
            src="https://media.base44.com/images/public/user_67da72445efe4064f012cd35/52b6212d8_image.png"
            className="w-40 h-40 object-contain mb-10"
            alt="Hanoo"
          />
          <p className="text-white text-xl font-bold text-center mb-2">ברוך הבא!</p>
          <p className="text-blue-200 text-center text-sm">שיתוף חניות בין שכנים בצורה חכמה</p>
        </div>
        <div className="bg-white rounded-t-3xl p-6 space-y-3">
          {!user ? (
            <button
              onClick={() => base44.auth.redirectToLogin(window.location.origin + "/")}
              className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2"
              style={{ background: "#007AFF" }}
            >
              <User size={20} />
              התחבר / הירשם
            </button>
          ) : (
            <>
              <button
                onClick={() => setStep("join")}
                className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2"
                style={{ background: "#007AFF" }}
              >
                <Key size={20} />
                הצטרף לבניין קיים
              </button>
              <button
                onClick={() => setStep("create")}
                className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2"
                style={{ background: "#EBF4FF", color: "#007AFF" }}
              >
                <Building2 size={20} />
                רשום בניין חדש
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── JOIN 1: קוד הצטרפות ──
  if (step === "join") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <BackButton onClick={() => setStep("choose")} />
        <StepDots current={0} total={2} />
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#EBF4FF" }}>
            <Key size={30} style={{ color: "#007AFF" }} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">קוד הצטרפות</h2>
          <p className="text-gray-500 text-sm">הזן את הקוד שקיבלת מבעל הבניין</p>
        </div>

        <div className="space-y-4">
          <input
            value={inviteCode}
            onChange={e => { setInviteCode(e.target.value); setError(""); }}
            placeholder="לדוגמה: ABC123"
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-4 text-center text-2xl font-bold tracking-widest outline-none focus:border-blue-400"
            style={{ background: "white", letterSpacing: "0.3em" }}
            autoCapitalize="characters"
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={handleCheckCode}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: "#007AFF", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "מחפש..." : "המשך"}
          </button>
        </div>
      </div>
    );
  }

  // ── JOIN 2: פרטי דירה וחניה ──
  if (step === "join2") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <BackButton onClick={() => setStep("join")} />
        <StepDots current={1} total={2} />

        <div className="bg-white rounded-2xl p-4 mb-6 flex items-center gap-3" style={{ border: "2px solid #EBF4FF" }}>
          <CheckCircle2 size={22} style={{ color: "#007AFF" }} />
          <div>
            <p className="text-xs text-gray-400">בניין נמצא</p>
            <p className="font-bold text-gray-800">{foundBuilding?.name}</p>
            <p className="text-gray-500 text-xs">{foundBuilding?.address}, {foundBuilding?.city}</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-1">הפרטים שלך</h2>
        <p className="text-gray-500 text-sm mb-6">כמה פרטים אחרונים ואתה פנימה</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר דירה</label>
            <input value={apartment} onChange={e => setApartment(e.target.value)} placeholder="לדוגמה: 5" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר חניה שלי</label>
            <input value={parkingSpot} onChange={e => setParkingSpot(e.target.value)} placeholder="לדוגמה: P15" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
          </div>
          {foundBuilding?.underground_parking && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">קומת חניה</label>
              <input value={joinFloor} onChange={e => setJoinFloor(e.target.value)} placeholder="לדוגמה: -2" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
              <p className="text-gray-400 text-xs mt-1">הבניין כולל חניון תת קרקעי</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר טלפון</label>
            <input value={joinPhone} onChange={e => setJoinPhone(e.target.value)} placeholder="0501234567" type="tel" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
            <p className="text-gray-400 text-xs mt-1">לשימוש בתקשורת עם שכנים</p>
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          {/* Duplicate warning */}
          {duplicateResident && !joiningDuplicate && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "#FFF8E7", border: "1px solid #FFD700" }}>
              <p className="font-bold text-amber-800 text-sm">⚠️ קיים דייר עם אותה דירה/חניה</p>
              <p className="text-amber-700 text-xs">
                {duplicateResident.user_name} כבר רשום עם דירה {duplicateResident.apartment_number}
                {duplicateResident.parking_spot ? `, חניה ${duplicateResident.parking_spot}` : ""}.
                האם אתם גרים יחד? (בן/בת זוג, בן בית)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setDuplicateResident(null); setApartment(""); setParkingSpot(""); }}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-gray-700"
                  style={{ background: "#F3F4F6" }}
                >
                  שנה פרטים
                </button>
                <button
                  onClick={() => { setJoiningDuplicate(true); completeJoin(); }}
                  className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#F59E0B" }}
                >
                  כן, בקש אישור
                </button>
              </div>
            </div>
          )}

          {!duplicateResident && (
            <button
              onClick={async () => {
                const hasDuplicate = await checkDuplicate();
                if (!hasDuplicate) completeJoin();
              }}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-white text-base"
              style={{ background: "#007AFF", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "מצטרף..." : "הצטרף לבניין"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── CREATE 1: פרטי הבניין ──
  if (step === "create") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <BackButton onClick={() => setStep("choose")} />
        <StepDots current={0} total={3} />
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#EBF4FF" }}>
            <Building2 size={30} style={{ color: "#007AFF" }} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">פרטי הבניין</h2>
          <p className="text-gray-500 text-sm">קצת עלינו על הבניין שלך</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">שם הבניין *</label>
            <input value={buildingName} onChange={e => setBuildingName(e.target.value)} placeholder="לדוגמה: בניין הרצל 12" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">כתובת *</label>
            <input value={buildingAddress} onChange={e => setBuildingAddress(e.target.value)} placeholder="לדוגמה: הרצל 12" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">עיר *</label>
            <input value={buildingCity} onChange={e => setBuildingCity(e.target.value)} placeholder="לדוגמה: תל אביב" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={handleCreateBuilding}
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: "#007AFF" }}
          >
            המשך
          </button>
        </div>
      </div>
    );
  }

  // ── CREATE 2: פרטי הדייר הבעלים + underground toggle ──
  if (step === "create2") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <BackButton onClick={() => setStep("create")} />
        <StepDots current={1} total={3} />

        <h2 className="text-2xl font-bold text-gray-800 mb-1">הפרטים שלך</h2>
        <p className="text-gray-500 text-sm mb-6">מספר דירה, חניה, טלפון וסוג החניון</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר דירתי</label>
            <input value={ownerApartment} onChange={e => setOwnerApartment(e.target.value)} placeholder="לדוגמה: 1" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר החניה שלי</label>
            <input value={ownerParking} onChange={e => setOwnerParking(e.target.value)} placeholder="לדוגמה: P1" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר טלפון</label>
            <input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} placeholder="0501234567" type="tel" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
            <p className="text-gray-400 text-xs mt-1">לשימוש בתקשורת עם שכנים</p>
          </div>

          <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "white", border: "1px solid #E5E7EB" }}>
            <div className="flex items-center gap-2">
              <Layers size={18} style={{ color: "#007AFF" }} />
              <div>
                <p className="font-medium text-gray-800 text-sm">חניון תת קרקעי</p>
                <p className="text-gray-400 text-xs">דיירים יצטרכו לציין קומת חניה</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUndergroundParking(!undergroundParking)}
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{ background: undergroundParking ? "#007AFF" : "#D1D5DB" }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                style={{ transform: undergroundParking ? "translateX(26px)" : "translateX(2px)" }}
              />
            </button>
          </div>

          {undergroundParking && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">קומת החניה שלי</label>
              <input value={ownerFloor} onChange={e => setOwnerFloor(e.target.value)} placeholder="לדוגמה: -2" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            onClick={() => setStep("create3")}
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: "#007AFF" }}
          >
            המשך
          </button>
        </div>
      </div>
    );
  }

  // ── CREATE 3: סיכום ואישור ──
  if (step === "create3") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <BackButton onClick={() => setStep("create2")} />
        <StepDots current={2} total={3} />

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "#EBF4FF" }}>
            <CheckCircle2 size={30} style={{ color: "#007AFF" }} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">סיכום</h2>
          <p className="text-gray-500 text-sm">בדוק שהכל נכון לפני יצירה</p>
        </div>

        <div className="space-y-3 mb-8">
          <SummaryCard icon={Building2} title="פרטי הבניין" onEdit={() => setStep("create")}>
            <p className="font-bold text-gray-800">{buildingName}</p>
            <p className="text-gray-500 text-sm">{buildingAddress}, {buildingCity}</p>
            {undergroundParking && (
              <div className="flex items-center gap-1 mt-1">
                <Layers size={12} style={{ color: "#007AFF" }} />
                <p className="text-blue-500 text-xs">חניון תת קרקעי</p>
              </div>
            )}
          </SummaryCard>

          <SummaryCard icon={User} title="הפרטים שלך" onEdit={() => setStep("create2")}>
            {ownerApartment && (
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-gray-400" />
                <p className="text-gray-700 text-sm">דירה <span className="font-medium">{ownerApartment}</span></p>
              </div>
            )}
            {ownerParking && (
              <div className="flex items-center gap-2">
                <Car size={13} className="text-gray-400" />
                <p className="text-gray-700 text-sm">חניה <span className="font-medium">{ownerParking}</span></p>
              </div>
            )}
            {undergroundParking && ownerFloor && (
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-gray-400" />
                <p className="text-gray-700 text-sm">קומה <span className="font-medium">{ownerFloor}</span></p>
              </div>
            )}
          </SummaryCard>
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
        <button
          onClick={completeCreateBuilding}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white text-base"
          style={{ background: "#007AFF", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "יוצר בניין..." : "צור בניין"}
        </button>
      </div>
    );
  }
}
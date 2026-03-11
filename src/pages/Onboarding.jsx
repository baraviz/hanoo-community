import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Building2, Key, ChevronRight } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("choose"); // choose | join | create
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Join form
  const [inviteCode, setInviteCode] = useState("");
  const [apartment, setApartment] = useState("");
  const [parkingSpot, setParkingSpot] = useState("");

  // Create form
  const [buildingName, setBuildingName] = useState("");
  const [buildingAddress, setBuildingAddress] = useState("");
  const [buildingCity, setBuildingCity] = useState("");
  const [undergroundParking, setUndergroundParking] = useState(false);
  const [ownerApartment, setOwnerApartment] = useState("");
  const [ownerParking, setOwnerParking] = useState("");
  const [ownerFloor, setOwnerFloor] = useState("");

  // Join form - floor
  const [joinFloor, setJoinFloor] = useState("");
  const [foundBuilding, setJoinBuildingData] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => base44.auth.redirectToLogin(createPageUrl("Home")));
  }, []);

  async function handleJoinBuilding() {
    if (!inviteCode.trim()) { setError("נא להזין קוד הצטרפות"); return; }
    setLoading(true); setError("");
    const buildings = await base44.entities.Building.filter({ invite_code: inviteCode.trim().toUpperCase() });
    if (buildings.length === 0) { setError("קוד שגוי, נסה שוב"); setLoading(false); return; }
    const building = buildings[0];
    setJoinBuildingData(building);
    setLoading(false);
    setStep("join2");
  }

  async function completeJoin() {
    if (!foundBuilding) return;
    setLoading(true);
    await base44.entities.Resident.create({
      user_email: user.email,
      user_name: user.full_name,
      building_id: foundBuilding.id,
      apartment_number: apartment,
      parking_spot: parkingSpot,
      parking_floor: foundBuilding.underground_parking ? joinFloor : "",
      credits: 0,
      status: "pending",
    });
    setLoading(false);
    navigate(createPageUrl("Home"));
  }

  async function createBuilding() {
    if (!buildingName || !buildingAddress || !buildingCity) { setError("נא למלא את כל השדות"); return; }
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
      credits: 0,
      status: "approved",
    });
    setLoading(false);
    navigate(createPageUrl("Home"));
  }

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
          <p className="text-white text-xl font-bold text-center mb-2">ברוך הבא! 🎉</p>
          <p className="text-blue-200 text-center text-sm">שיתוף חניות בין שכנים בצורה חכמה</p>
        </div>

        <div className="bg-white rounded-t-3xl p-6 space-y-3">
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
        </div>
      </div>
    );
  }

  if (step === "join") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <button onClick={() => setStep("choose")} className="flex items-center gap-1 text-gray-500 mb-6">
          <ChevronRight size={20} />
          <span>חזרה</span>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">הצטרף לבניין</h2>
        <p className="text-gray-500 text-sm mb-6">הזן את קוד ההצטרפות שקיבלת מבעל הבניין</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">קוד הצטרפות *</label>
            <input
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="לדוגמה: ABC123"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-center text-lg font-bold tracking-widest outline-none focus:border-blue-400"
              style={{ background: "white" }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר דירה</label>
            <input
              value={apartment}
              onChange={e => setApartment(e.target.value)}
              placeholder="לדוגמה: 5"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400"
              style={{ background: "white" }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר חניה שלי</label>
            <input
              value={parkingSpot}
              onChange={e => setParkingSpot(e.target.value)}
              placeholder="לדוגמה: P15"
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400"
              style={{ background: "white" }}
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            onClick={handleJoinBuilding}
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

  if (step === "join2") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <button onClick={() => setStep("join")} className="flex items-center gap-1 text-gray-500 mb-6">
          <ChevronRight size={20} />
          <span>חזרה</span>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">פרטי החניה</h2>
        <p className="text-gray-500 text-sm mb-6">בניין: <span className="font-medium text-gray-700">{foundBuilding?.name}</span></p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר דירה</label>
            <input value={apartment} onChange={e => setApartment(e.target.value)} placeholder="לדוגמה: 5" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר חניה</label>
            <input value={parkingSpot} onChange={e => setParkingSpot(e.target.value)} placeholder="לדוגמה: P15" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
          </div>
          {joinBuilding?.underground_parking && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">קומת חניה 🏗️</label>
              <input value={joinFloor} onChange={e => setJoinFloor(e.target.value)} placeholder="לדוגמה: -2" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
              <p className="text-gray-400 text-xs mt-1">הבניין כולל חניון תת קרקעי</p>
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            onClick={completeJoin}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: "#007AFF", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "מצטרף..." : "הצטרף לבניין"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "create") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <button onClick={() => setStep("choose")} className="flex items-center gap-1 text-gray-500 mb-6">
          <ChevronRight size={20} />
          <span>חזרה</span>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-1">רשום בניין חדש</h2>
        <p className="text-gray-500 text-sm mb-6">צור קהילת חניות לבניין שלך</p>

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

          {/* Underground parking toggle */}
          <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "white", border: "1px solid #E5E7EB" }}>
            <div>
              <p className="font-medium text-gray-800 text-sm">חניון תת קרקעי 🏗️</p>
              <p className="text-gray-400 text-xs">דיירים יצטרכו לציין קומת חניה</p>
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

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר דירתי</label>
            <input value={ownerApartment} onChange={e => setOwnerApartment(e.target.value)} placeholder="לדוגמה: 1" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">מספר החניה שלי</label>
            <input value={ownerParking} onChange={e => setOwnerParking(e.target.value)} placeholder="לדוגמה: P1" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
          </div>
          {undergroundParking && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">קומת החניה שלי</label>
              <input value={ownerFloor} onChange={e => setOwnerFloor(e.target.value)} placeholder="לדוגמה: -2" className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-blue-400" style={{ background: "white" }} />
            </div>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            onClick={createBuilding}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ background: "#007AFF", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "יוצר..." : "צור בניין"}
          </button>
        </div>
      </div>
    );
  }
}
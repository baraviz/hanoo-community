import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Building2, Key, Loader2 } from "lucide-react";

// This page handles share links like /JoinViaLink?bid=BUILDING_ID&ref=REFERRER_EMAIL
// It records the link_open event then redirects into Onboarding with the building pre-filled.

export default function JoinViaLink() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const bid = params.get("bid");
    const ref = params.get("ref");

    if (!bid) { setError("קישור לא תקין"); setLoading(false); return; }

    // Fetch building info
    const buildings = await base44.entities.Building.filter({ id: bid });
    if (buildings.length === 0) { setError("הבניין לא נמצא"); setLoading(false); return; }
    const b = buildings[0];
    setBuilding(b);

    // Record link_open event (fire and forget)
    if (ref) {
      base44.entities.ReferralEvent.create({
        referrer_email: ref,
        referrer_name: "",
        building_id: bid,
        event_type: "link_opened",
      }).catch(() => {});
    }

    setLoading(false);
  }

  function proceedToJoin() {
    const params = new URLSearchParams(window.location.search);
    const bid = params.get("bid");
    const ref = params.get("ref");
    // Navigate to Onboarding with the building pre-filled via query params
    const url = `/Onboarding?bid=${bid}${ref ? `&ref=${encodeURIComponent(ref)}` : ""}`;
    navigate(url);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#007AFF" }}>
        <Loader2 size={40} className="text-white animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-700 font-bold text-lg">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-6 px-6 py-3 rounded-2xl font-bold text-white"
            style={{ background: "#007AFF" }}
          >
            חזור לדף הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#007AFF" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">
        <h1 className="pacifico text-5xl text-white mb-2" style={{ fontFamily: "Pacifico, cursive" }}>Hanoo</h1>
        <p className="text-blue-200 mb-10">Community</p>
        <div className="w-20 h-20 bg-white bg-opacity-20 rounded-3xl flex items-center justify-center mb-6">
          <Building2 size={40} className="text-white" />
        </div>
        <p className="text-white text-2xl font-bold mb-2">הוזמנת לבניין!</p>
        <p className="text-blue-100 text-lg font-medium mb-1">{building?.name}</p>
        <p className="text-blue-200 text-sm">{building?.address}, {building?.city}</p>
      </div>

      <div className="bg-white rounded-t-3xl p-6">
        <p className="text-gray-500 text-sm text-center mb-5">
          שכן שלך הזמין אותך להצטרף לקהילת שיתוף החניות של הבניין
        </p>
        <button
          onClick={proceedToJoin}
          className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2"
          style={{ background: "#007AFF" }}
        >
          <Key size={20} />
          הצטרף עכשיו
        </button>
      </div>
    </div>
  );
}
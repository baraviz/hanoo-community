import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        navigate(createPageUrl("Home"));
      } else {
        navigate(createPageUrl("Onboarding"));
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between py-16"
      style={{ background: "#007AFF" }}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <h1
          className="pacifico text-6xl text-white"
          style={{ fontFamily: "Pacifico, cursive", textShadow: "0 2px 12px rgba(0,0,0,0.15)" }}
        >
          Hanoo
        </h1>
        <p className="text-white text-lg font-light tracking-wide opacity-90">
          Community
        </p>

        <div className="mt-8">
          <img
            src="https://media.base44.com/images/public/user_67da72445efe4064f012cd35/52b6212d8_image.png"
            alt="Hanoo mascot"
            className="w-56 h-56 object-contain drop-shadow-2xl"
          />
        </div>
      </div>

      <div className="flex gap-2 mb-8">
        <div className="w-2 h-2 rounded-full bg-white opacity-40"></div>
        <div className="w-6 h-2 rounded-full bg-white"></div>
        <div className="w-2 h-2 rounded-full bg-white opacity-40"></div>
      </div>
    </div>
  );
}
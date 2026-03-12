import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Home, Car, MessageCircle, User, ParkingSquare } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const noNavPages = ["Splash", "Onboarding"];
  const showNav = !noNavPages.includes(currentPageName);

  const navItems = [
    { name: "Home", label: "בית", icon: Home },
    { name: "FindParking", label: "מצא חניה", icon: Car },
    { name: "MyParking", label: "החניה שלי", icon: ParkingSquare },
    { name: "Chat", label: "צ'אט", icon: MessageCircle },
    { name: "Profile", label: "פרופיל", icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50 relative" dir="rtl">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Heebo:wght@300;400;500;600;700;800&display=swap');
        * { font-family: 'Heebo', sans-serif; }
        .pacifico { font-family: 'Pacifico', cursive !important; }
        body { background: #F5F7FA; }
      `}</style>

      <div className={showNav ? "pb-20" : ""}>
        {children}
      </div>

      {showNav && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-lg z-50" style={{maxWidth: 430, margin: "0 auto"}}>
          <div className="flex items-center justify-around py-2">
            {navItems.map(({ name, label, icon: Icon }) => {
              const isActive = currentPageName === name;
              return (
                <Link
                  key={name}
                  to={createPageUrl(name)}
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all"
                >
                  <Icon
                    size={22}
                    className={isActive ? "text-blue-500" : "text-gray-400"}
                    style={isActive ? { color: "#007AFF" } : {}}
                  />
                  <span
                    className={`text-xs font-medium ${isActive ? "text-blue-500" : "text-gray-400"}`}
                    style={isActive ? { color: "#007AFF" } : {}}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
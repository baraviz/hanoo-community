import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Home, Car, CalendarDays, User, ParkingSquare } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import ThemeToggle from "@/components/ThemeToggle";

// Apply saved theme before first render
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("hanoo-theme");
  if (saved === "dark") document.documentElement.classList.add("dark");
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const noNavPages = ["Splash", "Onboarding"];
  const showNav = !noNavPages.includes(currentPageName);

  const navItems = [
    { name: "Home",        label: "בית",      icon: Home },
    { name: "FindParking", label: "מצא חניה", icon: Car },
    { name: "MyParking",   label: "החניה שלי", icon: ParkingSquare },
    { name: "Bookings",    label: "הזמנות",   icon: CalendarDays },
    { name: "Profile",     label: "פרופיל",   icon: User },
  ];

  return (
    <div
      className="min-h-screen relative"
      dir="rtl"
      style={{ background: "var(--surface-page)", color: "var(--text-primary)" }}
    >
      <div className={showNav ? "pb-20" : ""} style={{ position: "relative", overflow: "hidden" }}>
        <PageTransition>
          {children}
        </PageTransition>
      </div>

      {showNav && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t"
          style={{
            maxWidth: 430,
            margin: "0 auto",
            paddingBottom: "env(safe-area-inset-bottom)",
            background: "var(--surface-nav)",
            borderColor: "var(--surface-nav-border)",
            /* Blur effect for native feel */
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="flex items-center justify-around py-2">
            {navItems.map(({ name, label, icon: Icon }) => {
              const path = name === "Home" ? "/" : `/${name}`;
              const isActive = name === "Home"
                ? location.pathname === "/"
                : location.pathname.startsWith(`/${name}`);
              return (
                <Link
                  key={name}
                  to={createPageUrl(name)}
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all"
                >
                  <Icon
                    size={22}
                    style={{ color: isActive ? "var(--hanoo-blue)" : "var(--text-tertiary)" }}
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: isActive ? "var(--hanoo-blue)" : "var(--text-tertiary)" }}
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
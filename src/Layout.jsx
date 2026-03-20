import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Home, Car, CalendarDays, User, ParkingSquare } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import ThemeToggle from "@/components/ThemeToggle";
import { useAppNavigation } from "@/lib/NavigationContext";

// Apply saved theme before first render
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("hanoo-theme");
  if (saved === "dark") document.documentElement.classList.add("dark");
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const { switchTab } = useAppNavigation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const noNavPages = ["Splash", "Onboarding"];
  const showNav = !noNavPages.includes(currentPageName);

  const navItems = [
    { name: "Home",        label: "בית",       icon: Home,          path: "/" },
    { name: "FindParking", label: "מצא חניה",  icon: Car,           path: "/FindParking" },
    { name: "MyParking",   label: "החניה שלי", icon: ParkingSquare, path: "/MyParking" },
    { name: "Bookings",    label: "הזמנות",    icon: CalendarDays,  path: "/Bookings" },
    { name: "Profile",     label: "פרופיל",    icon: User,          path: "/Profile" },
  ];

  return (
    <div
      className="min-h-screen relative"
      dir="rtl"
      style={{ background: "var(--surface-page)", color: "var(--text-primary)" }}
    >
      <div
        className={showNav ? "" : ""}
        style={{
          position: "relative",
          overflow: "hidden",
          paddingBottom: showNav ? "calc(64px + env(safe-area-inset-bottom))" : 0,
        }}
      >
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
            {navItems.map(({ name, label, icon: Icon, path }) => {
              const isActive = name === "Home"
                ? location.pathname === "/"
                : location.pathname.startsWith(`/${name}`);
              return (
                <button
                  key={name}
                  onClick={() => switchTab(path)}
                  className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all select-none"
                  style={{ minWidth: 44, minHeight: 44, background: "transparent", border: "none" }}
                >
                  <Icon
                    size={22}
                    style={{ color: isActive ? "var(--hanoo-blue)" : "var(--text-tertiary)" }}
                  />
                  <span
                    className="text-xs font-medium select-none"
                    style={{ color: isActive ? "var(--hanoo-blue)" : "var(--text-tertiary)" }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
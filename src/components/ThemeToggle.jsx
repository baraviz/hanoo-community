import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }) {
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined"
      ? document.documentElement.classList.contains("dark") ||
        localStorage.getItem("hanoo-theme") === "dark"
      : false
  );

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("hanoo-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("hanoo-theme", "light");
    }
  }, [dark]);

  // Apply saved preference on mount
  useEffect(() => {
    const saved = localStorage.getItem("hanoo-theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <button
      onClick={() => setDark(d => !d)}
      className={`w-9 h-9 flex items-center justify-center rounded-2xl transition-colors ${className}`}
      style={{ background: "rgba(255,255,255,0.2)" }}
      aria-label="Toggle dark mode"
    >
      {dark ? <Sun size={16} className="text-white" /> : <Moon size={16} className="text-white" />}
    </button>
  );
}
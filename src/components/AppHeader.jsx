/**
 * AppHeader — consistent iOS-style page header.
 *
 * Props:
 *  title        string   — main heading
 *  subtitle     string   — optional subtext
 *  showBack     bool     — show back chevron (auto-detected if omitted)
 *  onBack       fn       — override back action
 *  right        node     — right-side slot (e.g. menu button, actions)
 *  children     node     — rendered below title row (tabs, etc.)
 *  noPadTop     bool     — skip the safe-area + pt-12 (for modals)
 */
import { ChevronRight } from "lucide-react";
import { useAppNavigation } from "@/lib/NavigationContext";

export default function AppHeader({
  title,
  subtitle,
  showBack,
  onBack,
  right,
  children,
  noPadTop = false,
}) {
  const { back, canGoBack } = useAppNavigation();
  const shouldShowBack = showBack !== undefined ? showBack : canGoBack();

  function handleBack() {
    if (onBack) onBack();
    else back();
  }

  return (
    <div
      style={{ background: "var(--surface-header)" }}
      className={`${noPadTop ? "pt-4" : "pt-safe"} pb-4 px-5`}
    >
      <div className="flex items-center justify-between gap-2" style={{ minHeight: 44 }}>
        {/* Back button — right side in RTL = visual left */}
        <div className="flex-none" style={{ width: 36 }}>
          {shouldShowBack && (
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-2xl select-none"
              style={{ background: "rgba(255,255,255,0.2)" }}
              aria-label="חזור"
            >
              <ChevronRight size={20} className="text-white" />
            </button>
          )}
        </div>

        {/* Title — centred */}
        <div className="flex-1 text-center">
          <h1 className="text-white text-lg font-bold leading-tight select-none">{title}</h1>
          {subtitle && (
            <p className="text-blue-200 text-xs mt-0.5 select-none">{subtitle}</p>
          )}
        </div>

        {/* Right slot */}
        <div className="flex-none flex items-center gap-2" style={{ width: 36, justifyContent: "flex-end" }}>
          {right}
        </div>
      </div>

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}